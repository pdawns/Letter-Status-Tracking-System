import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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

  useEffect(() => {
    fetchLetter();
  }, [letterId]);

  const fetchLetter = async () => {
    try {
      const { data: letterData, error: letterError } = await supabase
        .from('letters')
        .select('*')
        .eq('id', letterId)
        .single();

      if (letterError) throw letterError;
      setLetter(letterData);

      const { data: statusData, error: statusError } = await supabase
        .from('letter_statuses')
        .select('*')
        .eq('letter_id', letterId)
        .order('signed_at', { ascending: true });

      if (statusError) throw statusError;
      setStatuses(statusData || []);

      const existingStatuses = statusData || [];
      setNoted(existingStatuses.some((s) => s.status_type === 'noted'));
      setApproved(existingStatuses.some((s) => s.status_type === 'approved'));
      setReviewed(existingStatuses.some((s) => s.status_type === 'reviewed'));
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

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const updates: Array<{
      status_type: 'noted' | 'approved' | 'reviewed';
      signed_by: string;
      notes: string;
    }> = [];

    if (noted && notedBy && !statuses.some((s) => s.status_type === 'noted')) {
      updates.push({ status_type: 'noted', signed_by: notedBy, notes: notedNotes });
    }

    if (approved && approvedBy && !statuses.some((s) => s.status_type === 'approved')) {
      updates.push({ status_type: 'approved', signed_by: approvedBy, notes: approvedNotes });
    }

    if (reviewed && reviewedBy && !statuses.some((s) => s.status_type === 'reviewed')) {
      updates.push({ status_type: 'reviewed', signed_by: reviewedBy, notes: reviewedNotes });
    }

    if (updates.length === 0) {
      setError('No new status updates to save');
      return;
    }

    setSaving(true);

    try {
      const insertData = updates.map((update) => ({
        letter_id: letterId,
        ...update,
      }));

      const { error: insertError } = await supabase
        .from('letter_statuses')
        .insert(insertData);

      if (insertError) throw insertError;

      alert('Status updated successfully!');
      fetchLetter();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <p className="text-red-600 text-lg">Letter not found</p>
          <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <Lock className="w-12 h-12 text-blue-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Handler Verification</h1>
            <p className="text-gray-600 mb-1">You are the letter handler/manager</p>
            <p className="text-sm text-gray-500">Enter your PIN to record status updates and signatures</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                PIN
              </label>
              <input
                type="password"
                id="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter PIN"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  const existingNoted = statuses.find((s) => s.status_type === 'noted');
  const existingApproved = statuses.find((s) => s.status_type === 'approved');
  const existingReviewed = statuses.find((s) => s.status_type === 'reviewed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-4 py-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <CheckSquare className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Record Status Updates</h1>
              <p className="text-gray-600">{letter.title}</p>
              <p className="text-sm text-gray-500">Ref: {letter.reference_number}</p>
              <p className="text-sm text-blue-600 mt-1">
                As the handler, record when signers complete each status
              </p>
            </div>
          </div>

          <form onSubmit={handleStatusUpdate} className="space-y-6">
            <div className="space-y-4 border-t pt-6">
              <p className="text-sm font-medium text-gray-700 mb-4">
                Check the boxes below as signers complete each status. Enter the signer's name and date.
              </p>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="noted"
                    checked={noted}
                    onChange={(e) => setNoted(e.target.checked)}
                    disabled={!!existingNoted}
                    className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="noted" className="block font-medium text-gray-900 mb-1">
                      Noted {existingNoted && '✓ Completed'}
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Person who noted the letter</p>
                    {existingNoted ? (
                      <div className="text-sm text-gray-600">
                        <p>Signed by: {existingNoted.signed_by}</p>
                        <p>Date: {new Date(existingNoted.signed_at).toLocaleString()}</p>
                        {existingNoted.notes && <p>Notes: {existingNoted.notes}</p>}
                      </div>
                    ) : (
                      noted && (
                        <>
                          <input
                            type="text"
                            value={notedBy}
                            onChange={(e) => setNotedBy(e.target.value)}
                            placeholder="Signed by (name)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                            required={noted}
                          />
                          <input
                            type="text"
                            value={notedNotes}
                            onChange={(e) => setNotedNotes(e.target.value)}
                            placeholder="Notes (optional)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="reviewed"
                    checked={reviewed}
                    onChange={(e) => setReviewed(e.target.checked)}
                    disabled={!!existingReviewed}
                    className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="reviewed" className="block font-medium text-gray-900 mb-1">
                      Reviewed {existingReviewed && '✓ Completed'}
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Person who reviewed the letter</p>
                    {existingReviewed ? (
                      <div className="text-sm text-gray-600">
                        <p>Signed by: {existingReviewed.signed_by}</p>
                        <p>Date: {new Date(existingReviewed.signed_at).toLocaleString()}</p>
                        {existingReviewed.notes && <p>Notes: {existingReviewed.notes}</p>}
                      </div>
                    ) : (
                      reviewed && (
                        <>
                          <input
                            type="text"
                            value={reviewedBy}
                            onChange={(e) => setReviewedBy(e.target.value)}
                            placeholder="Signed by (name)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                            required={reviewed}
                          />
                          <input
                            type="text"
                            value={reviewedNotes}
                            onChange={(e) => setReviewedNotes(e.target.value)}
                            placeholder="Notes (optional)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="approved"
                    checked={approved}
                    onChange={(e) => setApproved(e.target.checked)}
                    disabled={!!existingApproved}
                    className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="approved" className="block font-medium text-gray-900 mb-1">
                      Approved {existingApproved && '✓ Completed'}
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Person who approved the letter</p>
                    {existingApproved ? (
                      <div className="text-sm text-gray-600">
                        <p>Signed by: {existingApproved.signed_by}</p>
                        <p>Date: {new Date(existingApproved.signed_at).toLocaleString()}</p>
                        {existingApproved.notes && <p>Notes: {existingApproved.notes}</p>}
                      </div>
                    ) : (
                      approved && (
                        <>
                          <input
                            type="text"
                            value={approvedBy}
                            onChange={(e) => setApprovedBy(e.target.value)}
                            placeholder="Signed by (name)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                            required={approved}
                          />
                          <input
                            type="text"
                            value={approvedNotes}
                            onChange={(e) => setApprovedNotes(e.target.value)}
                            placeholder="Notes (optional)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Status Update'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
