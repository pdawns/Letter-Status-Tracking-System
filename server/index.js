const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Cloudinary config ─────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── PostgreSQL pool ───────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')
    ? { rejectUnauthorized: false }
    : false,
});

// ── Multer memory storage (for Cloudinary) ────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

function now() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// ── DB helpers ────────────────────────────────────────────
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

// ── Init tables ───────────────────────────────────────────
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

  // ── Migrate: add missing columns to existing tables ──────
  const migrations = [
    `ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_subject TEXT DEFAULT ''`,
    `ALTER TABLE letters ADD COLUMN IF NOT EXISTS sender_name TEXT DEFAULT ''`,
    `ALTER TABLE letters ADD COLUMN IF NOT EXISTS sender_office TEXT DEFAULT ''`,
    `ALTER TABLE letters ADD COLUMN IF NOT EXISTS sender_phone TEXT DEFAULT ''`,
    `ALTER TABLE letters ADD COLUMN IF NOT EXISTS sender_email TEXT DEFAULT ''`,
    `ALTER TABLE letters ADD COLUMN IF NOT EXISTS required_statuses TEXT DEFAULT 'noted,approved,reviewed'`,
    `ALTER TABLE letters ADD COLUMN IF NOT EXISTS email_sent_at TEXT DEFAULT NULL`,
    `ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_direction TEXT DEFAULT NULL`,
    `ALTER TABLE letters ADD COLUMN IF NOT EXISTS sent_at TEXT DEFAULT NULL`,
    `ALTER TABLE letters ADD COLUMN IF NOT EXISTS received_at TEXT DEFAULT NULL`,
    `ALTER TABLE letters ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT NULL`,
    `ALTER TABLE letters ADD COLUMN IF NOT EXISTS archived_at TEXT`,
    `ALTER TABLE letters ADD COLUMN IF NOT EXISTS file_url TEXT`,
    `ALTER TABLE letters ADD COLUMN IF NOT EXISTS file_name TEXT`,
    `ALTER TABLE letter_statuses ADD COLUMN IF NOT EXISTS review_file_url TEXT DEFAULT NULL`,
    `ALTER TABLE letter_statuses ADD COLUMN IF NOT EXISTS review_file_name TEXT DEFAULT NULL`,
  ];
  for (const sql of migrations) {
    await pool.query(sql).catch(() => {}); // ignore if already exists
  }

  // Seed users
  await pool.query(`INSERT INTO users (username, password, role) VALUES ('jonarleen.cabago@pto','jcabago','staff') ON CONFLICT (username) DO UPDATE SET role='staff'`);
  await pool.query(`INSERT INTO users (username, password, role) VALUES ('honaygrace.labajo@pto','hglabajo','staff') ON CONFLICT (username) DO UPDATE SET role='staff'`);
  await pool.query(`INSERT INTO users (username, password, role) VALUES ('dearlyn.doñina@pto','ddoñina','staff') ON CONFLICT (username) DO UPDATE SET role='staff'`);
  await pool.query(`INSERT INTO users (username, password, role) VALUES ('ronaldjame.violon@pto','ptoMisOr','admin') ON CONFLICT (username) DO UPDATE SET role='admin'`);
  await pool.query(`INSERT INTO users (username, password, role) VALUES ('ptomisor@pto','ptoMisOr','viewer') ON CONFLICT (username) DO UPDATE SET role='viewer'`);
  await pool.query(`DELETE FROM users WHERE username NOT IN ('jonarleen.cabago@pto','honaygrace.labajo@pto','dearlyn.doñina@pto','ronaldjame.violon@pto','ptomisor@pto')`);

  // Seed default document types
  const defaultTypes = ['Letter','Certificate','Memo','Report','Disbursement Voucher'];
  for (const name of defaultTypes) {
    await pool.query(`INSERT INTO document_types (name, is_custom) VALUES ($1, 0) ON CONFLICT (name) DO NOTHING`, [name]);
  }

  // Backfill direction for legacy rows
  await pool.query(`UPDATE letters SET document_direction='receiving', received_at=created_at WHERE document_direction IS NULL AND sender_name IS NOT NULL AND sender_name!=''`);
  await pool.query(`UPDATE letters SET document_direction='sending', sent_at=created_at WHERE document_direction IS NULL`);
  await pool.query(`UPDATE letters SET sent_at=created_at WHERE document_direction='sending' AND sent_at IS NULL`);
  await pool.query(`UPDATE letters SET created_by='mj' WHERE created_by IS NULL OR created_by=''`);

  console.log('Database ready.');
}

