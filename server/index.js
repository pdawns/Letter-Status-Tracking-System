const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3001;

// ── PostgreSQL connection ─────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false,
});

function now() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// ── pg helpers ────────────────────────────────────────────
async function run(sql, params = []) {
  await pool.query(sql, params);
}
async function get(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows[0];
}
async function all(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

// ── Create tables ─────────────────────────────────────────
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS letters (
      id TEXT PRIMARY KEY,
      reference_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      handler_pin TEXT NOT NULL,
      document_type TEXT DEFAULT 'letter',
      document_subject TEXT DEFAULT '',
      file_url TEXT,
      file_name TEXT,
      archived INTEGER DEFAULT 0,
      archived_at TEXT,
      sender_name TEXT DEFAULT '',
      sender_office TEXT DEFAULT '',
      sender_phone TEXT DEFAULT '',
      sender_email TEXT DEFAULT '',
      required_statuses TEXT DEFAULT 'noted,approved,reviewed',
      email_sent_at TEXT DEFAULT NULL,
      document_direction TEXT DEFAULT NULL,
      sent_at TEXT DEFAULT NULL,
      received_at TEXT DEFAULT NULL,
      created_by TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
    );
    CREATE TABLE IF NOT EXISTS letter_statuses (
      id TEXT PRIMARY KEY,
      letter_id TEXT NOT NULL,
      status_type TEXT NOT NULL,
      signed_by TEXT NOT NULL,
      signed_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
      notes TEXT DEFAULT '',
      review_file_url TEXT DEFAULT NULL,
      review_file_name TEXT DEFAULT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
    );
    CREATE TABLE IF NOT EXISTS action_tickets (
      id TEXT PRIMARY KEY,
      letter_id TEXT NOT NULL,
      ticket_number TEXT UNIQUE NOT NULL,
      assigned_by TEXT NOT NULL,
      assigned_to TEXT NOT NULL,
      action_notes TEXT DEFAULT '',
      due_date TEXT DEFAULT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
      completed_at TEXT DEFAULT NULL
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      letter_id TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      created_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
    );
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff'
    );
    CREATE TABLE IF NOT EXISTS document_types (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      is_custom INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
    );
  `);

  // ── Seed users ──────────────────────────────────────────
  await run(`INSERT INTO users (username, password, role) VALUES ('mj','password','staff') ON CONFLICT (username) DO UPDATE SET role='staff'`);
  await run(`INSERT INTO users (username, password, role) VALUES ('jh','password','staff') ON CONFLICT (username) DO UPDATE SET role='staff'`);
  await run(`INSERT INTO users (username, password, role) VALUES ('violon','password','admin') ON CONFLICT (username) DO UPDATE SET role='admin'`);
  await run(`DELETE FROM users WHERE username NOT IN ('mj','jh','violon')`);

  // ── Seed document types ─────────────────────────────────
  const defaultTypes = ['Letter','Certificate','Memo','Report','Disbursement Voucher'];
  for (const name of defaultTypes) {
    await run(`INSERT INTO document_types (name, is_custom) VALUES ($1, 0) ON CONFLICT (name) DO NOTHING`, [name]);
  }

  console.log('Database ready.');
}

// ── Boot ──────────────────────────────────────────────────
initDb().then(() => {

  // ── Activity Log helper ───────────────────────────────
  function logActivity(letterId, action, description, performedBy) {
    pool.query(
      'INSERT INTO activity_logs (id, letter_id, action, description, performed_by, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
      [crypto.randomUUID(), letterId, action, description, performedBy, now()]
    ).catch(() => {});
  }

  // ── Auth middleware ───────────────────────────────────
  async function requireAuth(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const session = await get('SELECT token, user_id FROM sessions WHERE token = $1', [token]);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = session.user_id;
    const userRow = await get('SELECT role FROM users WHERE username = $1', [session.user_id]);
    req.userRole = userRow?.role || 'staff';
    next();
  }

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    'https://letters-status-tracking-system.vercel.app',
    'https://pto-dts-2026.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));

  app.get('/', (_req, res) => res.json({ status: 'DocuTrack Server is running' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // ── Auth ──────────────────────────────────────────────
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
    const user = await get('SELECT * FROM users WHERE username = $1', [username]);
    if (!user || user.password !== password)
      return res.status(401).json({ error: 'Invalid username or password' });
    const token = crypto.randomBytes(32).toString('hex');
    await run('INSERT INTO sessions (token, user_id, created_at) VALUES ($1,$2,$3) ON CONFLICT (token) DO UPDATE SET user_id=$2', [token, username, now()]);
    res.json({ token, username, role: user.role });
  });

  app.post('/api/logout', async (req, res) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (token) await run('DELETE FROM sessions WHERE token = $1', [token]);
    res.json({ success: true });
  });

  app.post('/api/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
    const user = await get('SELECT * FROM users WHERE username = $1', [req.userId]);
    if (!user || user.password !== currentPassword)
      return res.status(401).json({ error: 'Current password is incorrect' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    await run('UPDATE users SET password = $1 WHERE username = $2', [newPassword, req.userId]);
    res.json({ success: true });
  });

  // ── Public endpoints ──────────────────────────────────
  app.get('/api/public/letters', async (_req, res) => {
    res.json(await all('SELECT id, reference_number, title, document_subject, document_type, document_direction, created_at, required_statuses, sender_name, sender_office FROM letters WHERE archived = 0 ORDER BY created_at DESC'));
  });

  app.get('/api/public/letters/:id/statuses', async (req, res) => {
    res.json(await all('SELECT * FROM letter_statuses WHERE letter_id = $1 ORDER BY signed_at ASC', [req.params.id]));
  });

  // ── Document Types ────────────────────────────────────
  app.get('/api/document-types', requireAuth, async (_req, res) => {
    res.json(await all('SELECT id, name, is_custom FROM document_types ORDER BY is_custom ASC, name ASC'));
  });

  app.post('/api/document-types', requireAuth, async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    const trimmed = name.trim();
    try {
      await run('INSERT INTO document_types (name, is_custom) VALUES ($1, 1) ON CONFLICT (name) DO NOTHING', [trimmed]);
      res.json(await get('SELECT id, name, is_custom FROM document_types WHERE name = $1', [trimmed]));
    } catch (e) {
      res.status(500).json({ error: 'Failed to save document type' });
    }
  });

  // ── Letters ───────────────────────────────────────────
  app.get('/api/letters', requireAuth, async (_req, res) => {
    res.json(await all('SELECT * FROM letters WHERE archived = 0 ORDER BY created_at DESC'));
  });

  app.get('/api/letters/archived', requireAuth, async (_req, res) => {
    res.json(await all('SELECT * FROM letters WHERE archived = 1 ORDER BY archived_at DESC'));
  });

  app.get('/api/letters/:id', requireAuth, async (req, res) => {
    const letter = await get('SELECT * FROM letters WHERE id = $1', [req.params.id]);
    if (!letter) return res.status(404).json({ error: 'Not found' });
    res.json(letter);
  });

  app.post('/api/letters', requireAuth, async (req, res) => {
    const id = crypto.randomUUID();
    const { reference_number, title, document_subject, document_type, handler_pin, description,
      sender_name, sender_office, sender_phone, sender_email, required_statuses, document_direction } = req.body;
    const sent_at = document_direction === 'sending' ? now() : null;
    const received_at = document_direction === 'receiving' ? now() : null;
    await run(
      `INSERT INTO letters (id, reference_number, title, document_subject, document_type, handler_pin,
        description, sender_name, sender_office, sender_phone, sender_email, required_statuses,
        document_direction, sent_at, received_at, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [id, reference_number, title, document_subject || '', document_type || 'letter', handler_pin,
       description || '', sender_name || '', sender_office || '', sender_phone || '', sender_email || '',
       required_statuses || 'noted,approved,reviewed', document_direction || null, sent_at, received_at, req.userId, now()]
    );
    logActivity(id, 'document_created', `Document "${title}" (${reference_number}) created`, req.userId);
    res.json(await get('SELECT * FROM letters WHERE id = $1', [id]));
  });

  app.patch('/api/letters/:id', requireAuth, async (req, res) => {
    try {
      const fields = req.body;
      const allowed = ['file_url','file_name','title','description','handler_pin','document_type',
        'document_subject','sender_name','sender_office','sender_phone','sender_email',
        'required_statuses','document_direction','sent_at','received_at'];
      const updates = Object.keys(fields).filter(k => allowed.includes(k));
      if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
      const setClauses = updates.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values = updates.map(k => fields[k] ?? null);
      await run(`UPDATE letters SET ${setClauses} WHERE id = $${updates.length + 1}`, [...values, req.params.id]);
      const letter = await get('SELECT * FROM letters WHERE id = $1', [req.params.id]);
      if (!letter) return res.status(404).json({ error: 'Not found' });
      logActivity(req.params.id, 'document_updated', `Document info updated`, req.userId);
      res.json(letter);
    } catch (err) {
      console.error('PATCH /api/letters/:id error:', err);
      res.status(500).json({ error: err.message || 'Update failed' });
    }
  });

  app.delete('/api/letters/:id', requireAuth, async (req, res) => {
    await run('DELETE FROM letter_statuses WHERE letter_id = $1', [req.params.id]);
    await run('DELETE FROM letters WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  });

  app.patch('/api/letters/:id/archive', requireAuth, async (req, res) => {
    await run('UPDATE letters SET archived = 1, archived_at = $1 WHERE id = $2', [now(), req.params.id]);
    logActivity(req.params.id, 'document_archived', `Document archived`, req.userId);
    res.json({ success: true });
  });

  app.patch('/api/letters/:id/unarchive', requireAuth, async (req, res) => {
    await run('UPDATE letters SET archived = 0, archived_at = NULL WHERE id = $1', [req.params.id]);
    logActivity(req.params.id, 'document_unarchived', `Document restored from archive`, req.userId);
    res.json({ success: true });
  });

  app.patch('/api/letters/:id/email-sent', requireAuth, async (req, res) => {
    await run('UPDATE letters SET email_sent_at = $1 WHERE id = $2', [now(), req.params.id]);
    const letter = await get('SELECT * FROM letters WHERE id = $1', [req.params.id]);
    logActivity(req.params.id, 'email_sent', `Email notification sent`, req.userId);
    res.json(letter);
  });

  // ── Send email ────────────────────────────────────────
  app.post('/api/send-email', requireAuth, async (req, res) => {
    const { to, subject, body, letterId } = req.body;
    if (!to || !subject || !body) return res.status(400).json({ error: 'Missing required fields' });
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailName = process.env.EMAIL_FROM_NAME || "Provincial Treasurer's Office";
    if (!emailUser || !emailPass)
      return res.status(503).json({ error: 'Email not configured.' });
    try {
      const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: emailUser, pass: emailPass } });
      await transporter.sendMail({ from: `"${emailName}" <${emailUser}>`, to, subject, text: body });
      if (letterId) await run('UPDATE letters SET email_sent_at = $1 WHERE id = $2', [now(), letterId]);
      res.json({ success: true });
    } catch (err) {
      console.error('Email send error:', err);
      res.status(500).json({ error: err.message || 'Failed to send email' });
    }
  });

  // ── File uploads ──────────────────────────────────────
  const UPLOADS_DIR = path.join(__dirname, 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  app.use('/uploads', (req, res, next) => {
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    next();
  }, express.static(UPLOADS_DIR));

  const diskUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
      },
    }),
    limits: { fileSize: 100 * 1024 * 1024 },
  });

  app.post('/api/upload', requireAuth, diskUpload.single('file'), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : `http://localhost:${PORT}`;
      res.json({ file_url: `${baseUrl}/uploads/${req.file.filename}`, file_name: req.file.originalname });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Upload failed' });
    }
  });

  // ── Activity Logs ─────────────────────────────────────
  app.get('/api/letters/:id/activity-logs', requireAuth, async (req, res) => {
    res.json(await all('SELECT * FROM activity_logs WHERE letter_id = $1 ORDER BY created_at ASC', [req.params.id]));
  });

  app.get('/api/activity-logs', requireAuth, async (req, res) => {
    const limit = parseInt(req.query.limit) || 200;
    const action = req.query.action || null;
    if (action) {
      res.json(await all(
        'SELECT al.*, l.reference_number, l.title FROM activity_logs al LEFT JOIN letters l ON al.letter_id = l.id WHERE al.action = $1 ORDER BY al.created_at DESC LIMIT $2',
        [action, limit]
      ));
    } else {
      res.json(await all(
        'SELECT al.*, l.reference_number, l.title FROM activity_logs al LEFT JOIN letters l ON al.letter_id = l.id ORDER BY al.created_at DESC LIMIT $1',
        [limit]
      ));
    }
  });

  // ── Statuses ──────────────────────────────────────────
  app.get('/api/letters/:id/statuses', requireAuth, async (req, res) => {
    res.json(await all('SELECT * FROM letter_statuses WHERE letter_id = $1 ORDER BY signed_at ASC', [req.params.id]));
  });

  app.post('/api/letters/:id/statuses', requireAuth, async (req, res) => {
    const items = req.body;
    for (const row of items) {
      await run(
        'INSERT INTO letter_statuses (id, letter_id, status_type, signed_by, notes, review_file_url, review_file_name, signed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [crypto.randomUUID(), req.params.id, row.status_type, row.signed_by, row.notes || '', row.review_file_url || null, row.review_file_name || null, now()]
      );
      logActivity(req.params.id, 'status_added', `Status "${row.status_type}" added by ${row.signed_by}`, req.userId);
    }
    res.json(await all('SELECT * FROM letter_statuses WHERE letter_id = $1 ORDER BY signed_at ASC', [req.params.id]));
  });

  // ── Action Tickets ────────────────────────────────────
  app.get('/api/letters/:id/action-tickets', requireAuth, async (req, res) => {
    res.json(await all('SELECT * FROM action_tickets WHERE letter_id = $1 ORDER BY created_at DESC', [req.params.id]));
  });

  app.post('/api/letters/:id/action-tickets', requireAuth, async (req, res) => {
    const { assigned_by, assigned_to, action_notes, due_date } = req.body;
    if (!assigned_by || !assigned_to) return res.status(400).json({ error: 'assigned_by and assigned_to are required' });
    const id = crypto.randomUUID();
    const year = new Date().getFullYear();
    const countRow = await get('SELECT COUNT(*) as cnt FROM action_tickets');
    const seq = (parseInt(countRow?.cnt) ?? 0) + 1;
    const ticket_number = `ACT-${year}-${String(seq).padStart(4, '0')}`;
    await run(
      'INSERT INTO action_tickets (id, letter_id, ticket_number, assigned_by, assigned_to, action_notes, due_date, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [id, req.params.id, ticket_number, assigned_by, assigned_to, action_notes || '', due_date || null, 'pending', now()]
    );
    logActivity(req.params.id, 'ticket_created', `Action ticket ${ticket_number} assigned to ${assigned_to} by ${assigned_by}`, req.userId);
    res.json(await get('SELECT * FROM action_tickets WHERE id = $1', [id]));
  });

  app.patch('/api/action-tickets/:id/complete', requireAuth, async (req, res) => {
    await run('UPDATE action_tickets SET status = $1, completed_at = $2 WHERE id = $3', ['completed', now(), req.params.id]);
    const ticket = await get('SELECT * FROM action_tickets WHERE id = $1', [req.params.id]);
    if (!ticket) return res.status(404).json({ error: 'Not found' });
    logActivity(ticket.letter_id, 'ticket_completed', `Action ticket ${ticket.ticket_number} marked as completed`, req.userId);
    res.json(ticket);
  });

  app.listen(PORT, '0.0.0.0', () => console.log(`DocuTrack Server running on port ${PORT}`));

}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
