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
const SIR_LENMARK = 'Lenmark G. Benlot, Acting Assistant Provincial Treasurer';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: '#004526' }}></div>
        <p className="mt-3 text-gray-600 text-sm">Loading...</p>
      </div>
    </div>
  );

  if (!letter) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
        <p className="text-red-600">Letter not found</p>
        <button onClick={onBack} className="mt-3 hover:underline text-sm" style={{ color: '#004526' }}>Go back</button>
      </div>
    </div>
  );

  // ── PIN screen ────────────────────────────────────────────
  if (!authenticated) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm hover:opacity-80" style={{ color: '#004526' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-center mb-5">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full" style={{ backgroundColor: '#DFF5E1' }}>
              <Lock className="w-8 h-8" style={{ color: '#004526' }} />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Handler Verification</h1>
          <p className="text-xs text-gray-500">Enter your PIN to record status updates</p>
        </div>
        <form onSubmit={handlePinSubmit} className="space-y-3">
          <div>
            <label htmlFor="pin" className="block text-xs font-medium text-gray-700 mb-1">PIN</label>
            <input type="password" id="pin" value={pin} onChange={(e) => setPin(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              placeholder="Enter PIN" required />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>}
          <button type="submit" className="w-full text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-4 py-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="mb-3 flex items-center gap-2 text-sm hover:opacity-80" style={{ color: '#004526' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-white rounded-lg shadow-xl p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-2 border-b pb-4">
            <CheckSquare className="w-6 h-6" style={{ color: '#004526' }} />
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#004526' }}>Record Status Updates</h1>
              <p className="text-gray-600 text-sm">{letter.title}</p>
              <p className="text-xs text-gray-500">Ref: {letter.reference_number}</p>
            </div>
          </div>

          {/* ── STEP 1: FOR REVIEW ─────────────────────────── */}
          <div className={`rounded-lg border-2 p-4 transition-all ${isReviewed ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: '#004526' }}>Step 1</span>
                <span className="text-sm font-semibold text-gray-800">For Review</span>
              </div>
              {isReviewed
                ? <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">✓ Reviewed</span>
                : <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">⏳ Pending</span>}
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Reviewer: <span className="font-medium text-gray-700">{SIR_LENMARK}</span>
            </p>

            {isReviewed && reviewStatus ? (
              <div className="text-xs text-gray-600 space-y-0.5">
                <p>Reviewed by: <span className="font-medium">{reviewStatus.signed_by}</span></p>
                <p>Date: {new Date(reviewStatus.signed_at).toLocaleString()}</p>
                {reviewStatus.notes && <p>Notes: {reviewStatus.notes}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => setReviewChecked(v => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-xs font-medium transition-all"
                    style={{
                      borderColor: reviewChecked ? '#9CAF88' : '#d1d5db',
                      backgroundColor: reviewChecked ? '#9CAF88' : '#fff',
                      color: reviewChecked ? '#fff' : '#374151',
                    }}
                  >
                    {reviewChecked && <Check className="w-3 h-3" />}
                    Mark as Reviewed & Verified
                  </button>
                </label>
                {reviewChecked && (
                  <>
                    <input
                      type="text"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                    <button
                      onClick={() => setShowReviewConfirm(true)}
                      disabled={saving}
                      className="w-full text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#004526' }}
                      onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#9CAF88')}
                      onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#004526')}
                    >
                      Save Review
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── STEP 2: FOR APPROVAL ───────────────────────── */}
          <div className={`rounded-lg border-2 p-4 transition-all ${
            !isReviewed ? 'border-gray-200 bg-gray-100 opacity-60' :
            isApproved ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: isReviewed ? '#004526' : '#9ca3af' }}>Step 2</span>
                <span className="text-sm font-semibold text-gray-800">For Approval</span>
              </div>
              {!isReviewed
                ? <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">🔒 Locked</span>
                : isApproved
                  ? <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">✓ Approved</span>
                  : <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">⏳ Pending</span>}
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Approver: <span className="font-medium text-gray-700">{SIR_RONALD}</span>
            </p>

            {isApproved && approvalStatus ? (
              <div className="space-y-1">
                <div className="text-xs text-gray-600 space-y-0.5">
                  <p>Approved by: <span className="font-medium">{approvalStatus.signed_by}</span></p>
                  <p>Date: {new Date(approvalStatus.signed_at).toLocaleString()}</p>
                  {approvalStatus.notes && <p>Notes: {fixName(approvalStatus.notes)}</p>}
                </div>
                {/* Show existing tickets */}
                {actionTickets.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold text-gray-600">Action Tickets:</p>
                    {actionTickets.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setPreviewTicket(t)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs hover:bg-green-50 transition-colors"
                        style={{ borderColor: '#9CAF88' }}
                      >
                        <span className="flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5" style={{ color: '#004526' }} />
                          <span className="font-medium">{t.ticket_number}</span>
                          <span className="text-gray-500">→ {fixName(t.assigned_to)}</span>
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-full font-medium ${t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {t.status === 'completed' ? '✓ Done' : '🖨 For Printing'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : isReviewed ? (
              <div className="space-y-3">
                {/* Mode selector */}
                <div className="flex gap-2">
                  {(['self', 'assign'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setApprovalMode(mode)}
                      className="flex-1 py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all"
                      style={{
                        borderColor: approvalMode === mode ? '#004526' : '#d1d5db',
                        backgroundColor: approvalMode === mode ? '#f0f7f0' : '#fff',
                        color: approvalMode === mode ? '#004526' : '#374151',
                      }}
                    >
                      {mode === 'self' ? '✍️ Sir Ronald acts himself' : '📋 Assign to someone'}
                    </button>
                  ))}
                </div>

                {/* Self mode */}
                {approvalMode === 'self' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                    <button
                      onClick={() => setShowApprovalConfirm(true)}
                      disabled={saving}
                      className="w-full text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#004526' }}
                      onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#9CAF88')}
                      onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#004526')}
                    >
                      Save Approval
                    </button>
                  </div>
                )}

                {/* Assign mode */}
                {approvalMode === 'assign' && (
                  <div className="space-y-2">
                    {/* Assignee dropdown */}
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setDropdownOpen(v => !v)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-sm border-2 rounded-xl transition-all"
                        style={{ borderColor: assignTo ? '#9CAF88' : '#e5e7eb', color: assignTo ? '#374151' : '#9ca3af' }}
                      >
                        <span className="truncate">{assignTo || 'Assign to...'}</span>
                        <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2 transition-transform" style={{ color: '#9CAF88', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                      </button>
                      {dropdownOpen && (
                        <div className="absolute z-20 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                          {ASSIGNEES.map(name => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => { setAssignTo(name); setDropdownOpen(false); }}
                              className="w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-green-50 transition-colors"
                              style={{ color: assignTo === name ? '#004526' : '#374151' }}
                            >
                              <span>{name}</span>
                              {assignTo === name && <Check className="w-4 h-4" style={{ color: '#9CAF88' }} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Other personnel name */}
                    {assignTo === 'Other Personnel' && (
                      <input
                        type="text"
                        value={assignToOther}
                        onChange={(e) => setAssignToOther(e.target.value)}
                        placeholder="Enter personnel name"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                    )}

                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      title="Due Date / Deadline"
                    />
                    <textarea
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="Instruction / Notes"
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none"
                    />
                    <button
                      onClick={() => {
                        if (!resolvedAssignTo.trim()) { setError('Please select or enter an assignee.'); return; }
                        setError('');
                        setShowApprovalConfirm(true);
                      }}
                      disabled={saving}
                      className="w-full text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#004526' }}
                      onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#9CAF88')}
                      onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#004526')}
                    >
                      <Ticket className="w-4 h-4" /> Generate Action Ticket & Save
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Complete Step 1 (For Review) first before proceeding to approval.</p>
            )}
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>}
        </div>
      </div>
    </div>

    {/* Review confirm */}
    {showReviewConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Confirm Review</h2>
          <p className="text-sm text-gray-600 mb-1">Reviewer: <span className="font-medium">{SIR_LENMARK}</span></p>
          {reviewNotes && <p className="text-sm text-gray-600 mb-3">Notes: {reviewNotes}</p>}
          <p className="text-xs text-gray-400 mb-5">This cannot be undone once saved.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowReviewConfirm(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
            <button onClick={handleReviewSubmit} className="flex-1 px-4 py-2 text-white rounded-lg text-sm" style={{ backgroundColor: '#004526' }}>Confirm</button>
          </div>
        </div>
      </div>
    )}

    {/* Approval confirm */}
    {showApprovalConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Confirm Approval</h2>
          <p className="text-sm text-gray-600 mb-1">Approver: <span className="font-medium">{SIR_RONALD}</span></p>
          {approvalMode === 'assign' && (
            <>
              <p className="text-sm text-gray-600 mb-1">Assigned to: <span className="font-medium">{resolvedAssignTo}</span></p>
              {dueDate && <p className="text-sm text-gray-600 mb-1">Due: {new Date(dueDate).toLocaleDateString()}</p>}
              {instruction && <p className="text-sm text-gray-600 mb-1">Instruction: {instruction}</p>}
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 mb-3">An Action Tickler Slip will be generated.</p>
            </>
          )}
          <p className="text-xs text-gray-400 mb-5">This cannot be undone once saved.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowApprovalConfirm(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
            <button onClick={handleApprovalSubmit} className="flex-1 px-4 py-2 text-white rounded-lg text-sm" style={{ backgroundColor: '#004526' }}>Confirm</button>
          </div>
        </div>
      </div>
    )}

    {/* Success */}
    {showSuccess && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#DFF5E1' }}>
            <CheckSquare className="w-6 h-6" style={{ color: '#004526' }} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Status Updated</h2>
          <p className="text-gray-600 text-sm mb-5">Saved successfully.</p>
          {/* Show latest ticket if one was just created */}
          {actionTickets.length > 0 && (
            <button
              onClick={() => { setShowSuccess(false); setPreviewTicket(actionTickets[0]); }}
              className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2 border-2 rounded-lg text-sm font-medium transition-colors"
              style={{ borderColor: '#9CAF88', color: '#004526' }}
            >
              <Ticket className="w-4 h-4" /> View Action Ticket
            </button>
          )}
          <button onClick={() => setShowSuccess(false)} className="w-full px-4 py-2 text-white rounded-lg text-sm" style={{ backgroundColor: '#004526' }}>OK</button>
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
