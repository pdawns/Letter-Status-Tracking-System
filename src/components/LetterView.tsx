import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { Letter } from '../types';
import { FileText, Printer, ArrowLeft, Eye, Download } from 'lucide-react';

interface LetterViewProps {
  letterId: string;
  onBack: () => void;
}

export default function LetterView({ letterId, onBack }: LetterViewProps) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLetter();
  }, [letterId]);

  const fetchLetter = async () => {
    try {
      const { data, error } = await supabase
        .from('letters')
        .select('*')
        .eq('id', letterId)
        .single();
      if (error) throw error;
      setLetter(data);
    } catch (err) {
      console.error('Error fetching letter:', err);
    } finally {
      setLoading(false);
    }
  };

  const trackingUrl = `${window.location.origin}?track=${letterId}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: '#004526' }} />
          <p className="mt-3 text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="max-w-2xl">
        <p className="text-red-600">Letter not found</p>
        <button onClick={onBack} className="mt-3 text-sm hover:underline" style={{ color: '#004526' }}>
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm hover:opacity-80 print:hidden"
        style={{ color: '#004526' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </button>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#004526' }}>Document Created</h1>
          <p className="text-gray-600 text-sm mt-1">Ref: {letter.reference_number}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="print:hidden flex items-center gap-2 text-sm text-white px-4 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: '#004526' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#9CAF88')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#004526')}
        >
          <Printer className="w-4 h-4" />
          Print / Save
        </button>
      </div>

      {/* Document details card */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#DFF5E1' }}>
            <FileText className="w-5 h-5" style={{ color: '#004526' }} />
          </div>
          <h2 className="text-sm font-semibold text-gray-700">Document Details</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">Document Type</p>
            <p className="font-medium text-gray-900 capitalize">{letter.document_type || 'Letter'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Reference No.</p>
            <p className="font-medium text-gray-900">{letter.reference_number}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-500">Title</p>
            <p className="font-medium text-gray-900">{letter.title}</p>
          </div>
          {letter.document_subject && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500">Subject</p>
              <p className="text-gray-900">{letter.document_subject}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500">Date Created</p>
            <p className="font-medium text-gray-900">{new Date(letter.created_at).toLocaleString()}</p>
          </div>
        </div>

        {letter.file_url && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Attached Document</p>
            <div className="flex items-center gap-2">
              <a
                href={letter.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: '#004526' }}
              >
                <Eye className="w-3.5 h-3.5" />
                View
              </a>
              <a
                href={letter.file_url}
                download={letter.file_name}
                className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded-lg bg-gray-500 hover:bg-gray-600 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </a>
              <span className="text-xs text-gray-500 truncate">{letter.file_name}</span>
            </div>
          </div>
        )}
      </div>

      {/* QR Code card */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Tracking QR Code</h2>
        <p className="text-xs text-gray-500 mb-4">
          Print and attach this QR code to the physical document for tracking.
        </p>

        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-lg border-2" style={{ borderColor: '#9CAF88' }}>
            <QRCodeSVG value={trackingUrl} size={200} level="H" />
          </div>

          <div className="w-full rounded-lg px-3 py-2 text-xs font-mono break-all text-gray-600" style={{ backgroundColor: '#DFF5E1' }}>
            {trackingUrl}
          </div>

          <ol className="w-full text-xs text-gray-500 space-y-1 list-decimal list-inside">
            <li>Print this page and attach the QR code to the physical document.</li>
            <li>Scan the QR code to track or update the document status.</li>
            <li>Handlers need the PIN; receivers can view the receipt directly.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
