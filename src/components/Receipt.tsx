import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Letter, LetterStatus } from '../types';
import { FileText, CheckCircle, Clock, Download, ArrowLeft } from 'lucide-react';

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
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
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

  const hasNoted = statuses.some((s) => s.status_type === 'noted');
  const hasReviewed = statuses.some((s) => s.status_type === 'reviewed');
  const hasApproved = statuses.some((s) => s.status_type === 'approved');
  const allComplete = hasNoted && hasReviewed && hasApproved;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 p-4 py-8 print:bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-green-600 hover:text-green-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Print/Save Receipt
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8 print:shadow-none">
          <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-4 rounded-full">
                <FileText className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Letter Tracking Receipt</h1>
            <p className="text-gray-600">Official Status Record</p>
            <p className="text-sm text-gray-500 mt-2">
              This is the official record of all signatures and status updates on this letter
            </p>
          </div>

          <div className="space-y-6 mb-8">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-1">Reference Number</h2>
                <p className="text-lg font-semibold text-gray-900">{letter.reference_number}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-1">Status</h2>
                <p className="text-lg font-semibold">
                  {allComplete ? (
                    <span className="text-green-600">Complete</span>
                  ) : (
                    <span className="text-yellow-600">In Progress</span>
                  )}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-1">Title</h2>
              <p className="text-gray-900">{letter.title}</p>
            </div>

            {letter.description && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-1">Description</h2>
                <p className="text-gray-900">{letter.description}</p>
              </div>
            )}

            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-1">Created</h2>
              <p className="text-gray-900">{new Date(letter.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="border-t-2 border-gray-200 pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Signature and Status History</h2>

            <div className="space-y-4">
              {[
                { type: 'noted', label: 'Noted', desc: 'Acknowledged and noted' },
                { type: 'reviewed', label: 'Reviewed', desc: 'Reviewed for accuracy and content' },
                { type: 'approved', label: 'Approved', desc: 'Final approval granted' },
              ].map(({ type, label, desc }) => {
                const status = statuses.find((s) => s.status_type === type);
                const isComplete = !!status;

                return (
                  <div
                    key={type}
                    className={`border-2 rounded-lg p-4 ${
                      isComplete
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {isComplete ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <Clock className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg mb-1">
                          {label}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{desc}</p>
                        {isComplete ? (
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-700">
                              <span className="font-medium">Signed by:</span> {status.signed_by}
                            </p>
                            <p className="text-gray-700">
                              <span className="font-medium">Date & Time:</span>{' '}
                              {new Date(status.signed_at).toLocaleString()}
                            </p>
                            {status.notes && (
                              <p className="text-gray-700">
                                <span className="font-medium">Notes:</span> {status.notes}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">Awaiting signature</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>This is an official tracking receipt</p>
            <p className="mt-1">Generated on {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
