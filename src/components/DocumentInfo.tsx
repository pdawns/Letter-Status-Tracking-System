import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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
      const { data, error } = await supabase
        .from('letters')
        .select('*')
        .eq('id', letterId)
        .single();

      if (error) throw error;
      setDocument(data);
    } catch (err) {
      console.error('Error fetching document:', err);
    } finally {
      setLoading(false);
    }
  };

  const viewDocument = () => {
    if (document?.file_url) {
      window.open(document.file_url, '_blank');
    }
  };

  const downloadDocument = async () => {
    if (document?.file_url) {
      try {
        const response = await fetch(document.file_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = document.file_name || 'document';
        window.document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(link);
      } catch (err) {
        console.error('Error downloading document:', err);
        alert('Failed to download document');
      }
    }
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

            {document.file_name && (
              <div className="p-3 rounded-lg col-span-2" style={{ backgroundColor: '#DFF5E1' }}>
                <p className="text-xs text-gray-600 mb-1">File Name</p>
                <p className="text-sm font-medium break-all" style={{ color: '#004526' }}>{document.file_name}</p>
              </div>
            )}
          </div>

          {/* Document Actions & Preview */}
          {document.file_url && (
            <div className="border-t pt-4">
              <h3 className="text-base font-semibold mb-3" style={{ color: '#004526' }}>Document File</h3>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={viewDocument}
                  className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                  style={{ backgroundColor: '#004526' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#004526'}
                >
                  <Eye className="w-4 h-4" />
                  View Document
                </button>
                <button
                  onClick={downloadDocument}
                  className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                  style={{ backgroundColor: '#004526' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#004526'}
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>

              {/* Document Preview */}
              <div className="bg-gray-100 rounded-lg overflow-hidden">
                <iframe
                  src={document.file_url}
                  className="w-full h-96 border-0"
                  title="Document Preview"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
