import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { Letter, LetterStatus } from '../types';
import { FileText, CheckCircle, Download, ArrowLeft, Paperclip, ExternalLink } from 'lucide-react';
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

  // Parse description field for document details
  const parseDescription = (description?: string) => {
    if (!description) return { documentFor: '', documentThru: '', documentFrom: '' };
    
    const lines = description.split('\n');
    const documentFor = lines.find(line => line.startsWith('For:'))?.replace('For:', '').trim() || '';
    const documentThru = lines.find(line => line.startsWith('Thru:'))?.replace('Thru:', '').trim() || '';
    const documentFrom = lines.find(line => line.startsWith('From:'))?.replace('From:', '').trim() || '';
    
    return { documentFor, documentThru, documentFrom };
  };

  const { documentFor, documentThru, documentFrom } = parseDescription(letter.description);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 p-3 py-4 print:bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-green-600 hover:text-green-700 text-sm px-4 py-2 rounded-lg border border-green-600 hover:bg-green-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back 
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

        <div className="bg-white rounded-xl shadow-xl p-6 print:shadow-none print:p-0 border border-gray-100">
          {/* Header Section */}
          <div className="text-center mb-6 pb-5 border-b-2 print:mb-4 print:pb-3" style={{ borderColor: '#9CAF88' }}>
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full" style={{ backgroundColor: '#DFF5E1' }}>
                <FileText className="w-10 h-10" style={{ color: '#004526' }} />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2 print:text-lg" style={{ color: '#004526' }}>Document Tracking Receipt</h1>
            <p className="font-medium text-sm print:text-xs" style={{ color: '#9CAF88' }}>Official Status Record</p>
            <p className="text-xs text-gray-500 mt-2 print:text-[10px]">
              This is the official record of all signatures and status updates on this document
            </p>
          </div>

          {/* Document Information and QR Code Section - Side by Side */}
          <div className="mb-6 pb-5 border-b-2 print:mb-4 print:pb-3" style={{ borderColor: '#9CAF88' }}>
            <div className="grid md:grid-cols-3 gap-6 print:gap-3">
              {/* Document Information - Left Side (2/3 width) */}
              <div className="md:col-span-2">
                <h2 className="text-lg font-bold mb-4 print:text-sm flex items-center gap-2" style={{ color: '#004526' }}>
                  <div className="w-1 h-6 rounded-full" style={{ backgroundColor: '#004526' }}></div>
                  Document Information
                </h2>
                <div className="space-y-3 print:space-y-2">
                  <div className="grid grid-cols-2 gap-4 print:gap-2">
                    <div className="print:break-inside-avoid bg-gray-50 p-3 rounded-lg print:bg-transparent print:p-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CAF88' }}>Document No.</p>
                      <p className="text-sm font-bold print:text-xs" style={{ color: '#004526' }}>{letter.reference_number}</p>
                    </div>
                    <div className="print:break-inside-avoid bg-gray-50 p-3 rounded-lg print:bg-transparent print:p-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CAF88' }}>Status</p>
                      <p className="text-sm font-bold print:text-xs">
                        {allComplete ? (
                          <span className="text-green-600">✓ Complete</span>
                        ) : (
                          <span className="text-yellow-600">⏳ In Progress</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {letter.document_type && (
                    <div className="print:break-inside-avoid bg-gray-50 p-3 rounded-lg print:bg-transparent print:p-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CAF88' }}>Document Type</p>
                      <p className="text-gray-900 text-sm print:text-xs font-medium">{letter.document_type}</p>
                    </div>
                  )}

                  {documentFor && (
                    <div className="print:break-inside-avoid bg-gray-50 p-3 rounded-lg print:bg-transparent print:p-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CAF88' }}>Document For</p>
                      <p className="text-gray-900 text-sm print:text-xs font-medium">{documentFor}</p>
                    </div>
                  )}

                  {documentThru && (
                    <div className="print:break-inside-avoid bg-gray-50 p-3 rounded-lg print:bg-transparent print:p-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CAF88' }}>Thru</p>
                      <p className="text-gray-900 text-sm print:text-xs font-medium">{documentThru}</p>
                    </div>
                  )}

                  {documentFrom && (
                    <div className="print:break-inside-avoid bg-gray-50 p-3 rounded-lg print:bg-transparent print:p-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CAF88' }}>Document From</p>
                      <p className="text-gray-900 text-sm print:text-xs font-medium">{documentFrom}</p>
                    </div>
                  )}

                  {letter.document_subject && (
                    <div className="print:break-inside-avoid bg-gray-50 p-3 rounded-lg print:bg-transparent print:p-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CAF88' }}>Document Subject</p>
                      <p className="text-gray-900 text-sm print:text-xs font-medium leading-relaxed">{letter.document_subject}</p>
                    </div>
                  )}

                  <div className="print:break-inside-avoid bg-gray-50 p-3 rounded-lg print:bg-transparent print:p-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CAF88' }}>Date Created</p>
                    <p className="text-gray-900 text-sm print:text-xs font-medium">{new Date(letter.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* QR Code - Right Side (1/3 width) */}
              <div className="md:col-span-1 flex flex-col items-center justify-start">
                <h2 className="text-sm font-bold mb-3 print:text-xs" style={{ color: '#004526' }}>Document QR Code</h2>
                <div className="flex flex-col items-center">
                  <div className="bg-white p-3 rounded-lg shadow-sm border-2 print:p-2 print:shadow-none" style={{ borderColor: '#9CAF88' }}>
                    <QRCodeSVG 
                      value={letter.file_url || letter.reference_number} 
                      size={120} 
                      level="H"
                      className="print:w-20 print:h-20"
                      fgColor="#004526"
                      bgColor="#ffffff"
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-2 text-center print:text-[10px]">
                    Scan to access document
                  </p>
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

          {/* Signature History Section - Simple & Structured */}
          <div className="mb-6 print:mb-4">
            <h2 className="text-base font-bold mb-4 print:text-sm" style={{ color: '#004526' }}>
              Signature History
            </h2>
            
            <div className="space-y-3 print:space-y-2">
              {/* Noted Status */}
              {statuses.filter((s) => s.status_type === 'noted').map((status) => (
                <div
                  key={status.id}
                  className="border rounded-lg p-4 print:p-3 print:break-inside-avoid bg-white"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 mt-1">
                      <CheckCircle className="w-5 h-5 print:w-4 print:h-4" style={{ color: '#004526' }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm print:text-xs" style={{ color: '#004526' }}>
                        Noted ✓ Completed
                      </h3>
                      <p className="text-xs text-gray-500 print:text-[10px]">
                        Person who noted the letter
                      </p>
                    </div>
                  </div>
                  
                  <div className="ml-8 space-y-1">
                    <p className="text-sm text-gray-900 print:text-xs">
                      <span className="text-gray-600">Signed by:</span> {status.signed_by}
                    </p>
                    <p className="text-sm text-gray-900 print:text-xs">
                      <span className="text-gray-600">Date:</span> {new Date(status.signed_at).toLocaleString('en-US', {
                        month: 'numeric',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                    {status.notes && (
                      <p className="text-sm text-gray-900 print:text-xs mt-2">
                        <span className="text-gray-600">Notes:</span> {status.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Reviewed Status */}
              {statuses.filter((s) => s.status_type === 'reviewed').length > 0 ? (
                statuses.filter((s) => s.status_type === 'reviewed').map((status) => (
                  <div
                    key={status.id}
                    className="border rounded-lg p-4 print:p-3 print:break-inside-avoid bg-white"
                    style={{ borderColor: '#e5e7eb' }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0 mt-1">
                        <CheckCircle className="w-5 h-5 print:w-4 print:h-4" style={{ color: '#004526' }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm print:text-xs" style={{ color: '#004526' }}>
                          Reviewed ✓ Completed
                        </h3>
                        <p className="text-xs text-gray-500 print:text-[10px]">
                          Person who reviewed the letter
                        </p>
                      </div>
                    </div>
                    
                    <div className="ml-8 space-y-1">
                      <p className="text-sm text-gray-900 print:text-xs">
                        <span className="text-gray-600">Signed by:</span> {status.signed_by}
                      </p>
                      <p className="text-sm text-gray-900 print:text-xs">
                        <span className="text-gray-600">Date:</span> {new Date(status.signed_at).toLocaleString('en-US', {
                          month: 'numeric',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                      {status.notes && (
                        <p className="text-sm text-gray-900 print:text-xs mt-2">
                          <span className="text-gray-600">Notes:</span> {status.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className="border rounded-lg p-4 print:p-3 bg-gray-50"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-5 h-5 border-2 rounded print:w-4 print:h-4" style={{ borderColor: '#d1d5db' }}></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm text-gray-400 print:text-xs">
                        Reviewed
                      </h3>
                      <p className="text-xs text-gray-400 print:text-[10px]">
                        Person who reviewed the letter
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Approved Status */}
              {statuses.filter((s) => s.status_type === 'approved').length > 0 ? (
                statuses.filter((s) => s.status_type === 'approved').map((status) => (
                  <div
                    key={status.id}
                    className="border rounded-lg p-4 print:p-3 print:break-inside-avoid bg-white"
                    style={{ borderColor: '#e5e7eb' }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0 mt-1">
                        <CheckCircle className="w-5 h-5 print:w-4 print:h-4" style={{ color: '#004526' }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm print:text-xs" style={{ color: '#004526' }}>
                          Approved ✓ Completed
                        </h3>
                        <p className="text-xs text-gray-500 print:text-[10px]">
                          Person who approved the letter
                        </p>
                      </div>
                    </div>
                    
                    <div className="ml-8 space-y-1">
                      <p className="text-sm text-gray-900 print:text-xs">
                        <span className="text-gray-600">Signed by:</span> {status.signed_by}
                      </p>
                      <p className="text-sm text-gray-900 print:text-xs">
                        <span className="text-gray-600">Date:</span> {new Date(status.signed_at).toLocaleString('en-US', {
                          month: 'numeric',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                      {status.notes && (
                        <p className="text-sm text-gray-900 print:text-xs mt-2">
                          <span className="text-gray-600">Notes:</span> {status.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className="border rounded-lg p-4 print:p-3 bg-gray-50"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-5 h-5 border-2 rounded print:w-4 print:h-4" style={{ borderColor: '#d1d5db' }}></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm text-gray-400 print:text-xs">
                        Approved
                      </h3>
                      <p className="text-xs text-gray-400 print:text-[10px]">
                        Person who approved the letter
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
