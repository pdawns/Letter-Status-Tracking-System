import { useState } from 'react';
import { ActionTicket as ActionTicketType, Letter } from '../types';
import { Ticket, Download, X } from 'lucide-react';
import { generateTicklerPDF, downloadTicklerPDF } from '../Generates/pdf';
import { fixName } from '../lib/fixNames';

interface ActionTicketProps {
  ticket: ActionTicketType;
  letter: Letter;
  onClose: () => void;
}

// Split a string into lines of at most `maxChars` characters (word-wrap)
function wrapText(text: string, maxChars = 55): string[] {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + (current ? ' ' : '') + word).length <= maxChars) {
      current += (current ? ' ' : '') + word;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Render a fixed block of `total` rows; filled lines first, rest blank
function TextBlock({ text, total }: { text: string; total: number }) {
  const lines = wrapText(text);
  return (
    <>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="border-b border-black py-1 px-2 text-xs" style={{ minHeight: 22 }}>
          {i < lines.length ? lines[i] : '\u00A0'}
        </div>
      ))}
    </>
  );
}

// One single-line field row with bold label + value
function FieldRow({ label, value = '' }: { label: string; value?: string }) {
  return (
    <div className="border-b border-black py-1 px-2 flex gap-1 text-xs" style={{ minHeight: 22 }}>
      <span className="font-bold shrink-0">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function ActionTicket({ ticket, letter, onClose }: ActionTicketProps) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      // pass a corrected ticket to the PDF generator
      const fixedTicket = {
        ...ticket,
        assigned_to: fixName(ticket.assigned_to),
        assigned_by: fixName(ticket.assigned_by),
        action_notes: fixName(ticket.action_notes || ''),
      };
      const pdf = await generateTicklerPDF(fixedTicket, letter);
      downloadTicklerPDF(pdf, ticket.ticket_number);
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF.');
    } finally {
      setGenerating(false);
    }
  };

  const subjectFull = [letter.title, letter.document_subject, letter.description]
    .filter(Boolean).join(' — ');

  // fix any legacy misspelling from DB
  const assignedTo  = fixName(ticket.assigned_to);
  const assignedBy  = fixName(ticket.assigned_by);
  const actionNotes = fixName(ticket.action_notes || '');

  const dueFormatted = ticket.due_date
    ? new Date(ticket.due_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const dateFormatted = new Date(ticket.created_at).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4" style={{ color: '#004526' }} />
            <span className="font-semibold text-gray-800 text-sm">Action Tickler Slip</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#004526' }}
              onMouseEnter={(e) => !generating && (e.currentTarget.style.backgroundColor = '#9CAF88')}
              onMouseLeave={(e) => !generating && (e.currentTarget.style.backgroundColor = '#004526')}
            >
              <Download className="w-3.5 h-3.5" />
              {generating ? 'Generating...' : 'Download PDF'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slip preview — mirrors the physical form exactly */}
        <div className="overflow-y-auto p-5">
          <div
            className="mx-auto border-2 border-black"
            style={{ fontFamily: 'Arial, sans-serif', fontSize: 12 }}
          >
            {/* Header */}
            <div className="border-b-2 border-black text-center font-bold py-1 px-2 text-sm">
              ACTION TICKLER SLIP
            </div>
            <div className="border-b border-black text-center py-1 px-2 text-xs">
              For Incoming Mail/Message
            </div>

            {/* Single-line fields */}
            <FieldRow label="Correspondence No." value={ticket.ticket_number} />
            <FieldRow label="Date:" value={dateFormatted} />
            <FieldRow label="From:" value="Provincial Treasurer's Office" />

            {/* Subject label row */}
            <FieldRow label="Subject:" />
            {/* Subject text flows into 7 blank lines */}
            <TextBlock text={subjectFull} total={7} />

            {/* Assigned to / Due date */}
            <FieldRow label="Assigned to:" value={assignedTo} />
            <FieldRow label="Due Date/Deadline:" value={dueFormatted} />

            {/* Instruction label row */}
            <FieldRow label="Instruction:" />
            {/* Instruction text flows into 7 blank lines */}
            <TextBlock text={actionNotes} total={7} />

            {/* By + signature blank */}
            <FieldRow label="By:" value={assignedBy} />
            <div className="py-1 px-2 text-xs" style={{ minHeight: 22 }}>&nbsp;</div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-3">
            Generated on {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
