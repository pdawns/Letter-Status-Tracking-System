import { useEffect, useState } from 'react';
import { getLetter } from '../lib/api';
import { Letter } from '../types';
import { Download, ArrowLeft, Eye, Bell, Printer } from 'lucide-react';
import NotifySender from './NotifySender';
import { generateLetterViewPDF } from '../Generates/pdf/generateLetterViewPDF';
import { downloadPDF } from '../Generates/pdf';

interface LetterViewProps {
  letterId: string;
  onBack: () => void;
}


export default function LetterView({ letterId, onBack }: LetterViewProps) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotify, setShowNotify] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => { fetchLetter(); }, [letterId]);

  const fetchLetter = async () => {
    try {
      const data = await getLetter(letterId);
      if (!data) throw new Error('Not found');
      setLetter(data);
    } catch (err) {
      console.error('Error fetching letter:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = () => {
    if (!letter?.file_url) return;
    const isOffice = letter.file_url.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i);
    if (isOffice) {
      window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(letter.file_url)}&embedded=false`, '_blank');
    } else {
      window.open(letter.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownload = () => {
    if (!letter?.file_url) return;
    const link = document.createElement('a');
    link.href = letter.file_url;
    link.download = letter.file_name || 'document';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSavePDF = async () => {
    if (!letter || isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      const pdf = await generateLetterViewPDF(letter);
      downloadPDF(pdf, `letter-${letter.reference_number}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--primary)' }}></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-red-600">Letter not found</p>
        <button onClick={onBack} className="mt-4 hover:underline" style={{ color: 'var(--primary)' }}>Go back</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto letter-print-area">
      {/* Action bar — hidden on print */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium text-white transition-colors"
          style={{ backgroundColor: 'var(--primary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          {(letter.sender_phone || letter.sender_email) && (
            <button
              onClick={() => setShowNotify(true)}
              className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--accent)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
            >
              <Bell className="w-4 h-4" />
              Notify Sender
            </button>
          )}
          <button
            onClick={handleSavePDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)', color: 'white', border: '2px solid rgba(255,255,255,0.2)' }}
            onMouseEnter={e => !isGeneratingPDF && (e.currentTarget.style.backgroundColor = 'var(--accent)')}
            onMouseLeave={e => !isGeneratingPDF && (e.currentTarget.style.backgroundColor = 'var(--primary)')}
          >
            {isGeneratingPDF
              ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Generating...</>
              : <><Download className="w-4 h-4" />Save as PDF</>}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--primary)', color: 'white' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {showNotify && letter && <NotifySender letter={letter} onClose={() => setShowNotify(false)} />}

      {/* Letter card */}
      <div className="letter-print-card bg-white rounded-lg shadow-lg print:shadow-none print:rounded-none" style={{ border: '1px solid #e5e7eb' }}>

        {/* ── Letterhead ── */}
        <div className="px-8 pt-6 pb-4" style={{ borderBottom: '3px double #1e3a5f' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-shrink-0">
              <img src="/bagong-pilipinas-v4.png" alt="Bagong Pilipinas" className="object-contain" style={{ width: 64, height: 64 }} />
              <img src="/LOGO2.png" alt="Province of Misamis Oriental" className="object-contain" style={{ width: 64, height: 64 }} />
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs" style={{ color: '#374151' }}>Republic of the Philippines</p>
              <p className="text-sm font-bold uppercase tracking-wide" style={{ color: '#1e3a5f' }}>Province of Misamis Oriental</p>
              <p className="text-lg font-extrabold uppercase" style={{ color: '#1e3a5f' }}>Office of the Provincial Treasurer</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>www.misamisoriental.gov.ph</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <img src="/LOGO1.png" alt="Misamis Oriental Seal" className="object-contain" style={{ width: 64, height: 64 }} />
              <img src="/LOGO3.jpg" alt="Unity - The Road to Progress" className="object-contain" style={{ width: 64, height: 64 }} />
            </div>
          </div>
        </div>

        {/* ── Document details body ── */}
        <div className="px-8 py-6 space-y-3">
          <p className="text-sm" style={{ color: '#374151' }}>
            {new Date(letter.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className="pt-1">
            <p className="text-sm font-semibold" style={{ color: '#374151' }}>
              Reference No.: <span className="font-bold" style={{ color: '#111827' }}>{letter.reference_number}</span>
            </p>
          </div>

          <div className="grid grid-cols-[130px_1fr] gap-x-2 text-sm pt-2">
            <span className="font-semibold" style={{ color: '#6b7280' }}>Document Type:</span>
            <span className="capitalize font-medium" style={{ color: '#111827' }}>{letter.document_type || 'Letter'}</span>
          </div>

          <div className="grid grid-cols-[130px_1fr] gap-x-2 text-sm">
            <span className="font-semibold" style={{ color: '#6b7280' }}>Title:</span>
            <span className="font-medium" style={{ color: '#111827' }}>{letter.title}</span>
          </div>

          {letter.document_subject && (
            <div className="grid grid-cols-[130px_1fr] gap-x-2 text-sm">
              <span className="font-semibold" style={{ color: '#6b7280' }}>Subject:</span>
              <span style={{ color: '#111827' }}>{letter.document_subject}</span>
            </div>
          )}

          {letter.description && (
            <div className="grid grid-cols-[130px_1fr] gap-x-2 text-sm">
              <span className="font-semibold" style={{ color: '#6b7280' }}>Description:</span>
              <span style={{ color: '#111827' }}>{letter.description}</span>
            </div>
          )}

          {/* Scanned document buttons — hidden on print */}
          {letter.file_url && (
            <div className="pt-2 flex items-center gap-2 print:hidden">
              <button onClick={handleViewDocument} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors">
                <Eye className="w-4 h-4" />
                View Document
              </button>
              <button onClick={handleDownload} className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors">
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          )}
        </div>

        {/* ── Letter body ── */}
        <div className="px-8 pb-6 space-y-4 text-sm" style={{ color: '#111827' }}>
          <p>Dear Sir/Ma'am,</p>
          <p>Good day!</p>

          <p className="leading-relaxed">
            This is to inform you that your document titled <span className="font-semibold">"{letter.title}"</span> with
            Reference No. <span className="font-semibold">{letter.reference_number}</span> has been officially received
            by the Provincial Treasurer's Office, Province of Misamis Oriental on{' '}
            {new Date(letter.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
          </p>

          <p>For your information and guidance.</p>

          <div className="pt-6">
            <p>Respectfully yours,</p>
            <div className="mt-8 mb-1">
              <p className="font-bold uppercase">RONALD JAME D. VIOLON, CPA, REB, REA, MDMG</p>
              <p>Provincial Treasurer</p>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-8 py-5 print:py-3 letter-print-footer" style={{ borderTop: '1px solid #e5e7eb' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center text-[10px]" style={{ color: '#6b7280' }}>
              <p className="font-semibold uppercase text-xs mb-1" style={{ color: '#374151' }}>Office of the Provincial Treasurer</p>
              <p>1st Floor, Provincial Capitol Building, Provincial Capitol Compound</p>
              <p>Don Apolinar Velez St., Cagayan de Oro City</p>
              <p>Email Address: misor.pto@gmail.com</p>
            </div>
            <div className="flex-shrink-0">
              <img src="/bangon-misor-gov.png" alt="Bangon Mis.Or." className="object-contain" style={{ width: 90, height: 90 }} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
