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

  const getDocumentIcon = (type: string | undefined) => {
    switch (type) {
      case 'certificate':
        return '🎓';
      case 'memo':
        return '📝';
      case 'report':
        return '📊';
      default:
        return '📄';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-4 py-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <p className="text-gray-600">Document not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-4 py-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </button>

        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 sm:p-8 text-white">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{getDocumentIcon(document.document_type)}</span>
              <div>
                <p className="text-sm opacity-90">{document.reference_number}</p>
                <h1 className="text-2xl sm:text-3xl font-bold">{document.title}</h1>
              </div>
            </div>
          </div>

          {/* Document Information */}
          <div className="p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Document Information
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Document Type
                  </p>
                  <p className="font-medium text-gray-900 capitalize">
                    {document.document_type || 'N/A'}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Created Date
                  </p>
                  <p className="font-medium text-gray-900">
                    {new Date(document.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {document.document_subject && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Subject</p>
                  <p className="font-medium text-gray-900">{document.document_subject}</p>
                </div>
              )}

              {document.description && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Description</p>
                  <p className="text-gray-900">{document.description}</p>
                </div>
              )}

              {document.file_name && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">File Name</p>
                  <p className="font-medium text-gray-900">{document.file_name}</p>
                </div>
              )}
            </div>

            {/* Document Actions */}
            {document.file_url && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Document File</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={viewDocument}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Eye className="w-5 h-5" />
                    View Document
                  </button>
                  <button
                    onClick={downloadDocument}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Download Document
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
