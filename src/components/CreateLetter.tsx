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

  const glassInputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(156,175,136,0.2)',
    color: '#DFF5E1',
  };

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
        document_direction: documentDirection || undefined,
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
      <div className="rounded-2xl p-4" style={{ background: 'rgba(0, 45, 20, 0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(156,175,136,0.2)', borderRadius: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-6 h-6" style={{ color: '#9CAF88' }} />
          <h1 className="text-xl font-bold" style={{ color: '#DFF5E1' }}>Create New Document</h1>
        </div>
        <p className="text-sm ml-8 mb-4" style={{ color: 'rgba(223,245,225,0.65)' }}>
          As the handler, create a new document and set up the tracking system
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="type" className="block text-xs font-medium mb-1" style={{ color: 'rgba(156,175,136,0.8)' }}>
              Document Type *
            </label>
            <select
              id="type"
              value={documentType}
              onChange={(e) => {
                setDocumentType(e.target.value);
                setOtherDocumentType('');
              }}
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
              style={{ ...glassInputStyle }}
            >
              <option value="letter" style={{ background: '#002814' }}>Letter</option>
              <option value="certificate" style={{ background: '#002814' }}>Certificate</option>
              <option value="memo" style={{ background: '#002814' }}>Memo</option>
              <option value="report" style={{ background: '#002814' }}>Report</option>
              <option value="other" style={{ background: '#002814' }}>Other</option>
            </select>
            {documentType === 'other' && (
              <input
                type="text"
                value={otherDocumentType}
                onChange={(e) => setOtherDocumentType(e.target.value)}
                className="w-full mt-2 px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
                style={{ ...glassInputStyle }}
                placeholder="Specify document type..."
                required
              />
            )}
          </div>

          <div>
            <label htmlFor="title" className="block text-xs font-medium mb-1" style={{ color: 'rgba(156,175,136,0.8)' }}>
              Document Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
              style={{ ...glassInputStyle }}
              placeholder="e.g., Budget Approval Request"
              required
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-xs font-medium mb-1" style={{ color: 'rgba(156,175,136,0.8)' }}>
              Document Subject (Optional)
            </label>
            <textarea
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
              style={{ ...glassInputStyle }}
              placeholder="Purpose of the document..."
            />
          </div>

          <div>
            <label htmlFor="file" className="block text-xs font-medium mb-1" style={{ color: 'rgba(156,175,136,0.8)' }}>
              Upload Document File * (PDF, Image, DOC)
            </label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center transition-colors" style={{ borderColor: 'rgba(156,175,136,0.4)', background: 'rgba(0,0,0,0.2)' }}>
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
                  <Upload className="w-6 h-6" style={{ color: 'rgba(156,175,136,0.6)' }} />
                  <p className="text-xs font-medium" style={{ color: 'rgba(223,245,225,0.65)' }}>
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(156,175,136,0.5)' }}>PDF, PNG, JPG, DOC up to 500MB</p>
                </div>
              </label>
            </div>
            {fileWarning && (
              <div className="mt-2 px-3 py-2 rounded-lg text-xs flex items-start gap-2" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fcd34d' }}>
                <span className="mt-0.5">⚠️</span>
                <span>{fileWarning}</span>
              </div>
            )}
          </div>

          {/* Document Direction */}
          <div className="pt-4" style={{ borderTop: '1px solid rgba(156,175,136,0.15)' }}>
            <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'rgba(156,175,136,0.8)' }}>
              This document is... <span style={{ color: '#fca5a5' }}>*</span>
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
                  className="flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    background: documentDirection === value ? 'rgba(156,175,136,0.2)' : 'rgba(0,0,0,0.2)',
                    border: documentDirection === value ? '2px solid rgba(156,175,136,0.5)' : '2px solid rgba(156,175,136,0.15)',
                    color: documentDirection === value ? '#DFF5E1' : 'rgba(223,245,225,0.6)',
                  }}
                >
                  <span className="font-semibold">{label}</span>
                  <span className="text-xs font-normal" style={{ color: documentDirection === value ? 'rgba(223,245,225,0.7)' : 'rgba(156,175,136,0.5)' }}>{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sender Information — only shown when receiving */}
          {documentDirection === 'receiving' && (
          <div className="pt-4" style={{ borderTop: '1px solid rgba(156,175,136,0.15)' }}>
            <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'rgba(156,175,136,0.8)' }}>Sender Information (Optional)</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(156,175,136,0.8)' }}>Sender Name</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
                    style={{ ...glassInputStyle }}
                    placeholder="e.g., Juan Dela Cruz"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(156,175,136,0.8)' }}>Office / Company</label>
                  <input
                    type="text"
                    value={senderOffice}
                    onChange={(e) => setSenderOffice(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
                    style={{ ...glassInputStyle }}
                    placeholder="e.g., DILG Regional Office"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(156,175,136,0.8)' }}>Phone Number</label>
                  <input
                    type="tel"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
                    style={{ ...glassInputStyle }}
                    placeholder="e.g., 09XXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(156,175,136,0.8)' }}>Email Address</label>
                  <input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
                    style={{ ...glassInputStyle }}
                    placeholder="e.g., sender@email.com"
                  />
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Required Actions */}
          <div className="pt-4" style={{ borderTop: '1px solid rgba(156,175,136,0.15)' }}>
            <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'rgba(156,175,136,0.8)' }}>Required Actions <span style={{ color: '#fca5a5' }}>*</span></p>
            <p className="text-xs mb-3" style={{ color: 'rgba(156,175,136,0.6)' }}>Select which actions this document requires to be considered complete.</p>
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
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 select-none"
                  style={{
                    background: checked ? 'rgba(156,175,136,0.25)' : 'rgba(0,0,0,0.2)',
                    border: checked ? '2px solid rgba(156,175,136,0.5)' : '2px solid rgba(156,175,136,0.15)',
                    color: checked ? '#DFF5E1' : 'rgba(223,245,225,0.5)',
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{
                      borderColor: checked ? 'rgba(156,175,136,0.8)' : 'rgba(156,175,136,0.3)',
                      backgroundColor: checked ? 'rgba(156,175,136,0.3)' : 'transparent',
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
                className="w-full mt-3 px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
                style={{ ...glassInputStyle }}
                placeholder="Specify required action..."
              />
            )}
          </div>

          <div>
            <label htmlFor="pin" className="block text-xs font-medium mb-1" style={{ color: 'rgba(156,175,136,0.8)' }}>
              Handler PIN * (minimum 4 characters)
            </label>
            <input
              type="password"
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
              style={{ ...glassInputStyle }}
              placeholder="Enter a secure PIN"
              minLength={4}
              required
            />
            <p className="mt-1 text-xs" style={{ color: 'rgba(156,175,136,0.6)' }}>
              You'll need this PIN to record status updates. Keep it secure.
            </p>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-2 px-4 rounded-lg text-sm font-medium disabled:cursor-not-allowed transition-colors"
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
          className="flex flex-col items-center gap-3 rounded-2xl px-8 py-6 animate-[fadeInScale_0.3s_ease-out]"
          style={{ background: 'rgba(0,40,18,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '2px solid rgba(156,175,136,0.3)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(156,175,136,0.2)' }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: '#9CAF88' }} />
          </div>
          <div className="text-center">
            <p className="text-base font-bold" style={{ color: '#DFF5E1' }}>Document Created!</p>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(156,175,136,0.8)' }}>{createdRefNumber}</p>
          </div>
          <p className="text-xs" style={{ color: 'rgba(156,175,136,0.6)' }}>Redirecting to document view...</p>
        </div>
      </div>
    )}

    {showConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: 'rgba(0, 40, 18, 0.88)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(156,175,136,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#DFF5E1' }}>Create Document</h2>
          <p className="mb-3 text-sm" style={{ color: 'rgba(223,245,225,0.65)' }}>Are you sure you want to create this document?</p>
          <div className="rounded-lg p-3 mb-4 space-y-1 text-sm" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <p><span style={{ color: 'rgba(156,175,136,0.7)' }}>Title:</span> <span className="font-medium" style={{ color: '#DFF5E1' }}>{title}</span></p>
            <p><span style={{ color: 'rgba(156,175,136,0.7)' }}>Type:</span> <span className="font-medium capitalize" style={{ color: '#DFF5E1' }}>{documentType === 'other' ? otherDocumentType : documentType}</span></p>
            {subject && <p><span style={{ color: 'rgba(156,175,136,0.7)' }}>Subject:</span> <span className="font-medium" style={{ color: '#DFF5E1' }}>{subject}</span></p>}
            {file && <p><span style={{ color: 'rgba(156,175,136,0.7)' }}>File:</span> <span className="font-medium" style={{ color: '#DFF5E1' }}>{file.name}</span></p>}
          </div>
          <p className="text-xs mb-5" style={{ color: 'rgba(156,175,136,0.6)' }}>Make sure all details are correct before proceeding.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2 rounded-lg transition-colors" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(156,175,136,0.2)', color: 'rgba(223,245,225,0.65)' }}>Cancel</button>
            <button onClick={handleConfirmedSubmit} className="flex-1 px-4 py-2 text-white rounded-lg transition-colors" style={{ backgroundColor: '#004526' }}>Yes, Create</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
