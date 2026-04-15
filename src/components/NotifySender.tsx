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
    const subject = encodeURIComponent(`${templates[selectedTemplate].label} - ${letter.reference_number}`);
    const body = encodeURIComponent(message);
    window.open(`https://mail.google.com/mail/?view=cm&to=${letter.sender_email || ''}&su=${subject}&body=${body}`, '_blank');
    try {
      const updated = await markEmailSent(letter.id);
      onEmailSent?.(updated);
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Fixed header */}
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-base font-bold" style={{ color: '#004526' }}>Notify Sender</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 pb-6 space-y-3">

        {/* Email already sent badge */}
        {letter.email_sent_at && (
          <div className="mb-3 flex items-center gap-2 text-xs rounded-lg px-3 py-2" style={{ backgroundColor: '#DFF5E1', color: '#004526' }}>
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Email already sent on {new Date(letter.email_sent_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {/* Message template selector */}
        <div className="mb-3 relative">
          <p className="text-xs font-medium text-gray-600 mb-1">Select message type:</p>
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 border-2 rounded-lg text-sm transition-all"
            style={{ borderColor: '#9CAF88', color: '#004526' }}
          >
            <span className="font-medium">{templates[selectedTemplate].label}</span>
            <ChevronDown className="w-4 h-4 transition-transform" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: '#9CAF88' }} />
          </button>
          {dropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
              {(Object.keys(templates) as Array<'received' | 'approved'>).map(key => (
                <button
                  key={key}
                  onClick={() => { setSelectedTemplate(key); setDropdownOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-green-50 transition-colors flex items-center justify-between"
                  style={{ color: selectedTemplate === key ? '#004526' : '#374151' }}
                >
                  <div>
                    <p className="font-medium">{templates[key].label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{templates[key].body.slice(0, 60)}…</p>
                  </div>
                  {selectedTemplate === key && <CheckCircle className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: '#9CAF88' }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message Preview */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-700 whitespace-pre-wrap border border-gray-200 max-h-40 overflow-y-auto">
          {message}
        </div>

        {/* Sender Info */}
        {(letter.sender_phone || letter.sender_email) && (
          <div className="mb-4 text-xs text-gray-500 space-y-1">
            {letter.sender_phone && <p>📱 {letter.sender_phone}</p>}
            {letter.sender_email && <p>✉️ {letter.sender_email}</p>}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: '#004526' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#004526'}
          >
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Message to Clipboard'}
          </button>

          {letter.sender_phone && (
            <button
              onClick={handleSMS}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Open in SMS App ({letter.sender_phone})
            </button>
          )}

          {letter.sender_phone && (
            <button
              onClick={handleGoogleMessages}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: '#1A73E8' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1558B0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1A73E8'}
            >
              <MessageSquare className="w-4 h-4" />
              Open Google Messages ({letter.sender_phone})
            </button>
          )}

          {letter.sender_email && (
            <button
              onClick={handleEmail}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Send via Gmail ({letter.sender_email})
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          SMS opens your default messaging app. Google Messages copies the message and opens the web app. Gmail opens with the message pre-filled.
        </p>
        </div>{/* end scrollable */}
      </div>
    </div>
  );
}
