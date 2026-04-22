import { useState, useEffect } from 'react';
import { getLetter, getStatusesForLetter } from '../lib/api';
import { Letter } from '../types';
import { FileText, User, Eye, ArrowLeft } from 'lucide-react';

interface TrackLetterProps {
  letterId: string;
  onHandlerSelected: () => void;
  onReceiverSelected: () => void;
  onBack?: () => void;
}

export default function TrackLetter({
  letterId,
  onHandlerSelected,
  onReceiverSelected,
  onBack,
}: TrackLetterProps) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLetter();
  }, [letterId]);

  const fetchLetter = async () => {
    try {
      const data = await getLetter(letterId);
      if (!data) throw new Error('Not found');

      // Check if all required statuses are completed — if so, skip role selection
      const required = (data.required_statuses || 'noted,approved,reviewed')
        .split(',').map((s) => s.trim()).filter(Boolean);
      const statuses = await getStatusesForLetter(letterId);
      const completed = statuses.map((s) => s.status_type);
      const allDone = required.every((r) => completed.includes(r as any));

      if (allDone) {
        onReceiverSelected();
        return;
      }

      setLetter(data);
    } catch (err) {
      console.error('Error fetching letter:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--accent)' }}></div>
          <p className="mt-3 text-sm" style={{ color: 'rgba(var(--accent-rgb),0.8)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="rounded-2xl p-6 max-w-md text-center" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(var(--accent-rgb),0.2)', boxShadow: '0 4px 24px var(--input-bg)' }}>
          <p style={{ color: '#fca5a5' }}>Document not found</p>
          <p className="mt-2 text-sm" style={{ color: 'rgba(var(--accent-text-rgb),0.65)' }}>Please check the QR code and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex items-center justify-center">
      <div className="rounded-2xl p-6 max-w-2xl w-full" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(var(--accent-rgb),0.2)', boxShadow: '0 4px 24px var(--input-bg)' }}>
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-sm hover:opacity-80"
            style={{ color: 'var(--accent)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </button>
        )}
        
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full" style={{ background: 'rgba(var(--accent-rgb),0.15)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
              <FileText className="w-8 h-8" style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--accent-text)' }}>Document Tracking</h1>
          <p className="text-sm mb-1" style={{ color: 'rgba(var(--accent-text-rgb),0.65)' }}>{letter.title}</p>
          <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>Ref: {letter.reference_number}</p>
        </div>

        <div className="pt-6" style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.15)' }}>
          <h2 className="text-lg font-semibold mb-4 text-center" style={{ color: 'var(--accent-text)' }}>
            What's your role?
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={onHandlerSelected}
              className="group rounded-xl p-5 hover:shadow-lg transition-all transform hover:scale-105"
              style={{ background: 'var(--input-bg)', border: '2px solid rgba(var(--accent-rgb),0.3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--input-bg)')}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-full" style={{ background: 'rgba(var(--accent-rgb),0.15)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
                  <User className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                </div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--accent-text)' }}>
                  I'm the Handler
                </h3>
                <p className="text-xs" style={{ color: 'rgba(var(--accent-text-rgb),0.65)' }}>
                  I created this document and manage the tracking system. I record who signed and what statuses were completed.
                </p>
                <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                  Requires PIN
                </span>
              </div>
            </button>

            <button
              onClick={onReceiverSelected}
              className="group rounded-xl p-5 hover:shadow-lg transition-all transform hover:scale-105"
              style={{ background: 'var(--input-bg)', border: '2px solid rgba(var(--accent-rgb),0.3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--input-bg)')}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-full" style={{ background: 'rgba(var(--accent-rgb),0.15)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
                  <Eye className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                </div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--accent-text)' }}>
                  I'm a Receiver/Signer
                </h3>
                <p className="text-xs" style={{ color: 'rgba(var(--accent-text-rgb),0.65)' }}>
                  I need to sign this document (Approved, Noted, or Reviewed). I want to see the tracking receipt.
                </p>
                <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                  No PIN required
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
