import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getLetter } from '../lib/api';
import { Letter } from '../types';
import { FileText, Download, ArrowLeft, Eye } from 'lucide-react';

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
      const data = getLetter(letterId);
      if (!data) throw new Error('Not found');
      setLetter(data);
    } catch (err) {
      console.error('Error fetching letter:', err);
    } finally {
      setLoading(false);
    }
  };

  const trackingUrl = `${window.location.origin}/?track=${letterId}`;

  const handlePrint = () => {
    window.print();
  };

  // Convert base64 data URL to a Blob URL for safe browser opening/downloading
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  };

  const handleViewDocument = () => {
    if (!letter?.file_url) return;
    const blob = dataUrlToBlob(letter.file_url);
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    // Revoke after a short delay to allow the tab to load
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  };

  const handleDownload = () => {
    if (!letter?.file_url) return;
    const blob = dataUrlToBlob(letter.file_url);
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = letter.file_name || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#004526' }}></div>
        <p className="mt-4 text-gray-600">Loading letter...</p>
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-red-600">Letter not found</p>
        <button
          onClick={onBack}
          className="mt-4 hover:underline"
          style={{ color: '#004526' }}
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 print:hidden"
        style={{ color: '#004526' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </button>

      <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none">
        <div className="flex items-center justify-between mb-6 print:mb-8">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8" style={{ color: '#004526' }} />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Letter Created</h1>
              <p className="text-gray-600">Reference: {letter.reference_number}</p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg print:hidden transition-colors"
            style={{ backgroundColor: '#004526' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#9CAF88')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#004526')}
          >
            <Download className="w-4 h-4" />
            Print/Save
          </button>
        </div>

        <div className="border-t border-gray-200 pt-6 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-gray-500">Type</h2>
            <p className="text-lg text-gray-900 mt-1 capitalize">{letter.document_type || 'Letter'}</p>
          </div>

          <div>
            <h2 className="text-sm font-medium text-gray-500">Title</h2>
            <p className="text-lg text-gray-900 mt-1">{letter.title}</p>
          </div>

          {letter.document_subject && (
            <div>
              <h2 className="text-sm font-medium text-gray-500">Subject</h2>
              <p className="text-gray-900 mt-1">{letter.document_subject}</p>
            </div>
          )}

          {letter.file_url && (
            <div>
              <h2 className="text-sm font-medium text-gray-500">Scanned Document</h2>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={handleViewDocument}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View Document
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-medium text-gray-500">Created</h2>
            <p className="text-gray-900 mt-1">
              {new Date(letter.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Tracking QR Code
            </h2>
            <p className="text-gray-600 mb-6">
              Scan this QR code to track or update the letter status
            </p>

            <div className="flex justify-center mb-6">
              <div className="bg-white p-4 rounded-lg border-4 border-gray-200">
                <QRCodeSVG value={trackingUrl} size={256} level="H" />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 font-mono break-all">
                {trackingUrl}
              </p>
            </div>

            <div className="mt-6 text-sm text-gray-600 print:block">
              <p className="font-medium">How to use:</p>
              <ol className="mt-2 space-y-1 text-left max-w-md mx-auto">
                <li>1. Print this page with the QR code</li>
                <li>2. Attach it to your physical document</li>
                <li>3. Scan the QR code to track or update status</li>
                <li>4. Handlers need the PIN; receivers can view the receipt</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
