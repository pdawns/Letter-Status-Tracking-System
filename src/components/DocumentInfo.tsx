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

  const viewDocument = () => {
    if (!document?.file_url) return;
    const isOffice = document.file_url.match(/\.(doc|docx|xls|xlsx|ppt|pptx)(\?|$)/i);
    if (isOffice) {
      window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(document.file_url)}&embedded=false`, '_blank');
    } else {
      window.open(document.file_url, '_blank', 'noopener,noreferrer');
    }
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
        <Loader className="w-8 h-8 animate-spin" style={{ color: '#004526' }} />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm" style={{ color: '#004526' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <p className="text-gray-600">Document not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm hover:opacity-80" style={{ color: '#004526' }}>
        <ArrowLeft className="w-4 h-4" /> Back to Library
      </button>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 text-white" style={{ background: 'linear-gradient(to right, #004526, #9CAF88)' }}>
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
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: '#004526' }}>
            <FileText className="w-4 h-4" /> Document Information
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#DFF5E1' }}>
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Document Type</p>
              <p className="text-sm font-medium capitalize" style={{ color: '#004526' }}>{document.document_type || 'N/A'}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#DFF5E1' }}>
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Created Date</p>
              <p className="text-sm font-medium" style={{ color: '#004526' }}>
                {new Date(document.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
            {document.document_direction === 'sending' && (
              <div className="p-3 rounded-lg col-span-2" style={{ backgroundColor: '#DFF5E1' }}>
                <p className="text-xs text-gray-600 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date Sent</p>
                <p className="text-sm font-medium" style={{ color: '#004526' }}>
                  {new Date(document.sent_at || document.created_at).toLocaleString()}
                </p>
                <p className="text-xs mt-1.5" style={{ color: '#004526' }}>
                  <span className="font-semibold">📤 Sent by</span> Provincial Treasurer's Office
                </p>
              </div>
            )}
            {document.document_direction === 'receiving' && (() => {
              const reviewStatus = statuses.find(s => s.status_type === 'for review' || s.status_type === 'reviewed');
              return reviewStatus ? (
                <div className="p-3 rounded-lg col-span-2" style={{ backgroundColor: '#DFF5E1' }}>
                  <p className="text-xs text-gray-600 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date Received</p>
                  <p className="text-sm font-medium" style={{ color: '#004526' }}>
                    {new Date(reviewStatus.signed_at).toLocaleString()}
                  </p>
                  <p className="text-xs mt-1.5" style={{ color: '#004526' }}>
                    <span className="font-semibold">✓ Reviewed by</span> {reviewStatus.signed_by}
                  </p>
                </div>
              ) : null;
            })()}
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
            {document.sender_name && (
              <div className="p-3 rounded-lg col-span-2" style={{ backgroundColor: '#DFF5E1' }}>
                <p className="text-xs text-gray-600 mb-1">Sender</p>
                <p className="text-sm font-medium" style={{ color: '#004526' }}>
                  {document.sender_name}{document.sender_office ? ` — ${document.sender_office}` : ''}
                </p>
                {document.sender_phone && <p className="text-xs text-gray-500 mt-0.5">📱 {document.sender_phone}</p>}
                {document.sender_email && <p className="text-xs text-gray-500">✉️ {document.sender_email}</p>}
              </div>
            )}
          </div>

          {/* Action Tickets */}
          {actionTickets.length > 0 && (
            <div className="border-t pt-4 mt-2">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: '#004526' }}>
                <Ticket className="w-4 h-4" /> Action Tickler Slips
              </h2>
              <div className="space-y-2">
                {actionTickets.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setPreviewTicket(t)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border-2 text-sm hover:bg-green-50 transition-colors text-left"
                    style={{ borderColor: '#9CAF88' }}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-xs">{t.ticket_number}</p>
                      <p className="text-xs text-gray-500 truncate">Assigned to: {fixName(t.assigned_to)}</p>
                      {t.due_date && <p className="text-xs text-gray-400">Due: {new Date(t.due_date).toLocaleDateString()}</p>}
                    </div>
                    <span className={`ml-2 shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {t.status === 'completed' ? '✓ Done' : '🖨 For Printing'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions / File Preview */}
          {document.file_url ? (
            <div className="border-t pt-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={viewDocument}
                  className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg transition-colors text-xs"
                  style={{ backgroundColor: '#004526' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#004526'}
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button
                  onClick={downloadDocument}
                  className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg transition-colors text-xs"
                  style={{ backgroundColor: '#004526' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#004526'}
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg transition-colors text-xs disabled:opacity-60"
                  style={{ backgroundColor: '#9CAF88' }}
                  onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.backgroundColor = '#004526'; }}
                  onMouseLeave={(e) => { if (!uploading) e.currentTarget.style.backgroundColor = '#9CAF88'; }}
                >
                  {uploading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {uploading ? 'Uploading...' : 'Replace File'}
                </button>
                {(document.sender_phone || document.sender_email) && (
                  <button
                    onClick={() => setShowNotify(true)}
                    className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg transition-colors text-xs"
                    style={{ backgroundColor: '#9CAF88' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#004526'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
                  >
                    <Bell className="w-3.5 h-3.5" /> Notify Sender
                  </button>
                )}
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              </div>

              {/* Inline File Preview */}
              <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#9CAF88' }}>
                <div className="px-3 py-2 flex items-center gap-2 text-xs font-semibold text-white" style={{ backgroundColor: '#004526' }}>
                  <Eye className="w-3.5 h-3.5" />
                  Document Preview
                  {document.file_name && <span className="font-normal opacity-80 truncate">— {document.file_name}</span>}
                </div>
                {(() => {
                  const url = document.file_url!;
                  const isImage = url.match(/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i);
                  const isOffice = url.match(/\.(doc|docx|xls|xlsx|ppt|pptx)(\?|$)/i);

                  if (isImage) {
                    return (
                      <div className="flex items-center justify-center bg-gray-50 p-4" style={{ minHeight: '300px' }}>
                        <img src={url} alt={document.file_name || 'Document'} className="max-w-full max-h-[600px] object-contain rounded shadow" />
                      </div>
                    );
                  }

                  if (isOffice) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 bg-gray-50 gap-3 text-gray-500">
                        <FileText className="w-12 h-12 opacity-30" />
                        <p className="text-sm font-medium">Word/Excel/PowerPoint files cannot be previewed in the browser.</p>
                        <p className="text-xs text-gray-400">Download the file to open it in Microsoft Office or LibreOffice.</p>
                        <button
                          onClick={downloadDocument}
                          className="flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-xs mt-1"
                          style={{ backgroundColor: '#004526' }}
                        >
                          <Download className="w-3.5 h-3.5" /> Download File
                        </button>
                      </div>
                    );
                  }

                  // PDF or other — embed directly
                  return (
                    <iframe
                      src={url}
                      title="Document Preview"
                      className="w-full border-0"
                      style={{ height: '600px' }}
                    />
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="border-t pt-4">
              <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#9CAF88' }}>
                <div className="px-3 py-2 flex items-center gap-2 text-xs font-semibold text-white" style={{ backgroundColor: '#004526' }}>
                  <Eye className="w-3.5 h-3.5" />
                  Document Preview
                </div>
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 bg-gray-50 gap-3">
                  <FileText className="w-10 h-10 opacity-30" />
                  <p className="text-sm">No file attached to this document.</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 text-white px-4 py-2 rounded-lg transition-colors text-xs disabled:opacity-60"
                    style={{ backgroundColor: '#004526' }}
                  >
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
