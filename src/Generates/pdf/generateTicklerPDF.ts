import jsPDF from 'jspdf';
import { ActionTicket, Letter } from '../../types';

/**
 * ACTION TICKLER SLIP
 * - Top-left, narrow margins (12.7 mm all sides)
 * - Slip: 100 mm wide × ~136.5 mm tall  (fits within 138 mm target)
 * - Text strictly wrapped inside each row — no overflow
 */
export async function generateTicklerPDF(
  ticket: ActionTicket,
  letter: Letter
): Promise<jsPDF> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pdf.setProperties({
    title: `Action Tickler Slip - ${ticket.ticket_number}`,
    subject: 'Action Tickler Slip',
    author: 'Document Tracking System',
    creator: 'Document Tracking System',
  });

  // ── Dimensions ────────────────────────────────────────────
  const margin = 12.7;   // narrow margin (1.27 cm)
  const slipW  = 100;    // slip width (mm)
  const rowH   = 6.2;    // row height — fits 5+5 text rows in exactly 138 mm
  const hdrH   = rowH + 1.5; // slightly taller header row
  const pad    = 2;      // inner horizontal padding
  const fs     = 8.5;    // font size (pt) — adjusted for tighter rows
  const lx     = margin;
  let   y      = margin;

  const maxTW  = slipW - pad * 2;   // max text width inside a row
  const indent = 4;                  // extra left indent for sub-content rows
  const midY   = (h: number) => y + h / 2 + 1.3; // vertical text baseline

  // ── Helpers ───────────────────────────────────────────────

  const box = (h: number) => {
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.3);
    pdf.rect(lx, y, slipW, h);
  };

  /**
   * One or two row(s) with bold label + normal value.
   * If the value fits on the same line as the label → single row.
   * If it doesn't fit → label on its own row, value wraps into the next row(s).
   */
  const fieldRow = (label: string, value = '') => {
    pdf.setFontSize(fs);
    pdf.setTextColor(0);

    if (!value) {
      box(rowH);
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, lx + pad, midY(rowH));
      y += rowH;
      return;
    }

    pdf.setFont('helvetica', 'bold');
    const labelW = pdf.getTextWidth(label + ' ');
    pdf.setFont('helvetica', 'normal');
    const availW = maxTW - labelW;

    if (pdf.getTextWidth(value) <= availW) {
      // fits on one row
      box(rowH);
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, lx + pad, midY(rowH));
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, lx + pad + labelW, midY(rowH));
      y += rowH;
    } else {
      // label row — bold label + as much of value as fits
      const lines = pdf.splitTextToSize(value, maxTW) as string[];
      // first line: label + first value line (if fits after label)
      box(rowH);
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, lx + pad, midY(rowH));
      // check if first wrapped line fits after label
      const firstLine = lines[0] || '';
      if (pdf.getTextWidth(firstLine) <= availW) {
        pdf.setFont('helvetica', 'normal');
        pdf.text(firstLine, lx + pad + labelW, midY(rowH));
        y += rowH;
        // remaining lines each get their own row — indented
        for (let i = 1; i < lines.length; i++) {
          box(rowH);
          pdf.setFont('helvetica', 'normal');
          pdf.text(lines[i], lx + pad + indent, midY(rowH));
          y += rowH;
        }
      } else {
        // label alone on first row, all value lines below — indented
        y += rowH;
        for (const line of lines) {
          box(rowH);
          pdf.setFont('helvetica', 'normal');
          pdf.text(line, lx + pad + indent, midY(rowH));
          y += rowH;
        }
      }
    }
  };

  /**
   * `totalRows` ruled rows. Wrapped text fills from the top with a small
   * left indent for cleaner appearance; remaining rows stay blank.
   */
  const textBlock = (text: string, totalRows: number) => {
    pdf.setFontSize(fs);
    const lines: string[] = text
      ? (pdf.splitTextToSize(text, maxTW - indent) as string[])
      : [];
    for (let i = 0; i < totalRows; i++) {
      box(rowH);
      if (i < lines.length) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(fs);
        pdf.setTextColor(0);
        pdf.text(lines[i], lx + pad + indent, midY(rowH));
      }
      y += rowH;
    }
  };

  // ── HEADER ────────────────────────────────────────────────
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.5);
  pdf.rect(lx, y, slipW, hdrH);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(0);
  pdf.text('ACTION TICKLER SLIP', lx + slipW / 2, midY(hdrH), { align: 'center' });
  y += hdrH;

  pdf.setLineWidth(0.3);
  pdf.rect(lx, y, slipW, rowH);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(fs);
  pdf.text('For Incoming Mail/Message', lx + slipW / 2, midY(rowH), { align: 'center' });
  y += rowH;

  // ── FIELDS ────────────────────────────────────────────────
  fieldRow('Correspondence No.', ticket.ticket_number);
  fieldRow('Date:', new Date(ticket.created_at).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  }));
  fieldRow('From:', "Provincial Treasurer's Office");

  // Subject: label row + 5 text rows
  fieldRow('Subject:');
  const subjectText = [letter.title, letter.document_subject, letter.description]
    .filter(Boolean).join(' — ');
  textBlock(subjectText, 5);

  fieldRow('Assigned to:', ticket.assigned_to);
  fieldRow('Due Date/Deadline:', ticket.due_date
    ? new Date(ticket.due_date).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '');

  // Instruction: label row + 5 text rows
  fieldRow('Instruction:');
  textBlock(ticket.action_notes || '', 5);

  // By + blank signature row
  fieldRow('By:', ticket.assigned_by);
  box(rowH);
  y += rowH;

  // ── FOOTER ────────────────────────────────────────────────
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(160);
  pdf.text(
    `Generated on ${new Date().toLocaleString()} — Document Tracking System`,
    lx, y + 4
  );

  return pdf;
}

export function downloadTicklerPDF(pdf: jsPDF, ticketNumber: string): void {
  pdf.save(`tickler-${ticketNumber}.pdf`);
}
