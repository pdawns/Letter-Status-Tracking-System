import { useState } from 'react';
import { Send, Search, FileText, Building2, User } from 'lucide-react';
import { getLetters, insertStatuses, updateLetter } from '../lib/api';
import { Letter } from '../types';

export default function SendDocument() {
  const [refNumber, setRefNumber] = useState('');
  const [letter, setLetter] = useState<Letter | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientOffice, setRecipientOffice] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotFound(false);
    setLetter(null);
    setSuccess(false);
    setLoading(true);
    try {
      const letters = await getLetters();
      const found = letters.find(
        (l) => l.reference_number.toLowerCase() === refNumber.trim().toLowerCase()
      );
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
    setSending(true);
    try {
      const sender = localStorage.getItem('dts_username') || 'staff';
      const senderLabel = sender === 'staff' ? "Provincial Treasurer's Office" : sender;
      await insertStatuses([
        {
          letter_id: letter.id,
          status_type: 'noted',
          signed_by: `Sent by: ${senderLabel} → ${recipientName} (${recipientOffice})`,
          notes: notes || 'Document forwarded/sent',
        },
      ]);
      // Record the sent timestamp on the letter
      await updateLetter(letter.id, { sent_at: new Date().toISOString() });
      setSuccess(true);
      setLetter(null);
      setRefNumber('');
      setRecipientName('');
      setRecipientOffice('');
      setNotes('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-5 max-w-xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: '#DFF5E1' }}>Send Document</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(156,175,136,0.8)' }}>Search a document by reference number and log its dispatch</p>
      </div>

      {success && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }}>
          Document sent successfully and status logged.
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <input type="text" value={refNumber} onChange={(e) => { setRefNumber(e.target.value); setNotFound(false); }}
          placeholder="Enter reference number (e.g. DTS-2026-001)"
          className="flex-1 px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-green-600"
          style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(156,175,136,0.2)', color: '#DFF5E1' }}
          required />
        <button type="submit" disabled={loading}
          className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-60 transition-all active:scale-95"
          style={{ backgroundColor: '#004526' }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#005c33')}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#004526')}>
          {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Search className="w-4 h-4" /> Search</>}
        </button>
      </form>

      {notFound && (
        <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
          No document found with reference number "<span className="font-medium">{refNumber}</span>".
        </div>
      )}

      {letter && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(0,45,20,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(156,175,136,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
          {/* Document info header */}
          <div className="px-5 py-4" style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(156,175,136,0.15)' }}>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl mt-0.5" style={{ background: 'rgba(156,175,136,0.15)', border: '1px solid rgba(156,175,136,0.25)' }}>
                <FileText className="w-5 h-5" style={{ color: '#9CAF88' }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: 'rgba(156,175,136,0.65)' }}>Reference</p>
                <p className="font-bold text-sm" style={{ color: '#DFF5E1' }}>{letter.reference_number}</p>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(223,245,225,0.75)' }}>{letter.title}</p>
                {letter.document_type && (
                  <span className="inline-block mt-1 text-xs rounded-full px-2 py-0.5 font-medium capitalize" style={{ background: 'rgba(156,175,136,0.15)', color: '#9CAF88', border: '1px solid rgba(156,175,136,0.25)' }}>
                    {letter.document_type}
                  </span>
                )}
                {letter.sender_office && (
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'rgba(156,175,136,0.7)' }}>
                    <Building2 className="w-3 h-3" /> {letter.sender_office}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Send form */}
          <form onSubmit={handleSend} className="px-5 py-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(156,175,136,0.7)' }}>Send To</p>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(156,175,136,0.85)' }}>Recipient Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'rgba(156,175,136,0.5)' }} />
                <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-none"
                  style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(156,175,136,0.2)', color: '#DFF5E1' }}
                  placeholder="Full name of recipient" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(156,175,136,0.85)' }}>Office / Department</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'rgba(156,175,136,0.5)' }} />
                <input type="text" value={recipientOffice} onChange={(e) => setRecipientOffice(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-none"
                  style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(156,175,136,0.2)', color: '#DFF5E1' }}
                  placeholder="Office or department" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(156,175,136,0.85)' }}>Notes <span style={{ color: 'rgba(156,175,136,0.5)', fontWeight: 400 }}>(optional)</span></label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl resize-none focus:outline-none"
                style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(156,175,136,0.2)', color: '#DFF5E1' }}
                rows={2} placeholder="Additional notes..." />
            </div>
            <button type="submit" disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all active:scale-95"
              style={{ backgroundColor: '#004526' }}
              onMouseEnter={(e) => !sending && (e.currentTarget.style.backgroundColor = '#005c33')}
              onMouseLeave={(e) => !sending && (e.currentTarget.style.backgroundColor = '#004526')}>
              {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> Confirm Send</>}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
