import { useState } from 'react';
import { Letter } from '../types';
import { MessageSquare, Mail, Copy, X, CheckCircle } from 'lucide-react';

interface NotifySenderProps {
  letter: Letter;
  onClose: () => void;
}

export default function NotifySender({ letter, onClose }: NotifySenderProps) {
  const [copied, setCopied] = useState(false);

  const date = new Date(letter.created_at).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const message = `Good day${letter.sender_name ? `, ${letter.sender_name}` : ''}!\n\nThis is to inform you that your document titled "${letter.title}" (Reference No: ${letter.reference_number}) has been officially received by the Provincial Treasurer's Office, Province of Misamis Oriental on ${date}.\n\nThank you.\n\n- Provincial Treasurer's Office\n  Province of Misamis Oriental`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSMS = () => {
    const phone = letter.sender_phone?.replace(/\s/g, '') || '';
    const encoded = encodeURIComponent(message);
    window.open(`sms:${phone}?body=${encoded}`, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Document Received - ${letter.reference_number}`);
    const body = encodeURIComponent(message);
    const email = letter.sender_email || '';
    window.open(`https://mail.google.com/mail/?view=cm&to=${email}&su=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: '#004526' }}>Notify Sender</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-700 whitespace-pre-wrap border border-gray-200">
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

          <button
            onClick={handleSMS}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Open in SMS App {letter.sender_phone ? `(${letter.sender_phone})` : ''}
          </button>

          <button
            onClick={handleEmail}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Send via Gmail {letter.sender_email ? `(${letter.sender_email})` : ''}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          SMS and Gmail options open your device's app with the message pre-filled.
        </p>
      </div>
    </div>
  );
}
