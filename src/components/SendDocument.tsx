import { useState } from 'react';
import { Send, Search } from 'lucide-react';
import { getLetter, insertStatuses } from '../lib/api';
import { Letter } from '../types';

export default function SendDocument() {
  const [refNumber, setRefNumber] = useState('');
  const [letter, setLetter] = useState<Letter | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientOffice, setRecipientOffice] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotFound(false);
    setLetter(null);
    setSuccess(false);
    setLoading(true);
    try {
      // Search by reference number via all letters
      const res = await fetch(`/api/letters?ref=${encodeURIComponent(refNumber.trim())}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('dts_token')}` },
      });
      const letters: Letter[] = await res.json();
      const found = Array.isArray(letters)
        ? letters.find((l) => l.reference_number.toLowerCase() === refNumber.trim().toLowerCase())
        : null;
      if (found) {
        setLetter(found);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!letter) return;
    setLoading(true);
    try {
      await insertStatuses([
        {
          letter_id: letter.id,
          status_type: 'noted',
          signed_by: `${recipientName} (${recipientOffice}) — Sent by: ${localStorage.getItem('dts_username') || 'receiver'}`,
          notes: notes || 'Document sent',
        },
      ]);
      setSuccess(true);
      setLetter(null);
      setRefNumber('');
      setRecipientName('');
      setRecipientOffice('');
      setNotes('');
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 max-w-xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: '#004526' }}>Send Document</h1>
        <p className="text-gray-600 text-sm mt-1">Search a document by reference number and log its dispatch</p>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Document sent successfully and status logged.
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <input
          type="text"
          value={refNumber}
          onChange={(e) => setRefNumber(e.target.value)}
          placeholder="Reference number (e.g. DTS-2026-001)"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
          style={{ backgroundColor: '#004526' }}
        >
          <Search className="w-4 h-4" /> Search
        </button>
      </form>

      {notFound && (
        <p className="text-sm text-red-600">No document found with that reference number.</p>
      )}

      {letter && (
        <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
          <div className="mb-4">
            <p className="text-xs text-gray-500">Reference</p>
            <p className="font-semibold text-sm" style={{ color: '#004526' }}>{letter.reference_number}</p>
            <p className="text-sm text-gray-700 mt-1">{letter.title}</p>
            {letter.sender_office && (
              <p className="text-xs text-gray-500 mt-1">From: {letter.sender_office}</p>
            )}
          </div>

          <form onSubmit={handleSend} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Recipient Name</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                placeholder="Full name of recipient"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Recipient Office / Department</label>
              <input
                type="text"
                value={recipientOffice}
                onChange={(e) => setRecipientOffice(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                placeholder="Office or department"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 resize-none"
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: '#004526' }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Send className="w-4 h-4" /> Confirm Send</>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
