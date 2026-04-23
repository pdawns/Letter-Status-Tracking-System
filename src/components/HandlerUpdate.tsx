import { useState, useEffect, useRef } from 'react';
import { getLetter, getStatusesForLetter, insertStatuses, createActionTicket, getActionTickets, getRole, uploadReviewFile } from '../lib/api';
import { Letter, LetterStatus, ActionTicket } from '../types';
import { Lock, CheckSquare, ArrowLeft, ChevronDown, Check, Ticket, UserCheck, Paperclip, Eye, Loader } from 'lucide-react';
import ActionTicketModal from './ActionTicket';
import { fixName } from '../lib/fixNames';

interface HandlerUpdateProps {
  letterId: string;
  onBack: () => void;
}

const SIR_RONALD = 'RONALD JAME D. VIOLON, CPA, REB, REA, MDMG';
const SIR_LENMARK = 'Linmark G. Benlot, Acting Assistant Provincial Treasurer';
const MAAM_FLOR = 'Floramae Constantino, Acting Assistant Provincial Treasurer';
const REVIEWERS = [SIR_LENMARK, MAAM_FLOR, 'Other'];

// ── Workflow ──────────────────────────────────────────────
// Step 1 → Sir Violon  : assigns to Maam Flor or Sir Linmark, generates tickler slip
// Step 2 → Staff       : receives doc back, marks as reviewed (on behalf of assigned reviewer)
// Step 3 → Sir Violon  : notes the document to complete it

