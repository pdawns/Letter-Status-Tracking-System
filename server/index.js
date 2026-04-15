const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const cloudinary = require('cloudinary').v2;
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
  `);
  // Migrate: add email_sent_at if missing
  try { db.run('ALTER TABLE letters ADD COLUMN email_sent_at TEXT DEFAULT NULL'); saveDb(); } catch (_) {}
  saveDb();
  console.log('Database ready.');

  // ── Auth middleware ───────────────────────────────────────
  function requireAuth(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const session = get('SELECT token FROM sessions WHERE token = ?', [token]);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
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
    if (username !== 'staff' || password !== 'password')
      return res.status(401).json({ error: 'Invalid username or password' });
    const token = crypto.randomBytes(32).toString('hex');
    run('INSERT OR REPLACE INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)', [token, 'staff', now()]);
    res.json({ token, username: 'staff' });
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
    const { reference_number, title, document_subject, document_type, handler_pin, description, sender_name, sender_office, sender_phone, sender_email, required_statuses } = req.body;
    run(
      'INSERT INTO letters (id, reference_number, title, document_subject, document_type, handler_pin, description, sender_name, sender_office, sender_phone, sender_email, required_statuses, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, reference_number, title, document_subject || '', document_type || 'letter', handler_pin, description || '', sender_name || '', sender_office || '', sender_phone || '', sender_email || '', required_statuses || 'noted,approved,reviewed', now()]
    );
    res.json(get('SELECT * FROM letters WHERE id = ?', [id]));
  });

  app.patch('/api/letters/:id', requireAuth, (req, res) => {
    try {
      const fields = req.body;
      const allowed = ['file_url', 'file_name', 'title', 'description', 'handler_pin', 'document_type', 'document_subject', 'sender_name', 'sender_office', 'sender_phone', 'sender_email', 'required_statuses'];
      const updates = Object.keys(fields).filter(k => allowed.includes(k));
      if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
      const setClauses = updates.map(k => `${k} = ?`).join(', ');
      const values = updates.map(k => fields[k] ?? null);
      run(`UPDATE letters SET ${setClauses} WHERE id = ?`, [...values, req.params.id]);
      const letter = get('SELECT * FROM letters WHERE id = ?', [req.params.id]);
      if (!letter) return res.status(404).json({ error: 'Not found' });
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
    res.json({ success: true });
  });

  app.patch('/api/letters/:id/unarchive', requireAuth, (req, res) => {
    run('UPDATE letters SET archived = 0, archived_at = NULL WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  // ── Email sent tracking ───────────────────────────────────
  app.patch('/api/letters/:id/email-sent', requireAuth, (req, res) => {
    run('UPDATE letters SET email_sent_at = ? WHERE id = ?', [now(), req.params.id]);
    const letter = get('SELECT * FROM letters WHERE id = ?', [req.params.id]);
    res.json(letter);
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
    }
    res.json(all('SELECT * FROM letter_statuses WHERE letter_id = ? ORDER BY signed_at ASC', [req.params.id]));
  });

  app.listen(PORT, '0.0.0.0', () => console.log(`DTS Server running on port ${PORT}`));

}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
