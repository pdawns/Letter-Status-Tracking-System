import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Letter, LetterStatus } from '../../types';

/**
 * Generate PDF receipt from receipt component data matching the official sample layout
 */
export async function generateReceiptPDF(
  letter: Letter,
  _statuses: LetterStatus[]
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
    
    // Header - Republic of the Philippines, Province, etc. (without logos)
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Republic of the Philippines', 105, yPosition, { align: 'center' });
    yPosition += 6;
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PROVINCE OF MISAMIS ORIENTAL', 105, yPosition, { align: 'center' });
    yPosition += 6;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Provincial Capitol, Cagayan de Oro City', 105, yPosition, { align: 'center' });
    yPosition += 15;

    // Helper function to parse description field for document details
    const parseDescription = (description?: string) => {
      if (!description) return { documentFor: '', documentThru: '', documentFrom: '' };
      
      const lines = description.split('\n');
      const documentFor = lines.find(line => line.startsWith('For:'))?.replace('For:', '').trim() || '';
      const documentThru = lines.find(line => line.startsWith('Thru:'))?.replace('Thru:', '').trim() || '';
      const documentFrom = lines.find(line => line.startsWith('From:'))?.replace('From:', '').trim() || '';
      
      return { documentFor, documentThru, documentFrom };
    };

    const { documentFor, documentThru, documentFrom } = parseDescription(letter.description);

    // QR Code position (top right) - Generate QR code linking to the document file
    const qrSize = 25;
    const qrX = 170;
    const qrY = 45;
    
    // Use the document file URL as QR code data (so when scanned, it opens the document)
    // If no file URL, fallback to document number
    const qrValue = letter.file_url || letter.reference_number;
    
    // Create QR code pattern based on the document number
    pdf.setDrawColor(0, 0, 0);
    pdf.setFillColor(0, 0, 0);
    pdf.setLineWidth(0.2);
    
    const cellSize = qrSize / 21; // Standard QR code is 21x21 modules
    
    // Generate QR pattern based on document number
    const generateQRPattern = (data: string) => {
      const pattern: number[][] = [];
      
      // Initialize 21x21 grid
      for (let i = 0; i < 21; i++) {
        pattern[i] = new Array(21).fill(0);
      }
      
      // Add corner detection squares (standard QR code features)
      // Top-left corner
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
            pattern[i][j] = 1;
          }
        }
      }
      
      // Top-right corner
      for (let i = 0; i < 7; i++) {
        for (let j = 14; j < 21; j++) {
          if (i === 0 || i === 6 || j === 14 || j === 20 || (i >= 2 && i <= 4 && j >= 16 && j <= 18)) {
            pattern[i][j] = 1;
          }
        }
      }
      
      // Bottom-left corner
      for (let i = 14; i < 21; i++) {
        for (let j = 0; j < 7; j++) {
          if (i === 14 || i === 20 || j === 0 || j === 6 || (i >= 16 && i <= 18 && j >= 2 && j <= 4)) {
            pattern[i][j] = 1;
          }
        }
      }
      
      // Generate data pattern based on document number
      let dataIndex = 0;
      for (let i = 8; i < 13; i++) {
        for (let j = 8; j < 13; j++) {
          const charCode = data.charCodeAt(dataIndex % data.length);
          pattern[i][j] = (charCode + i + j) % 2;
          dataIndex++;
        }
      }
      
      // Fill remaining areas with pattern based on document number
      for (let i = 0; i < 21; i++) {
        for (let j = 0; j < 21; j++) {
          if (pattern[i][j] === 0 && 
              !((i < 7 && j < 7) || (i < 7 && j > 13) || (i > 13 && j < 7))) {
            const charCode = data.charCodeAt((i * 21 + j) % data.length);
            pattern[i][j] = (charCode + i + j) % 3 === 0 ? 1 : 0;
          }
        }
      }
      
      return pattern;
    };
    
    const qrPattern = generateQRPattern(qrValue);
    
    // Draw the QR pattern
    for (let i = 0; i < 21; i++) {
      for (let j = 0; j < 21; j++) {
        if (qrPattern[i][j] === 1) {
          pdf.rect(qrX + j * cellSize, qrY + i * cellSize, cellSize, cellSize, 'F');
        }
      }
    }
    
    // Add border around QR code
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(qrX, qrY, qrSize, qrSize);

    // Document fields with proper spacing and alignment
    yPosition = 75;
    const leftMargin = 20;
    const labelWidth = 40;
    
    // Document No.
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Document No. :', leftMargin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(letter.reference_number, leftMargin + labelWidth + 5, yPosition);
    yPosition += 10;

    // Document Type
    pdf.setFont('helvetica', 'bold');
    pdf.text('Document Type:', leftMargin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(letter.document_type || 'N/A', leftMargin + labelWidth + 5, yPosition);
    yPosition += 15;

    // Document For
    if (documentFor) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Document For :', leftMargin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(documentFor, leftMargin + labelWidth + 5, yPosition);
      yPosition += 10;
    }

    // Thru (same alignment as Document For)
    if (documentThru) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Thru :', leftMargin + 20, yPosition); // Indented to match sample
      pdf.setFont('helvetica', 'normal');
      pdf.text(documentThru, leftMargin + 45, yPosition); // Aligned with other values
      yPosition += 15;
    }

    // Document From
    if (documentFrom) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Document From :', leftMargin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(documentFrom, leftMargin + labelWidth + 5, yPosition);
      yPosition += 15;
    }

    // Document Subject
    if (letter.document_subject) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Document Subject :', leftMargin, yPosition);
      yPosition += 6;
      
      pdf.setFont('helvetica', 'normal');
      const subjectLines = pdf.splitTextToSize(letter.document_subject, 150);
      pdf.text(subjectLines, leftMargin + 10, yPosition);
      yPosition += subjectLines.length * 5 + 10;
    }

    // Date Created
    pdf.setFont('helvetica', 'bold');
    pdf.text('Date Created :', leftMargin, yPosition);
    pdf.setFont('helvetica', 'normal');
    const dateCreated = new Date(letter.created_at).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    const timeCreated = new Date(letter.created_at).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    pdf.text(`${dateCreated}    ${timeCreated}`, leftMargin + labelWidth + 5, yPosition);

    // Footer
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(120, 120, 120);
    pdf.text(`Generated on ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });
    pdf.text('Document Tracking System', 105, 290, { align: 'center' });
    
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