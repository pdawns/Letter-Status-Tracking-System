import { useState } from 'react';
import { Letter } from '../types';
import { MessageSquare, Mail, Copy, X, CheckCircle, ChevronDown } from 'lucide-react';
import { markEmailSent } from '../lib/api';

interface NotifySenderProps {
  letter: Letter;
  onClose: () => void;
  onEmailSent?: (updatedLetter: Letter) => void;
}

const SIR_RONALD = 'Ronald Jame D. Violon, CPA, REB, REA, MDMG';

export default function NotifySender({ letter, onClose, onEmailSent }: NotifySenderProps) {
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'received' | 'approved'>('received');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const date = new Date(letter.created_at).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const greeting = `Good day${letter.sender_name ? `, ${letter.sender_name}` : ''}!`;
  const closing = `Thank you.\n\n- Provincial Treasurer's Office\n  Province of Misamis Oriental`;

  const templates: Record<'received' | 'approved', { label: string; body: string }> = {
    received: {
      label: 'Document Received',
      body: `This is to inform you that your document titled "${letter.title}" (Reference No: ${letter.reference_number}) has been officially received by the Provincial Treasurer's Office, Province of Misamis Oriental on ${date}.`,
    },
    approved: {
      label: 'Document Approved',
      body: `This is to inform you that your document titled "${letter.title}" (Reference No: ${letter.reference_number}) has been officially approved by Sir ${SIR_RONALD} from Provincial Treasurer's Office, Province of Misamis Oriental on ${date}.`,
    },
  };

  const message = `${greeting}\n\n${templates[selectedTemplate].body}\n\n${closing}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSMS = () => {
    const phone = letter.sender_phone?.replace(/\s/g, '') || '';
    window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_blank');
  };

  const handleGoogleMessages = () => {
    navigator.clipboard.writeText(message);
    window.open('https://messages.google.com/web/conversations/new', '_blank');
  };

  const handleEmail = async () => {
    const subject = `${templates[selectedTemplate].label} - ${letter.reference_number}`;
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(message);
    window.open(`https://mail.google.com/mail/?view=cm&to=${letter.sender_email || ''}&su=${encodedSubject}&body=${encodedBody}`, '_blank');
    try {
      const updated = await markEmailSent(letter.id);
      onEmailSent?.(updated);
    } catch (_) {}
  };  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
      <div className="rounded-2xl w-full max-w-md flex flex-col max-h-[90vh]" style={{ background: 'rgba(0,40,18,0.88)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(156,175,136,0.2)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
        {/* Fixed header */}
        <div className="flex items-center justify-between p-5 pb-4 shrink-0" style={{ borderBottom: '1px solid rgba(156,175,136,0.15)' }}>
          <h2 className="text-base font-bold" style={{ color: '#DFF5E1' }}>Notify Sender</h2>
          <button onClick={onClose} className="hover:opacity-70 transition-opacity" style={{ color: 'rgba(156,175,136,0.7)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-5 pb-5 space-y-3 mt-4">

        {letter.email_sent_at && (
          <div className="flex items-center gap-2 text-xs rounded-xl px-3 py-2" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }}>
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Email already sent on {new Date(letter.email_sent_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        <div className="relative">
          <p className="text-xs font-medium mb-1" style={{ color: 'rgba(156,175,136,0.8)' }}>Select message type:</p>
          <button onClick={() => setDropdownOpen(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all"
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(156,175,136,0.25)', color: '#DFF5E1' }}>
            <span className="font-medium">{templates[selectedTemplate].label}</span>
            <ChevronDown className="w-4 h-4 transition-transform" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: '#9CAF88' }} />
          </button>
          {dropdownOpen && (
            <div className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden shadow-xl" style={{ background: 'rgba(0,35,15,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(156,175,136,0.2)' }}>
              {(Object.keys(templates) as Array<'received' | 'approved'>).map(key => (
                <button key={key} onClick={() => { setSelectedTemplate(key); setDropdownOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between"
                  style={{ color: selectedTemplate === key ? '#DFF5E1' : 'rgba(223,245,225,0.65)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(156,175,136,0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <div>
                    <p className="font-medium">{templates[key].label}</p>
                    <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'rgba(156,175,136,0.6)' }}>{templates[key].body.slice(0, 60)}…</p>
                  </div>
                  {selectedTemplate === key && <CheckCircle className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: '#9CAF88' }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message Preview */}
        <div className="rounded-xl p-3 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(156,175,136,0.15)', color: 'rgba(223,245,225,0.75)' }}>
          {message}
        </div>

        {(letter.sender_phone || letter.sender_email) && (
          <div className="text-xs space-y-1" style={{ color: 'rgba(156,175,136,0.7)' }}>
            {letter.sender_phone && <p>📱 {letter.sender_phone}</p>}
            {letter.sender_email && <p>✉️ {letter.sender_email}</p>}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <button onClick={handleCopy}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all active:scale-95"
            style={{ backgroundColor: '#004526' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#005c33'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#004526'}>
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Message to Clipboard'}
          </button>
          {letter.sender_phone && (
            <button onClick={handleSMS}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all active:scale-95"
              style={{ backgroundColor: '#16a34a' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}>
              <MessageSquare className="w-4 h-4" />
              Open in SMS App ({letter.sender_phone})
            </button>
          )}
          {letter.sender_phone && (
            <button onClick={handleGoogleMessages}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all active:scale-95"
              style={{ backgroundColor: '#1A73E8' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1558B0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1A73E8'}>
              <MessageSquare className="w-4 h-4" />
              Open Google Messages ({letter.sender_phone})
            </button>
          )}
          {letter.sender_email && (
            <button onClick={handleEmail}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all active:scale-95"
              style={{ backgroundColor: '#2563eb' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}>
              <Mail className="w-4 h-4" />
              Send via Gmail ({letter.sender_email})
            </button>
          )}
        </div>

        <p className="text-xs text-center" style={{ color: 'rgba(156,175,136,0.5)' }}>
          SMS opens your default messaging app. Google Messages copies the message and opens the web app. Gmail opens with the message pre-filled.
        </p>
        </div>
      </div>
    </div>
  );
}
