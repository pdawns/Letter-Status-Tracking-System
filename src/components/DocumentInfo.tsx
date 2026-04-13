import { useState, useEffect } from 'react';
import { getLetter } from '../lib/api';
import { Letter } from '../types';
import { ArrowLeft, FileText, Calendar, Tag, Download, Eye, Loader } from 'lucide-react';

interface DocumentInfoProps {
  letterId: string;
  onBack: () => void;
}

export default function DocumentInfo({ letterId, onBack }: DocumentInfoProps) {
  const [document, setDocument] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocument();
  }, [letterId]);

  const fetchDocument = async () => {
    try {
      const data = getLetter(letterId);
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
    const blob = dataUrlToBlob(document.file_url);
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  };

  const downloadDocument = async () => {
    if (!document?.file_url) return;
    const blob = dataUrlToBlob(document.file_url);
    const blobUrl = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = blobUrl;
    link.download = document.file_name || 'document';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  // Convert base64 data URL to Blob for safe browser open/download
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <p className="text-gray-600">Document not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm hover:opacity-80"
        style={{ color: '#004526' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Library
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

        {/* Document Information */}
        <div className="p-4">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: '#004526' }}>
            <FileText className="w-4 h-4" style={{ color: '#004526' }} />
            Document Information
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#DFF5E1' }}>
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Document Type
              </p>
              <p className="text-sm font-medium capitalize" style={{ color: '#004526' }}>
                {document.document_type || 'N/A'}
              </p>
            </div>

            <div className="p-3 rounded-lg" style={{ backgroundColor: '#DFF5E1' }}>
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Created Date
              </p>
              <p className="text-sm font-medium" style={{ color: '#004526' }}>
                {new Date(document.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
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

            {document.description && (
              <div className="p-3 rounded-lg col-span-2" style={{ backgroundColor: '#DFF5E1' }}>
                <p className="text-xs text-gray-600 mb-1">Description</p>
                <p className="text-sm" style={{ color: '#004526' }}>{document.description}</p>
              </div>
            )}

          </div>

          {/* Print Preview Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: '#004526' }}>
                <Eye className="w-4 h-4" />
                Print Preview
              </h3>
              {document.file_url && (
                <div className="flex gap-2">
                  <button
                    onClick={viewDocument}
                    className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg transition-colors text-xs"
                    style={{ backgroundColor: '#004526' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#004526'}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Open
                  </button>
                  <button
                    onClick={downloadDocument}
                    className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg transition-colors text-xs"
                    style={{ backgroundColor: '#004526' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#004526'}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              )}
            </div>

            {/* File name badge */}
            {document.file_name && (
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {document.file_name}
              </p>
            )}

            {/* Preview frame */}
            <div className="rounded-lg overflow-hidden border border-gray-200 shadow-inner bg-gray-200 p-3">
              <div className="bg-white shadow-lg rounded mx-auto overflow-hidden" style={{ minHeight: '500px' }}>
                {document.file_url ? (
                  document.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || document.file_url.startsWith('data:image/') ? (
                    <img
                      src={document.file_url}
                      alt={document.file_name || 'Document'}
                      className="w-full h-auto object-contain"
                    />
                  ) : (
                    <iframe
                      src={document.file_url}
                      className="w-full border-0"
                      style={{ height: '600px' }}
                      title="Print Preview"
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400">
                    <FileText className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">No preview available</p>
                    <p className="text-xs mt-1 opacity-70">The file could not be loaded for preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
