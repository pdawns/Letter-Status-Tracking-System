const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3001;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

const DB_PATH = path.join(__dirname, 'dts.db');
const db = new Database(DB_PATH);

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
    letter_id TEXT NOT NULL,
    status_type TEXT NOT NULL,
    signed_by TEXT NOT NULL,
    signed_at TEXT DEFAULT (datetime('now')),
    notes TEXT DEFAULT ''
  );
`);

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => res.json({ status: 'DTS Server is running' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/letters', (req, res) => {
  res.json(db.prepare('SELECT * FROM letters WHERE archived = 0 ORDER BY created_at DESC').all());
});

app.get('/api/letters/archived', (req, res) => {
  res.json(db.prepare('SELECT * FROM letters WHERE archived = 1 ORDER BY archived_at DESC').all());
});

app.get('/api/letters/:id', (req, res) => {
  const letter = db.prepare('SELECT * FROM letters WHERE id = ?').get(req.params.id);
  if (!letter) return res.status(404).json({ error: 'Not found' });
  res.json(letter);
});

app.post('/api/letters', (req, res) => {
  const id = crypto.randomUUID();
  const { reference_number, title, document_subject, document_type, handler_pin, description } = req.body;
  db.prepare('INSERT INTO letters (id, reference_number, title, document_subject, document_type, handler_pin, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, reference_number, title, document_subject || '', document_type || 'letter', handler_pin, description || '');
  res.json(db.prepare('SELECT * FROM letters WHERE id = ?').get(id));
});

app.patch('/api/letters/:id', (req, res) => {
  const { file_url, file_name } = req.body;
  db.prepare('UPDATE letters SET file_url = ?, file_name = ? WHERE id = ?').run(file_url, file_name, req.params.id);
  res.json(db.prepare('SELECT * FROM letters WHERE id = ?').get(req.params.id));
});

app.delete('/api/letters/:id', (req, res) => {
  db.prepare('DELETE FROM letter_statuses WHERE letter_id = ?').run(req.params.id);
  db.prepare('DELETE FROM letters WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.patch('/api/letters/:id/archive', (req, res) => {
  db.prepare("UPDATE letters SET archived = 1, archived_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.patch('/api/letters/:id/unarchive', (req, res) => {
  db.prepare('UPDATE letters SET archived = 0, archived_at = NULL WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
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

app.get('/api/letters/:id/statuses', (req, res) => {
  res.json(db.prepare('SELECT * FROM letter_statuses WHERE letter_id = ? ORDER BY signed_at ASC').all(req.params.id));
});

app.post('/api/letters/:id/statuses', (req, res) => {
  const items = req.body;
  const insert = db.prepare('INSERT INTO letter_statuses (id, letter_id, status_type, signed_by, notes) VALUES (?, ?, ?, ?, ?)');
  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(crypto.randomUUID(), req.params.id, row.status_type, row.signed_by, row.notes || '');
  });
  insertMany(items);
  res.json(db.prepare('SELECT * FROM letter_statuses WHERE letter_id = ? ORDER BY signed_at ASC').all(req.params.id));
});

app.listen(PORT, '0.0.0.0', () => console.log(`DTS Server running on port ${PORT}`));
