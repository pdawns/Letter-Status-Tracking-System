import { useState, useEffect } from 'react';
import { getLetter, getStatusesForLetter, insertStatuses } from '../lib/api';
import { Letter, LetterStatus } from '../types';
import { Lock, CheckSquare, ArrowLeft } from 'lucide-react';

interface HandlerUpdateProps {
  letterId: string;
  onBack: () => void;
}

export default function HandlerUpdate({ letterId, onBack }: HandlerUpdateProps) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [statuses, setStatuses] = useState<LetterStatus[]>([]);
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [noted, setNoted] = useState(false);
  const [approved, setApproved] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const [notedBy, setNotedBy] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [reviewedBy, setReviewedBy] = useState('');

  const [notedNotes, setNotedNotes] = useState('');
  const [approvedNotes, setApprovedNotes] = useState('');
  const [reviewedNotes, setReviewedNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Array<{ status_type: 'noted' | 'approved' | 'reviewed'; signed_by: string; notes: string }>>([]);

  useEffect(() => { fetchLetter(); }, [letterId]);

  const fetchLetter = async () => {
    try {
      const letterData = getLetter(letterId);
      if (!letterData) throw new Error('Letter not found');
      setLetter(letterData);
      const statusData = getStatusesForLetter(letterId);
      setStatuses(statusData);
      setNoted(statusData.some((s) => s.status_type === 'noted'));
      setApproved(statusData.some((s) => s.status_type === 'approved'));
      setReviewed(statusData.some((s) => s.status_type === 'reviewed'));
    } catch (err) {
      console.error('Error fetching letter:', err);
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

  const handleStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const updates: Array<{ status_type: 'noted' | 'approved' | 'reviewed'; signed_by: string; notes: string }> = [];
    if (noted && notedBy && !statuses.some((s) => s.status_type === 'noted'))
      updates.push({ status_type: 'noted', signed_by: notedBy, notes: notedNotes });
    if (approved && approvedBy && !statuses.some((s) => s.status_type === 'approved'))
      updates.push({ status_type: 'approved', signed_by: approvedBy, notes: approvedNotes });
    if (reviewed && reviewedBy && !statuses.some((s) => s.status_type === 'reviewed'))
      updates.push({ status_type: 'reviewed', signed_by: reviewedBy, notes: reviewedNotes });

    if (updates.length === 0) { setError('No new status updates to save'); return; }
    setPendingUpdates(updates);
    setShowConfirm(true);
  };

  const handleConfirmedSave = () => {
    setShowConfirm(false);
    setSaving(true);
    try {
      insertStatuses(pendingUpdates.map((u) => ({ letter_id: letterId, ...u })));
      setShowSuccess(true);
      fetchLetter();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

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
          <h1 className="text-xl font-bold text-gray-900 mb-2">Handler Verification</h1>
          <p className="text-gray-600 text-sm mb-1">You are the letter handler/manager</p>
          <p className="text-xs text-gray-500">Enter your PIN to record status updates and signatures</p>
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

  const existingNoted = statuses.find((s) => s.status_type === 'noted');
  const existingApproved = statuses.find((s) => s.status_type === 'approved');
  const existingReviewed = statuses.find((s) => s.status_type === 'reviewed');

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-4 py-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="mb-3 flex items-center gap-2 text-sm hover:opacity-80" style={{ color: '#004526' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-white rounded-lg shadow-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare className="w-6 h-6" style={{ color: '#004526' }} />
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#004526' }}>Record Status Updates</h1>
              <p className="text-gray-600 text-sm">{letter.title}</p>
              <p className="text-xs text-gray-500">Ref: {letter.reference_number}</p>
            </div>
          </div>

          <form onSubmit={handleStatusUpdate} className="space-y-4">
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs font-medium text-gray-700 mb-3">
                Check the boxes below as signers complete each status. Enter the signer's name and date.
              </p>

              {/* Noted */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="noted" checked={noted} onChange={(e) => setNoted(e.target.checked)}
                    disabled={!!existingNoted} className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500" />
                  <div className="flex-1">
                    <label htmlFor="noted" className="block font-medium text-gray-900 mb-1">Noted {existingNoted && '✓ Completed'}</label>
                    <p className="text-xs text-gray-500 mb-2">Person who noted the letter</p>
                    {existingNoted ? (
                      <div className="text-sm text-gray-600">
                        <p>Signed by: {existingNoted.signed_by}</p>
                        <p>Date: {new Date(existingNoted.signed_at).toLocaleString()}</p>
                        {existingNoted.notes && <p>Notes: {existingNoted.notes}</p>}
                      </div>
                    ) : noted && (
                      <>
                        <input type="text" value={notedBy} onChange={(e) => setNotedBy(e.target.value)}
                          placeholder="Signed by (name)" className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2" required={noted} />
                        <input type="text" value={notedNotes} onChange={(e) => setNotedNotes(e.target.value)}
                          placeholder="Notes (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Reviewed */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="reviewed" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)}
                    disabled={!!existingReviewed} className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500" />
                  <div className="flex-1">
                    <label htmlFor="reviewed" className="block font-medium text-gray-900 mb-1">Reviewed {existingReviewed && '✓ Completed'}</label>
                    <p className="text-xs text-gray-500 mb-2">Person who reviewed the letter</p>
                    {existingReviewed ? (
                      <div className="text-sm text-gray-600">
                        <p>Signed by: {existingReviewed.signed_by}</p>
                        <p>Date: {new Date(existingReviewed.signed_at).toLocaleString()}</p>
                        {existingReviewed.notes && <p>Notes: {existingReviewed.notes}</p>}
                      </div>
                    ) : reviewed && (
                      <>
                        <input type="text" value={reviewedBy} onChange={(e) => setReviewedBy(e.target.value)}
                          placeholder="Signed by (name)" className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2" required={reviewed} />
                        <input type="text" value={reviewedNotes} onChange={(e) => setReviewedNotes(e.target.value)}
                          placeholder="Notes (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Approved */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="approved" checked={approved} onChange={(e) => setApproved(e.target.checked)}
                    disabled={!!existingApproved} className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500" />
                  <div className="flex-1">
                    <label htmlFor="approved" className="block font-medium text-gray-900 mb-1">Approved {existingApproved && '✓ Completed'}</label>
                    <p className="text-xs text-gray-500 mb-2">Person who approved the letter</p>
                    {existingApproved ? (
                      <div className="text-sm text-gray-600">
                        <p>Signed by: {existingApproved.signed_by}</p>
                        <p>Date: {new Date(existingApproved.signed_at).toLocaleString()}</p>
                        {existingApproved.notes && <p>Notes: {existingApproved.notes}</p>}
                      </div>
                    ) : approved && (
                      <>
                        <input type="text" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)}
                          placeholder="Signed by (name)" className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2" required={approved} />
                        <input type="text" value={approvedNotes} onChange={(e) => setApprovedNotes(e.target.value)}
                          placeholder="Notes (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>}

            <button type="submit" disabled={saving}
              className="w-full text-white py-2 px-4 rounded-lg text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: saving ? '#9ca3af' : '#004526' }}
              onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#9CAF88')}
              onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#004526')}>
              {saving ? 'Saving...' : 'Save Status Update'}
            </button>
          </form>
        </div>
      </div>
    </div>

    {/* Confirm Save Modal */}
    {showConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Confirm Status Update</h2>
          <p className="text-gray-600 mb-3 text-sm">You are about to save the following status updates:</p>
          <ul className="mb-4 space-y-1">
            {pendingUpdates.map((u) => (
              <li key={u.status_type} className="text-sm flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: '#004526' }}></span>
                <span className="capitalize font-medium">{u.status_type}</span> — {u.signed_by}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 mb-5">This cannot be undone once saved.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={handleConfirmedSave} className="flex-1 px-4 py-2 text-white rounded-lg transition-colors" style={{ backgroundColor: '#004526' }}>Yes, Save</button>
          </div>
        </div>
      </div>
    )}

    {/* Success Modal */}
    {showSuccess && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#DFF5E1' }}>
            <CheckSquare className="w-6 h-6" style={{ color: '#004526' }} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Status Updated</h2>
          <p className="text-gray-600 text-sm mb-5">The status has been saved successfully.</p>
          <button onClick={() => setShowSuccess(false)} className="w-full px-4 py-2 text-white rounded-lg transition-colors" style={{ backgroundColor: '#004526' }}>OK</button>
        </div>
      </div>
    )}
    </>
  );
}
