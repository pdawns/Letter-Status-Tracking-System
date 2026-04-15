import { useState } from 'react';
import { insertLetter, updateLetter, uploadFile as uploadFileToStorage } from '../lib/api';
import { FileText, Upload, CheckCircle2 } from 'lucide-react';

interface CreateLetterProps {
  onLetterCreated: (letterId: string) => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

export default function CreateLetter({ onLetterCreated, onToast }: CreateLetterProps) {
  const [documentType, setDocumentType] = useState('letter');
  const [otherDocumentType, setOtherDocumentType] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [pin, setPin] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileWarning, setFileWarning] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdRefNumber, setCreatedRefNumber] = useState('');
  // Document direction
  const [documentDirection, setDocumentDirection] = useState<'sending' | 'receiving' | ''>('');
  // Sender info
  const [senderName, setSenderName] = useState('');
  const [senderOffice, setSenderOffice] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  // Required actions
  const [reqApproval, setReqApproval] = useState(false);
  const [reqReview, setReqReview] = useState(false);
  const [reqOther, setReqOther] = useState(false);
  const [reqOtherText, setReqOtherText] = useState('');

  const generateReferenceNumber = () => {
    const year = new Date().getFullYear();
    const prefix = documentType === 'certificate' ? 'CERT' : 'DOC';
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}-${random}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const maxSize = 500 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        setError('File size must be less than 500MB');
        return;
      }
      setFile(selectedFile);
      setError('');
      // Warn if file exceeds local preview limit (~1.5MB)
      if (selectedFile.size > 1.5 * 1024 * 1024) {
        setFileWarning(
          `This file is ${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB. Files larger than 1.5MB cannot be previewed due to browser storage limitations. The document will still be created, but Print Preview will not be available.`
        );
      } else {
        setFileWarning('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!documentDirection) {
      setError('Please select whether this document is for sending or receiving');
      return;
    }
    if (!title || !pin || !file) {
      setError('Please fill in all required fields and select a document');
      return;
    }
    if (documentType === 'other' && !otherDocumentType.trim()) {
      setError('Please specify the document type');
      return;
    }
    if (pin.length < 4) {
      setError('PIN must be at least 4 characters');
      return;
    }
    if (!reqApproval && !reqReview && !reqOther) {
      setError('Please select at least one required action');
      return;
    }
    if (reqOther && !reqOtherText.trim()) {
      setError('Please specify the "Other" required action');
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmedSubmit = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const referenceNumber = generateReferenceNumber();

      const letter = await insertLetter({
        reference_number: referenceNumber,
        title,
        document_subject: subject,
        document_type: documentType === 'other' ? otherDocumentType.trim() : documentType,
        handler_pin: pin,
        sender_name: documentDirection === 'receiving' ? senderName : '',
        sender_office: documentDirection === 'receiving' ? senderOffice : '',
        sender_phone: documentDirection === 'receiving' ? senderPhone : '',
        sender_email: documentDirection === 'receiving' ? senderEmail : '',
        required_statuses: [reqApproval && 'for approval', reqReview && 'for review', reqOther && reqOtherText.trim()].filter(Boolean).join(',') || '',
      });

      if (file) {
        try {
          const fileUrl = await uploadFileToStorage(file, letter.id);
          await updateLetter(letter.id, { file_url: fileUrl ?? undefined, file_name: file.name });
        } catch (fileErr) {
          console.warn('File too large, saving without file:', fileErr);
          await updateLetter(letter.id, { file_name: file.name });
        }
      }

      setCreatedRefNumber(letter.reference_number);
      onToast?.(`Document created: ${letter.reference_number}`, 'success');
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onLetterCreated(letter.id);
      }, 2000);
    } catch (err) {
      console.error('Create document error:', err);
      const msg = (err as any)?.message || JSON.stringify(err);
      setError(msg || 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
            <label htmlFor="type" className="block text-xs font-medium text-gray-700 mb-1">
              Document Type *
            </label>
            <select
              id="type"
              value={documentType}
              onChange={(e) => {
                setDocumentType(e.target.value);
                setOtherDocumentType('');
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
            >
              <option value="letter">Letter</option>
              <option value="certificate">Certificate</option>
              <option value="memo">Memo</option>
              <option value="report">Report</option>
              
              <option value="other">Other</option>
            </select>
            {documentType === 'other' && (
              <input
                type="text"
                value={otherDocumentType}
                onChange={(e) => setOtherDocumentType(e.target.value)}
                className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="Specify document type..."
                required
              />
            )}
          </div>

          <div>
            <label htmlFor="title" className="block text-xs font-medium text-gray-700 mb-1">
              Document Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              placeholder="e.g., Budget Approval Request"
              required
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-xs font-medium text-gray-700 mb-1">
              Document Subject (Optional)
            </label>
            <textarea
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              placeholder="Purpose of the document..."
            />
          </div>

          <div>
            <label htmlFor="file" className="block text-xs font-medium text-gray-700 mb-1">
              Upload Document File * (PDF, Image, DOC)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-opacity-80 transition-colors" style={{ borderColor: '#9CAF88' }}>
              <input
                type="file"
                id="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx"
                className="hidden"
                required
              />
              <label htmlFor="file" className="cursor-pointer">
                <div className="flex flex-col items-center gap-1">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <p className="text-xs font-medium text-gray-700">
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500">PDF, PNG, JPG, DOC up to 500MB</p>
                </div>
              </label>
            </div>
            {fileWarning && (
              <div className="mt-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-lg text-xs flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>{fileWarning}</span>
              </div>
            )}
          </div>

          {/* Document Direction */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              This document is... <span className="text-red-500">*</span>
            </p>
            <div className="flex gap-3">
              {[
                { value: 'sending', label: 'For Sending', desc: 'You are sending this document out' },
                { value: 'receiving', label: 'For Receiving', desc: 'You received this document' },
              ].map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDocumentDirection(value as 'sending' | 'receiving')}
                  className="flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all duration-150"
                  style={{
                    borderColor: documentDirection === value ? '#004526' : '#d1d5db',
                    backgroundColor: documentDirection === value ? '#f0f7f0' : '#fff',
                    color: documentDirection === value ? '#004526' : '#374151',
                  }}
                >
                  <span className="font-semibold">{label}</span>
                  <span className="text-xs font-normal" style={{ color: documentDirection === value ? '#004526' : '#9ca3af' }}>{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sender Information — only shown when receiving */}
          {documentDirection === 'receiving' && (
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Sender Information (Optional)</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sender Name</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    placeholder="e.g., Juan Dela Cruz"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Office / Company</label>
                  <input
                    type="text"
                    value={senderOffice}
                    onChange={(e) => setSenderOffice(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    placeholder="e.g., DILG Regional Office"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    placeholder="e.g., 09XXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    placeholder="e.g., sender@email.com"
                  />
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Required Actions */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Required Actions <span className="text-red-500">*</span></p>
            <p className="text-xs text-gray-500 mb-3">Select which actions this document requires to be considered complete.</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'For Approval', checked: reqApproval, toggle: () => setReqApproval(v => !v) },
                { label: 'For Review', checked: reqReview, toggle: () => setReqReview(v => !v) },
                {
                  label: 'Other',
                  checked: reqOther,
                  toggle: () => { setReqOther(v => { if (v) setReqOtherText(''); return !v; }); }
                },
              ].map(({ label, checked, toggle }) => (
                <button
                  key={label}
                  type="button"
                  onClick={toggle}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all duration-150 select-none"
                  style={{
                    borderColor: checked ? '#9CAF88' : '#d1d5db',
                    backgroundColor: checked ? '#9CAF88' : '#fff',
                    color: checked ? '#fff' : '#374151',
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{
                      borderColor: checked ? '#fff' : '#9ca3af',
                      backgroundColor: checked ? '#fff' : 'transparent',
                    }}
                  >
                    {checked && (
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#9CAF88' }} />
                    )}
                  </span>
                  {label}
                </button>
              ))}
            </div>
            {reqOther && (
              <input
                type="text"
                value={reqOtherText}
                onChange={(e) => setReqOtherText(e.target.value)}
                className="w-full mt-3 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="Specify required action..."
              />
            )}
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

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-2 px-4 rounded-lg text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: loading ? '#9ca3af' : '#004526' }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#9CAF88')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#004526')}
          >
            {loading ? 'Creating Document...' : 'Create Document'}
          </button>
        </form>
      </div>
    </div>

    {/* Success toast */}
    {showSuccess && (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          className="flex flex-col items-center gap-3 bg-white rounded-2xl shadow-2xl px-8 py-6 animate-[fadeInScale_0.3s_ease-out]"
          style={{ border: '2px solid #004526' }}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DFF5E1' }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: '#004526' }} />
          </div>
          <div className="text-center">
            <p className="text-base font-bold" style={{ color: '#004526' }}>Document Created!</p>
            <p className="text-sm text-gray-500 mt-0.5">{createdRefNumber}</p>
          </div>
          <p className="text-xs text-gray-400">Redirecting to document view...</p>
        </div>
      </div>
    )}

    {showConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Create Document</h2>
          <p className="text-gray-600 mb-3 text-sm">Are you sure you want to create this document?</p>
          <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1 text-sm">
            <p><span className="text-gray-500">Title:</span> <span className="font-medium">{title}</span></p>
            <p><span className="text-gray-500">Type:</span> <span className="font-medium capitalize">{documentType === 'other' ? otherDocumentType : documentType}</span></p>
            {subject && <p><span className="text-gray-500">Subject:</span> <span className="font-medium">{subject}</span></p>}
            {file && <p><span className="text-gray-500">File:</span> <span className="font-medium">{file.name}</span></p>}
          </div>
          <p className="text-xs text-gray-500 mb-5">Make sure all details are correct before proceeding.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={handleConfirmedSubmit} className="flex-1 px-4 py-2 text-white rounded-lg transition-colors" style={{ backgroundColor: '#004526' }}>Yes, Create</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
