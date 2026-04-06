import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Letter } from '../types';
import { ArrowLeft, FileText, Loader } from 'lucide-react';

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

  // Parse description field for document details
  const parseDescription = (description?: string) => {
    if (!description) return { documentFor: '', documentThru: '', documentFrom: '' };
    
    const lines = description.split('\n');
    const documentFor = lines.find(line => line.startsWith('For:'))?.replace('For:', '').trim() || '';
    const documentThru = lines.find(line => line.startsWith('Thru:'))?.replace('Thru:', '').trim() || '';
    const documentFrom = lines.find(line => line.startsWith('From:'))?.replace('From:', '').trim() || '';
    
    return { documentFor, documentThru, documentFrom };
  };

  const viewDocument = () => {
    if (document?.file_url) {
      window.open(document.file_url, '_blank');
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
      <div className="max-w-xl mx-auto px-3 py-6">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-sm hover:opacity-80"
          style={{ color: '#004526' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </button>
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <p className="text-gray-600">Document not found</p>
        </div>
      </div>
    );
  }

  const { documentFor, documentThru, documentFrom } = parseDescription(document.description);

  return (
    <div className="max-w-xl mx-auto px-3 py-6">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm hover:opacity-80"
        style={{ color: '#004526' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </button>

      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-6 h-6" style={{ color: '#004526' }} />
          <h1 className="text-xl font-bold" style={{ color: '#004526' }}>Document Information</h1>
        </div>
        <p className="text-gray-600 text-sm ml-8 mb-4">
          View document details and information
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Document No.
            </label>
            <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50">
              {document.reference_number}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50">
              {document.document_type || 'N/A'}
            </div>
          </div>

          {documentFor && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Document For
              </label>
              <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50">
                {documentFor}
              </div>
            </div>
          )}

          {documentThru && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Thru
              </label>
              <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50">
                {documentThru}
              </div>
            </div>
          )}

          {documentFrom && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Document From
              </label>
              <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50">
                {documentFrom}
              </div>
            </div>
          )}

          {document.document_subject && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Document Subject
              </label>
              <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 min-h-[60px]">
                {document.document_subject}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Date Created
            </label>
            <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50">
              {new Date(document.created_at).toLocaleString()}
            </div>
          </div>

          {document.file_name && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Uploaded Document File
              </label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center" style={{ borderColor: '#9CAF88', backgroundColor: '#DFF5E1' }}>
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-6 h-6" style={{ color: '#004526' }} />
                  <p className="text-xs font-medium" style={{ color: '#004526' }}>
                    {document.file_name}
                  </p>
                  <button
                    onClick={viewDocument}
                    className="text-xs hover:underline"
                    style={{ color: '#004526' }}
                  >
                    Click to view document
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