// ── Activity Log helper ───────────────────────────────────
async function logActivity(letterId, action, description, performedBy) {
  try {
    await run(
      'INSERT INTO activity_logs (id, letter_id, action, description, performed_by, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
      [crypto.randomUUID(), letterId, action, description, performedBy, now()]
    );
  } catch (_) {}
}

// ── Auth middleware ───────────────────────────────────────
function requireAuth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  get('SELECT token, user_id FROM sessions WHERE token = $1', [token]).then(session => {
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = session.user_id;
    get('SELECT role FROM users WHERE username = $1', [session.user_id]).then(u => {
      req.userRole = u?.role || 'staff';
      next();
    });
  }).catch(() => res.status(500).json({ error: 'Auth error' }));
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

// ── Auth routes ───────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
    const user = await get('SELECT * FROM users WHERE username = $1', [username]);
    if (!user || user.password !== password)
      return res.status(401).json({ error: 'Invalid username or password' });
    const token = crypto.randomBytes(32).toString('hex');
    await run('INSERT INTO sessions (token, user_id, created_at) VALUES ($1,$2,$3) ON CONFLICT (token) DO UPDATE SET user_id=$2', [token, username, now()]);
    res.json({ token, username, role: user.role });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/logout', async (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (token) await run('DELETE FROM sessions WHERE token = $1', [token]);
  res.json({ success: true });
});

