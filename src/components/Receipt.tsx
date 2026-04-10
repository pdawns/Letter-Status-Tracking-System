import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { Letter, LetterStatus } from '../types';
import { FileText, CheckCircle, Clock, Download, ArrowLeft, Paperclip, ExternalLink } from 'lucide-react';
import { generateReceiptPDF, downloadPDF } from '../Generates/pdf';

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

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handlePrintSavePDF = async () => {
    if (!letter || isGeneratingPDF) return;
    
    setIsGeneratingPDF(true);
    try {
      const pdf = await generateReceiptPDF(letter, statuses);
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

  const hasNoted = statuses.some((s) => s.status_type === 'noted');
  const hasReviewed = statuses.some((s) => s.status_type === 'reviewed');
  const hasApproved = statuses.some((s) => s.status_type === 'approved');
  const allComplete = hasNoted && hasReviewed && hasApproved;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 p-3 py-4 print:bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-green-600 hover:text-green-700 text-sm px-4 py-2 rounded-lg border border-green-600 hover:bg-green-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          
          <button
            onClick={handlePrintSavePDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            style={{ backgroundColor: '#004526' }}
            onMouseEnter={(e) => !isGeneratingPDF && (e.currentTarget.style.backgroundColor = '#9CAF88')}
            onMouseLeave={(e) => !isGeneratingPDF && (e.currentTarget.style.backgroundColor = '#004526')}
          >
            {isGeneratingPDF ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Print/Save Receipt
              </>
            )}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-5 print:shadow-none print:p-0">
          {/* Header Section */}
          <div className="text-center mb-5 pb-4 border-b-2 border-gray-200 print:mb-4 print:pb-3">
            <div className="flex justify-center mb-3">
              <div className="bg-green-100 p-3 rounded-full">
                <FileText className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1 print:text-lg">Document Tracking Receipt</h1>
            <p className="text-gray-600 font-medium text-sm print:text-xs">Official Status Record</p>
            <p className="text-xs text-gray-500 mt-1 print:text-[10px]">
              This is the official record of all signatures and status updates on this document
            </p>
          </div>

          {/* Document Information and QR Code Section - Side by Side */}
          <div className="mb-5 pb-4 border-b-2 border-gray-200 print:mb-4 print:pb-3">
            <div className="flex flex-row gap-4 print:gap-3">
              {/* Document Information - Left Side */}
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-gray-900 mb-3 print:text-sm">Document Information</h2>
                <div className="space-y-2 print:space-y-2">
                  <div className="grid grid-cols-2 gap-3 print:gap-2">
                    <div className="print:break-inside-avoid">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Reference Number</p>
                      <p className="text-sm font-bold text-gray-900 print:text-xs">{letter.reference_number}</p>
                    </div>
                    <div className="print:break-inside-avoid">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</p>
                      <p className="text-sm font-bold print:text-xs">
                        {allComplete ? (
                          <span className="text-green-600">✓ Complete</span>
                        ) : (
                          <span className="text-yellow-600">⏳ In Progress</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="print:break-inside-avoid">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Title</p>
                    <p className="text-gray-900 font-medium text-sm print:text-xs">{letter.title}</p>
                  </div>

                  {letter.document_type && (
                    <div className="print:break-inside-avoid">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Document Type</p>
                      <p className="text-gray-900 capitalize text-sm print:text-xs">{letter.document_type}</p>
                    </div>
                  )}

                  {letter.document_subject && (
                    <div className="print:break-inside-avoid">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Subject</p>
                      <p className="text-gray-900 text-sm print:text-xs">{letter.document_subject}</p>
                    </div>
                  )}

                  {letter.description && (
                    <div className="print:break-inside-avoid">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
                      <p className="text-gray-900 text-sm print:text-xs">{letter.description}</p>
                    </div>
                  )}

                  <div className="print:break-inside-avoid">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Created Date</p>
                    <p className="text-gray-900 text-sm print:text-xs">{new Date(letter.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* QR Code - Always on the Right */}
              <div className="flex-shrink-0 flex flex-col items-center justify-start w-36">
                <h2 className="text-sm font-bold text-gray-900 mb-2 print:text-xs">Reference QR Code</h2>
                <div className="flex flex-col items-center">
                  <div className="bg-white p-2 rounded print:p-1">
                    <QRCodeSVG 
                      value={`${window.location.origin}/?ref=${letter.reference_number}&type=${letter.document_type || 'document'}&id=${letter.id}`}
                      size={100} 
                      level="H"
                      className="print:w-16 print:h-16"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 text-center print:text-[8px]">
                    Scan to track
                  </p>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/?ref=${letter.reference_number}&type=${letter.document_type || 'document'}&id=${letter.id}`;
                      console.log('QR Code URL:', url);
                      navigator.clipboard.writeText(url);
                      alert('QR URL copied to clipboard:\n' + url);
                    }}
                    className="text-[10px] text-blue-600 underline mt-1 print:hidden"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Uploaded Document File Section */}
          {letter.file_url && letter.file_name && (
            <div className="mb-5 pb-4 border-b-2 border-gray-200 print:mb-4 print:pb-3 print:break-inside-avoid">
              <h2 className="text-base font-bold text-gray-900 mb-3 print:text-sm flex items-center gap-2">
                <Paperclip className="w-4 h-4" style={{ color: '#004526' }} />
                Attached Document
              </h2>
              <div className="border-2 rounded-lg p-4 print:border print:p-3 print:bg-white" style={{ borderColor: '#9CAF88', backgroundColor: '#DFF5E1' }}>
                <div className="flex items-start gap-3 print:gap-2">
                  <div className="p-2 rounded-lg flex-shrink-0 print:p-1" style={{ backgroundColor: '#9CAF88' }}>
                    <FileText className="w-6 h-6 print:w-5 print:h-5" style={{ color: '#004526' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 print:text-[9px]">
                      File Name
                    </p>
                    <p className="text-sm font-bold text-gray-900 break-words mb-2 print:text-xs print:mb-1">
                      {letter.file_name}
                    </p>
                    <p className="text-xs text-gray-600 mb-2 print:text-[10px] print:mb-1">
                      This is the official document attached to this tracking receipt.
                    </p>
                    <a
                      href={letter.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 hover:underline font-medium text-xs print:hidden"
                      style={{ color: '#004526' }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Document
                    </a>
                    <div className="hidden print:block text-[10px] text-gray-600 break-all mt-1">
                      <p className="font-semibold mb-1">Document URL:</p>
                      <p>{letter.file_url}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Signature History Section - Only Noted Signatures */}
          <div className="mb-5 print:mb-4">
            <h2 className="text-base font-bold text-gray-900 mb-3 print:text-sm">Signature History</h2>
            
            {statuses.filter((s) => s.status_type === 'noted').length > 0 ? (
              <div className="space-y-2 print:space-y-2">
                {statuses
                  .filter((s) => s.status_type === 'noted')
                  .map((status, index) => (
                    <div
                      key={status.id}
                      className="border-2 rounded-lg p-3 print:border print:p-2 print:bg-white print:break-inside-avoid"
                      style={{ borderColor: '#004526', backgroundColor: '#DFF5E1' }}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-1 flex-shrink-0">
                          <CheckCircle className="w-5 h-5 print:w-4 print:h-4" style={{ color: '#004526' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-sm mb-1 print:text-xs">
                            Noted #{index + 1}
                          </h3>
                          <p className="text-xs text-gray-600 mb-1 print:text-[10px]">Acknowledged and noted</p>
                          <div className="space-y-1 text-xs print:text-[10px]">
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
              <div className="border-2 border-gray-300 bg-gray-50 rounded-lg p-3 print:border print:p-2 print:bg-white">
                <div className="flex items-start gap-2">
                  <div className="mt-1 flex-shrink-0">
                    <Clock className="w-5 h-5 text-gray-400 print:w-4 print:h-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-sm mb-1 print:text-xs">No Signatures Yet</h3>
                    <p className="text-xs text-gray-500 print:text-[10px]">Awaiting signatures</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Section */}
          <div className="pt-4 border-t border-gray-200 text-center text-xs text-gray-500 print:pt-3 print:border-t print:text-[10px]">
            <p className="font-medium">This is an official tracking receipt</p>
            <p className="mt-1">Generated on {new Date().toLocaleString()}</p>
            <p className="mt-1 text-gray-400 print:text-gray-600">Document Tracking System</p>
          </div>
        </div>
      </div>
    </div>
  );
}
