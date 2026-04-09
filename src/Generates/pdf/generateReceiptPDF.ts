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
    
    // Generate QR code as data URL
    const trackingUrl = `${window.location.origin}/?track=${letter.id}`;
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
    
    // Draw table for document information
    const tableStartY = yPosition;
    const leftColX = 20;
    const rightColX = 75;
    const rowHeight = 8;
    let currentRow = 0;
    
    // Helper function to draw table row
    const drawTableRow = (label: string, value: string, rowIndex: number) => {
      const rowY = tableStartY + (rowIndex * rowHeight);
      
      // Draw cell borders
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.rect(leftColX, rowY, 55, rowHeight);
      pdf.rect(rightColX, rowY, 120, rowHeight);
      
      // Label (left column)
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(80, 80, 80);
      pdf.text(label, leftColX + 2, rowY + 5.5);
      
      // Value (right column)
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      
      // Handle long text
      const maxWidth = 115;
      const lines = pdf.splitTextToSize(value, maxWidth);
      
      if (lines.length > 1) {
        // Multi-line value
        lines.forEach((line: string, idx: number) => {
          pdf.text(line, rightColX + 2, rowY + 5.5 + (idx * 4));
        });
        return lines.length - 1; // Return extra rows needed
      } else {
        pdf.text(value, rightColX + 2, rowY + 5.5);
        return 0;
      }
    };
    
    // Draw table rows
    drawTableRow('Title', letter.title, currentRow++);
    
    if (letter.document_type) {
      drawTableRow('Document Type', letter.document_type.toUpperCase(), currentRow++);
    }
    
    if (letter.document_subject) {
      const extraRows = drawTableRow('Subject', letter.document_subject, currentRow);
      currentRow += 1 + extraRows;
    }
    
    if (letter.description) {
      const extraRows = drawTableRow('Description', letter.description, currentRow);
      currentRow += 1 + extraRows;
    }
    
    drawTableRow('Created Date', new Date(letter.created_at).toLocaleString(), currentRow++);
    
    yPosition = tableStartY + (currentRow * rowHeight) + 10;
    
    // Add QR Code on the right side
    const qrSize = 35;
    const qrX = 160;
    const qrY = tableStartY;
    
    pdf.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    
    // Add "Scan to track" text below QR
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Scan to track', qrX + (qrSize / 2), qrY + qrSize + 4, { align: 'center' });
    
    // Signature section (NO border, NO "Noted #X", just "Signed by" on right)
    const notedStatuses = statuses.filter((s) => s.status_type === 'noted');
    
    if (notedStatuses.length > 0) {
      notedStatuses.forEach((status) => {
        // Check if we need a new page
        if (yPosition > 260) {
          pdf.addPage();
          yPosition = 20;
        }
        
        // Just display "Signed by: NAME" on the RIGHT side, no border, no badge
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        const signedByText = `Signed by: ${status.signed_by}`;
        const textWidth = pdf.getTextWidth(signedByText);
        pdf.text(signedByText, 195 - textWidth, yPosition);
        
        yPosition += 8;
      });
    }
    
    // Attached Document Section
    if (letter.file_url && letter.file_name) {
      yPosition += 5;
      
      // Check if we need a new page
      if (yPosition > 240) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('ATTACHED DOCUMENT', 20, yPosition);
      yPosition += 7;
      
      // Draw box for file info
      pdf.setDrawColor(156, 175, 136);
      pdf.setFillColor(223, 245, 225);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(20, yPosition, 175, 20, 2, 2, 'FD');
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 69, 38);
      pdf.text('File Name:', 25, yPosition + 6);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      const fileNameLines = pdf.splitTextToSize(letter.file_name, 140);
      pdf.text(fileNameLines, 25, yPosition + 11);
      
      yPosition += 25;
    }
    
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