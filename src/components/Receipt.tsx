import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { Letter, LetterStatus } from '../types';
import { FileText, CheckCircle, Clock, Download, ArrowLeft, Paperclip, ExternalLink } from 'lucide-react';

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

        <div className="bg-white rounded-lg shadow-xl p-8 print:shadow-none print:p-0">
          {/* Header Section */}
          <div className="text-center mb-8 pb-8 border-b-2 border-gray-200 print:mb-6 print:pb-6">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-4 rounded-full">
                <FileText className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 print:text-2xl">Document Tracking Receipt</h1>
            <p className="text-gray-600 font-medium print:text-sm">Official Status Record</p>
            <p className="text-sm text-gray-500 mt-2 print:text-xs">
              This is the official record of all signatures and status updates on this document
            </p>
          </div>

          {/* Document Information and QR Code Section - Side by Side */}
          <div className="mb-8 pb-8 border-b-2 border-gray-200 print:mb-6 print:pb-6">
            <div className="grid md:grid-cols-3 gap-6 print:gap-4">
              {/* Document Information - Left Side (2/3 width) */}
              <div className="md:col-span-2">
                <h2 className="text-lg font-bold text-gray-900 mb-4 print:text-base">Document Information</h2>
                <div className="space-y-4 print:space-y-3">
                  <div className="grid grid-cols-2 gap-4 print:gap-3">
                    <div className="print:break-inside-avoid">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Reference Number</p>
                      <p className="text-base font-bold text-gray-900 print:text-sm">{letter.reference_number}</p>
                    </div>
                    <div className="print:break-inside-avoid">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</p>
                      <p className="text-base font-bold print:text-sm">
                        {allComplete ? (
                          <span className="text-green-600">✓ Complete</span>
                        ) : (
                          <span className="text-yellow-600">⏳ In Progress</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="print:break-inside-avoid">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Title</p>
                    <p className="text-gray-900 font-medium print:text-sm">{letter.title}</p>
                  </div>

                  {letter.document_type && (
                    <div className="print:break-inside-avoid">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Document Type</p>
                      <p className="text-gray-900 capitalize print:text-sm">{letter.document_type}</p>
                    </div>
                  )}

                  {letter.document_subject && (
                    <div className="print:break-inside-avoid">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Subject</p>
                      <p className="text-gray-900 print:text-sm">{letter.document_subject}</p>
                    </div>
                  )}

                  {letter.description && (
                    <div className="print:break-inside-avoid">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
                      <p className="text-gray-900 print:text-sm">{letter.description}</p>
                    </div>
                  )}

                  <div className="print:break-inside-avoid">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Created Date</p>
                    <p className="text-gray-900 print:text-sm">{new Date(letter.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* QR Code - Right Side (1/3 width) */}
              <div className="md:col-span-1 flex flex-col items-center justify-start">
                <h2 className="text-base font-bold text-gray-900 mb-3 print:text-sm">Reference QR Code</h2>
                <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50 print:border print:border-purple-400 print:p-3 print:bg-white">
                  <div className="flex flex-col items-center">
                    <p className="text-xs text-gray-600 mb-3 print:text-[10px] print:mb-2 text-center">
                      Scan to reference
                    </p>
                    <div className="bg-white p-2 rounded border border-gray-200 print:p-1">
                      <QRCodeSVG 
                        value={letter.reference_number} 
                        size={120} 
                        level="H" 
                        includeMargin={false}
                        className="print:w-20 print:h-20"
                      />
                    </div>
                    <p className="text-xs font-semibold text-gray-900 mt-2 print:text-[10px] print:mt-1 text-center break-all">
                      {letter.reference_number}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Uploaded Document File Section */}
          {letter.file_url && letter.file_name && (
            <div className="mb-8 pb-8 border-b-2 border-gray-200 print:mb-6 print:pb-6 print:break-inside-avoid">
              <h2 className="text-lg font-bold text-gray-900 mb-4 print:text-base flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-blue-600" />
                Attached Document
              </h2>
              <div className="border-2 border-blue-300 rounded-lg p-6 bg-blue-50 print:border print:border-blue-400 print:p-4 print:bg-white">
                <div className="flex items-start gap-4 print:gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg flex-shrink-0 print:p-2">
                    <FileText className="w-8 h-8 text-blue-600 print:w-6 print:h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1 print:text-xs">
                      File Name
                    </p>
                    <p className="text-base font-bold text-gray-900 break-words mb-3 print:text-sm print:mb-2">
                      {letter.file_name}
                    </p>
                    <p className="text-sm text-gray-600 mb-3 print:text-xs print:mb-2">
                      This is the official document attached to this tracking receipt.
                    </p>
                    <a
                      href={letter.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm print:hidden"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Document
                    </a>
                    <div className="hidden print:block text-xs text-gray-600 break-all mt-2">
                      <p className="font-semibold mb-1">Document URL:</p>
                      <p>{letter.file_url}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Signature History Section - Only Noted Signatures */}
          <div className="mb-8 print:mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 print:text-base">Signature History</h2>
            
            {statuses.filter((s) => s.status_type === 'noted').length > 0 ? (
              <div className="space-y-3 print:space-y-2">
                {statuses
                  .filter((s) => s.status_type === 'noted')
                  .map((status, index) => (
                    <div
                      key={status.id}
                      className="border-2 border-green-500 bg-green-50 rounded-lg p-4 print:border print:border-green-400 print:p-3 print:bg-white print:break-inside-avoid"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex-shrink-0">
                          <CheckCircle className="w-6 h-6 text-green-600 print:w-5 print:h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-base mb-1 print:text-sm">
                            Noted #{index + 1}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2 print:text-xs">Acknowledged and noted</p>
                          <div className="space-y-1 text-sm print:text-xs">
                            <p className="text-gray-700 print:text-gray-900">
                              <span className="font-semibold">Signed by:</span> {status.signed_by}
                            </p>
                            <p className="text-gray-700 print:text-gray-900">
                              <span className="font-semibold">Date & Time:</span>{' '}
                              {new Date(status.signed_at).toLocaleString()}
                            </p>
                            {status.notes && (
                              <p className="text-gray-700 print:text-gray-900">
                                <span className="font-semibold">Notes:</span> {status.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="border-2 border-gray-300 bg-gray-50 rounded-lg p-4 print:border print:p-3 print:bg-white">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0">
                    <Clock className="w-6 h-6 text-gray-400 print:w-5 print:h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-base mb-1 print:text-sm">No Signatures Yet</h3>
                    <p className="text-sm text-gray-500 print:text-xs">Awaiting signatures</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Section */}
          <div className="pt-6 border-t border-gray-200 text-center text-sm text-gray-500 print:pt-4 print:border-t print:text-xs">
            <p className="font-medium">This is an official tracking receipt</p>
            <p className="mt-1">Generated on {new Date().toLocaleString()}</p>
            <p className="mt-2 text-gray-400 print:text-gray-600">Document Tracking System</p>
          </div>
        </div>
      </div>
    </div>
  );
}
