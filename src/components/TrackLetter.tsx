import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Letter } from '../types';
import { FileText, User, Eye, ArrowLeft, FileImage, File, Download } from 'lucide-react';

interface TrackLetterProps {
  letterId: string;
  onHandlerSelected: () => void;
  onReceiverSelected: () => void;
  onBack?: () => void;
}

function getFileType(fileName?: string): 'image' | 'pdf' | 'docx' | 'other' {
  if (!fileName) return 'other';
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext ?? '')) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext ?? '')) return 'docx';
  return 'other';
}

function FileViewer({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const type = getFileType(fileName);
  const FileIcon = type === 'image' ? FileImage : File;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* File name bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded" style={{ backgroundColor: '#DFF5E1' }}>
            <FileIcon className="w-4 h-4" style={{ color: '#004526' }} />
          </div>
          <span className="text-sm font-medium text-gray-700 truncate">{fileName}</span>
        </div>
        <a
          href={fileUrl}
          download={fileName}
          className="ml-2 shrink-0 flex items-center gap-1 text-xs text-white px-2.5 py-1.5 rounded-lg transition-colors"
          style={{ backgroundColor: '#004526' }}
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </a>
      </div>

      {/* Inline viewer */}
      {type === 'image' && (
        <img
          src={fileUrl}
          alt={fileName}
          className="w-full rounded-lg object-contain max-h-[500px] bg-gray-50"
        />
      )}

      {type === 'pdf' && (
        <iframe
          src={fileUrl}
          className="w-full rounded-lg"
          style={{ height: '500px' }}
          title={fileName}
        />
      )}

      {type === 'docx' && (
        <iframe
          src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
          className="w-full rounded-lg"
          style={{ height: '500px' }}
          title={fileName}
        />
      )}

      {type === 'other' && (
        <div className="rounded-lg p-6 text-center" style={{ backgroundColor: '#DFF5E1' }}>
          <File className="w-10 h-10 mx-auto mb-2" style={{ color: '#004526' }} />
          <p className="text-sm text-gray-600">Preview not available.</p>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline mt-1 block"
            style={{ color: '#004526' }}
          >
            Open file in new tab
          </a>
        </div>
      )}
    </div>
  );
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
      <div className="bg-white rounded-lg shadow p-6 max-w-md">
        <p className="text-red-600 font-medium">Document not found</p>
        <p className="text-gray-500 mt-1 text-sm">Please check the QR code and try again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm hover:opacity-80"
          style={{ color: '#004526' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </button>
      )}

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#004526' }}>Document Tracking</h1>
        <p className="text-gray-500 text-sm mt-0.5">Ref: {letter.reference_number}</p>
      </div>

      {/* Document info */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: '#DFF5E1' }}>
            <FileText className="w-5 h-5" style={{ color: '#004526' }} />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{letter.title}</p>
            {letter.document_subject && (
              <p className="text-xs text-gray-500 mt-0.5">{letter.document_subject}</p>
            )}
          </div>
        </div>
      </div>

      {/* Uploaded document — shown immediately, no toggle */}
      {letter.file_url && letter.file_name && (
        <FileViewer fileUrl={letter.file_url} fileName={letter.file_name} />
      )}

      {/* Role selection */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">What's your role?</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <button
            onClick={onHandlerSelected}
            className="border-2 rounded-lg p-4 hover:shadow-md transition-all text-left"
            style={{ borderColor: '#9CAF88' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full" style={{ backgroundColor: '#DFF5E1' }}>
                <User className="w-5 h-5" style={{ color: '#004526' }} />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">I'm the Handler</h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              I created this document and manage the tracking system.
            </p>
            <span className="text-xs font-medium mt-2 block" style={{ color: '#004526' }}>
              Requires PIN
            </span>
          </button>

          <button
            onClick={onReceiverSelected}
            className="border-2 rounded-lg p-4 hover:shadow-md transition-all text-left"
            style={{ borderColor: '#9CAF88' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full" style={{ backgroundColor: '#DFF5E1' }}>
                <Eye className="w-5 h-5" style={{ color: '#004526' }} />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">I'm a Receiver/Signer</h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              I need to sign this document or view the tracking receipt.
            </p>
            <span className="text-xs font-medium mt-2 block" style={{ color: '#004526' }}>
              No PIN required
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
