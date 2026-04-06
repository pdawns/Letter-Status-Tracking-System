import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface CreateLetterProps {
  onLetterCreated: (letterId: string) => void;
}

export default function CreateLetter({ onLetterCreated }: CreateLetterProps) {
  const [documentNo, setDocumentNo] = useState('');
  const [documentType, setDocumentType] = useState('Request');
  const [documentFor, setDocumentFor] = useState('');
  const [documentThru, setDocumentThru] = useState('');
  const [documentFrom, setDocumentFrom] = useState('');
  const [documentSubject, setDocumentSubject] = useState('');
  const [pin, setPin] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState('');

  const generateReferenceNumber = () => {
    if (documentNo.trim()) {
      return documentNo.trim();
    }
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `DOC-${year}-${random}`;
  };

  const validateFile = (selectedFile: File): string | null => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (selectedFile.size > maxSize) {
      return 'File size must be less than 50MB';
    }

    if (!allowedTypes.includes(selectedFile.type)) {
      return 'File type not supported. Please upload PDF, Image, DOC, or Excel files only.';
    }

    return null;
  };

  const uploadFileToStorage = async (documentId: string, fileToUpload: File): Promise<string> => {
    const fileExt = fileToUpload.name.split('.').pop()?.toLowerCase();
    const timestamp = Date.now();
    const filePath = `${documentId}/${timestamp}.${fileExt}`;

    console.log('Starting file upload:', {
      documentId,
      fileName: fileToUpload.name,
      fileSize: fileToUpload.size,
      fileType: fileToUpload.type,
      filePath
    });

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`File upload failed: ${uploadError.message}`);
    }

    console.log('File uploaded to storage:', uploadData);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    if (!urlData.publicUrl) {
      throw new Error('Failed to get public URL for uploaded file');
    }

    console.log('Public URL generated:', urlData.publicUrl);
    return urlData.publicUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError('');
    setSuccess('');

    if (selectedFile) {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setSuccess(`File selected: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Strict validation
    if (!documentNo.trim()) {
      setError('Document No. is required');
      return;
    }
    if (!documentType) {
      setError('Document Type is required');
      return;
    }
    if (!documentFor.trim()) {
      setError('Document For is required');
      return;
    }
    if (!documentFrom.trim()) {
      setError('Document From is required');
      return;
    }
    if (!documentSubject.trim()) {
      setError('Document Subject is required');
      return;
    }
    if (!pin || pin.length < 4) {
      setError('PIN must be at least 4 characters');
      return;
    }
    if (!file) {
      setError('Document file is required. Please select a file to upload.');
      return;
    }

    // Final file validation
    const fileValidation = validateFile(file);
    if (fileValidation) {
      setError(fileValidation);
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const referenceNumber = generateReferenceNumber();
      console.log('=== STARTING DOCUMENT CREATION ===');
      console.log('Reference Number:', referenceNumber);

      setUploadProgress(10);
      setSuccess('Creating document record...');

      // Step 1: Create the letter record
      const { data: letterData, error: insertError } = await supabase
        .from('letters')
        .insert({
          reference_number: referenceNumber,
          title: `${documentType} - ${documentFor}`,
          document_subject: documentSubject,
          document_type: documentType,
          document_for: documentFor,
          document_thru: documentThru || null,
          document_from: documentFrom,
          description: `For: ${documentFor}\nThru: ${documentThru || 'N/A'}\nFrom: ${documentFrom}`,
          handler_pin: pin,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error(`Failed to create document: ${insertError.message}`);
      }

      console.log('Document created in database:', letterData);
      setUploadProgress(30);
      setSuccess('Document created. Uploading file...');

      // Step 2: Upload file to storage
      const fileUrl = await uploadFileToStorage(letterData.id, file);
      
      setUploadProgress(70);
      setSuccess('File uploaded. Updating document record...');

      // Step 3: Update the letter with file information
      const { data: updateData, error: updateError } = await supabase
        .from('letters')
        .update({
          file_url: fileUrl,
          file_name: file.name,
        })
        .eq('id', letterData.id)
        .select();

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Failed to save file information: ${updateError.message}`);
      }

      console.log('Document updated with file info:', updateData);
      setUploadProgress(90);
      setSuccess('Document and file saved successfully!');

      // Step 4: Verify the data was saved correctly
      const { data: verifyData, error: verifyError } = await supabase
        .from('letters')
        .select('id, reference_number, title, file_url, file_name')
        .eq('id', letterData.id)
        .single();

      if (verifyError) {
        console.error('Verification error:', verifyError);
        throw new Error('Failed to verify document was saved correctly');
      }

      console.log('=== VERIFICATION SUCCESSFUL ===');
      console.log('Saved document:', verifyData);

      if (!verifyData.file_url || !verifyData.file_name) {
        throw new Error('File information was not saved correctly to database');
      }

      setUploadProgress(100);
      setSuccess('✅ Document created successfully with file attached!');

      // Wait a moment to show success message
      setTimeout(() => {
        onLetterCreated(letterData.id);
      }, 1500);

    } catch (err) {
      console.error('=== DOCUMENT CREATION FAILED ===');
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create document');
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-3">
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-6 h-6" style={{ color: '#004526' }} />
          <h1 className="text-xl font-bold" style={{ color: '#004526' }}>Create New Document</h1>
        </div>
        <p className="text-gray-600 text-sm ml-8 mb-4">
          As the handler, create a new document and set up the tracking system
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="documentNo" className="block text-xs font-medium text-gray-700 mb-1">
              Document No. *
            </label>
            <input
              type="text"
              id="documentNo"
              value={documentNo}
              onChange={(e) => setDocumentNo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              placeholder="Enter document number"
              required
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-xs font-medium text-gray-700 mb-1">
              Document Type *
            </label>
            <select
              id="type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              required
            >
              <option value="Request">Request</option>
              <option value="Letter">Letter</option>
              <option value="Certificate">Certificate</option>
              <option value="Memo">Memo</option>
              <option value="Report">Report</option>
              <option value="Notice">Notice</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="documentFor" className="block text-xs font-medium text-gray-700 mb-1">
              Document For *
            </label>
            <input
              type="text"
              id="documentFor"
              value={documentFor}
              onChange={(e) => setDocumentFor(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              placeholder="Enter recipient/purpose"
              required
            />
          </div>

          <div>
            <label htmlFor="documentThru" className="block text-xs font-medium text-gray-700 mb-1">
              Thru (Optional)
            </label>
            <input
              type="text"
              id="documentThru"
              value={documentThru}
              onChange={(e) => setDocumentThru(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              placeholder="Enter intermediary (if any)"
            />
          </div>

          <div>
            <label htmlFor="documentFrom" className="block text-xs font-medium text-gray-700 mb-1">
              Document From *
            </label>
            <input
              type="text"
              id="documentFrom"
              value={documentFrom}
              onChange={(e) => setDocumentFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              placeholder="Enter sender/originator"
              required
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-xs font-medium text-gray-700 mb-1">
              Document Subject *
            </label>
            <textarea
              id="subject"
              value={documentSubject}
              onChange={(e) => setDocumentSubject(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              placeholder="Enter document subject/description"
              required
            />
          </div>

          <div>
            <label htmlFor="file" className="block text-xs font-medium text-gray-700 mb-1">
              Upload Document File * (REQUIRED)
            </label>
            <div 
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="file"
                id="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls"
                className="hidden"
                required
              />
              <label htmlFor="file" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  {file ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <Upload className="w-8 h-8 text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {file ? `Selected: ${file.name}` : 'Click to upload document file'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, PNG, JPG, DOC, Excel files up to 50MB
                    </p>
                    {file && (
                      <p className="text-xs text-green-600 mt-1">
                        Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="pin" className="block text-xs font-medium text-gray-700 mb-1">
              Handler PIN * (minimum 4 characters)
            </label>
            <input
              type="password"
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              placeholder="Enter a secure PIN"
              minLength={4}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              You'll need this PIN to record status updates. Keep it secure.
            </p>
          </div>

          {uploadProgress > 0 && (
            <div className="rounded-lg p-3" style={{ backgroundColor: '#DFF5E1' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: '#004526' }}>
                  {uploadProgress === 100 ? 'Complete!' : 'Processing...'}
                </p>
                <p className="text-sm font-medium" style={{ color: '#004526' }}>{uploadProgress}%</p>
              </div>
              <div className="w-full rounded-full h-2" style={{ backgroundColor: '#9CAF88' }}>
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%`, backgroundColor: '#004526' }}
                ></div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full text-white py-3 px-4 rounded-lg text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: loading || !file ? '#9ca3af' : '#004526' }}
            onMouseEnter={(e) => !loading && file && (e.currentTarget.style.backgroundColor = '#9CAF88')}
            onMouseLeave={(e) => !loading && file && (e.currentTarget.style.backgroundColor = '#004526')}
          >
            {loading ? 'Creating Document...' : !file ? 'Please select a file first' : 'Create Document with File'}
          </button>
        </form>
      </div>
    </div>
  );
}
