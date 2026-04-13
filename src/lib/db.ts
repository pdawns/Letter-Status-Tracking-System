import { Letter, LetterStatus } from '../types';

const LETTERS_KEY = 'dts_letters';
const STATUSES_KEY = 'dts_statuses';

const generateId = () => crypto.randomUUID();

// ── Letters ──────────────────────────────────────────────

const getAllLetters = (): Letter[] => {
  try {
    return JSON.parse(localStorage.getItem(LETTERS_KEY) || '[]');
  } catch { return []; }
};

export const getLetters = (): Letter[] =>
  getAllLetters().filter((l: Letter) => !l.archived);

const saveLetters = (letters: Letter[]) =>
  localStorage.setItem(LETTERS_KEY, JSON.stringify(letters));

export const getLetter = (id: string): Letter | null =>
  getAllLetters().find((l) => l.id === id) || null;

export const insertLetter = (data: Omit<Letter, 'id' | 'created_at'>): Letter => {
  const letter: Letter = { ...data, id: generateId(), created_at: new Date().toISOString() };
  const existing = getAllLetters();
  existing.push(letter);
  saveLetters(existing);
  return letter;
};

export const updateLetter = (id: string, data: Partial<Letter>): Letter | null => {
  const letters = getAllLetters();
  const idx = letters.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  letters[idx] = { ...letters[idx], ...data };
  saveLetters(letters);
  return letters[idx];
};

export const deleteLetter = (id: string): void => {
  saveLetters(getAllLetters().filter((l) => l.id !== id));
  saveStatuses(getStatuses().filter((s) => s.letter_id !== id));
};

export const archiveLetter = (id: string): void => {
  const letters = getAllLetters();
  const idx = letters.findIndex((l) => l.id === id);
  if (idx === -1) return;
  letters[idx] = { ...letters[idx], archived: true, archived_at: new Date().toISOString() };
  saveLetters(letters);
};

export const unarchiveLetter = (id: string): void => {
  const letters = getAllLetters();
  const idx = letters.findIndex((l) => l.id === id);
  if (idx === -1) return;
  letters[idx] = { ...letters[idx], archived: false, archived_at: undefined };
  saveLetters(letters);
};

export const getArchivedLetters = (): Letter[] =>
  getAllLetters().filter((l) => l.archived === true);

// ── Statuses ─────────────────────────────────────────────

export const getStatuses = (): LetterStatus[] => {
  try {
    return JSON.parse(localStorage.getItem(STATUSES_KEY) || '[]');
  } catch { return []; }
};

const saveStatuses = (statuses: LetterStatus[]) =>
  localStorage.setItem(STATUSES_KEY, JSON.stringify(statuses));

export const getStatusesForLetter = (letterId: string): LetterStatus[] =>
  getStatuses()
    .filter((s) => s.letter_id === letterId)
    .sort((a, b) => new Date(a.signed_at).getTime() - new Date(b.signed_at).getTime());

export const insertStatuses = (items: Omit<LetterStatus, 'id' | 'signed_at'>[]): LetterStatus[] => {
  const newStatuses = items.map((item) => ({
    ...item,
    id: generateId(),
    signed_at: new Date().toISOString(),
  }));
  saveStatuses([...getStatuses(), ...newStatuses]);
  return newStatuses;
};

// ── File Storage (base64 in localStorage) ────────────────

// localStorage has ~5MB limit; base64 encoding adds ~33% overhead
// Safe limit for a single file is ~1.5MB original size
const MAX_PREVIEW_SIZE = 1.5 * 1024 * 1024; // 1.5MB

export const uploadFile = async (file: File, _documentId: string): Promise<string> => {
  if (file.size > MAX_PREVIEW_SIZE) {
    throw new Error(
      `FILE_TOO_LARGE:${(file.size / (1024 * 1024)).toFixed(1)}MB`
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      try {
        // Test if it fits in localStorage
        localStorage.setItem('_size_test', result);
        localStorage.removeItem('_size_test');
        resolve(result);
      } catch {
        reject(new Error('FILE_TOO_LARGE:storage_full'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};