export default function HandlerUpdate({ letterId, onBack }: HandlerUpdateProps) {
  const role = getRole();
  const isViolon = role === 'admin';
  const isStaff = role === 'staff' || role === 'receiver';

  const [letter, setLetter] = useState<Letter | null>(null);
  const [statuses, setStatuses] = useState<LetterStatus[]>([]);
  const [actionTickets, setActionTickets] = useState<ActionTicket[]>([]);
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(isViolon); // admin skips PIN; staff uses PIN
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Step 1 state — Violon assigns reviewer
  const [assignReviewTo, setAssignReviewTo] = useState('');
  const [otherReviewer, setOtherReviewer] = useState('');
  const [reviewDueDate, setReviewDueDate] = useState('');
  const [reviewInstruction, setReviewInstruction] = useState('');
  const [reviewDropdownOpen, setReviewDropdownOpen] = useState(false);
  const reviewDropdownRef = useRef<HTMLDivElement>(null);
  const [showAssignConfirm, setShowAssignConfirm] = useState(false);

  // Step 2 state — Staff marks reviewed
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewChecked, setReviewChecked] = useState(false);
  const [reviewFile, setReviewFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const reviewFileRef = useRef<HTMLInputElement>(null);
  const [showReviewConfirm, setShowReviewConfirm] = useState(false);

  // Step 3 state — Violon notes
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);

  const [previewTicket, setPreviewTicket] = useState<ActionTicket | null>(null);

  useEffect(() => { fetchData(); }, [letterId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (reviewDropdownRef.current && !reviewDropdownRef.current.contains(e.target as Node))
        setReviewDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchData = async () => {
    try {
      const letterData = await getLetter(letterId);
      if (!letterData) throw new Error('Letter not found');
      setLetter(letterData);
      const statusData = await getStatusesForLetter(letterId);
      setStatuses(statusData);
      try {
        const ticketData = await getActionTickets(letterId);
        setActionTickets(Array.isArray(ticketData) ? ticketData : []);
      } catch { setActionTickets([]); }
    } catch { setError('Failed to load letter'); }
    finally { setLoading(false); }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (letter && pin === letter.handler_pin) {
      setAuthenticated(true);
    } else {
      setError('Incorrect PIN. Please try again.');
      setPin('');
    }
  };

  // ── Derived state ─────────────────────────────────────────
  const assignedTicket = actionTickets[0] ?? null;
  const isAssigned = actionTickets.length > 0;
  const assignedTo = assignedTicket ? fixName(assignedTicket.assigned_to) : '';

  const reviewStatus = statuses.find(s => s.status_type === 'reviewed');
  const isReviewed = !!reviewStatus;

  const notedStatus = statuses.find(s => s.status_type === 'noted');
  const isNoted = !!notedStatus;

  // ── Step 1: Violon assigns reviewer ──────────────────────
  const handleAssignSubmit = async () => {
    setShowAssignConfirm(false);
    setSaving(true);
    const finalReviewer = assignReviewTo === 'Other' ? otherReviewer.trim() : assignReviewTo;
    try {
      await createActionTicket(letterId, {
        assigned_by: SIR_RONALD,
        assigned_to: finalReviewer,
        action_notes: reviewInstruction || 'Please review this document.',
        due_date: reviewDueDate || undefined,
      });
      await fetchData();
      setAssignReviewTo('');
      setOtherReviewer('');
      setReviewDueDate('');
      setReviewInstruction('');
      setShowSuccess(true);
    } catch { setError('Failed to assign for review.'); }
    finally { setSaving(false); }
  };

  // ── Step 2: Staff marks reviewed ─────────────────────────
  const handleReviewSubmit = async () => {
    setShowReviewConfirm(false);
    setSaving(true);
    try {
      let review_file_url: string | null = null;
      let review_file_name: string | null = null;
      if (reviewFile) {
        setUploadingFile(true);
        const uploaded = await uploadReviewFile(reviewFile);
        review_file_url = uploaded.file_url;
        review_file_name = uploaded.file_name;
        setUploadingFile(false);
      }
      await insertStatuses([{
        letter_id: letterId,
        status_type: 'reviewed',
        signed_by: assignedTo || SIR_LENMARK,
        notes: reviewNotes,
        review_file_url,
        review_file_name,
      }]);
      await fetchData();
      setReviewChecked(false);
      setReviewNotes('');
      setReviewFile(null);
      setShowSuccess(true);
    } catch { setError('Failed to save review.'); }
    finally { setSaving(false); setUploadingFile(false); }
  };

  // ── Step 3: Violon notes ──────────────────────────────────
  const handleNotedSubmit = async () => {
    setShowApprovalConfirm(false);
    setSaving(true);
    try {
      await insertStatuses([{
        letter_id: letterId,
        status_type: 'noted',
        signed_by: SIR_RONALD,
        notes: approvalNotes,
      }]);
      await fetchData();
      setApprovalNotes('');
      setShowSuccess(true);
    } catch { setError('Failed to save.'); }
    finally { setSaving(false); }
  };


  // ── Loading / not found ───────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--accent)' }} />
        <p className="mt-3 text-sm" style={{ color: 'rgba(var(--accent-rgb),0.8)' }}>Loading...</p>
      </div>
    </div>
  );

  if (!letter) return (
    <div className="flex items-center justify-center p-8">
      <div className="p-6 max-w-md text-center rounded-2xl" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(20px)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}>
        <p style={{ color: '#fca5a5' }}>Letter not found</p>
        <button onClick={onBack} className="mt-3 hover:underline text-sm" style={{ color: 'var(--accent)' }}>Go back</button>
      </div>
    </div>
  );

  if (!authenticated) return (
    <div className="flex items-center justify-center p-6">
      <div className="rounded-2xl p-6 max-w-md w-full" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(var(--accent-rgb),0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm hover:opacity-80" style={{ color: 'var(--accent)' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-center mb-5">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-2xl" style={{ background: 'rgba(var(--accent-rgb),0.15)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
              <Lock className="w-8 h-8" style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--accent-text)' }}>Handler Verification</h1>
          <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>Enter your PIN to record status updates</p>
        </div>
        <form onSubmit={handlePinSubmit} className="space-y-3">
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'var(--accent-text)' }}
            placeholder="Enter PIN" required />
          {error && <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>{error}</div>}
          <button type="submit" className="w-full text-white py-2 px-4 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--primary)' }}>Authenticate</button>
        </form>
      </div>
    </div>
  );

  return (
    <>
    <div className="p-4 py-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="mb-3 flex items-center gap-2 text-sm hover:opacity-80" style={{ color: 'var(--accent)' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(var(--accent-rgb),0.2)', boxShadow: '0 4px 24px var(--input-bg)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4" style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(var(--accent-rgb),0.15)' }}>
            <div className="p-2 rounded-xl" style={{ background: 'rgba(var(--accent-rgb),0.15)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
              <CheckSquare className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h1 className="text-base font-bold" style={{ color: 'var(--accent-text)' }}>Record Status Updates</h1>
              <p className="text-xs" style={{ color: 'rgba(var(--accent-text-rgb),0.55)' }}>{letter.title}</p>
              <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Ref: {letter.reference_number}</p>
            </div>
          </div>

          <div className="p-5 space-y-3">

            {/* ── STEP 1: SIR VIOLON ASSIGNS REVIEWER ──────── */}
            <StepCard
              step={1}
              title="Assign for Review"
              subtitle={isAssigned ? `Assigned to: ${assignedTo}` : 'Sir Ronald assigns reviewer'}
              done={isAssigned}
              locked={false}
            >
              {isAssigned ? (
                <div className="space-y-2">
                  <div className="text-xs space-y-0.5" style={{ color: 'rgba(var(--accent-text-rgb),0.75)' }}>
                    <p>Assigned by: <span className="font-medium" style={{ color: 'var(--accent-text)' }}>{fixName(assignedTicket!.assigned_by)}</span></p>
                    <p>Assigned to: <span className="font-medium" style={{ color: 'var(--accent-text)' }}>{assignedTo}</span></p>
                    {assignedTicket!.due_date && (
                      <p style={{ color: 'rgba(var(--accent-rgb),0.65)' }}>
                        Due: {new Date(assignedTicket!.due_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                    {assignedTicket!.action_notes && <p>Instruction: {fixName(assignedTicket!.action_notes)}</p>}
                  </div>
                  <button onClick={() => setPreviewTicket(assignedTicket!)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                    style={{ background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'var(--accent)' }}>
                    <Ticket className="w-3.5 h-3.5" /> View Action Tickler Slip
                  </button>
                </div>
              ) : isViolon ? (
                <div className="space-y-2">
                  <div className="relative" ref={reviewDropdownRef}>
                    <button type="button" onClick={() => setReviewDropdownOpen(v => !v)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-xl"
                      style={{ border: assignReviewTo ? '1px solid rgba(var(--accent-rgb),0.4)' : '1px solid rgba(var(--accent-rgb),0.2)', background: 'var(--input-bg)', color: assignReviewTo ? 'var(--accent-text)' : 'rgba(var(--accent-rgb),0.5)' }}>
                      <span className="truncate">{assignReviewTo || 'Choose reviewer...'}</span>
                      <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: 'var(--accent)', transform: reviewDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                    </button>
                    {reviewDropdownOpen && (
                      <div className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden shadow-lg" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}>
                        {REVIEWERS.map(name => (
                          <button key={name} type="button" onClick={() => { setAssignReviewTo(name); setReviewDropdownOpen(false); }}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm text-left"
                            style={{ color: assignReviewTo === name ? 'var(--accent-text)' : 'rgba(var(--accent-text-rgb),0.7)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.12)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                            <span>{name}</span>
                            {assignReviewTo === name && <Check className="w-4 h-4" style={{ color: 'var(--accent)' }} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {assignReviewTo === 'Other' && (
                    <input
                      type="text"
                      value={otherReviewer}
                      onChange={(e) => setOtherReviewer(e.target.value)}
                      placeholder="Enter reviewer name..."
                      className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                      style={{ background: 'var(--input-bg)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'var(--accent-text)' }}
                    />
                  )}
                  <input type="date" value={reviewDueDate} onChange={(e) => setReviewDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'var(--accent-text)' }}
                    title="Due Date / Deadline" />
                  <textarea value={reviewInstruction} onChange={(e) => setReviewInstruction(e.target.value)}
                    placeholder="Instruction / Notes (optional)" rows={2}
                    className="w-full px-3 py-2 text-sm rounded-xl resize-none focus:outline-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'var(--accent-text)' }} />
                  <button
                    onClick={() => {
                      if (!assignReviewTo) { setError('Please choose a reviewer.'); return; }
                      if (assignReviewTo === 'Other' && !otherReviewer.trim()) { setError('Please enter the reviewer name.'); return; }
                      setError(''); setShowAssignConfirm(true);
                    }}
                    disabled={saving}
                    className="w-full text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--primary)' }}>
                    <Ticket className="w-4 h-4" /> Assign &amp; Generate Tickler Slip
                  </button>
                </div>
              ) : (
                <p className="text-xs italic" style={{ color: 'rgba(var(--accent-rgb),0.45)' }}>
                  Waiting for Sir Ronald to assign a reviewer.
                </p>
              )}
            </StepCard>

            {/* ── STEP 2: STAFF MARKS REVIEWED ─────────────── */}
            <StepCard
              step={2}
              title="For Review"
              subtitle={isReviewed
                ? `Reviewed by: ${fixName(reviewStatus!.signed_by)}`
                : isAssigned ? `Assigned to: ${assignedTo} — staff to confirm` : 'Awaiting assignment'}
              done={isReviewed}
              locked={!isAssigned}
            >
              {isReviewed ? (
                <div className="space-y-2">
                  {/* Info row */}
                  <div className="flex flex-col gap-0.5 text-xs" style={{ color: 'rgba(var(--accent-text-rgb),0.75)' }}>
                    <p>Reviewed by: <span className="font-semibold" style={{ color: 'var(--accent-text)' }}>{fixName(reviewStatus!.signed_by)}</span></p>
                    <p style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>{new Date(reviewStatus!.signed_at).toLocaleString()}</p>
                    {reviewStatus!.notes && <p className="italic">"{reviewStatus!.notes}"</p>}
                  </div>
                  {/* PDF file card */}
                  {reviewStatus!.review_file_url ? (
                    <button
                      onClick={() => window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(reviewStatus!.review_file_url!)}&embedded=false`, '_blank')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                    >
                      {/* PDF icon */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white" style={{ background: '#dc2626' }}>
                        PDF
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--accent-text)' }}>
                          {reviewStatus!.review_file_name || 'Attached Review File'}
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Click to open PDF</p>
                      </div>
                      <Eye className="w-4 h-4 flex-shrink-0" style={{ color: '#f87171' }} />
                    </button>
                  ) : (
                    <p className="text-xs italic" style={{ color: 'rgba(var(--accent-rgb),0.4)' }}>No file attached</p>
                  )}
                </div>
              ) : isAssigned && isStaff ? (
                <div className="space-y-2">
                  <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.18)', color: 'var(--accent)' }}>
                    Document assigned to <span className="font-semibold">{assignedTo}</span> for review. Confirm once reviewed.
                  </div>
                  <button type="button" onClick={() => setReviewChecked(v => !v)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{
                      border: reviewChecked ? '1px solid rgba(var(--accent-rgb),0.45)' : '1px solid rgba(var(--accent-rgb),0.18)',
                      background: reviewChecked ? 'rgba(var(--accent-rgb),0.2)' : 'rgba(0,0,0,0.15)',
                      color: reviewChecked ? 'var(--accent-text)' : 'rgba(var(--accent-text-rgb),0.6)',
                    }}>
                    {reviewChecked && <Check className="w-3 h-3" />}
                    Confirm Reviewed by {assignedTo}
                  </button>
                  {reviewChecked && (
                    <>
                      <input type="text" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Notes (optional)"
                        className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                        style={{ background: 'var(--input-bg)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'var(--accent-text)' }} />
                      {/* File attach — PDF only */}
                      <input ref={reviewFileRef} type="file" className="hidden"
                        accept=".pdf,application/pdf"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          if (f && f.type !== 'application/pdf') {
                            setError('Only PDF files are allowed.');
                            return;
                          }
                          setReviewFile(f);
                        }} />
                      <button type="button" onClick={() => reviewFileRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                        style={{ border: reviewFile ? '1px solid rgba(var(--accent-rgb),0.45)' : '1px solid rgba(var(--accent-rgb),0.18)', background: reviewFile ? 'rgba(var(--accent-rgb),0.12)' : 'rgba(0,0,0,0.12)', color: reviewFile ? 'var(--accent-text)' : 'rgba(var(--accent-text-rgb),0.55)' }}>
                        <Paperclip className="w-3.5 h-3.5" />
                        {reviewFile ? reviewFile.name : 'Attach File (optional)'}
                      </button>
                      {reviewFile && (
                        <button type="button" onClick={() => setReviewFile(null)}
                          className="text-xs hover:opacity-70"
                          style={{ color: '#fca5a5' }}>
                          Remove file
                        </button>
                      )}
                      <button onClick={() => setShowReviewConfirm(true)} disabled={saving || uploadingFile}
                        className="w-full text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ backgroundColor: 'var(--primary)' }}>
                        {uploadingFile && <Loader className="w-3.5 h-3.5 animate-spin" />}
                        {uploadingFile ? 'Uploading...' : 'Save Review'}
                      </button>
                    </>
                  )}
                </div>
              ) : isAssigned ? (
                <p className="text-xs italic" style={{ color: 'rgba(var(--accent-rgb),0.45)' }}>
                  Waiting for staff to confirm review by {assignedTo}.
                </p>
              ) : (
                <p className="text-xs italic" style={{ color: 'rgba(var(--accent-rgb),0.45)' }}>Complete Step 1 first.</p>
              )}
            </StepCard>

            {/* ── STEP 3: SIR VIOLON NOTES ─────────────────── */}
            <StepCard
              step={3}
              title="Noted By"
              subtitle={isNoted ? `Noted by: ${SIR_RONALD}` : 'Sir Ronald notes the document'}
              done={isNoted}
              locked={!isReviewed}
            >
              {isNoted ? (
                <div className="text-xs space-y-0.5" style={{ color: 'rgba(var(--accent-text-rgb),0.75)' }}>
                  <p>Noted by: <span className="font-medium" style={{ color: 'var(--accent-text)' }}>{notedStatus!.signed_by}</span></p>
                  <p style={{ color: 'rgba(var(--accent-rgb),0.65)' }}>Date: {new Date(notedStatus!.signed_at).toLocaleString()}</p>
                  {notedStatus!.notes && <p>Notes: {fixName(notedStatus!.notes)}</p>}
                </div>
              ) : isReviewed && isViolon ? (
                <div className="space-y-2">
                  <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7' }}>
                    <UserCheck className="w-3.5 h-3.5 inline mr-1.5" />
                    Reviewed by {fixName(reviewStatus!.signed_by)}. Ready for your notation.
                  </div>
                  {reviewStatus!.review_file_url && (
                    <button
                      onClick={() => window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(reviewStatus!.review_file_url!)}&embedded=false`, '_blank')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white" style={{ background: '#dc2626' }}>
                        PDF
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--accent-text)' }}>
                          {reviewStatus!.review_file_name || 'Attached Review File'}
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>Click to open PDF</p>
                      </div>
                      <Eye className="w-4 h-4 flex-shrink-0" style={{ color: '#f87171' }} />
                    </button>
                  )}
                  <input type="text" value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'var(--accent-text)' }} />
                  <button onClick={() => setShowApprovalConfirm(true)} disabled={saving}
                    className="w-full text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: 'var(--primary)' }}>
                    Noted By Sir Ronald
                  </button>
                </div>
              ) : isReviewed ? (
                <p className="text-xs italic" style={{ color: 'rgba(var(--accent-rgb),0.45)' }}>
                  Waiting for Sir Ronald to note this document.
                </p>
              ) : (
                <p className="text-xs italic" style={{ color: 'rgba(var(--accent-rgb),0.45)' }}>Complete Step 2 first.</p>
              )}
            </StepCard>

            {error && (
              <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Step 1 confirm */}
    {showAssignConfirm && (
      <ConfirmModal title="Assign for Review" onCancel={() => setShowAssignConfirm(false)} onConfirm={handleAssignSubmit}>
        <p className="text-sm mb-1" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>
          Assigned by: <span className="font-medium" style={{ color: 'var(--accent-text)' }}>{SIR_RONALD}</span>
        </p>
        <p className="text-sm mb-1" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>
          Assigned to: <span className="font-medium" style={{ color: 'var(--accent-text)' }}>{assignReviewTo === 'Other' ? otherReviewer : assignReviewTo}</span>
        </p>
        {reviewDueDate && (
          <p className="text-sm mb-1" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>
            Due: {new Date(reviewDueDate).toLocaleDateString()}
          </p>
        )}
        <p className="text-xs px-2 py-1 rounded-lg mt-2" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fcd34d' }}>
          An Action Tickler Slip will be generated.
        </p>
      </ConfirmModal>
    )}

    {/* Step 2 confirm */}
    {showReviewConfirm && (
      <ConfirmModal title="Confirm Review" onCancel={() => setShowReviewConfirm(false)} onConfirm={handleReviewSubmit}>
        <p className="text-sm mb-1" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>
          Reviewed by: <span className="font-medium" style={{ color: 'var(--accent-text)' }}>{assignedTo}</span>
        </p>
        {reviewNotes && (
          <p className="text-sm mb-1" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>Notes: {reviewNotes}</p>
        )}
      </ConfirmModal>
    )}

    {/* Step 3 confirm */}
    {showApprovalConfirm && (
      <ConfirmModal title="Confirm Notation" onCancel={() => setShowApprovalConfirm(false)} onConfirm={handleNotedSubmit}>
        <p className="text-sm mb-1" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>
          Noted by: <span className="font-medium" style={{ color: 'var(--accent-text)' }}>{SIR_RONALD}</span>
        </p>
        {approvalNotes && (
          <p className="text-sm mb-1" style={{ color: 'rgba(var(--accent-text-rgb),0.7)' }}>Notes: {approvalNotes}</p>
        )}
      </ConfirmModal>
    )}

    {/* Success */}
    {showSuccess && (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
        <div className="rounded-2xl p-6 max-w-sm w-full text-center" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(var(--accent-rgb),0.2)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(var(--accent-rgb),0.15)', border: '1px solid rgba(var(--accent-rgb),0.3)' }}>
            <CheckSquare className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--accent-text)' }}>Status Updated</h2>
          <p className="text-sm mb-5" style={{ color: 'rgba(var(--accent-text-rgb),0.65)' }}>Saved successfully.</p>
          {actionTickets.length > 0 && (
            <button onClick={() => { setShowSuccess(false); setPreviewTicket(actionTickets[actionTickets.length - 1]); }}
              className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ border: '1px solid rgba(var(--accent-rgb),0.35)', color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.1)' }}>
              <Ticket className="w-4 h-4" /> View Action Tickler Slip
            </button>
          )}
          <button onClick={() => setShowSuccess(false)} className="w-full px-4 py-2 text-white rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--primary)' }}>OK</button>
        </div>
      </div>
    )}

    {previewTicket && letter && (
      <ActionTicketModal ticket={previewTicket} letter={letter} onClose={() => setPreviewTicket(null)} />
    )}
    </>
  );
}

// ── Step card ─────────────────────────────────────────────
function StepCard({ step, title, subtitle, done, locked, children }: {
  step: number; title: string; subtitle: string;
  done: boolean; locked: boolean; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: done ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.18)',
      border: done ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(var(--accent-rgb),0.15)',
      opacity: locked ? 0.55 : 1,
    }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(var(--accent-rgb),0.1)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: done ? '#10b981' : locked ? '#4b5563' : 'var(--primary)' }}>
            {done ? '✓' : step}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>{title}</p>
            <p className="text-xs" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>{subtitle}</p>
          </div>
        </div>
        {locked
          ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(var(--accent-rgb),0.5)', border: '1px solid rgba(var(--accent-rgb),0.1)' }}>🔒 Locked</span>
          : done
            ? <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>✓ Done</span>
            : <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.1)', color: '#fcd34d', border: '1px solid rgba(251,191,36,0.2)' }}>⏳ Pending</span>}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

// ── Confirm modal ─────────────────────────────────────────
function ConfirmModal({ title, onCancel, onConfirm, children }: {
  title: string; onCancel: () => void; onConfirm: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(var(--accent-rgb),0.2)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--accent-text)' }}>{title}</h2>
        {children}
        <p className="text-xs mt-3 mb-5" style={{ color: 'rgba(var(--accent-rgb),0.6)' }}>This cannot be undone once saved.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'rgba(var(--accent-text-rgb),0.7)' }}>
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-white rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--primary)' }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
