import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { Letter, LetterStatus } from '../types';
<<<<<<< HEAD
import { FileText, CheckCircle, Clock, Download, ArrowLeft, File, Eye } from 'lucide-react';
=======
import { FileText, CheckCircle, Clock, Download, ArrowLeft, Paperclip, ExternalLink } from 'lucide-react';
>>>>>>> c455058 (Commit by ling)

interface ReceiptProps {
  letterId: string;
  onBack: () => void;
}

export default function Receipt({ letterId, onBack }: ReceiptProps) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [statuses, setStatuses] = useState<LetterStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDocument, setShowDocument] = useState(false);

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

  const handleDownload = () => {
    if (letter?.file_url) {
      window.open(letter.file_url, '_blank');
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
              <div className="bg-blue-100 p-4 rounded-full">
                <FileText className="w-12 h-12 text-blue-600" />
              </div>
            </div>
<<<<<<< HEAD
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Tracking Receipt</h1>
            <p className="text-gray-600 mb-1">Official Status & Document Record</p>
            <p className="text-xs text-gray-500">
              Complete tracking history and attached document reference
            </p>
          </div>

          <div className="space-y-6 mb-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="text-xs font-medium text-gray-500 mb-2 uppercase">Reference Number</h2>
                <p className="text-2xl font-bold text-gray-900 font-mono">{letter.reference_number}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="text-xs font-medium text-gray-500 mb-2 uppercase">Overall Status</h2>
                <p className="text-lg font-semibold">
                  {allComplete ? (
                    <span className="inline-flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      Complete
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-amber-600">
                      <Clock className="w-5 h-5" />
                      In Progress
                    </span>
=======
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
>>>>>>> c455058 (Commit by ling)
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

<<<<<<< HEAD
            <div>
              <h2 className="text-xs font-medium text-gray-500 mb-2 uppercase">Document Title</h2>
              <p className="text-lg font-semibold text-gray-900">{letter.title}</p>
            </div>

            {letter.description && (
              <div>
                <h2 className="text-xs font-medium text-gray-500 mb-2 uppercase">Description</h2>
                <p className="text-gray-700 leading-relaxed">{letter.description}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h2 className="text-xs font-medium text-gray-500 mb-2 uppercase">Created Date</h2>
                <p className="text-gray-900">{new Date(letter.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <h2 className="text-xs font-medium text-gray-500 mb-2 uppercase">Created Time</h2>
                <p className="text-gray-900">{new Date(letter.created_at).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>

          {letter.file_url && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-5 mb-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <File className="w-5 h-5 text-blue-600" />
                    Attached Document
                  </h2>
                  <p className="text-sm text-gray-700 mb-1">{letter.file_name || 'Document File'}</p>
                  <p className="text-xs text-gray-500">
                    This receipt is linked with the uploaded document above
                  </p>
                </div>
                <div className="flex gap-2 print:hidden">
                  <button
                    onClick={() => setShowDocument(!showDocument)}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Open
                  </button>
                </div>
              </div>
            </div>
          )}

          {showDocument && letter.file_url && (
            <div className="mb-8 border-2 border-gray-300 rounded-lg overflow-hidden print:hidden">
              <div className="bg-gray-100 p-3 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Document Preview</h3>
                <button
                  onClick={() => setShowDocument(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="bg-white p-4">
                {letter.file_url.match(/\.(pdf)$/i) ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded">
                    <File className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-gray-600 mb-4">PDF Document Preview</p>
=======
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
>>>>>>> c455058 (Commit by ling)
                    <a
                      href={letter.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
<<<<<<< HEAD
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Open PDF in new tab
                    </a>
                  </div>
                ) : (
                  <img
                    src={letter.file_url}
                    alt="Document"
                    className="max-w-full h-auto rounded"
                  />
                )}
              </div>
            </div>
          )}

          <div className="border-t-2 border-gray-200 pt-8">
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
                    className={`border-l-4 p-5 rounded-lg ${
                      isComplete
                        ? 'border-l-green-500 bg-green-50'
                        : 'border-l-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-0.5">
                        {isComplete ? (
                          <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-300 rounded-full">
                            <Clock className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-base mb-1">
                          {label}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">{desc}</p>
                        {isComplete ? (
                          <div className="bg-white bg-opacity-60 p-3 rounded text-sm space-y-2">
                            <div className="flex justify-between gap-4">
                              <div>
                                <p className="text-gray-500 text-xs uppercase tracking-wide">Signed By</p>
                                <p className="font-semibold text-gray-900">{status.signed_by}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs uppercase tracking-wide">Date</p>
                                <p className="font-semibold text-gray-900">
                                  {new Date(status.signed_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs uppercase tracking-wide">Time</p>
                                <p className="font-semibold text-gray-900">
                                  {new Date(status.signed_at).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                            {status.notes && (
                              <div className="pt-2 border-t">
                                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Notes</p>
                                <p className="text-gray-700 italic">{status.notes}</p>
                              </div>
=======
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
>>>>>>> c455058 (Commit by ling)
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

<<<<<<< HEAD
          <div className="mt-8 pt-8 border-t-2 border-gray-200">
            <div className="bg-gray-50 p-5 rounded-lg text-center">
              <p className="text-sm font-semibold text-gray-900">Document Tracking Complete</p>
              <p className="text-xs text-gray-600 mt-2">
                This receipt represents the official tracking record for the above document
              </p>
              <p className="text-xs text-gray-500 mt-3">
                Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Reference: {letter.reference_number}
              </p>
            </div>
=======
          {/* Footer Section */}
          <div className="pt-6 border-t border-gray-200 text-center text-sm text-gray-500 print:pt-4 print:border-t print:text-xs">
            <p className="font-medium">This is an official tracking receipt</p>
            <p className="mt-1">Generated on {new Date().toLocaleString()}</p>
            <p className="mt-2 text-gray-400 print:text-gray-600">Document Tracking System</p>
>>>>>>> c455058 (Commit by ling)
          </div>
        </div>
      </div>
    </div>
  );
}
