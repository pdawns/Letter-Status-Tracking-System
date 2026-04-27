import { useState, useEffect, useRef } from 'react';
import { insertLetter, updateLetter, uploadFile as uploadFileToStorage, getDocumentTypes, addDocumentType, DocumentType } from '../lib/api';
import { FileText, Upload, CheckCircle2, ChevronDown, ArrowUpFromLine, ArrowDownToLine, Check, Lock } from 'lucide-react';

interface CreateLetterProps {
  onLetterCreated: (letterId: string) => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

interface DropdownOption { value: string; label: string; }

function CustomDropdown({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: DropdownOption[]; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find(o => o.value === value);
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    else setSearch('');
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-xl transition-all"
        style={{ background: open ? 'rgba(var(--primary-rgb),0.5)' : 'var(--input-bg)', border: open ? '1px solid rgba(var(--accent-rgb),0.5)' : '1px solid rgba(var(--accent-rgb),0.2)', color: selected ? 'var(--accent-text)' : 'rgba(var(--accent-text-rgb),0.4)' }}>
        <span>{selected?.label ?? placeholder ?? 'Select...'}</span>
        <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform" style={{ color: 'var(--accent)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 w-full rounded-xl overflow-hidden"
          style={{ background: 'var(--card-bg)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(var(--accent-rgb),0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {/* Search input */}
          <div className="p-2" style={{ borderBottom: '1px solid rgba(var(--accent-rgb),0.15)' }}>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search office..."
              className="w-full px-3 py-1.5 text-sm rounded-lg focus:outline-none"
              style={{ background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'var(--accent-text)' }}
            />
          </div>
          {/* Options list */}
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filtered.length === 0
              ? <p className="px-4 py-3 text-sm" style={{ color: 'rgba(var(--accent-rgb),0.5)' }}>No results found.</p>
              : filtered.map(opt => (
                <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); setSearch(''); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors"
                  style={{ color: opt.value === value ? 'var(--accent-text)' : 'rgba(var(--accent-text-rgb),0.65)', background: opt.value === value ? 'rgba(var(--accent-rgb),0.15)' : 'transparent', fontWeight: opt.value === value ? 600 : 400 }}
                  onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.08)'; }}
                  onMouseLeave={e => { if (opt.value !== value) e.currentTarget.style.background = 'transparent'; }}>
                  <span>{opt.label}</span>
                  {opt.value === value && <Check className="w-3.5 h-3.5 ml-4" style={{ color: 'var(--accent)' }} />}
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { background: 'var(--input-bg)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'var(--accent-text)' };
const lbl: React.CSSProperties = { color: 'rgba(var(--accent-rgb),0.8)' };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium mb-1.5" style={lbl}>{children}</label>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl" style={{ background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.22)', overflow: 'visible' }}>
      <div className="px-4 py-2.5 rounded-t-2xl" style={{ background: 'rgba(var(--accent-rgb),0.15)', borderBottom: '1px solid rgba(var(--accent-rgb),0.18)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>{title}</p>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

export default function CreateLetter({ onLetterCreated, onToast }: CreateLetterProps) {
  const [documentType, setDocumentType] = useState('');
  const [otherDocumentType, setOtherDocumentType] = useState('');
  const [dbDocumentTypes, setDbDocumentTypes] = useState<DocumentType[]>([]);

  // Hardcoded offices/departments for incoming sender
  const OFFICES = [
    // Executive & Administration
    'Provincial Governor\'s Office',
    'Office of the Provincial Administrator',
    'Office of the Assistant Provincial Administrator',
    // Legislative
    'Sangguniang Panlalawigan of Misamis Oriental',
    // Financial & Budget
    'Provincial Treasurer\'s Office',
    'Provincial Budget Office',
    // Property & Land
    'Provincial Assessor\'s Office',
    // Engineering & Infrastructure
    'Provincial Engineering Office',
    // Agriculture & Veterinary
    'Provincial Veterinary Office',
    'Provincial Agriculture Office',
    // Health & Social Services
    'Provincial Health Office',
    'Provincial Social Welfare and Development Office (PSWDO)',
    // Planning & Development
    'Provincial Planning & Development Office (PPDO)',
    // Legal & HR
    'Provincial Legal Office',
    'Human Resource Management Office (HRMO)',
    // Disaster Management
    'Provincial Disaster Risk Reduction and Management Office (PDRRMO)',
  ];

  useEffect(() => {
    getDocumentTypes().then(setDbDocumentTypes).catch(() => {});
  }, []);
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
  const [documentDirection, setDocumentDirection] = useState<'sending' | 'receiving' | ''>('');
  const [senderName, setSenderName] = useState('');
  const [senderOffice, setSenderOffice] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [reqApproval, setReqApproval] = useState(false);
  const [reqReview, setReqReview] = useState(false);
  const [reqInfo, setReqInfo] = useState(false);
  const [reqOther, setReqOther] = useState(false);
  const [reqOtherText, setReqOtherText] = useState('');

  const generateReferenceNumber = () => {
    const year = new Date().getFullYear();
    const prefix = documentType.toLowerCase().includes('cert') ? 'CERT' : 'DOC';
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}-${random}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 500 * 1024 * 1024) { setError('File size must be less than 500MB'); return; }
    setFile(f);
    setError('');
    setFileWarning(f.size > 1.5 * 1024 * 1024
      ? `File is ${(f.size / (1024 * 1024)).toFixed(1)}MB. Files >1.5MB cannot be previewed. Document will still be created.`
      : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!documentDirection) { setError('Please select whether this document is for sending or receiving'); return; }
    if (!title || !pin || !file) { setError('Please fill in all required fields and select a document'); return; }
    if (!documentType) { setError('Please select a document type'); return; }
    if (documentType === 'other' && !otherDocumentType.trim()) { setError('Please specify the document type'); return; }
    if (pin.length < 4) { setError('PIN must be at least 4 characters'); return; }
    if (!reqApproval && !reqReview && !reqInfo && !reqOther) { setError('Please select at least one required action'); return; }
    if (reqOther && !reqOtherText.trim()) { setError('Please specify the "Other" required action'); return; }
    setShowConfirm(true);
  };

  const handleConfirmedSubmit = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const referenceNumber = generateReferenceNumber();

      // If "other", save the custom type to DB first so it appears in future dropdowns
      let finalDocType = documentType;
      if (documentType === 'other' && otherDocumentType.trim()) {
        try {
          const saved = await addDocumentType(otherDocumentType.trim());
          finalDocType = saved.name;
          setDbDocumentTypes(prev => prev.some(t => t.name === saved.name) ? prev : [...prev, saved]);
        } catch (_) {
          finalDocType = otherDocumentType.trim();
        }
      }

      const letter = await insertLetter({
        reference_number: referenceNumber, title,
        document_subject: subject,
        document_type: finalDocType,
        handler_pin: pin,
        sender_name: documentDirection === 'receiving' ? senderName : '',
        sender_office: documentDirection === 'receiving' ? senderOffice : '',
        sender_phone: documentDirection === 'receiving' ? senderPhone : '',
        sender_email: documentDirection === 'receiving' ? senderEmail : '',
        required_statuses: [reqApproval && 'for approval', reqReview && 'for review', reqInfo && 'for information', reqOther && reqOtherText.trim()].filter(Boolean).join(',') || '',
        document_direction: documentDirection || undefined,
      });
      if (file) {
        try {
          const fileUrl = await uploadFileToStorage(file, letter.id);
          await updateLetter(letter.id, { file_url: fileUrl ?? undefined, file_name: file.name });
        } catch { await updateLetter(letter.id, { file_name: file.name }); }
      }
      setCreatedRefNumber(letter.reference_number);
      onToast?.(`Document created: ${letter.reference_number}`, 'success');
      setShowSuccess(true);
      setTimeout(() => { setShowSuccess(false); onLetterCreated(letter.id); }, 2000);
    } catch (err) {
      setError((err as any)?.message || 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <div className="p-2.5 rounded-2xl" style={{ background: 'rgba(var(--accent-rgb),0.15)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
          <FileText className="w-5 h-5" style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--accent-text)' }}>Create New Document</h1>
          <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Fill in the details to register a document</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Two-column landscape layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-3">
            <Card title="Document Details">
              <div>
                <FieldLabel>Document Type <span style={{ color: '#fca5a5' }}>*</span></FieldLabel>
                <CustomDropdown
                  value={documentType}
                  onChange={v => { setDocumentType(v); setOtherDocumentType(''); }}
                  placeholder="Select document type..."
                  options={[
                    ...dbDocumentTypes.map(t => ({ value: t.name, label: t.name })),
                    { value: 'other', label: 'Other...' },
                  ]}
                />
                {documentType === 'other' && (
                  <input type="text" value={otherDocumentType} onChange={e => setOtherDocumentType(e.target.value)}
                    className="w-full mt-2 px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-green-600"
                    style={inp} placeholder="Specify document type..." required />
                )}
              </div>
              <div>
                <FieldLabel>Document Title <span style={{ color: '#fca5a5' }}>*</span></FieldLabel>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-green-600"
                  style={inp} placeholder="e.g., Budget Approval Request" required />
              </div>
              <div>
                <FieldLabel>Document Subject <span className="font-normal opacity-60">(Optional)</span></FieldLabel>
                <textarea value={subject} onChange={e => setSubject(e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-green-600 resize-none"
                  style={inp} placeholder="Purpose of the document..." />
              </div>
            </Card>

            <Card title="Attach Document File">
              <div className="rounded-xl p-5 text-center cursor-pointer transition-colors"
                style={{ borderWidth: '2px', borderStyle: 'dashed', borderColor: file ? 'rgba(var(--accent-rgb),0.5)' : 'rgba(var(--accent-rgb),0.25)', background: file ? 'rgba(var(--accent-rgb),0.08)' : 'rgba(0,0,0,0.15)' }}>
                <input type="file" id="file" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" className="hidden" required />
                <label htmlFor="file" className="cursor-pointer flex flex-col items-center gap-2">
                  {file
                    ? <><CheckCircle2 className="w-8 h-8" style={{ color: 'var(--accent)' }} /><p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>{file.name}</p><p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Click to replace</p></>
                    : <><Upload className="w-8 h-8" style={{ color: 'rgba(var(--accent-rgb),0.4)' }} /><p className="text-sm font-medium" style={{ color: 'rgba(var(--accent-text-rgb),0.65)' }}>Click to upload or drag and drop</p><p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.45)' }}>PDF, PNG, JPG, DOC up to 500MB</p></>
                  }
                </label>
              </div>
              {fileWarning && (
                <div className="px-3 py-2 rounded-xl text-xs flex items-start gap-2" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fcd34d' }}>
                  <span>⚠️</span><span>{fileWarning}</span>
                </div>
              )}
            </Card>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-3" style={{ overflow: 'visible' }}>
            <Card title="Transmittal Direction">
              <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Is this document being sent out or received?</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'sending', label: 'For Outgoing', icon: ArrowUpFromLine },
                  { value: 'receiving', label: 'For Incoming', icon: ArrowDownToLine },
                ].map(({ value, label, icon: Icon }) => (
                  <button key={value} type="button" onClick={() => setDocumentDirection(value as 'sending' | 'receiving')}
                    className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: documentDirection === value ? 'rgba(var(--accent-rgb),0.18)' : 'rgba(0,0,0,0.15)',
                      border: documentDirection === value ? '1.5px solid rgba(var(--accent-rgb),0.5)' : '1.5px solid rgba(var(--accent-rgb),0.12)',
                      color: documentDirection === value ? 'var(--accent-text)' : 'rgba(var(--accent-text-rgb),0.5)',
                    }}>
                    <Icon className="w-5 h-5" style={{ color: documentDirection === value ? 'var(--accent)' : 'rgba(var(--accent-rgb),0.35)' }} />
                    <span className="font-semibold">{label}</span>
                  </button>
                ))}
              </div>

              {documentDirection === 'receiving' && (
                <div className="pt-2 space-y-2" style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.1)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>Sender Info <span className="font-normal normal-case opacity-60">(Optional)</span></p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={lbl}>Sender Name</label>
                      <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-green-600"
                        style={inp} placeholder="Juan Dela Cruz" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={lbl}>Office / Department</label>
                      <CustomDropdown
                        value={senderOffice}
                        onChange={setSenderOffice}
                        placeholder="Select office/department..."
                        options={OFFICES.map(o => ({ value: o, label: o }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={lbl}>Phone</label>
                      <input type="tel" value={senderPhone} onChange={e => setSenderPhone(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-green-600"
                        style={inp} placeholder="09XXXXXXXXX" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={lbl}>Email</label>
                      <input type="email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-green-600"
                        style={inp} placeholder="sender@email.com" />
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card title="Required Actions">
              <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Select which actions this document requires to be complete.</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'For Approval', checked: reqApproval, toggle: () => setReqApproval(v => !v) },
                  { label: 'For Review', checked: reqReview, toggle: () => setReqReview(v => !v) },
                  { label: 'For Information', checked: reqInfo, toggle: () => setReqInfo(v => !v) },
                  { label: 'Other', checked: reqOther, toggle: () => { setReqOther(v => { if (v) setReqOtherText(''); return !v; }); } },
                ].map(({ label, checked, toggle }) => (
                  <button key={label} type="button" onClick={toggle}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all select-none"
                    style={{ background: checked ? 'rgba(var(--accent-rgb),0.2)' : 'rgba(0,0,0,0.2)', border: checked ? '1.5px solid rgba(var(--accent-rgb),0.5)' : '1.5px solid rgba(var(--accent-rgb),0.15)', color: checked ? 'var(--accent-text)' : 'rgba(var(--accent-text-rgb),0.5)' }}>
                    <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: checked ? 'rgba(var(--accent-rgb),0.8)' : 'rgba(var(--accent-rgb),0.3)', background: checked ? 'rgba(var(--accent-rgb),0.3)' : 'transparent' }}>
                      {checked && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />}
                    </span>
                    {label}
                  </button>
                ))}
              </div>
              {reqOther && (
                <input type="text" value={reqOtherText} onChange={e => setReqOtherText(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-green-600"
                  style={inp} placeholder="Specify required action..." />
              )}
            </Card>

            <Card title="Handler PIN">
              <div>
                <FieldLabel>PIN <span style={{ color: '#fca5a5' }}>*</span> <span className="font-normal opacity-60">(min. 4 characters)</span></FieldLabel>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'rgba(var(--accent-rgb),0.4)' }} />
                  <input type="password" value={pin} onChange={e => setPin(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-green-600"
                    style={inp} placeholder="Enter a secure PIN" minLength={4} required />
                </div>
                <p className="mt-1.5 text-xs" style={{ color: 'rgba(var(--accent-rgb),0.5)' }}>You'll need this PIN to record status updates.</p>
              </div>
            </Card>
          </div>
        </div>

        {error && (
          <div className="mt-3 px-3 py-2.5 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="mt-3 w-full text-white py-3 px-4 rounded-xl text-sm font-semibold disabled:cursor-not-allowed transition-colors"
          style={{ backgroundColor: loading ? '#9ca3af' : 'var(--primary)' }}
          onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = 'var(--primary-hover)')}
          onMouseLeave={e => !loading && (e.currentTarget.style.backgroundColor = 'var(--primary)')}>
          {loading ? 'Creating Document...' : 'Create Document'}
        </button>
      </form>
    </div>

    {showSuccess && (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-3 rounded-2xl px-8 py-6"
          style={{ background: 'var(--card-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '2px solid rgba(var(--accent-rgb),0.3)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(var(--accent-rgb),0.2)' }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--accent)' }} />
          </div>
          <div className="text-center">
            <p className="text-base font-bold" style={{ color: 'var(--accent-text)' }}>Document Created!</p>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(var(--accent-rgb),0.8)' }}>{createdRefNumber}</p>
          </div>
          <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Redirecting to document view...</p>
        </div>
      </div>
    )}

    {showConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(var(--accent-rgb),0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--accent-text)' }}>Create Document</h2>
          <p className="mb-3 text-sm" style={{ color: 'rgba(var(--accent-text-rgb),0.65)' }}>Are you sure you want to create this document?</p>
          <div className="rounded-xl p-3 mb-4 space-y-1.5 text-sm" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(var(--accent-rgb),0.1)' }}>
            <p><span style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>Title:</span> <span className="font-medium" style={{ color: 'var(--accent-text)' }}>{title}</span></p>
            <p><span style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>Type:</span> <span className="font-medium capitalize" style={{ color: 'var(--accent-text)' }}>{documentType === 'other' ? otherDocumentType : documentType}</span></p>
            {subject && <p><span style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>Subject:</span> <span className="font-medium" style={{ color: 'var(--accent-text)' }}>{subject}</span></p>}
            {file && <p><span style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>File:</span> <span className="font-medium" style={{ color: 'var(--accent-text)' }}>{file.name}</span></p>}
            <p><span style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>Direction:</span> <span className="font-medium capitalize" style={{ color: 'var(--accent-text)' }}>{documentDirection}</span></p>
          </div>
          <p className="text-xs mb-5" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Make sure all details are correct before proceeding.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--input-bg)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'rgba(var(--accent-text-rgb),0.65)' }}>Cancel</button>
            <button onClick={handleConfirmedSubmit} className="flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors"
              style={{ backgroundColor: 'var(--primary)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--primary)'}>Yes, Create</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
