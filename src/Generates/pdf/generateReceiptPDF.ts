import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { Letter, LetterStatus } from '../../types';

function fixNamePdf(value: string): string {
  return value.replace(/Constantito/g, 'Constantino').replace(/Lenmark/g, 'Linmark');
}

/**
 * Load an image URL as base64 data URL
 */
async function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

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
      author: 'DocuTrack',
      keywords: 'receipt, document, tracking, signature',
      creator: 'DocuTrack'
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

    // Load logos
    const baseUrl = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : '';
    let logoBagong = '', logo1 = '', logo2 = '', logo3 = '', logoBangonGov = '';
    try { logoBagong = await loadImageAsBase64(`${baseUrl}/bagong-pilipinas-v4.png`); } catch { /* skip */ }
    try { logo1 = await loadImageAsBase64(`${baseUrl}/LOGO1.png`); } catch { /* skip */ }
    try { logo2 = await loadImageAsBase64(`${baseUrl}/LOGO2.png`); } catch { /* skip */ }
    try { logo3 = await loadImageAsBase64(`${baseUrl}/LOGO3.jpg`); } catch { /* skip */ }
    try { logoBangonGov = await loadImageAsBase64(`${baseUrl}/bangon-misor-gov.png`); } catch { /* skip */ }

    // ── Letterhead Header ──────────────────────────────────
    const logoSize = 14;
    const headerY = 6;

    if (logoBagong) pdf.addImage(logoBagong, 'PNG', 10, headerY, logoSize, logoSize);
    if (logo2)      pdf.addImage(logo2,      'PNG', 26, headerY, logoSize, logoSize);
    if (logo1)      pdf.addImage(logo1,      'PNG', 166, headerY, logoSize, logoSize);
    if (logo3)      pdf.addImage(logo3,      'PNG', 182, headerY, logoSize, logoSize);

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    pdf.text('Republic of the Philippines', 105, headerY + 3, { align: 'center' });

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 58, 95);
    pdf.text('PROVINCE OF MISAMIS ORIENTAL', 105, headerY + 7.5, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 58, 95);
    pdf.text('OFFICE OF THE PROVINCIAL TREASURER', 105, headerY + 13, { align: 'center' });

    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text('www.misamisoriental.gov.ph', 105, headerY + 17, { align: 'center' });

    // Double line separator
    pdf.setDrawColor(30, 58, 95);
    pdf.setLineWidth(0.7);
    pdf.line(10, headerY + 20, 200, headerY + 20);
    pdf.setLineWidth(0.25);
    pdf.line(10, headerY + 22, 200, headerY + 22);

    yPosition = headerY + 28;

    // ── Title + Reference + Status ─────────────────────────
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 69, 38);
    pdf.text('DOCUMENT TRACKING RECEIPT', 105, yPosition, { align: 'center' });
    yPosition += 7;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Reference: ${letter.reference_number}`, 10, yPosition);

    const hasNoted = statuses.some(s => s.status_type === 'noted');
    const hasReviewed = statuses.some(s => s.status_type === 'reviewed');
    const hasApproved = statuses.some(s => s.status_type === 'approved');
    const allComplete = hasNoted && hasReviewed && hasApproved;
    pdf.text(`Status: ${allComplete ? 'COMPLETE' : 'IN PROGRESS'}`, 200, yPosition, { align: 'right' });
    yPosition += 6;

    // ── Document info table + QR side by side ──────────────
    const qrSize = 30;
    const qrX = 168;
    const tableStartY = yPosition;
    const leftColX = 10;
    const leftColW = 45;
    const rightColX = 55;
    const rightColW = 108;
    const lh = 4;
    const padV = 2.5;
    let currentY = tableStartY;

    const drawRow = (label: string, value: string) => {
      const lines: string[] = pdf.splitTextToSize(value, rightColW - 3);
      const cellH = padV * 2 + lines.length * lh;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.25);
      pdf.rect(leftColX, currentY, leftColW, cellH);
      pdf.rect(rightColX, currentY, rightColW, cellH);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(80, 80, 80);
      pdf.text(label, leftColX + 2, currentY + padV + lh - 1);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      lines.forEach((line, i) => pdf.text(line, rightColX + 2, currentY + padV + lh - 1 + i * lh));
      currentY += cellH;
    };

    drawRow('Title', letter.title);
    if (letter.document_type) drawRow('Document Type', letter.document_type.toUpperCase());
    if (letter.document_subject) drawRow('Subject', letter.document_subject);
    if (letter.description) drawRow('Description', letter.description);
    drawRow('Created Date', new Date(letter.created_at).toLocaleDateString());
    if (letter.document_direction === 'sending')
      drawRow('Date Sent', new Date(letter.sent_at || letter.created_at).toLocaleString());
    if (letter.document_direction === 'receiving') {
      const rev = statuses.find(s => s.status_type === 'for review' || s.status_type === 'reviewed');
      if (rev) drawRow('Date Received', new Date(rev.signed_at).toLocaleString());
    }

    const tableEndY = currentY;
    const tableH = tableEndY - tableStartY;
    const qrY = tableStartY + Math.max(0, (tableH - qrSize) / 2);
    pdf.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);
    pdf.text('Scan to track', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });

    yPosition = Math.max(tableEndY, qrY + qrSize + 5) + 5;

    // ── Noted By + Bangon logo side by side ────────────────
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 69, 38);
    pdf.text('NOTED BY', 10, yPosition);
    yPosition += 4;

    const bangonSize = 24;
    const bangonX = 176;
    const bangonY = yPosition;

    if (statuses.length > 0) {
      const ns = statuses[0];
      const boxX = 10;
      const boxW = 160;
      const labelW = 32;
      const valW = boxW - labelW - 4;
      const pad = 2.5;
      const rlh = 4.5;
      const noteLines = ns.notes ? pdf.splitTextToSize(fixNamePdf(ns.notes), valW) : [];
      const rowCount = 2 + (ns.notes ? noteLines.length : 0);
      const boxH = pad * 2 + rowCount * rlh;

      pdf.setDrawColor(0, 69, 38);
      pdf.setLineWidth(0.4);
      pdf.rect(boxX, yPosition, boxW, boxH);

      pdf.setFontSize(8);
      let ry = yPosition + pad + rlh - 1;

      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(60, 60, 60);
      pdf.text('Signed by:', boxX + 2, ry);
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(0, 0, 0);
      pdf.text(fixNamePdf(ns.signed_by), boxX + labelW, ry);
      ry += rlh;

      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(60, 60, 60);
      pdf.text('Date & Time:', boxX + 2, ry);
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(0, 0, 0);
      pdf.text(new Date(ns.signed_at).toLocaleString(), boxX + labelW, ry);
      ry += rlh;

      if (ns.notes) {
        pdf.setFont('helvetica', 'bold'); pdf.setTextColor(60, 60, 60);
        pdf.text('Notes:', boxX + 2, ry);
        pdf.setFont('helvetica', 'normal'); pdf.setTextColor(0, 0, 0);
        noteLines.forEach((line: string, i: number) => pdf.text(line, boxX + labelW, ry + i * rlh));
      }

      yPosition += boxH + 3;
    } else {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(150, 150, 150);
      pdf.text('Document has not been noted by Sir Ronald yet.', 10, yPosition);
      yPosition += 7;
    }

    // Bangon logo beside Noted By
    if (logoBangonGov) pdf.addImage(logoBangonGov, 'PNG', bangonX, bangonY, bangonSize, bangonSize);

    // ── Footer ─────────────────────────────────────────────
    yPosition = Math.max(yPosition, bangonY + bangonSize + 3) + 4;
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.25);
    pdf.line(10, yPosition, 200, yPosition);
    yPosition += 3;

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(55, 65, 81);
    pdf.text('OFFICE OF THE PROVINCIAL TREASURER', 10, yPosition);
    yPosition += 3.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text('1st Floor, Provincial Capitol Building, Provincial Capitol Compound', 10, yPosition);
    yPosition += 3.5;
    pdf.text(`Don Apolinar Velez St., Cagayan de Oro City  |  Email: misor.pto@gmail.com  |  Generated on ${new Date().toLocaleString()}`, 10, yPosition);
    
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