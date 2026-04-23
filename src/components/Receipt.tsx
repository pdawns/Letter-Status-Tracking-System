import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getLetter, getStatusesForLetter, insertStatuses, getRole } from '../lib/api';
import { Letter, LetterStatus } from '../types';
import { CheckCircle, Clock, Download, ArrowLeft, ArrowUpFromLine, RotateCcw, X } from 'lucide-react';
import { generateReceiptPDF, downloadPDF } from '../Generates/pdf';
import { fixName } from '../lib/fixNames';
import logo1 from '../../images/LOGO1.jpg';

interface ReceiptProps {
  letterId: string;
  onBack: () => void;
}

export default function Receipt({ letterId, onBack }: ReceiptProps) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [statuses, setStatuses] = useState<LetterStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [letterId]);

  const fetchData = async () => {
    try {
      const letterData = await getLetter(letterId);
      if (!letterData) throw new Error('Letter not found');
      setLetter(letterData);
      setStatuses(await getStatusesForLetter(letterId));
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Released / Returned actions — staff only
  const isStaff = getRole() === 'staff';
  const [showReleasedConfirm, setShowReleasedConfirm] = useState(false);
  const [showReturnedConfirm, setShowReturnedConfirm] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [actionSaving, setActionSaving] = useState(false);

  const handleReleased = async () => {
    setActionSaving(true);
    try {
      await insertStatuses([{ letter_id: letterId, status_type: 'released', signed_by: localStorage.getItem('dts_username') || 'staff', notes: '' }]);
      setShowReleasedConfirm(false);
      await fetchData();
    } catch { /* ignore */ }
    finally { setActionSaving(false); }
  };

  const handleReturned = async () => {
    if (!returnNotes.trim()) return;
    setActionSaving(true);
    try {
      await insertStatuses([{ letter_id: letterId, status_type: 'returned', signed_by: localStorage.getItem('dts_username') || 'staff', notes: returnNotes.trim() }]);
      setShowReturnedConfirm(false);
      setReturnNotes('');
      await fetchData();
    } catch { /* ignore */ }
    finally { setActionSaving(false); }
  };

  const handlePrintSavePDF = async () => {
    if (!letter || isGeneratingPDF) return;
    
    setIsGeneratingPDF(true);
    try {
      // Only pass the noted status to the PDF
      const notedStatuses = statuses.filter(s => s.status_type === 'noted');
      const pdf = await generateReceiptPDF(
        letter,
        notedStatuses.map(s => ({ ...s, signed_by: fixName(s.signed_by), notes: fixName(s.notes) }))
      );
      downloadPDF(pdf, `receipt-${letter.reference_number}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <p className="text-red-600 text-lg">Letter not found</p>
          <button onClick={onBack} className="mt-4 text-green-600 hover:underline">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const requiredList = (letter.required_statuses || 'noted,approved,reviewed').split(',').map(s => s.trim());
  const hasNoted = statuses.some((s) => s.status_type === 'noted');
  const hasReviewed = statuses.some((s) => s.status_type === 'reviewed' || s.status_type === 'for review');
  const hasApproved = statuses.some((s) => s.status_type === 'approved' || s.status_type === 'for approval');
  const allComplete = requiredList.every(r => {
    if (r === 'noted') return hasNoted;
    if (r === 'approved' || r === 'for approval') return hasApproved;
    if (r === 'reviewed' || r === 'for review') return hasReviewed;
    return statuses.some(s => s.status_type === r);
  });

  // Receipt only shows the final "noted" status by Sir Violon
  const notedStatus = statuses.find(s => s.status_type === 'noted');
  const releasedStatus = statuses.find(s => s.status_type === 'released');
  const returnedStatus = statuses.find(s => s.status_type === 'returned');
  const hasAction = !!(releasedStatus || returnedStatus);

  return (
    <>
    <div className="min-h-screen p-3 py-4 print:bg-white" style={{ background: 'var(--app-bg)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-all font-medium text-white"
            style={{ backgroundColor: 'var(--primary)', border: '1px solid rgba(255,255,255,0.15)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Document Library
          </button>

          <button
            onClick={handlePrintSavePDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            style={{ backgroundColor: 'var(--primary)', border: '2px solid rgba(255,255,255,0.25)', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}
            onMouseEnter={e => !isGeneratingPDF && (e.currentTarget.style.backgroundColor = 'var(--accent)')}
            onMouseLeave={e => !isGeneratingPDF && (e.currentTarget.style.backgroundColor = 'var(--primary)')}
          >
            {isGeneratingPDF ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Generating PDF...</>
            ) : (
              <><Download className="w-5 h-5" />Print / Save Receipt</>
            )}
          </button>
        </div>

        <div className="rounded-2xl shadow-xl p-5 print:shadow-none print:p-0" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>
          {/* Header Section */}
          <div className="text-center mb-5 pb-4 print:mb-4 print:pb-3" style={{ borderBottom: '2px solid #e5e7eb' }}>
            <div className="flex justify-center mb-3">
              <div className="rounded-full overflow-hidden" style={{ width: 64, height: 64, border: '2px solid #d1d5db' }}>
                <img src={logo1} alt="PTO Logo" className="w-full h-full object-cover" />
              </div>
            </div>
            <h1 className="text-xl font-bold mb-1 print:text-lg" style={{ color: '#111827' }}>Document Tracking Receipt</h1>
            <p className="font-medium text-sm print:text-xs" style={{ color: '#6b7280' }}>Official Status Record</p>
            <p className="text-xs mt-1 print:text-[10px]" style={{ color: '#9ca3af' }}>
              This is the official record of all signatures and status updates on this document
            </p>
          </div>

          {/* Document Information and QR Code Section */}
          <div className="mb-5 pb-4 print:mb-4 print:pb-3" style={{ borderBottom: '2px solid #e5e7eb' }}>
            <div className="flex flex-row gap-4 print:gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold mb-3 print:text-sm" style={{ color: '#111827' }}>Document Information</h2>
                <div className="space-y-2 print:space-y-2">
                  <div className="grid grid-cols-2 gap-3 print:gap-2">
                    <div className="print:break-inside-avoid">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#6b7280' }}>Reference Number</p>
                      <p className="text-sm font-bold print:text-xs" style={{ color: '#111827' }}>{letter.reference_number}</p>
                    </div>
                    <div className="print:break-inside-avoid">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#6b7280' }}>Status</p>
                      <p className="text-sm font-bold print:text-xs">
                        {allComplete
                          ? <span style={{ color: '#16a34a' }}>✓ Complete</span>
                          : <span style={{ color: '#d97706' }}>⏳ In Progress</span>}
                      </p>
                    </div>
                  </div>
                  <div className="print:break-inside-avoid">
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#6b7280' }}>Title</p>
                    <p className="font-medium text-sm print:text-xs" style={{ color: '#111827' }}>{letter.title}</p>
                  </div>
                  {letter.document_type && (
                    <div className="print:break-inside-avoid">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#6b7280' }}>Document Type</p>
                      <p className="capitalize text-sm print:text-xs" style={{ color: '#111827' }}>{letter.document_type}</p>
                    </div>
                  )}
                  {letter.document_subject && (
                    <div className="print:break-inside-avoid">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#6b7280' }}>Subject</p>
                      <p className="text-sm print:text-xs" style={{ color: '#111827' }}>{letter.document_subject}</p>
                    </div>
                  )}
                  {letter.description && (
                    <div className="print:break-inside-avoid">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#6b7280' }}>Description</p>
                      <p className="text-sm print:text-xs" style={{ color: '#111827' }}>{letter.description}</p>
                    </div>
                  )}
                  <div className="print:break-inside-avoid">
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#6b7280' }}>Created Date</p>
                    <p className="text-sm print:text-xs" style={{ color: '#111827' }}>{new Date(letter.created_at).toLocaleDateString()}</p>
                  </div>
                  {letter.document_direction === 'sending' && (
                    <div className="print:break-inside-avoid">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#6b7280' }}>Date Sent</p>
                      <p className="text-sm print:text-xs" style={{ color: '#111827' }}>{new Date(letter.sent_at || letter.created_at).toLocaleString()}</p>
                    </div>
                  )}
                  {letter.document_direction === 'receiving' && (() => {
                    const reviewStatus = statuses.find(s => s.status_type === 'for review' || s.status_type === 'reviewed');
                    return reviewStatus ? (
                      <div className="print:break-inside-avoid">
                        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#6b7280' }}>Date Received</p>
                        <p className="text-sm print:text-xs" style={{ color: '#111827' }}>{new Date(reviewStatus.signed_at).toLocaleString()}</p>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
              {/* QR Code */}
              <div className="flex-shrink-0 flex flex-col items-center justify-start w-36">
                <h2 className="text-sm font-bold mb-2 print:text-xs" style={{ color: '#111827' }}>Reference QR Code</h2>
                <div className="flex flex-col items-center">
                  <div className="p-2 rounded print:p-1 bg-white">
                    <QRCodeSVG value={`${window.location.origin}/?ref=${letter.reference_number}&type=${letter.document_type || 'document'}&id=${letter.id}`} size={100} level="H" className="print:w-16 print:h-16" />
                  </div>
                  <p className="text-[10px] mt-1 text-center print:text-[8px]" style={{ color: '#9ca3af' }}>Scan to track</p>
                </div>
              </div>
            </div>
          </div>

          {/* Noted By Section */}
          <div className="mb-5 print:mb-4">
            <h2 className="text-base font-bold mb-3 print:text-sm" style={{ color: '#111827' }}>Noted By</h2>
            {notedStatus ? (
              <div className="rounded-xl p-3 print:p-2 print:break-inside-avoid" style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}>
                <div className="flex items-start gap-2">
                  <div className="mt-1 flex-shrink-0">
                    <CheckCircle className="w-5 h-5 print:w-4 print:h-4" style={{ color: '#16a34a' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm mb-1 print:text-xs" style={{ color: '#111827' }}>Noted By</h3>
                    <div className="space-y-1 text-xs print:text-[10px]" style={{ color: '#374151' }}>
                      <p><span className="font-semibold">Signed by:</span> {fixName(notedStatus.signed_by)}</p>
                      <p><span className="font-semibold">Date & Time:</span> {new Date(notedStatus.signed_at).toLocaleString()}</p>
                      {notedStatus.notes && <p><span className="font-semibold">Notes:</span> {fixName(notedStatus.notes)}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-3 print:p-2" style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb' }}>
                <div className="flex items-start gap-2">
                  <div className="mt-1 flex-shrink-0">
                    <Clock className="w-5 h-5 print:w-4 print:h-4" style={{ color: '#9ca3af' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm mb-1 print:text-xs" style={{ color: '#374151' }}>Awaiting Notation</h3>
                    <p className="text-xs print:text-[10px]" style={{ color: '#9ca3af' }}>Document has not been noted by Sir Ronald yet</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Released / Returned Section */}
          {isStaff && (
            <div className="mb-5 print:hidden">
              {/* Already actioned — show result */}
              {hasAction ? (
                <div className="rounded-xl p-3 flex items-start gap-3" style={{
                  background: releasedStatus ? '#eff6ff' : '#fef2f2',
                  border: releasedStatus ? '1.5px solid #93c5fd' : '1.5px solid #fca5a5',
                }}>
                  <div className="mt-0.5 flex-shrink-0">
                    {releasedStatus
                      ? <ArrowUpFromLine className="w-5 h-5" style={{ color: '#2563eb' }} />
                      : <RotateCcw className="w-5 h-5" style={{ color: '#dc2626' }} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: releasedStatus ? '#1d4ed8' : '#b91c1c' }}>
                      {releasedStatus ? 'Document For Released' : 'Document Returned'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                      By: {releasedStatus?.signed_by ?? returnedStatus?.signed_by} · {new Date((releasedStatus ?? returnedStatus)!.signed_at).toLocaleString()}
                    </p>
                    {returnedStatus?.notes && (
                      <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Reason: {returnedStatus.notes}</p>
                    )}
                  </div>
                </div>
              ) : (
                /* Action buttons */
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#6b7280' }}>Document Action</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowReleasedConfirm(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                      style={{ backgroundColor: 'var(--primary)' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--primary-hover, var(--accent))')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
                    >
                      <ArrowUpFromLine className="w-4 h-4" /> For Released
                    </button>
                    <button
                      onClick={() => setShowReturnedConfirm(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                      style={{ background: 'transparent', border: '1.5px solid var(--primary)', color: 'var(--primary)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--primary-rgb),0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <RotateCcw className="w-4 h-4" /> Returned
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Section */}
          <div className="pt-4 text-center text-xs print:pt-3 print:border-t print:text-[10px]" style={{ borderTop: '1px solid #e5e7eb', color: '#9ca3af' }}>
            <p className="font-medium" style={{ color: '#6b7280' }}>This is an official tracking receipt</p>
            <p className="mt-1">Generated on {new Date().toLocaleString()}</p>
            <p className="mt-1">DocuTrack — Provincial Treasurer's Office</p>
          </div>
        </div>
      </div>
    </div>

    {/* For Released confirm */}
    {showReleasedConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
        <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(var(--accent-rgb),0.2)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ color: 'var(--accent-text)' }}>Confirm For Released</h2>
            <button onClick={() => setShowReleasedConfirm(false)} style={{ color: 'rgba(var(--accent-rgb),0.5)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm mb-1" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>
            Mark this document as <span className="font-semibold" style={{ color: 'var(--accent)' }}>For Released</span>?
          </p>
          <p className="text-xs mb-5" style={{ color: 'rgba(var(--accent-rgb),0.5)' }}>
            This means the document has been released to the concerned party.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowReleasedConfirm(false)}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'rgba(var(--accent-text-rgb),0.7)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.08)')}>
              Cancel
            </button>
            <button onClick={handleReleased} disabled={actionSaving}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: 'var(--primary)' }}
              onMouseEnter={e => !actionSaving && (e.currentTarget.style.backgroundColor = 'var(--accent)')}
              onMouseLeave={e => !actionSaving && (e.currentTarget.style.backgroundColor = 'var(--primary)')}>
              {actionSaving ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Returned confirm */}
    {showReturnedConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
        <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(var(--accent-rgb),0.2)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ color: 'var(--accent-text)' }}>Confirm Returned</h2>
            <button onClick={() => { setShowReturnedConfirm(false); setReturnNotes(''); }} style={{ color: 'rgba(var(--accent-rgb),0.5)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm mb-3" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>
            Mark this document as <span className="font-semibold" style={{ color: 'var(--accent-text)' }}>Returned</span>?
          </p>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>
            Reason for Return <span style={{ color: '#fca5a5' }}>*</span>
          </label>
          <textarea
            value={returnNotes}
            onChange={e => setReturnNotes(e.target.value)}
            placeholder="Explain why the document is being returned..."
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-xl resize-none focus:outline-none mb-4"
            style={{ background: 'var(--input-bg)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'var(--accent-text)' }}
          />
          <div className="flex gap-3">
            <button onClick={() => { setShowReturnedConfirm(false); setReturnNotes(''); }}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'rgba(var(--accent-text-rgb),0.7)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.08)')}>
              Cancel
            </button>
            <button onClick={handleReturned} disabled={actionSaving || !returnNotes.trim()}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: 'var(--primary)', border: '1px solid rgba(var(--accent-rgb),0.3)' }}
              onMouseEnter={e => (!actionSaving && returnNotes.trim()) && (e.currentTarget.style.backgroundColor = 'var(--accent)')}
              onMouseLeave={e => (!actionSaving && returnNotes.trim()) && (e.currentTarget.style.backgroundColor = 'var(--primary)')}>
              {actionSaving ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
