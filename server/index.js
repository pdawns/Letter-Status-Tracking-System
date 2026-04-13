const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

// Ensure uploads folder exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Setup SQLite
const db = new Database(path.join(__dirname, 'dts.db'));

db.exec(`
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
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS letter_statuses (
    id TEXT PRIMARY KEY,
    letter_id TEXT NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
    status_type TEXT NOT NULL CHECK(status_type IN ('noted','approved','reviewed')),
    signed_by TEXT NOT NULL,
    signed_at TEXT DEFAULT (datetime('now')),
    notes TEXT DEFAULT ''
  );
`);

// File storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Letters ──────────────────────────────────────────────

app.get('/api/letters', (req, res) => {
  const letters = db.prepare('SELECT * FROM letters WHERE archived = 0 ORDER BY created_at DESC').all();
  res.json(letters);
});

app.get('/api/letters/archived', (req, res) => {
  const letters = db.prepare('SELECT * FROM letters WHERE archived = 1 ORDER BY archived_at DESC').all();
  res.json(letters);
});

app.get('/api/letters/:id', (req, res) => {
  const letter = db.prepare('SELECT * FROM letters WHERE id = ?').get(req.params.id);
  if (!letter) return res.status(404).json({ error: 'Not found' });
  res.json(letter);
});

app.post('/api/letters', (req, res) => {
  const id = crypto.randomUUID();
  const { reference_number, title, document_subject, document_type, handler_pin, description } = req.body;
  db.prepare(`
    INSERT INTO letters (id, reference_number, title, document_subject, document_type, handler_pin, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, reference_number, title, document_subject || '', document_type || 'letter', handler_pin, description || '');
  const letter = db.prepare('SELECT * FROM letters WHERE id = ?').get(id);
  res.json(letter);
});

app.patch('/api/letters/:id', (req, res) => {
  const { file_url, file_name } = req.body;
  db.prepare('UPDATE letters SET file_url = ?, file_name = ? WHERE id = ?')
    .run(file_url, file_name, req.params.id);
  const letter = db.prepare('SELECT * FROM letters WHERE id = ?').get(req.params.id);
  res.json(letter);
});

app.delete('/api/letters/:id', (req, res) => {
  db.prepare('DELETE FROM letters WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.patch('/api/letters/:id/archive', (req, res) => {
  db.prepare('UPDATE letters SET archived = 1, archived_at = datetime(\'now\') WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.patch('/api/letters/:id/unarchive', (req, res) => {
  db.prepare('UPDATE letters SET archived = 0, archived_at = NULL WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── File Upload ───────────────────────────────────────────

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  res.json({ file_url: fileUrl, file_name: req.file.originalname });
});

// ── Statuses ─────────────────────────────────────────────

app.get('/api/letters/:id/statuses', (req, res) => {
  const statuses = db.prepare(
    'SELECT * FROM letter_statuses WHERE letter_id = ? ORDER BY signed_at ASC'
  ).all(req.params.id);
  res.json(statuses);
});

app.post('/api/letters/:id/statuses', (req, res) => {
  const items = req.body;
  const insert = db.prepare(`
    INSERT INTO letter_statuses (id, letter_id, status_type, signed_by, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insert.run(crypto.randomUUID(), req.params.id, row.status_type, row.signed_by, row.notes || '');
    }
  });
  insertMany(items);
  const statuses = db.prepare(
    'SELECT * FROM letter_statuses WHERE letter_id = ? ORDER BY signed_at ASC'
  ).all(req.params.id);
  res.json(statuses);
});

app.listen(PORT, () => console.log(`DTS Server running on http://localhost:${PORT}`));
