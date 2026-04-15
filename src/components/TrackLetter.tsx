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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: '#004526' }}></div>
          <p className="mt-3 text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
          <p className="text-red-600">Document not found</p>
          <p className="text-gray-600 mt-2 text-sm">Please check the QR code and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-sm hover:opacity-80"
            style={{ color: '#004526' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </button>
        )}
        
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full" style={{ backgroundColor: '#DFF5E1' }}>
              <FileText className="w-8 h-8" style={{ color: '#004526' }} />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#004526' }}>Document Tracking</h1>
          <p className="text-gray-600 text-sm mb-1">{letter.title}</p>
          <p className="text-xs text-gray-500">Ref: {letter.reference_number}</p>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            What's your role?
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={onHandlerSelected}
              className="group bg-white border-2 rounded-lg p-5 hover:shadow-lg transition-all transform hover:scale-105"
              style={{ borderColor: '#9CAF88' }}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-full transition-colors" style={{ backgroundColor: '#DFF5E1' }}>
                  <User className="w-6 h-6" style={{ color: '#004526' }} />
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  I'm the Handler
                </h3>
                <p className="text-xs text-gray-600">
                  I created this document and manage the tracking system. I record who signed and what statuses were completed.
                </p>
                <span className="text-xs font-medium" style={{ color: '#004526' }}>
                  Requires PIN
                </span>
              </div>
            </button>

            <button
              onClick={onReceiverSelected}
              className="group bg-white border-2 rounded-lg p-5 hover:shadow-lg transition-all transform hover:scale-105"
              style={{ borderColor: '#9CAF88' }}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-full transition-colors" style={{ backgroundColor: '#DFF5E1' }}>
                  <Eye className="w-6 h-6" style={{ color: '#004526' }} />
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  I'm a Receiver/Signer
                </h3>
                <p className="text-xs text-gray-600">
                  I need to sign this document (Approved, Noted, or Reviewed). I want to see the tracking receipt.
                </p>
                <span className="text-xs font-medium" style={{ color: '#004526' }}>
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
