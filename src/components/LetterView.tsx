import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
          className="mt-4 text-blue-600 hover:underline"
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
        className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 print:hidden"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </button>

      <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none">
        <div className="flex items-center justify-between mb-6 print:mb-8">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Letter Created</h1>
              <p className="text-gray-600">Reference: {letter.reference_number}</p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 print:hidden"
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
                <a
                  href={letter.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View Document
                </a>
                <a
                  href={letter.file_url}
                  download={letter.file_name}
                  className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
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
