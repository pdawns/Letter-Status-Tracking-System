import { Letter, LetterStatus } from '../types';

const BASE = '/api';

// ── Auth helpers ──────────────────────────────────────────

export const getToken = (): string | null => localStorage.getItem('dts_token');
export const getRole = (): string => localStorage.getItem('dts_role') || 'staff';

const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

export const login = async (username: string, password: string): Promise<{ token: string; username: string; role: string }> => {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Invalid username or password');
  return res.json();
};

export const logout = async (): Promise<void> => {
  await fetch(`${BASE}/logout`, { method: 'POST', headers: authHeaders() });
  localStorage.removeItem('dts_token');
  localStorage.removeItem('dts_username');
  localStorage.removeItem('dts_role');
};

// ── Letters ──────────────────────────────────────────────

export const getLetters = async (): Promise<Letter[]> => {
  const res = await fetch(`${BASE}/letters`, { headers: authHeaders() });
  return res.json();
};

export const getLetter = async (id: string): Promise<Letter | null> => {
  const res = await fetch(`${BASE}/letters/${id}`, { headers: authHeaders() });
  if (!res.ok) return null;
  return res.json();
};

export const insertLetter = async (data: Omit<Letter, 'id' | 'created_at'>): Promise<Letter> => {
  const res = await fetch(`${BASE}/letters`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updateLetter = async (id: string, data: Partial<Letter>): Promise<Letter> => {
  const res = await fetch(`${BASE}/letters/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteLetter = async (id: string): Promise<void> => {
  await fetch(`${BASE}/letters/${id}`, { method: 'DELETE', headers: authHeaders() });
};

// ── File Upload ───────────────────────────────────────────

export const uploadFile = async (file: File, _documentId: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const token = getToken();
  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json();
  return data.file_url;
};

// ── Statuses ─────────────────────────────────────────────

export const getStatusesForLetter = async (letterId: string): Promise<LetterStatus[]> => {
  const res = await fetch(`${BASE}/letters/${letterId}/statuses`, { headers: authHeaders() });
  return res.json();
};

export const insertStatuses = async (
  items: Omit<LetterStatus, 'id' | 'signed_at'>[]
): Promise<LetterStatus[]> => {
  const letterId = items[0]?.letter_id;
  const res = await fetch(`${BASE}/letters/${letterId}/statuses`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(items),
  });
  return res.json();
};

export const getArchivedLetters = async (): Promise<Letter[]> => {
  const res = await fetch(`${BASE}/letters/archived`, { headers: authHeaders() });
  return res.json();
};

export const archiveLetter = async (id: string): Promise<void> => {
  await fetch(`${BASE}/letters/${id}/archive`, { method: 'PATCH', headers: authHeaders() });
};

export const unarchiveLetter = async (id: string): Promise<void> => {
  await fetch(`${BASE}/letters/${id}/unarchive`, { method: 'PATCH', headers: authHeaders() });
};

export const markEmailSent = async (id: string): Promise<Letter> => {
  const res = await fetch(`${BASE}/letters/${id}/email-sent`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  return res.json();
};

export const sendEmail = async (params: {
  to: string;
  subject: string;
  body: string;
  letterId?: string;
}): Promise<void> => {
  const res = await fetch(`${BASE}/send-email`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to send email');
  }
};

// ── Action Tickets ────────────────────────────────────────

export const getActionTickets = async (letterId: string): Promise<import('../types').ActionTicket[]> => {
  const res = await fetch(`${BASE}/letters/${letterId}/action-tickets`, { headers: authHeaders() });
  return res.json();
};

export const createActionTicket = async (
  letterId: string,
  data: { assigned_by: string; assigned_to: string; action_notes?: string; due_date?: string }
): Promise<import('../types').ActionTicket> => {
  const res = await fetch(`${BASE}/letters/${letterId}/action-tickets`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const completeActionTicket = async (ticketId: string): Promise<import('../types').ActionTicket> => {
  const res = await fetch(`${BASE}/action-tickets/${ticketId}/complete`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  return res.json();
};

// ── Activity Logs ─────────────────────────────────────────

export interface ActivityLog {
  id: string;
  letter_id: string;
  action: string;
  description: string;
  performed_by: string;
  created_at: string;
}

export const getActivityLogs = async (letterId: string): Promise<ActivityLog[]> => {
  const res = await fetch(`${BASE}/letters/${letterId}/activity-logs`, { headers: authHeaders() });
  return res.json();
};

export const getAllActivityLogs = async (params?: { limit?: number; action?: string }): Promise<(ActivityLog & { reference_number?: string; title?: string })[]> => {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.action) query.set('action', params.action);
  const res = await fetch(`${BASE}/activity-logs?${query}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
};
