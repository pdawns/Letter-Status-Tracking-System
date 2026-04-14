import { useState, useEffect } from 'react';
import { getLetter } from '../lib/api';
import { Letter } from '../types';
import { ArrowLeft, FileText, Calendar, Tag, Download, Eye, Loader, Bell } from 'lucide-react';
import NotifySender from './NotifySender';

interface DocumentInfoProps {
  letterId: string;
  onBack: () => void;
}

export default function DocumentInfo({ letterId, onBack }: DocumentInfoProps) {
  const [document, setDocument] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotify, setShowNotify] = useState(false);

  useEffect(() => { fetchDocument(); }, [letterId]);

  const fetchDocument = async () => {
    try {
      const data = await getLetter(letterId);
      if (!data) throw new Error('Not found');
      setDocument(data);
    } catch (err) {
      console.error('Error fetching document:', err);
    } finally {
      setLoading(false);
    }
  };

  const viewDocument = () => {
    if (!document?.file_url) return;
    const isOffice = document.file_url.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i);
    if (isOffice) {
      window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(document.file_url)}&embedded=false`, '_blank');
    } else {
      window.open(document.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  const downloadDocument = () => {
    if (!document?.file_url) return;
    const link = window.document.createElement('a');
    link.href = document.file_url;
    link.download = document.file_name || 'document';
    link.target = '_blank';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-8 h-8 animate-spin" style={{ color: '#004526' }} />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm" style={{ color: '#004526' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <p className="text-gray-600">Document not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm hover:opacity-80" style={{ color: '#004526' }}>
        <ArrowLeft className="w-4 h-4" /> Back to Library
      </button>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 text-white" style={{ background: 'linear-gradient(to right, #004526, #9CAF88)' }}>
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8" />
            <div>
              <p className="text-xs opacity-90">{document.reference_number}</p>
              <h1 className="text-xl font-bold">{document.title}</h1>
            </div>
          </div>
        </div>

        <div className="p-4">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: '#004526' }}>
            <FileText className="w-4 h-4" /> Document Information
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#DFF5E1' }}>
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Document Type</p>
              <p className="text-sm font-medium capitalize" style={{ color: '#004526' }}>{document.document_type || 'N/A'}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#DFF5E1' }}>
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Created Date</p>
              <p className="text-sm font-medium" style={{ color: '#004526' }}>
                {new Date(document.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="p-3 rounded-lg col-span-2" style={{ backgroundColor: '#DFF5E1' }}>
              <p className="text-xs text-gray-600 mb-1">Reference Number</p>
              <p className="text-sm font-medium" style={{ color: '#004526' }}>{document.reference_number}</p>
            </div>
            {document.document_subject && (
              <div className="p-3 rounded-lg col-span-2" style={{ backgroundColor: '#DFF5E1' }}>
                <p className="text-xs text-gray-600 mb-1">Subject</p>
                <p className="text-sm font-medium" style={{ color: '#004526' }}>{document.document_subject}</p>
              </div>
            )}
            {document.sender_name && (
              <div className="p-3 rounded-lg col-span-2" style={{ backgroundColor: '#DFF5E1' }}>
                <p className="text-xs text-gray-600 mb-1">Sender</p>
                <p className="text-sm font-medium" style={{ color: '#004526' }}>
                  {document.sender_name}{document.sender_office ? ` — ${document.sender_office}` : ''}
                </p>
                {document.sender_phone && <p className="text-xs text-gray-500 mt-0.5">📱 {document.sender_phone}</p>}
                {document.sender_email && <p className="text-xs text-gray-500">✉️ {document.sender_email}</p>}
              </div>
            )}
          </div>

          {/* Actions */}
          {document.file_url && (
            <div className="border-t pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={viewDocument}
                  className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg transition-colors text-xs"
                  style={{ backgroundColor: '#004526' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#004526'}
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button
                  onClick={downloadDocument}
                  className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg transition-colors text-xs"
                  style={{ backgroundColor: '#004526' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#004526'}
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                {(document.sender_phone || document.sender_email) && (
                  <button
                    onClick={() => setShowNotify(true)}
                    className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg transition-colors text-xs"
                    style={{ backgroundColor: '#9CAF88' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#004526'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
                  >
                    <Bell className="w-3.5 h-3.5" /> Notify Sender
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showNotify && <NotifySender letter={document} onClose={() => setShowNotify(false)} />}
    </div>
  );
}
