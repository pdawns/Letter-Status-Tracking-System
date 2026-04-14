import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { Letter, LetterStatus } from '../../types';

/**
 * Generate PDF receipt from receipt component data with professional table layout
 */
export async function generateReceiptPDF(
  letter: Letter,
  statuses: LetterStatus[]
): Promise<jsPDF> {
  try {
    // Create a new PDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Set document properties
    pdf.setProperties({
      title: `Receipt - ${letter.reference_number}`,
      subject: 'Document Tracking Receipt',
      author: 'Document Tracking System',
      keywords: 'receipt, document, tracking, signature',
      creator: 'Document Tracking System'
    });

    let yPosition = 20;
    
    // Generate QR code as data URL with reference number and document type
    const origin = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : '';
    const trackingUrl = `${origin}/?ref=${letter.reference_number}&type=${letter.document_type || 'document'}&id=${letter.id}`;
    const qrCodeDataUrl = await QRCode.toDataURL(trackingUrl, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'H'
    });
    
    // Add simple header WITHOUT border
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 69, 38);
    pdf.text('DOCUMENT TRACKING RECEIPT', 105, 27, { align: 'center' });
    
    yPosition = 45;
    
    // Add reference number and status
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Reference: ${letter.reference_number}`, 20, yPosition);
    
    const hasNoted = statuses.some((s) => s.status_type === 'noted');
    const hasReviewed = statuses.some((s) => s.status_type === 'reviewed');
    const hasApproved = statuses.some((s) => s.status_type === 'approved');
    const allComplete = hasNoted && hasReviewed && hasApproved;
    
    pdf.text(`Status: ${allComplete ? 'COMPLETE' : 'IN PROGRESS'}`, 140, yPosition);
    yPosition += 10;
    
    // Document Information Section Header
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DOCUMENT INFORMATION', 20, yPosition);
    yPosition += 5;
    
    // Layout: table on left, QR code on right — side by side
    const qrSize = 38;
    const qrX = 158;

    const tableStartY = yPosition;
    const leftColX = 20;
    const leftColWidth = 55;
    const rightColX = 75;
    const rightColWidth = 78;
    const lineHeight = 4.5; // line spacing inside multi-line cells
    const cellPadV = 3;     // top padding inside cell before first text line

    // currentY tracks the actual Y of the next row (accounts for expanded rows)
    let currentY = tableStartY;

    const drawTableRow = (label: string, value: string) => {
      const rowY = currentY;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      const lines: string[] = pdf.splitTextToSize(value, rightColWidth - 4);
      const cellHeight = cellPadV * 2 + lines.length * lineHeight;

      // Draw borders
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.rect(leftColX, rowY, leftColWidth, cellHeight);
      pdf.rect(rightColX, rowY, rightColWidth, cellHeight);

      // Label
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(80, 80, 80);
      pdf.text(label, leftColX + 2, rowY + cellPadV + lineHeight - 1);

      // Value lines
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      lines.forEach((line: string, idx: number) => {
        pdf.text(line, rightColX + 2, rowY + cellPadV + lineHeight - 1 + idx * lineHeight);
      });

      currentY += cellHeight;
    };

    drawTableRow('Title', letter.title);
    if (letter.document_type) drawTableRow('Document Type', letter.document_type.toUpperCase());
    if (letter.document_subject) drawTableRow('Subject', letter.document_subject);
    if (letter.description) drawTableRow('Description', letter.description);
    drawTableRow('Created Date', new Date(letter.created_at).toLocaleString());

    const tableEndY = currentY;

    // QR code: vertically centered beside the table
    const tableHeight = tableEndY - tableStartY;
    const finalQrY = tableStartY + Math.max(0, (tableHeight - qrSize) / 2);

    pdf.addImage(qrCodeDataUrl, 'PNG', qrX, finalQrY, qrSize, qrSize);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Scan to track', qrX + qrSize / 2, finalQrY + qrSize + 4, { align: 'center' });

    yPosition = Math.max(tableEndY, finalQrY + qrSize + 8) + 6;
    
    // Footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Generated on ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });
      pdf.text('Document Tracking System - Official Receipt', 105, 290, { align: 'center' });
      pdf.text(`Page ${i} of ${pageCount}`, 190, 290, { align: 'right' });
    }
    
    return pdf;
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF receipt');
  }
}

/**
 * Alternative method: Generate PDF from HTML element (screenshot)
 */
export async function generatePDFFromElement(element: HTMLElement): Promise<jsPDF> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    
    return pdf;
    
  } catch (error) {
    console.error('Error generating PDF from element:', error);
    throw new Error('Failed to generate PDF from element');
  }
}

/**
 * Download PDF file
 */
export function downloadPDF(pdf: jsPDF, filename: string = 'receipt.pdf'): void {
  pdf.save(filename);
}

/**
 * Open PDF in new tab
 */
export function openPDF(pdf: jsPDF): void {
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}