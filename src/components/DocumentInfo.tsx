import { useState, useEffect, useRef } from 'react';
import { getLetter, getActionTickets, getStatusesForLetter, uploadFile, updateLetter } from '../lib/api';
import { Letter, ActionTicket, LetterStatus } from '../types';
import { ArrowLeft, FileText, Calendar, Tag, Download, Eye, Loader, Bell, Ticket, Upload, RefreshCw } from 'lucide-react';
import NotifySender from './NotifySender';
import ActionTicketModal from './ActionTicket';
import { fixName } from '../lib/fixNames';

interface DocumentInfoProps {
  letterId: string;
  onBack: () => void;
}

export default function DocumentInfo({ letterId, onBack }: DocumentInfoProps) {
  const [document, setDocument] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotify, setShowNotify] = useState(false);
  const [actionTickets, setActionTickets] = useState<ActionTicket[]>([]);
  const [previewTicket, setPreviewTicket] = useState<ActionTicket | null>(null);
  const [statuses, setStatuses] = useState<LetterStatus[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchDocument(); }, [letterId]);

  const fetchDocument = async () => {
    try {
      const data = await getLetter(letterId);
      if (!data) throw new Error('Not found');
      setDocument(data);
      try {
        const tickets = await getActionTickets(letterId);
        setActionTickets(Array.isArray(tickets) ? tickets : []);
      } catch { setActionTickets([]); }
      try {
        const s = await getStatusesForLetter(letterId);
        setStatuses(Array.isArray(s) ? s : []);
      } catch { setStatuses([]); }
    } catch (err) {
      console.error('Error fetching document:', err);
    } finally {
      setLoading(false);
    }
  };

  const toViewUrl = (url: string) => {
    // For PDFs and raw files, use Google Docs viewer to avoid Cloudinary auth issues
    const isPdf = url.match(/\.pdf(\?|$)/i) || url.includes('/raw/upload/');
    const isOffice = url.match(/\.(doc|docx|xls|xlsx|ppt|pptx)(\?|$)/i);
    if (isPdf || isOffice) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=false`;
    }
    return url;
  };

  const viewDocument = () => {
    if (!document?.file_url) return;
    window.open(toViewUrl(document.file_url), '_blank', 'noopener,noreferrer');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !document) return;
    setUploading(true);
    try {
      const fileUrl = await uploadFile(file, document.id);
      await updateLetter(document.id, { file_url: fileUrl, file_name: file.name });
      await fetchDocument();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm" style={{ color: 'var(--accent)' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="p-6 text-center rounded-2xl" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(20px)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}>
          <p style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>Document not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm hover:opacity-80" style={{ color: 'var(--accent)' }}>
        <ArrowLeft className="w-4 h-4" /> Back to Library
      </button>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(var(--accent-rgb),0.2)', boxShadow: '0 4px 24px var(--input-bg)' }}>
        {/* Header */}
        <div className="p-4 text-white" style={{ background: 'linear-gradient(to right, var(--primary), var(--accent))' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8" />
              <div>
                <p className="text-xs opacity-90">{document.reference_number}</p>
                <h1 className="text-xl font-bold">{document.title}</h1>
              </div>
            </div>
            {(document.sender_phone || document.sender_email) && (
              <button
                onClick={() => setShowNotify(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.35)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              >
                <Bell className="w-3.5 h-3.5" /> Notify Sender
              </button>
            )}
          </div>
        </div>

        <div className="p-4">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-text)' }}>
            <FileText className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Document Information
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* info tiles */}
            {[
              { label: <><Tag className="w-3 h-3" /> Document Type</>, value: document.document_type || 'N/A' },
            ].map((_, i) => null)}
            <div className="p-3 rounded-xl" style={{ background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}>
              <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'rgba(var(--accent-rgb),0.75)' }}><Tag className="w-3 h-3" /> Document Type</p>
              <p className="text-sm font-medium capitalize" style={{ color: 'var(--accent-text)' }}>{document.document_type || 'N/A'}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}>
              <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'rgba(var(--accent-rgb),0.75)' }}><Calendar className="w-3 h-3" /> Created Date</p>
              <p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>
                {new Date(document.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
            {document.document_direction === 'sending' && (
              <div className="p-3 rounded-xl col-span-2" style={{ background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}>
                <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'rgba(var(--accent-rgb),0.75)' }}><Calendar className="w-3 h-3" /> Date Sent</p>
                <p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>
                  {new Date(document.sent_at || document.created_at).toLocaleString()}
                </p>
                <p className="text-xs mt-1.5" style={{ color: 'rgba(var(--accent-rgb),0.8)' }}>
                  <span className="font-semibold">📤 Sent by</span> Provincial Treasurer's Office
                </p>
              </div>
            )}
            {document.document_direction === 'receiving' && (() => {
              const reviewStatus = statuses.find(s => s.status_type === 'for review' || s.status_type === 'reviewed');
              return reviewStatus ? (
                <div className="p-3 rounded-xl col-span-2" style={{ background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}>
                  <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'rgba(var(--accent-rgb),0.75)' }}><Calendar className="w-3 h-3" /> Date Received</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>
                    {new Date(reviewStatus.signed_at).toLocaleString()}
                  </p>
                  <p className="text-xs mt-1.5" style={{ color: 'rgba(var(--accent-rgb),0.8)' }}>
                    <span className="font-semibold">✓ Reviewed by</span> {reviewStatus.signed_by}
                  </p>
                </div>
              ) : null;
            })()}
            <div className="p-3 rounded-xl col-span-2" style={{ background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(var(--accent-rgb),0.75)' }}>Reference Number</p>
              <p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>{document.reference_number}</p>
            </div>
            {document.document_subject && (
              <div className="p-3 rounded-xl col-span-2" style={{ background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}>
                <p className="text-xs mb-1" style={{ color: 'rgba(var(--accent-rgb),0.75)' }}>Subject</p>
                <p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>{document.document_subject}</p>
              </div>
            )}
            {document.created_by && (
              <div className="p-3 rounded-xl col-span-2" style={{ background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}>
                <p className="text-xs mb-1" style={{ color: 'rgba(var(--accent-rgb),0.75)' }}>Created By</p>
                <p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>{document.created_by}</p>
              </div>
            )}
            {document.sender_name && (
              <div className="p-3 rounded-xl col-span-2" style={{ background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}>
                <p className="text-xs mb-1" style={{ color: 'rgba(var(--accent-rgb),0.75)' }}>Sender</p>
                <p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>
                  {document.sender_name}{document.sender_office ? ` — ${document.sender_office}` : ''}
                </p>
                {document.sender_phone && <p className="text-xs mt-0.5" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>📱 {document.sender_phone}</p>}
                {document.sender_email && <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>✉️ {document.sender_email}</p>}
              </div>
            )}
          </div>

          {/* Action Tickets */}
          {actionTickets.length > 0 && (
            <div className="pt-4 mt-2" style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.15)' }}>
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-text)' }}>
                <Ticket className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Action Tickler Slips
              </h2>
              <div className="space-y-2">
                {actionTickets.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setPreviewTicket(t)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors text-left"
                    style={{ background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.18)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.1)')}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-xs" style={{ color: 'var(--accent-text)' }}>{t.ticket_number}</p>
                      <p className="text-xs truncate" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>Assigned to: {fixName(t.assigned_to)}</p>
                      {t.due_date && <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Due: {new Date(t.due_date).toLocaleDateString()}</p>}
                    </div>
                    <span className={`ml-2 shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${t.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-blue-900 text-blue-300'}`}>
                      {t.status === 'completed' ? '✓ Done' : '🖨 For Printing'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions / File Preview */}
          {document.file_url ? (
            <div className="pt-4" style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.15)' }}>
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={viewDocument} className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg transition-colors text-xs" style={{ backgroundColor: 'var(--primary)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}>
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button onClick={downloadDocument} className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg transition-colors text-xs" style={{ backgroundColor: 'var(--primary)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}>
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg transition-colors text-xs disabled:opacity-60" style={{ backgroundColor: 'var(--accent)' }} onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.backgroundColor = 'var(--primary)'; }} onMouseLeave={(e) => { if (!uploading) e.currentTarget.style.backgroundColor = 'var(--accent)'; }}>
                  {uploading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {uploading ? 'Uploading...' : 'Replace File'}
                </button>
                {(document.sender_phone || document.sender_email) && (
                  <button onClick={() => setShowNotify(true)} className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg transition-colors text-xs" style={{ backgroundColor: 'var(--accent)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}>
                    <Bell className="w-3.5 h-3.5" /> Notify Sender
                  </button>
                )}
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              </div>

              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
                <div className="px-3 py-2 flex items-center gap-2 text-xs font-semibold text-white" style={{ backgroundColor: 'var(--primary)' }}>
                  <Eye className="w-3.5 h-3.5" />
                  Document Preview
                  {document.file_name && <span className="font-normal opacity-80 truncate">— {document.file_name}</span>}
                </div>
                {(() => {
                  const url = document.file_url!;
                  const isImage = (url.match(/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i)) || (url.includes('/image/upload/') && !url.match(/\.pdf(\?|$)/i));
                  const isOffice = url.match(/\.(doc|docx|xls|xlsx|ppt|pptx)(\?|$)/i);
                  const isPdf = url.match(/\.pdf(\?|$)/i) || url.includes('/raw/upload/');
                  if (isImage) return (
                    <div className="flex items-center justify-center p-4" style={{ minHeight: '300px', background: 'rgba(0,0,0,0.2)' }}>
                      <img src={url} alt={document.file_name || 'Document'} className="max-w-full max-h-[600px] object-contain rounded shadow" />
                    </div>
                  );
                  if (isOffice) return (
                    <div className="flex flex-col items-center justify-center py-12 gap-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <FileText className="w-12 h-12 opacity-30" style={{ color: 'var(--accent)' }} />
                      <p className="text-sm font-medium" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>Word/Excel/PowerPoint files cannot be previewed in the browser.</p>
                      <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Download the file to open it in Microsoft Office or LibreOffice.</p>
                      <button onClick={downloadDocument} className="flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-xs mt-1" style={{ backgroundColor: 'var(--primary)' }}>
                        <Download className="w-3.5 h-3.5" /> Download File
                      </button>
                    </div>
                  );
                  if (isPdf) return (
                    <div className="flex flex-col items-center justify-center py-12 gap-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <FileText className="w-12 h-12 opacity-30" style={{ color: 'var(--accent)' }} />
                      <p className="text-sm font-medium" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>PDF preview is not available inline.</p>
                      <button onClick={() => window.open(toViewUrl(url), '_blank', 'noopener,noreferrer')} className="flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-xs mt-1" style={{ backgroundColor: 'var(--primary)' }}>
                        <Eye className="w-3.5 h-3.5" /> Open PDF in New Tab
                      </button>
                    </div>
                  );
                  return <iframe src={url} title="Document Preview" className="w-full border-0" style={{ height: '600px' }} />;
                })()}
              </div>
            </div>
          ) : (
            <div className="pt-4" style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.15)' }}>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
                <div className="px-3 py-2 flex items-center gap-2 text-xs font-semibold text-white" style={{ backgroundColor: 'var(--primary)' }}>
                  <Eye className="w-3.5 h-3.5" /> Document Preview
                </div>
                <div className="flex flex-col items-center justify-center py-10 gap-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <FileText className="w-10 h-10 opacity-30" style={{ color: 'var(--accent)' }} />
                  <p className="text-sm" style={{ color: 'rgba(var(--accent-text-rgb),0.6)' }}>No file attached to this document.</p>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 text-white px-4 py-2 rounded-lg transition-colors text-xs disabled:opacity-60" style={{ backgroundColor: 'var(--primary)' }}>
                    {uploading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploading ? 'Uploading...' : 'Attach File'}
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNotify && <NotifySender letter={document} onClose={() => setShowNotify(false)} />}
      {previewTicket && document && (
        <ActionTicketModal ticket={previewTicket} letter={document} onClose={() => setPreviewTicket(null)} />
      )}
    </div>
  );
}
