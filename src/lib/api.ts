import { Letter, LetterStatus } from '../types';

const BASE = 'http://localhost:3001/api';

// ── Letters ──────────────────────────────────────────────

export const getLetters = async (): Promise<Letter[]> => {
  const res = await fetch(`${BASE}/letters`);
  return res.json();
};

export const getLetter = async (id: string): Promise<Letter | null> => {
  const res = await fetch(`${BASE}/letters/${id}`);
  if (!res.ok) return null;
  return res.json();
};

export const insertLetter = async (data: Omit<Letter, 'id' | 'created_at'>): Promise<Letter> => {
  const res = await fetch(`${BASE}/letters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updateLetter = async (id: string, data: Partial<Letter>): Promise<Letter> => {
  const res = await fetch(`${BASE}/letters/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteLetter = async (id: string): Promise<void> => {
  await fetch(`${BASE}/letters/${id}`, { method: 'DELETE' });
};

// ── File Upload ───────────────────────────────────────────

export const uploadFile = async (file: File, _documentId: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: formData });
  const data = await res.json();
  return data.file_url;
};

// ── Statuses ─────────────────────────────────────────────

export const getStatusesForLetter = async (letterId: string): Promise<LetterStatus[]> => {
  const res = await fetch(`${BASE}/letters/${letterId}/statuses`);
  return res.json();
};

export const insertStatuses = async (
  items: Omit<LetterStatus, 'id' | 'signed_at'>[]
): Promise<LetterStatus[]> => {
  const letterId = items[0]?.letter_id;
  const res = await fetch(`${BASE}/letters/${letterId}/statuses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
  return res.json();
};

export const getArchivedLetters = async (): Promise<Letter[]> => {
  const res = await fetch(`${BASE}/letters/archived`);
  return res.json();
};

export const archiveLetter = async (id: string): Promise<void> => {
  await fetch(`${BASE}/letters/${id}/archive`, { method: 'PATCH' });
};

export const unarchiveLetter = async (id: string): Promise<void> => {
  await fetch(`${BASE}/letters/${id}/unarchive`, { method: 'PATCH' });
};
