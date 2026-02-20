import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Upload } from 'lucide-react';

interface CreateLetterProps {
  onLetterCreated: (letterId: string) => void;
}

export default function CreateLetter({ onLetterCreated }: CreateLetterProps) {
  const [documentType, setDocumentType] = useState('letter');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [pin, setPin] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const generateReferenceNumber = () => {
    const year = new Date().getFullYear();
    const prefix = documentType === 'certificate' ? 'CERT' : 'DOC';
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}-${random}`;
  };

  const uploadFile = async (documentId: string, fileName: string): Promise<string | null> => {
    if (!file) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${documentId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error('File upload error:', err);
      throw new Error('Failed to upload document file');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const maxSize = 50 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        setError('File size must be less than 50MB');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title || !pin || !file) {
      setError('Please fill in all required fields and select a document');
      return;
    }

    if (pin.length < 4) {
      setError('PIN must be at least 4 characters');
      return;
    }

    setLoading(true);

    try {
      const referenceNumber = generateReferenceNumber();

      const { data, error: insertError } = await supabase
        .from('letters')
        .insert({
          reference_number: referenceNumber,
          title,
          document_subject: subject,
          document_type: documentType,
          handler_pin: pin,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setUploadProgress(50);

      const fileUrl = await uploadFile(data.id, file.name);

      if (fileUrl) {
        const { error: updateError } = await supabase
          .from('letters')
          .update({
            file_url: fileUrl,
            file_name: file.name,
          })
          .eq('id', data.id);

        if (updateError) throw updateError;
      }

      setUploadProgress(100);
      onLetterCreated(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0">
      <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Create New Document</h1>
        </div>
        <p className="text-gray-600 ml-11 mb-6">
          As the handler, create a new document and set up the tracking system
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Document Type *
            </label>
            <select
              id="type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="letter">Letter</option>
              <option value="certificate">Certificate</option>
              <option value="memo">Memo</option>
              <option value="report">Report</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Document Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Budget Approval Request"
              required
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Document Subject (Optional)
            </label>
            <textarea
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief subject or summary of the document..."
            />
          </div>

          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
              Upload Document File * (PDF, Image, DOC)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                id="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx"
                className="hidden"
                required
              />
              <label htmlFor="file" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500">PDF, PNG, JPG, DOC up to 50MB</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
              Handler PIN * (minimum 4 characters)
            </label>
            <input
              type="password"
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter a secure PIN"
              minLength={4}
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              You'll need this PIN to record status updates. Keep it secure.
            </p>
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-900">Uploading...</p>
                <p className="text-sm font-medium text-blue-900">{uploadProgress}%</p>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating Document...' : 'Create Document'}
          </button>
        </form>
      </div>
    </div>
  );
}