app.post('/api/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
    const user = await get('SELECT * FROM users WHERE username = $1', [req.userId]);
    if (!user || user.password !== currentPassword)
      return res.status(401).json({ error: 'Current password is incorrect' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    await run('UPDATE users SET password = $1 WHERE username = $2', [newPassword, req.userId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Public endpoints ──────────────────────────────────────
app.get('/api/public/letters', async (_req, res) => {
  try {
    res.json(await all('SELECT id, reference_number, title, document_subject, document_type, document_direction, created_at, required_statuses, sender_name, sender_office FROM letters WHERE archived = 0 ORDER BY created_at DESC'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/public/letters/:id/statuses', async (req, res) => {
  try {
    res.json(await all('SELECT * FROM letter_statuses WHERE letter_id = $1 ORDER BY signed_at ASC', [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Document Types ────────────────────────────────────────
app.get('/api/document-types', requireAuth, async (_req, res) => {
  try {
    res.json(await all('SELECT id, name, is_custom FROM document_types ORDER BY is_custom ASC, name ASC'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/document-types', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const trimmed = name.trim();
    await run('INSERT INTO document_types (name, is_custom) VALUES ($1, 1) ON CONFLICT (name) DO NOTHING', [trimmed]);
    res.json(await get('SELECT id, name, is_custom FROM document_types WHERE name = $1', [trimmed]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Letters ───────────────────────────────────────────────
app.get('/api/letters', requireAuth, async (_req, res) => {
  try {
    res.json(await all('SELECT * FROM letters WHERE archived = 0 ORDER BY created_at DESC'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/letters/archived', requireAuth, async (_req, res) => {
  try {
    res.json(await all('SELECT * FROM letters WHERE archived = 1 ORDER BY archived_at DESC'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/letters/:id', requireAuth, async (req, res) => {
  try {
    const letter = await get('SELECT * FROM letters WHERE id = $1', [req.params.id]);
    if (!letter) return res.status(404).json({ error: 'Not found' });
    res.json(letter);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/letters', requireAuth, async (req, res) => {
  try {
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
      [id, reference_number, title, document_subject||'', document_type||'letter', handler_pin,
       description||'', sender_name||'', sender_office||'', sender_phone||'', sender_email||'',
       required_statuses||'noted,approved,reviewed', document_direction||null, sent_at, received_at, req.userId, now()]
    );
    await logActivity(id, 'document_created', `Document "${title}" (${reference_number}) created`, req.userId);
    res.json(await get('SELECT * FROM letters WHERE id = $1', [id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
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
    await logActivity(req.params.id, 'document_updated', 'Document info updated', req.userId);
    res.json(letter);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/letters/:id', requireAuth, async (req, res) => {
  try {
    await run('DELETE FROM letter_statuses WHERE letter_id = $1', [req.params.id]);
    await run('DELETE FROM letters WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/letters/:id/archive', requireAuth, async (req, res) => {
  try {
    await run('UPDATE letters SET archived = 1, archived_at = $1 WHERE id = $2', [now(), req.params.id]);
    await logActivity(req.params.id, 'document_archived', 'Document archived', req.userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/letters/:id/unarchive', requireAuth, async (req, res) => {
  try {
    await run('UPDATE letters SET archived = 0, archived_at = NULL WHERE id = $1', [req.params.id]);
    await logActivity(req.params.id, 'document_unarchived', 'Document restored from archive', req.userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/letters/:id/email-sent', requireAuth, async (req, res) => {
  try {
    await run('UPDATE letters SET email_sent_at = $1 WHERE id = $2', [now(), req.params.id]);
    const letter = await get('SELECT * FROM letters WHERE id = $1', [req.params.id]);
    await logActivity(req.params.id, 'email_sent', 'Email notification sent', req.userId);
    res.json(letter);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Send email ────────────────────────────────────────────
app.post('/api/send-email', requireAuth, async (req, res) => {
  try {
    const { to, subject, body, letterId } = req.body;
    if (!to || !subject || !body) return res.status(400).json({ error: 'Missing required fields' });
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailName = process.env.EMAIL_FROM_NAME || "Provincial Treasurer's Office";
    if (!emailUser || !emailPass) return res.status(503).json({ error: 'Email not configured.' });
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: emailUser, pass: emailPass } });
    await transporter.sendMail({ from: `"${emailName}" <${emailUser}>`, to, subject, text: body });
    if (letterId) await run('UPDATE letters SET email_sent_at = $1 WHERE id = $2', [now(), letterId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Upload to Cloudinary ──────────────────────────────────
app.post('/api/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    
    // For PDFs: use 'image' type with pages flag to make them publicly viewable
    // For other docs: use 'raw' but with public access
    // For images: use 'auto'
    let resourceType = 'auto';
    let uploadOptions = {
      folder: 'dts-uploads',
      use_filename: true,
      unique_filename: true,
      access_mode: 'public',
      type: 'upload',
    };

    if (ext === 'pdf') {
      // Upload PDFs as images with pages flag - this makes them publicly accessible
      resourceType = 'image';
      uploadOptions.flags = 'attachment';
      uploadOptions.format = 'pdf';
    } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
      // Office docs as raw with public access
      resourceType = 'raw';
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: resourceType, ...uploadOptions },
        (err, result) => err ? reject(err) : resolve(result)
      );
      Readable.from(req.file.buffer).pipe(stream);
    });

    // Use the secure_url directly
    const fileUrl = result.secure_url;

    res.json({ file_url: fileUrl, file_name: req.file.originalname });
  } catch (e) {
    console.error('Upload error:', e);
    res.status(500).json({ error: e.message || 'Upload failed' });
  }
});

// ── Proxy endpoint for viewing Cloudinary files ───────────
app.get('/api/proxy-file', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    // Only allow Cloudinary URLs for security
    if (!url.includes('res.cloudinary.com')) {
      return res.status(403).json({ error: 'Only Cloudinary URLs are allowed' });
    }

    // Fetch the file from Cloudinary using native fetch (Node 18+)
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch file from Cloudinary' });
    }

    // Forward the content type and stream the file
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    res.setHeader('Content-Disposition', 'inline');
    
    // Stream the response
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (e) {
    console.error('Proxy error:', e);
    res.status(500).json({ error: e.message || 'Proxy failed' });
  }
});

// ── Activity Logs ─────────────────────────────────────────
app.get('/api/letters/:id/activity-logs', requireAuth, async (req, res) => {
  try {
    res.json(await all('SELECT * FROM activity_logs WHERE letter_id = $1 ORDER BY created_at ASC', [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/activity-logs', requireAuth, async (req, res) => {
  try {
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Statuses ──────────────────────────────────────────────
app.get('/api/letters/:id/statuses', requireAuth, async (req, res) => {
  try {
    res.json(await all('SELECT * FROM letter_statuses WHERE letter_id = $1 ORDER BY signed_at ASC', [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/letters/:id/statuses', requireAuth, async (req, res) => {
  try {
    const items = req.body;
    for (const row of items) {
      await run(
        'INSERT INTO letter_statuses (id, letter_id, status_type, signed_by, notes, review_file_url, review_file_name, signed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [crypto.randomUUID(), req.params.id, row.status_type, row.signed_by, row.notes||'', row.review_file_url||null, row.review_file_name||null, now()]
      );
      await logActivity(req.params.id, 'status_added', `Status "${row.status_type}" added by ${row.signed_by}`, req.userId);
    }
    res.json(await all('SELECT * FROM letter_statuses WHERE letter_id = $1 ORDER BY signed_at ASC', [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Action Tickets ────────────────────────────────────────
app.get('/api/letters/:id/action-tickets', requireAuth, async (req, res) => {
  try {
    res.json(await all('SELECT * FROM action_tickets WHERE letter_id = $1 ORDER BY created_at DESC', [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/letters/:id/action-tickets', requireAuth, async (req, res) => {
  try {
    const { assigned_by, assigned_to, action_notes, due_date } = req.body;
    if (!assigned_by || !assigned_to) return res.status(400).json({ error: 'assigned_by and assigned_to are required' });
    const id = crypto.randomUUID();
    const year = new Date().getFullYear();
    const countRow = await get('SELECT COUNT(*) as cnt FROM action_tickets');
    const seq = (parseInt(countRow?.cnt) || 0) + 1;
    const ticket_number = `ACT-${year}-${String(seq).padStart(4, '0')}`;
    await run(
      'INSERT INTO action_tickets (id, letter_id, ticket_number, assigned_by, assigned_to, action_notes, due_date, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [id, req.params.id, ticket_number, assigned_by, assigned_to, action_notes||'', due_date||null, 'pending', now()]
    );
    await logActivity(req.params.id, 'ticket_created', `Action ticket ${ticket_number} assigned to ${assigned_to} by ${assigned_by}`, req.userId);
    res.json(await get('SELECT * FROM action_tickets WHERE id = $1', [id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/action-tickets/:id/complete', requireAuth, async (req, res) => {
  try {
    await run('UPDATE action_tickets SET status = $1, completed_at = $2 WHERE id = $3', ['completed', now(), req.params.id]);
    const ticket = await get('SELECT * FROM action_tickets WHERE id = $1', [req.params.id]);
    if (!ticket) return res.status(404).json({ error: 'Not found' });
    await logActivity(ticket.letter_id, 'ticket_completed', `Action ticket ${ticket.ticket_number} marked as completed`, req.userId);
    res.json(ticket);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Start ─────────────────────────────────────────────────
initDb()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => console.log(`DocuTrack Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
