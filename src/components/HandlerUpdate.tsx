import { useState, useEffect, useRef } from 'react';
import { getLetter, getStatusesForLetter, insertStatuses, createActionTicket, getActionTickets } from '../lib/api';
import { Letter, LetterStatus, ActionTicket } from '../types';
import { Lock, CheckSquare, ArrowLeft, ChevronDown, Check, Ticket } from 'lucide-react';
import ActionTicketModal from './ActionTicket';
import { fixName } from '../lib/fixNames';

interface HandlerUpdateProps {
  letterId: string;
  onBack: () => void;
}

const SIR_RONALD = 'RONALD JAME D. VIOLON, CPA, REB, REA, MDMG';
const SIR_LENMARK = 'Linmark G. Benlot, Acting Assistant Provincial Treasurer';
const MAAM_FLOR = 'Floramae Constantino, Acting Assistant Provincial Treasurer';

const ASSIGNEES = [SIR_LENMARK, MAAM_FLOR, 'Other Personnel'];

export default function HandlerUpdate({ letterId, onBack }: HandlerUpdateProps) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [statuses, setStatuses] = useState<LetterStatus[]>([]);
  const [actionTickets, setActionTickets] = useState<ActionTicket[]>([]);
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Review step state
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewChecked, setReviewChecked] = useState(false);

  // Approval step state
  const [approvalMode, setApprovalMode] = useState<'self' | 'assign' | ''>('');
  const [assignTo, setAssignTo] = useState('');
  const [assignToOther, setAssignToOther] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [instruction, setInstruction] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ticket preview modal
  const [previewTicket, setPreviewTicket] = useState<ActionTicket | null>(null);

  // Confirm dialogs
  const [showReviewConfirm, setShowReviewConfirm] = useState(false);
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);

  useEffect(() => { fetchData(); }, [letterId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
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
      } catch {
        setActionTickets([]);
      }
    } catch (err) {
      setError('Failed to load letter');
    } finally {
      setLoading(false);
    }
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
  const isReviewed = statuses.some(s => s.status_type === 'for review' || s.status_type === 'reviewed');
  const isApproved = statuses.some(s => s.status_type === 'for approval' || s.status_type === 'approved');
  const reviewStatus = statuses.find(s => s.status_type === 'for review' || s.status_type === 'reviewed');
  const approvalStatus = statuses.find(s => s.status_type === 'for approval' || s.status_type === 'approved');

  // ── Submit review ─────────────────────────────────────────
  const handleReviewSubmit = async () => {
    setShowReviewConfirm(false);
    setSaving(true);
    try {
      await insertStatuses([{
        letter_id: letterId,
        status_type: 'for review',
        signed_by: SIR_LENMARK,
        notes: reviewNotes,
      }]);
      await fetchData();
      setReviewChecked(false);
      setReviewNotes('');
      setShowSuccess(true);
    } catch {
      setError('Failed to save review status.');
    } finally {
      setSaving(false);
    }
  };

  // ── Submit approval ───────────────────────────────────────
  const handleApprovalSubmit = async () => {
    setShowApprovalConfirm(false);
    setSaving(true);
    try {
      const finalAssignTo = assignTo === 'Other Personnel' ? assignToOther : assignTo;

      if (approvalMode === 'assign') {
        // Generate action ticket + record status
        await createActionTicket(letterId, {
          assigned_by: SIR_RONALD,
          assigned_to: finalAssignTo,
          action_notes: instruction,
          due_date: dueDate || undefined,
        });
      }

      await insertStatuses([{
        letter_id: letterId,
        status_type: 'for approval',
        signed_by: SIR_RONALD,
        notes: approvalMode === 'assign'
          ? `Assigned to: ${finalAssignTo}${instruction ? '. ' + instruction : ''}`
          : approvalNotes,
      }]);

      await fetchData();
      setApprovalMode('');
      setAssignTo('');
      setAssignToOther('');
      setDueDate('');
      setInstruction('');
      setApprovalNotes('');
      setShowSuccess(true);
    } catch {
      setError('Failed to save approval status.');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / not found ───────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: '#9CAF88' }}></div>
        <p className="mt-3 text-sm" style={{ color: 'rgba(156,175,136,0.8)' }}>Loading...</p>
      </div>
    </div>
  );

  if (!letter) return (
    <div className="flex items-center justify-center p-8">
      <div className="p-6 max-w-md text-center rounded-2xl" style={{ background: 'rgba(0,45,20,0.45)', backdropFilter: 'blur(20px)', border: '1px solid rgba(156,175,136,0.2)' }}>
        <p style={{ color: '#fca5a5' }}>Letter not found</p>
        <button onClick={onBack} className="mt-3 hover:underline text-sm" style={{ color: '#9CAF88' }}>Go back</button>
      </div>
    </div>
  );

  if (!authenticated) return (
    <div className="flex items-center justify-center p-6">
      <div className="rounded-2xl p-6 max-w-md w-full" style={{ background: 'rgba(0,45,20,0.55)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(156,175,136,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm hover:opacity-80" style={{ color: '#9CAF88' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-center mb-5">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-2xl" style={{ background: 'rgba(156,175,136,0.15)', border: '1px solid rgba(156,175,136,0.25)' }}>
              <Lock className="w-8 h-8" style={{ color: '#9CAF88' }} />
            </div>
          </div>
          <h1 className="text-xl font-bold mb-1" style={{ color: '#DFF5E1' }}>Handler Verification</h1>
          <p className="text-xs" style={{ color: 'rgba(156,175,136,0.7)' }}>Enter your PIN to record status updates</p>
        </div>
        <form onSubmit={handlePinSubmit} className="space-y-3">
          <div>
            <label htmlFor="pin" className="block text-xs font-medium mb-1" style={{ color: 'rgba(156,175,136,0.85)' }}>PIN</label>
            <input type="password" id="pin" value={pin} onChange={(e) => setPin(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(156,175,136,0.2)', color: '#DFF5E1' }}
              placeholder="Enter PIN" required />
          </div>
          {error && <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>{error}</div>}
          <button type="submit" className="w-full text-white py-2 px-4 rounded-xl text-sm font-medium transition-colors"
            style={{ backgroundColor: '#004526' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9CAF88'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#004526'}>
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );

  const resolvedAssignTo = assignTo === 'Other Personnel' ? assignToOther : assignTo;

  return (
    <>
    <div className="p-4 py-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="mb-3 flex items-center gap-2 text-sm hover:opacity-80" style={{ color: '#9CAF88' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(0,45,20,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(156,175,136,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4" style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(156,175,136,0.15)' }}>
            <div className="p-2 rounded-xl" style={{ background: 'rgba(156,175,136,0.15)', border: '1px solid rgba(156,175,136,0.25)' }}>
              <CheckSquare className="w-5 h-5" style={{ color: '#9CAF88' }} />
            </div>
            <div>
              <h1 className="text-base font-bold" style={{ color: '#DFF5E1' }}>Record Status Updates</h1>
              <p className="text-xs" style={{ color: 'rgba(223,245,225,0.55)' }}>{letter.title}</p>
              <p className="text-xs" style={{ color: 'rgba(156,175,136,0.6)' }}>Ref: {letter.reference_number}</p>
            </div>
          </div>

          <div className="p-5 space-y-3">

            {/* ── STEP 1: FOR REVIEW ─────────────────────────── */}
            <div className="rounded-2xl overflow-hidden" style={{
              background: isReviewed ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.18)',
              border: isReviewed ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(156,175,136,0.15)',
            }}>
              {/* Step 1 header row */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(156,175,136,0.1)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: isReviewed ? '#10b981' : '#004526' }}>
                    {isReviewed ? '✓' : '1'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#DFF5E1' }}>For Review</p>
                    <p className="text-xs" style={{ color: 'rgba(156,175,136,0.7)' }}>{SIR_LENMARK}</p>
                  </div>
                </div>
                {isReviewed
                  ? <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>✓ Reviewed</span>
                  : <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.1)', color: '#fcd34d', border: '1px solid rgba(251,191,36,0.2)' }}>⏳ Pending</span>}
              </div>

              {/* Step 1 body */}
              <div className="px-4 py-3">
                {isReviewed && reviewStatus ? (
                  <div className="text-xs space-y-0.5" style={{ color: 'rgba(223,245,225,0.75)' }}>
                    <p>Reviewed by: <span className="font-medium" style={{ color: '#DFF5E1' }}>{reviewStatus.signed_by}</span></p>
                    <p style={{ color: 'rgba(156,175,136,0.65)' }}>Date: {new Date(reviewStatus.signed_at).toLocaleString()}</p>
                    {reviewStatus.notes && <p>Notes: {reviewStatus.notes}</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button type="button" onClick={() => setReviewChecked(v => !v)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{
                        border: reviewChecked ? '1px solid rgba(156,175,136,0.45)' : '1px solid rgba(156,175,136,0.18)',
                        background: reviewChecked ? 'rgba(156,175,136,0.2)' : 'rgba(0,0,0,0.15)',
                        color: reviewChecked ? '#DFF5E1' : 'rgba(223,245,225,0.6)',
                      }}>
                      {reviewChecked && <Check className="w-3 h-3" />}
                      Mark as Reviewed &amp; Verified
                    </button>
                    {reviewChecked && (
                      <>
                        <input type="text" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Notes (optional)"
                          className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                          style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(156,175,136,0.2)', color: '#DFF5E1' }} />
                        <button onClick={() => setShowReviewConfirm(true)} disabled={saving}
                          className="w-full text-white py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                          style={{ backgroundColor: '#004526' }}
                          onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#005c33')}
                          onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#004526')}>
                          Save Review
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── STEP 2: FOR APPROVAL ───────────────────────── */}
            <div className="rounded-2xl overflow-hidden" style={{
              background: !isReviewed ? 'rgba(0,0,0,0.18)' : isApproved ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.18)',
              border: !isReviewed ? '1px solid rgba(156,175,136,0.15)' : isApproved ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(156,175,136,0.15)',
              opacity: !isReviewed ? 0.55 : 1,
            }}>
              {/* Step 2 header row */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(156,175,136,0.1)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: isApproved ? '#10b981' : isReviewed ? '#004526' : '#4b5563' }}>
                    {isApproved ? '✓' : '2'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#DFF5E1' }}>For Approval</p>
                    <p className="text-xs" style={{ color: 'rgba(156,175,136,0.7)' }}>{SIR_RONALD}</p>
                  </div>
                </div>
                {!isReviewed
                  ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(156,175,136,0.5)', border: '1px solid rgba(156,175,136,0.1)' }}>🔒 Locked</span>
                  : isApproved
                    ? <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>✓ Approved</span>
                    : <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.1)', color: '#fcd34d', border: '1px solid rgba(251,191,36,0.2)' }}>⏳ Pending</span>}
              </div>

              {/* Step 2 body */}
              <div className="px-4 py-3">
                {isApproved && approvalStatus ? (
                  <div className="space-y-1">
                    <div className="text-xs space-y-0.5" style={{ color: 'rgba(223,245,225,0.75)' }}>
                      <p>Approved by: <span className="font-medium" style={{ color: '#DFF5E1' }}>{approvalStatus.signed_by}</span></p>
                      <p style={{ color: 'rgba(156,175,136,0.65)' }}>Date: {new Date(approvalStatus.signed_at).toLocaleString()}</p>
                      {approvalStatus.notes && <p>Notes: {fixName(approvalStatus.notes)}</p>}
                    </div>
                    {actionTickets.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold" style={{ color: 'rgba(156,175,136,0.8)' }}>Action Tickets:</p>
                        {actionTickets.map(t => (
                          <button key={t.id} onClick={() => setPreviewTicket(t)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors"
                            style={{ background: 'rgba(156,175,136,0.08)', border: '1px solid rgba(156,175,136,0.18)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(156,175,136,0.15)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(156,175,136,0.08)')}>
                            <span className="flex items-center gap-1.5">
                              <Ticket className="w-3.5 h-3.5" style={{ color: '#9CAF88' }} />
                              <span className="font-medium" style={{ color: '#DFF5E1' }}>{t.ticket_number}</span>
                              <span style={{ color: 'rgba(156,175,136,0.7)' }}>→ {fixName(t.assigned_to)}</span>
                            </span>
                            <span className="px-1.5 py-0.5 rounded-full font-medium text-xs"
                              style={t.status === 'completed'
                                ? { background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }
                                : { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}>
                              {t.status === 'completed' ? '✓ Done' : '🖨 For Printing'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : isReviewed ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {(['self', 'assign'] as const).map(mode => (
                        <button key={mode} type="button" onClick={() => setApprovalMode(mode)}
                          className="py-2 px-3 rounded-xl text-xs font-medium transition-all"
                          style={{
                            border: approvalMode === mode ? '1px solid rgba(156,175,136,0.45)' : '1px solid rgba(156,175,136,0.18)',
                            background: approvalMode === mode ? 'rgba(156,175,136,0.2)' : 'rgba(0,0,0,0.15)',
                            color: approvalMode === mode ? '#DFF5E1' : 'rgba(223,245,225,0.6)',
                          }}>
                          {mode === 'self' ? '✍️ Sir Ronald acts himself' : '📋 Assign to someone'}
                        </button>
                      ))}
                    </div>
                    {approvalMode === 'self' && (
                      <div className="space-y-2">
                        <input type="text" value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} placeholder="Notes (optional)"
                          className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                          style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(156,175,136,0.2)', color: '#DFF5E1' }} />
                        <button onClick={() => setShowApprovalConfirm(true)} disabled={saving}
                          className="w-full text-white py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                          style={{ backgroundColor: '#004526' }}
                          onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#005c33')}
                          onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#004526')}>
                          Save Approval
                        </button>
                      </div>
                    )}
                    {approvalMode === 'assign' && (
                      <div className="space-y-2">
                        <div className="relative" ref={dropdownRef}>
                          <button type="button" onClick={() => setDropdownOpen(v => !v)}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-xl transition-all"
                            style={{ border: assignTo ? '1px solid rgba(156,175,136,0.4)' : '1px solid rgba(156,175,136,0.2)', background: 'rgba(0,0,0,0.25)', color: assignTo ? '#DFF5E1' : 'rgba(156,175,136,0.5)' }}>
                            <span className="truncate">{assignTo || 'Assign to...'}</span>
                            <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2 transition-transform" style={{ color: '#9CAF88', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                          </button>
                          {dropdownOpen && (
                            <div className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden shadow-lg" style={{ background: 'rgba(0,35,15,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(156,175,136,0.2)' }}>
                              {ASSIGNEES.map(name => (
                                <button key={name} type="button" onClick={() => { setAssignTo(name); setDropdownOpen(false); }}
                                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors"
                                  style={{ color: assignTo === name ? '#DFF5E1' : 'rgba(223,245,225,0.7)' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(156,175,136,0.12)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                                  <span>{name}</span>
                                  {assignTo === name && <Check className="w-4 h-4" style={{ color: '#9CAF88' }} />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {assignTo === 'Other Personnel' && (
                          <input type="text" value={assignToOther} onChange={(e) => setAssignToOther(e.target.value)} placeholder="Enter personnel name"
                            className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(156,175,136,0.2)', color: '#DFF5E1' }} />
                        )}
                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                          style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(156,175,136,0.2)', color: '#DFF5E1' }} title="Due Date / Deadline" />
                        <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Instruction / Notes" rows={2}
                          className="w-full px-3 py-2 text-sm rounded-xl resize-none focus:outline-none"
                          style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(156,175,136,0.2)', color: '#DFF5E1' }} />
                        <button onClick={() => { if (!resolvedAssignTo.trim()) { setError('Please select or enter an assignee.'); return; } setError(''); setShowApprovalConfirm(true); }}
                          disabled={saving}
                          className="w-full text-white py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          style={{ backgroundColor: '#004526' }}
                          onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#005c33')}
                          onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#004526')}>
                          <Ticket className="w-4 h-4" /> Generate Action Ticket &amp; Save
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs italic" style={{ color: 'rgba(156,175,136,0.45)' }}>Complete Step 1 (For Review) first before proceeding to approval.</p>
                )}
              </div>
            </div>

            {error && <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>{error}</div>}

          </div>
        </div>
      </div>
    </div>

    {/* Review confirm modal */}
    {showReviewConfirm && (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
        <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: 'rgba(0,40,18,0.92)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(156,175,136,0.2)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#DFF5E1' }}>Confirm Review</h2>
          <p className="text-sm mb-1" style={{ color: 'rgba(223,245,225,0.7)' }}>Reviewer: <span className="font-medium" style={{ color: '#DFF5E1' }}>{SIR_LENMARK}</span></p>
          {reviewNotes && <p className="text-sm mb-3" style={{ color: 'rgba(223,245,225,0.7)' }}>Notes: {reviewNotes}</p>}
          <p className="text-xs mb-5" style={{ color: 'rgba(156,175,136,0.6)' }}>This cannot be undone once saved.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowReviewConfirm(false)} className="flex-1 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(156,175,136,0.2)', color: 'rgba(223,245,225,0.7)' }}>Cancel</button>
            <button onClick={handleReviewSubmit} className="flex-1 px-4 py-2 text-white rounded-xl text-sm font-medium" style={{ backgroundColor: '#004526' }}>Confirm</button>
          </div>
        </div>
      </div>
    )}

    {/* Approval confirm modal */}
    {showApprovalConfirm && (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
        <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: 'rgba(0,40,18,0.92)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(156,175,136,0.2)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#DFF5E1' }}>Confirm Approval</h2>
          <p className="text-sm mb-1" style={{ color: 'rgba(223,245,225,0.7)' }}>Approver: <span className="font-medium" style={{ color: '#DFF5E1' }}>{SIR_RONALD}</span></p>
          {approvalMode === 'assign' && (
            <>
              <p className="text-sm mb-1" style={{ color: 'rgba(223,245,225,0.7)' }}>Assigned to: <span className="font-medium" style={{ color: '#DFF5E1' }}>{resolvedAssignTo}</span></p>
              {dueDate && <p className="text-sm mb-1" style={{ color: 'rgba(223,245,225,0.7)' }}>Due: {new Date(dueDate).toLocaleDateString()}</p>}
              {instruction && <p className="text-sm mb-1" style={{ color: 'rgba(223,245,225,0.7)' }}>Instruction: {instruction}</p>}
              <p className="text-xs px-2 py-1 rounded-lg mb-3" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fcd34d' }}>An Action Tickler Slip will be generated.</p>
            </>
          )}
          <p className="text-xs mb-5" style={{ color: 'rgba(156,175,136,0.6)' }}>This cannot be undone once saved.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowApprovalConfirm(false)} className="flex-1 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(156,175,136,0.2)', color: 'rgba(223,245,225,0.7)' }}>Cancel</button>
            <button onClick={handleApprovalSubmit} className="flex-1 px-4 py-2 text-white rounded-xl text-sm font-medium" style={{ backgroundColor: '#004526' }}>Confirm</button>
          </div>
        </div>
      </div>
    )}

    {/* Success modal */}
    {showSuccess && (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
        <div className="rounded-2xl p-6 max-w-sm w-full text-center" style={{ background: 'rgba(0,40,18,0.92)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(156,175,136,0.2)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(156,175,136,0.15)', border: '1px solid rgba(156,175,136,0.3)' }}>
            <CheckSquare className="w-6 h-6" style={{ color: '#9CAF88' }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#DFF5E1' }}>Status Updated</h2>
          <p className="text-sm mb-5" style={{ color: 'rgba(223,245,225,0.65)' }}>Saved successfully.</p>
          {actionTickets.length > 0 && (
            <button onClick={() => { setShowSuccess(false); setPreviewTicket(actionTickets[0]); }}
              className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ border: '1px solid rgba(156,175,136,0.35)', color: '#9CAF88', background: 'rgba(156,175,136,0.1)' }}>
              <Ticket className="w-4 h-4" /> View Action Ticket
            </button>
          )}
          <button onClick={() => setShowSuccess(false)} className="w-full px-4 py-2 text-white rounded-xl text-sm font-medium" style={{ backgroundColor: '#004526' }}>OK</button>
        </div>
      </div>
    )}

    {/* Action ticket preview modal */}
    {previewTicket && letter && (
      <ActionTicketModal ticket={previewTicket} letter={letter} onClose={() => setPreviewTicket(null)} />
    )}
    </>
  );
}
