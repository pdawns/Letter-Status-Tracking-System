const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const cloudinary = require('cloudinary').v2;
const nodemailer = require('nodemailer');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 3001;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });
const DB_PATH = path.join(__dirname, 'dts.db');

// ── Users ─────────────────────────────────────────────────
const USERS = {
  staff:  { password: 'password', role: 'staff' },
  staff1: { password: 'password', role: 'receiver' },
};

// ── sql.js helpers ────────────────────────────────────────
let db;

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function now() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// ── Boot ──────────────────────────────────────────────────
initSqlJs().then((SQL) => {
  // Load existing DB file or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
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
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS letter_statuses (
      id TEXT PRIMARY KEY,
      letter_id TEXT NOT NULL,
      status_type TEXT NOT NULL,
      signed_by TEXT NOT NULL,
      signed_at TEXT DEFAULT (datetime('now')),
      notes TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
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
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT DEFAULT NULL
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      letter_id TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  // Migrate: add email_sent_at if missing
  try { db.run('ALTER TABLE letters ADD COLUMN email_sent_at TEXT DEFAULT NULL'); saveDb(); } catch (_) {}
  // Migrate: add document_direction, sent_at, received_at if missing
  try { db.run('ALTER TABLE letters ADD COLUMN document_direction TEXT DEFAULT NULL'); saveDb(); } catch (_) {}
  try { db.run('ALTER TABLE letters ADD COLUMN sent_at TEXT DEFAULT NULL'); saveDb(); } catch (_) {}
  try { db.run('ALTER TABLE letters ADD COLUMN received_at TEXT DEFAULT NULL'); saveDb(); } catch (_) {}
  // Backfill document_direction for existing records based on sender_name
  try {
    db.run(`UPDATE letters SET document_direction = 'receiving', received_at = created_at WHERE document_direction IS NULL AND sender_name IS NOT NULL AND sender_name != ''`);
    db.run(`UPDATE letters SET document_direction = 'sending', sent_at = created_at WHERE document_direction IS NULL`);
    // Also fix any sending records that have direction but missing sent_at
    db.run(`UPDATE letters SET sent_at = created_at WHERE document_direction = 'sending' AND sent_at IS NULL`);
    saveDb();
  } catch (_) {}  // Backfill activity logs for existing documents
  try {
    const existingLetters = all('SELECT * FROM letters');
    for (const letter of existingLetters) {
      const hasLog = get('SELECT id FROM activity_logs WHERE letter_id = ? AND action = ?', [letter.id, 'document_created']);
      if (!hasLog) {
        run(
          'INSERT INTO activity_logs (id, letter_id, action, description, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [crypto.randomUUID(), letter.id, 'document_created', `Document "${letter.title}" (${letter.reference_number}) created`, 'system', letter.created_at]
        );
      }
      // Backfill statuses
      const statuses = all('SELECT * FROM letter_statuses WHERE letter_id = ? ORDER BY signed_at ASC', [letter.id]);
      for (const s of statuses) {
        const hasStatusLog = get('SELECT id FROM activity_logs WHERE letter_id = ? AND action = ? AND created_at = ?', [letter.id, 'status_added', s.signed_at]);
        if (!hasStatusLog) {
          run(
            'INSERT INTO activity_logs (id, letter_id, action, description, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [crypto.randomUUID(), letter.id, 'status_added', `Status "${s.status_type}" added by ${s.signed_by}`, 'system', s.signed_at]
          );
        }
      }
      // Backfill action tickets
      const tickets = all('SELECT * FROM action_tickets WHERE letter_id = ? ORDER BY created_at ASC', [letter.id]);
      for (const t of tickets) {
        const hasTicketLog = get('SELECT id FROM activity_logs WHERE letter_id = ? AND action = ? AND created_at = ?', [letter.id, 'ticket_created', t.created_at]);
        if (!hasTicketLog) {
          run(
            'INSERT INTO activity_logs (id, letter_id, action, description, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [crypto.randomUUID(), letter.id, 'ticket_created', `Action ticket ${t.ticket_number} assigned to ${t.assigned_to} by ${t.assigned_by}`, 'system', t.created_at]
          );
        }
        if (t.status === 'completed' && t.completed_at) {
          const hasCompleteLog = get('SELECT id FROM activity_logs WHERE letter_id = ? AND action = ? AND created_at = ?', [letter.id, 'ticket_completed', t.completed_at]);
          if (!hasCompleteLog) {
            run(
              'INSERT INTO activity_logs (id, letter_id, action, description, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
              [crypto.randomUUID(), letter.id, 'ticket_completed', `Action ticket ${t.ticket_number} marked as completed`, 'system', t.completed_at]
            );
          }
        }
      }
      // Backfill archive
      if (letter.archived && letter.archived_at) {
        const hasArchiveLog = get('SELECT id FROM activity_logs WHERE letter_id = ? AND action = ?', [letter.id, 'document_archived']);
        if (!hasArchiveLog) {
          run(
            'INSERT INTO activity_logs (id, letter_id, action, description, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [crypto.randomUUID(), letter.id, 'document_archived', `Document archived`, 'system', letter.archived_at]
          );
        }
      }
      // Backfill email sent
      if (letter.email_sent_at) {
        const hasEmailLog = get('SELECT id FROM activity_logs WHERE letter_id = ? AND action = ?', [letter.id, 'email_sent']);
        if (!hasEmailLog) {
          run(
            'INSERT INTO activity_logs (id, letter_id, action, description, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [crypto.randomUUID(), letter.id, 'email_sent', `Email notification sent`, 'system', letter.email_sent_at]
          );
        }
      }
    }
    saveDb();
    console.log('Activity logs backfilled.');
  } catch (e) { console.error('Backfill error:', e); }

  // Migrate: fix misspelled name Constantito → Constantino
  try {
    db.run(`UPDATE action_tickets SET assigned_to = REPLACE(assigned_to, 'Constantito', 'Constantino') WHERE assigned_to LIKE '%Constantito%'`);
    db.run(`UPDATE letter_statuses SET notes = REPLACE(notes, 'Constantito', 'Constantino') WHERE notes LIKE '%Constantito%'`);
    db.run(`UPDATE letter_statuses SET signed_by = REPLACE(signed_by, 'Constantito', 'Constantino') WHERE signed_by LIKE '%Constantito%'`);
    saveDb();
  } catch (_) {}
  try {
    db.run(`CREATE TABLE IF NOT EXISTS action_tickets (
      id TEXT PRIMARY KEY,
      letter_id TEXT NOT NULL,
      ticket_number TEXT UNIQUE NOT NULL,
      assigned_by TEXT NOT NULL,
      assigned_to TEXT NOT NULL,
      action_notes TEXT DEFAULT '',
      due_date TEXT DEFAULT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT DEFAULT NULL
    )`);
    saveDb();
  } catch (_) {}
  saveDb();
  console.log('Database ready.');

  // ── Activity Log helper ───────────────────────────────────
  function logActivity(letterId, action, description, performedBy) {
    try {
      run(
        'INSERT INTO activity_logs (id, letter_id, action, description, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), letterId, action, description, performedBy, now()]
      );
    } catch (_) {}
  }

  // ── Auth middleware ───────────────────────────────────────
  function requireAuth(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const session = get('SELECT token, user_id FROM sessions WHERE token = ?', [token]);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = session.user_id;
    req.userRole = USERS[session.user_id]?.role || 'staff';
    next();
  }

  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '10mb' }));

  app.get('/', (req, res) => res.json({ status: 'DTS Server is running' }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // ── Auth ──────────────────────────────────────────────────
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
    const user = USERS[username];
    if (!user || user.password !== password)
      return res.status(401).json({ error: 'Invalid username or password' });
    const token = crypto.randomBytes(32).toString('hex');
    run('INSERT OR REPLACE INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)', [token, username, now()]);
    res.json({ token, username, role: user.role });
  });

  app.post('/api/logout', (req, res) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (token) run('DELETE FROM sessions WHERE token = ?', [token]);
    res.json({ success: true });
  });

  // ── Letters ───────────────────────────────────────────────
  app.get('/api/letters', requireAuth, (req, res) => {
    res.json(all('SELECT * FROM letters WHERE archived = 0 ORDER BY created_at DESC'));
  });

  app.get('/api/letters/archived', requireAuth, (req, res) => {
    res.json(all('SELECT * FROM letters WHERE archived = 1 ORDER BY archived_at DESC'));
  });

  app.get('/api/letters/:id', requireAuth, (req, res) => {
    const letter = get('SELECT * FROM letters WHERE id = ?', [req.params.id]);
    if (!letter) return res.status(404).json({ error: 'Not found' });
    res.json(letter);
  });

  app.post('/api/letters', requireAuth, (req, res) => {
    const id = crypto.randomUUID();
    const { reference_number, title, document_subject, document_type, handler_pin, description, sender_name, sender_office, sender_phone, sender_email, required_statuses, document_direction } = req.body;
    const sent_at = document_direction === 'sending' ? now() : null;
    const received_at = document_direction === 'receiving' ? now() : null;
    run(
      'INSERT INTO letters (id, reference_number, title, document_subject, document_type, handler_pin, description, sender_name, sender_office, sender_phone, sender_email, required_statuses, document_direction, sent_at, received_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, reference_number, title, document_subject || '', document_type || 'letter', handler_pin, description || '', sender_name || '', sender_office || '', sender_phone || '', sender_email || '', required_statuses || 'noted,approved,reviewed', document_direction || null, sent_at, received_at, now()]
    );
    logActivity(id, 'document_created', `Document "${title}" (${reference_number}) created`, req.userId);
    res.json(get('SELECT * FROM letters WHERE id = ?', [id]));
  });

  app.patch('/api/letters/:id', requireAuth, (req, res) => {
    try {
      const fields = req.body;
      const allowed = ['file_url', 'file_name', 'title', 'description', 'handler_pin', 'document_type', 'document_subject', 'sender_name', 'sender_office', 'sender_phone', 'sender_email', 'required_statuses', 'document_direction', 'sent_at', 'received_at'];
      const updates = Object.keys(fields).filter(k => allowed.includes(k));
      if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
      const setClauses = updates.map(k => `${k} = ?`).join(', ');
      const values = updates.map(k => fields[k] ?? null);
      run(`UPDATE letters SET ${setClauses} WHERE id = ?`, [...values, req.params.id]);
      const letter = get('SELECT * FROM letters WHERE id = ?', [req.params.id]);
      if (!letter) return res.status(404).json({ error: 'Not found' });
      logActivity(req.params.id, 'document_updated', `Document info updated`, req.userId);
      res.json(letter);
    } catch (err) {
      console.error('PATCH /api/letters/:id error:', err);
      res.status(500).json({ error: err.message || 'Update failed' });
    }
  });

  app.delete('/api/letters/:id', requireAuth, (req, res) => {
    run('DELETE FROM letter_statuses WHERE letter_id = ?', [req.params.id]);
    run('DELETE FROM letters WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  app.patch('/api/letters/:id/archive', requireAuth, (req, res) => {
    run('UPDATE letters SET archived = 1, archived_at = ? WHERE id = ?', [now(), req.params.id]);
    const letter = get('SELECT * FROM letters WHERE id = ?', [req.params.id]);
    logActivity(req.params.id, 'document_archived', `Document archived`, req.userId);
    res.json({ success: true });
  });

  app.patch('/api/letters/:id/unarchive', requireAuth, (req, res) => {
    run('UPDATE letters SET archived = 0, archived_at = NULL WHERE id = ?', [req.params.id]);
    logActivity(req.params.id, 'document_unarchived', `Document restored from archive`, req.userId);
    res.json({ success: true });
  });

  // ── Email sent tracking ───────────────────────────────────
  app.patch('/api/letters/:id/email-sent', requireAuth, (req, res) => {
    run('UPDATE letters SET email_sent_at = ? WHERE id = ?', [now(), req.params.id]);
    const letter = get('SELECT * FROM letters WHERE id = ?', [req.params.id]);
    logActivity(req.params.id, 'email_sent', `Email notification sent`, req.userId);
    res.json(letter);
  });

  // ── Send email via SMTP ───────────────────────────────────
  app.post('/api/send-email', requireAuth, async (req, res) => {
    const { to, subject, body, letterId } = req.body;
    if (!to || !subject || !body) return res.status(400).json({ error: 'Missing required fields' });

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailName = process.env.EMAIL_FROM_NAME || "Provincial Treasurer's Office";

    if (!emailUser || !emailPass) {
      return res.status(503).json({ error: 'Email not configured. Please set EMAIL_USER and EMAIL_PASS in .env' });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: emailUser, pass: emailPass },
      });

      await transporter.sendMail({
        from: `"${emailName}" <${emailUser}>`,
        to,
        subject,
        text: body,
      });

      // Mark email as sent on the letter
      if (letterId) {
        run('UPDATE letters SET email_sent_at = ? WHERE id = ?', [now(), letterId]);
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Email send error:', err);
      res.status(500).json({ error: err.message || 'Failed to send email' });
    }
  });

  // ── Upload ────────────────────────────────────────────────
  app.post('/api/upload', requireAuth, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'dts-documents', resource_type: 'auto', use_filename: true, unique_filename: true },
          (error, result) => { if (error) reject(error); else resolve(result); }
        );
        stream.end(req.file.buffer);
      });
      res.json({ file_url: result.secure_url, file_name: req.file.originalname });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message || 'Upload failed' });
    }
  });

  // ── Activity Logs ─────────────────────────────────────────
  app.get('/api/letters/:id/activity-logs', requireAuth, (req, res) => {
    res.json(all('SELECT * FROM activity_logs WHERE letter_id = ? ORDER BY created_at ASC', [req.params.id]));
  });

  app.get('/api/activity-logs', requireAuth, (req, res) => {
    const limit = parseInt(req.query.limit) || 200;
    const action = req.query.action || null;
    if (action) {
      res.json(all(
        'SELECT al.*, l.reference_number, l.title FROM activity_logs al LEFT JOIN letters l ON al.letter_id = l.id WHERE al.action = ? ORDER BY al.created_at DESC LIMIT ?',
        [action, limit]
      ));
    } else {
      res.json(all(
        'SELECT al.*, l.reference_number, l.title FROM activity_logs al LEFT JOIN letters l ON al.letter_id = l.id ORDER BY al.created_at DESC LIMIT ?',
        [limit]
      ));
    }
  });

  // ── Statuses ──────────────────────────────────────────────
  app.get('/api/letters/:id/statuses', requireAuth, (req, res) => {
    res.json(all('SELECT * FROM letter_statuses WHERE letter_id = ? ORDER BY signed_at ASC', [req.params.id]));
  });

  app.post('/api/letters/:id/statuses', requireAuth, (req, res) => {
    const items = req.body;
    for (const row of items) {
      run(
        'INSERT INTO letter_statuses (id, letter_id, status_type, signed_by, notes, signed_at) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), req.params.id, row.status_type, row.signed_by, row.notes || '', now()]
      );
      logActivity(req.params.id, 'status_added', `Status "${row.status_type}" added by ${row.signed_by}`, req.userId);
    }
    res.json(all('SELECT * FROM letter_statuses WHERE letter_id = ? ORDER BY signed_at ASC', [req.params.id]));
  });

  // ── Action Tickets ────────────────────────────────────────
  app.get('/api/letters/:id/action-tickets', requireAuth, (req, res) => {
    res.json(all('SELECT * FROM action_tickets WHERE letter_id = ? ORDER BY created_at DESC', [req.params.id]));
  });

  app.post('/api/letters/:id/action-tickets', requireAuth, (req, res) => {
    const { assigned_by, assigned_to, action_notes, due_date } = req.body;
    if (!assigned_by || !assigned_to) return res.status(400).json({ error: 'assigned_by and assigned_to are required' });
    const id = crypto.randomUUID();
    const year = new Date().getFullYear();
    const countRow = all('SELECT COUNT(*) as cnt FROM action_tickets');
    const seq = (countRow[0]?.cnt ?? 0) + 1;
    const ticket_number = `ACT-${year}-${String(seq).padStart(4, '0')}`;
    run(
      'INSERT INTO action_tickets (id, letter_id, ticket_number, assigned_by, assigned_to, action_notes, due_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.params.id, ticket_number, assigned_by, assigned_to, action_notes || '', due_date || null, 'pending', now()]
    );
    logActivity(req.params.id, 'ticket_created', `Action ticket ${ticket_number} assigned to ${assigned_to} by ${assigned_by}`, req.userId);
    res.json(get('SELECT * FROM action_tickets WHERE id = ?', [id]));
  });

  app.patch('/api/action-tickets/:id/complete', requireAuth, (req, res) => {
    run('UPDATE action_tickets SET status = ?, completed_at = ? WHERE id = ?', ['completed', now(), req.params.id]);
    const ticket = get('SELECT * FROM action_tickets WHERE id = ?', [req.params.id]);
    if (!ticket) return res.status(404).json({ error: 'Not found' });
    logActivity(ticket.letter_id, 'ticket_completed', `Action ticket ${ticket.ticket_number} marked as completed`, req.userId);
    res.json(ticket);
  });

  app.listen(PORT, '0.0.0.0', () => console.log(`DTS Server running on port ${PORT}`));

}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
