import { useState, useEffect, useRef } from 'react';
import { getLetter, getStatusesForLetter, insertStatuses } from '../lib/api';
import { Letter, LetterStatus } from '../types';
import { Lock, CheckSquare, ArrowLeft, ChevronDown, Check } from 'lucide-react';

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
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const REVIEWERS = [
    'Lenmark G. Benlot, Acting Assistant Provincial Treasurer',
    'Floramae Constantito, Acting Assistant Provincial Treasurer',
  ];

  // Dynamic per-status state: { [statusType]: { checked, signedBy, notes } }
  const [statusState, setStatusState] = useState<Record<string, { checked: boolean; signedBy: string; notes: string }>>({});
  const [pendingUpdates, setPendingUpdates] = useState<Array<{ status_type: string; signed_by: string; notes: string }>>([]);

  useEffect(() => { fetchLetter(); }, [letterId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchLetter = async () => {
    try {
      const letterData = await getLetter(letterId);
      if (!letterData) throw new Error('Letter not found');
      setLetter(letterData);
      const statusData = await getStatusesForLetter(letterId);
      setStatuses(statusData);

      // Init state for each required status
      const required = (letterData.required_statuses || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      const init: Record<string, { checked: boolean; signedBy: string; notes: string }> = {};
      required.forEach((r: string) => {
        const existing = statusData.some((s) => s.status_type === r);
        const isApproval = r === 'for approval' || r === 'approved';
        init[r] = {
          checked: existing,
          signedBy: isApproval ? 'RONALD JAME D. VIOLON, CPA, REB, REA, MDMG' : '',
          notes: '',
        };
      });
      setStatusState(init);
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

    const updates: Array<{ status_type: string; signed_by: string; notes: string }> = [];
    Object.entries(statusState).forEach(([type, val]) => {
      const alreadyDone = statuses.some((s) => s.status_type === type);
      if (val.checked && val.signedBy.trim() && !alreadyDone) {
        updates.push({ status_type: type, signed_by: val.signedBy.trim(), notes: val.notes });
      }
    });

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

  const updateStatus = (type: string, field: 'checked' | 'signedBy' | 'notes', value: boolean | string) => {
    setStatusState((prev) => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
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

  const requiredList = (letter.required_statuses || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  const isComplete = requiredList.every((r) => statuses.some((s) => s.status_type === r));

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
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-700">Select completed actions and fill in signer details.</p>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${isComplete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {isComplete ? '✓ Completed' : '⏳ In Progress'}
                </span>
              </div>

              {/* Render in order: for approval/approved first, for review second, others last */}
              {[
                ...requiredList.filter(r => r === 'for approval' || r === 'approved'),
                ...requiredList.filter(r => r === 'for review' || r === 'reviewed'),
                ...requiredList.filter(r => r !== 'for approval' && r !== 'approved' && r !== 'for review' && r !== 'reviewed'),
              ].map((statusType) => {
                const existing = statuses.find((s) => s.status_type === statusType);
                const state = statusState[statusType] ?? { checked: false, signedBy: '', notes: '' };
                // 'noted' and any non-standard types are treated as "Others"
                const isOthers = statusType === 'noted' || (statusType !== 'for approval' && statusType !== 'approved' && statusType !== 'for review' && statusType !== 'reviewed');
                const label = isOthers
                  ? statusType !== 'noted' ? statusType.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : ''
                  : statusType.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                return (
                  <div key={statusType} className="rounded-lg border-2 p-4 transition-all"
                    style={{ borderColor: existing ? '#9CAF88' : state.checked ? '#9CAF88' : '#e5e7eb', backgroundColor: existing ? '#f0faf0' : '#f9fafb' }}>
                    <div className="flex items-center gap-3 mb-2">
                      {/* Pill toggle */}
                      <button
                        type="button"
                        disabled={!!existing}
                        onClick={() => {
                          if (!existing) {
                            const newChecked = !state.checked;
                            const autoSignedBy = (statusType === 'for approval' || statusType === 'approved') && newChecked
                              ? 'RONALD JAME D. VIOLON, CPA, REB, REA, MDMG'
                              : (statusType === 'for approval' || statusType === 'approved') && !newChecked ? '' : state.signedBy;
                            setStatusState((prev) => ({
                              ...prev,
                              [statusType]: { ...prev[statusType], checked: newChecked, signedBy: autoSignedBy },
                            }));
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all duration-150 select-none"
                        style={{
                          borderColor: (existing || state.checked) ? '#9CAF88' : '#d1d5db',
                          backgroundColor: (existing || state.checked) ? '#9CAF88' : '#fff',
                          color: (existing || state.checked) ? '#fff' : '#374151',
                          cursor: existing ? 'default' : 'pointer',
                          opacity: existing ? 0.85 : 1,
                        }}
                      >
                        <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{
                            borderColor: (existing || state.checked) ? '#fff' : '#9ca3af',
                            backgroundColor: (existing || state.checked) ? '#fff' : 'transparent',
                          }}>
                          {(existing || state.checked) && (
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#9CAF88' }} />
                          )}
                        </span>
                        {isOthers ? 'Others' : label}
                      </button>
                      {isOthers && label && (
                        <span className="text-sm font-medium text-gray-500 italic">{label}</span>
                      )}
                      {existing && <span className="text-xs text-green-700 font-medium">✓ Completed</span>}
                    </div>

                    {existing ? (
                      <div className="text-sm text-gray-600 ml-1 space-y-0.5">
                        <p>Signed by: <span className="font-medium">{existing.signed_by}</span></p>
                        <p>Date: {new Date(existing.signed_at).toLocaleString()}</p>
                        {existing.notes && <p>Notes: {existing.notes}</p>}
                      </div>
                    ) : state.checked && (
                      <div className="mt-2 space-y-2">
                        {(statusType === 'for approval' || statusType === 'approved') ? (
                          <div className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium">
                            RONALD JAME D. VIOLON, CPA, REB, REA, MDMG
                          </div>
                        ) : (statusType === 'for review' || statusType === 'reviewed') ? (
                          <div className="relative" ref={dropdownRef}>
                            <button
                              type="button"
                              onClick={() => setDropdownOpen(dropdownOpen === statusType ? null : statusType)}
                              className="w-full flex items-center justify-between px-4 py-2.5 text-sm border-2 rounded-xl transition-all"
                              style={{
                                borderColor: state.signedBy ? '#9CAF88' : '#e5e7eb',
                                backgroundColor: '#fff',
                                color: state.signedBy ? '#374151' : '#9ca3af',
                              }}
                            >
                              <span className="truncate">{state.signedBy || 'Select reviewer...'}</span>
                              <ChevronDown
                                className="w-4 h-4 flex-shrink-0 ml-2 transition-transform"
                                style={{
                                  color: '#9CAF88',
                                  transform: dropdownOpen === statusType ? 'rotate(180deg)' : 'rotate(0deg)',
                                }}
                              />
                            </button>
                            {dropdownOpen === statusType && (
                              <div className="absolute z-20 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                                {REVIEWERS.map((name) => (
                                  <button
                                    key={name}
                                    type="button"
                                    onClick={() => {
                                      updateStatus(statusType, 'signedBy', name);
                                      setDropdownOpen(null);
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-green-50 transition-colors"
                                    style={{ color: state.signedBy === name ? '#004526' : '#374151' }}
                                  >
                                    <span>{name}</span>
                                    {state.signedBy === name && <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#9CAF88' }} />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <input type="text" value={state.signedBy}
                            onChange={(e) => updateStatus(statusType, 'signedBy', e.target.value)}
                            placeholder="Signed by (name)" required
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent" />
                        )}
                        <input type="text" value={state.notes}
                          onChange={(e) => updateStatus(statusType, 'notes', e.target.value)}
                          placeholder="Notes (optional)"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent" />
                      </div>
                    )}
                  </div>
                );
              })}
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

    {showConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Confirm Status Update</h2>
          <p className="text-gray-600 mb-3 text-sm">You are about to save the following status updates:</p>
          <ul className="mb-4 space-y-1">
            {pendingUpdates.map((u) => (
              <li key={u.status_type} className="text-sm flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: '#9CAF88' }}></span>
                <span className="font-medium capitalize">{u.status_type}</span> — {u.signed_by}
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
