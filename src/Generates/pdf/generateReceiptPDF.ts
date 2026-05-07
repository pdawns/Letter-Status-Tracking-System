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
 * Generate PDF receipt from receipt component data with landscape layout
 */
export async function generateReceiptPDF(
  letter: Letter,
  statuses: LetterStatus[]
): Promise<jsPDF> {
  try {
    // Create a new PDF document in LANDSCAPE orientation
    const pdf = new jsPDF({
      orientation: 'landscape',
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

    // Generate QR code as data URL with reference number and document type
    const origin = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : '';
    const trackingUrl = `${origin}/?ref=${letter.reference_number}&type=${letter.document_type || 'document'}&id=${letter.id}`;
    const qrCodeDataUrl = await QRCode.toDataURL(trackingUrl, {
      width: 300,
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

    // ── HEADER: Three logos centered at top ────────────────
    const logoSize = 22;
    const centerX = 148.5; // Center of landscape A4 (297mm / 2)
    const logoSpacing = 28;
    const headerY = 15;

    // Three logos: Bagong Pilipinas (left), Unity (center), Province Seal (right)
    if (logoBagong) pdf.addImage(logoBagong, 'PNG', centerX - logoSpacing - logoSize/2, headerY, logoSize, logoSize);
    if (logo3)      pdf.addImage(logo3,      'JPEG', centerX - logoSize/2, headerY, logoSize, logoSize);
    if (logo2)      pdf.addImage(logo2,      'PNG', centerX + logoSpacing - logoSize/2, headerY, logoSize, logoSize);

    // Text below logos
    let textY = headerY + logoSize + 4;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Republic of the Philippines', centerX, textY, { align: 'center' });
    
    textY += 5;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('PROVINCE OF MISAMIS ORIENTAL', centerX, textY, { align: 'center' });
    
    textY += 5;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text('Provincial Capitol, Cagayan de Oro City', centerX, textY, { align: 'center' });

    // ── LEFT SIDE: Document information ────────────────────
    const leftX = 15;
    let leftY = 70;
    const lineHeight = 6;
    const indentX = 35; // Indent for values

    // Helper function to add field with label and value
    const addField = (label: string, value: string, indent: boolean = true) => {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${label}:`, leftX, leftY);
      leftY += lineHeight;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(40, 40, 40);
      const maxWidth = 140;
      const lines = pdf.splitTextToSize(value, maxWidth);
      lines.forEach((line: string) => {
        pdf.text(line, indent ? indentX : leftX, leftY);
        leftY += lineHeight;
      });
      leftY += 1; // Extra spacing between fields
    };

    // Display document fields from document_subject
    if (letter.document_subject) {
      const subjectLines = letter.document_subject.split('\n').filter(line => line.trim());
      let firstField = true;
      
      subjectLines.forEach(line => {
        // Check if line contains a colon (field format like "Document No.: value")
        if (line.includes(':')) {
          const colonIndex = line.indexOf(':');
          const label = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          
          // Skip Document Type field from document_subject - we'll add it manually
          if (label.toLowerCase() !== 'document type') {
            addField(label, value);
            
            // Add Document Type right after Document No.
            if (firstField && label.toLowerCase().includes('document no') && letter.document_type) {
              addField('Document Type', letter.document_type);
            }
            firstField = false;
          }
        } else {
          // Display as continuation of previous field
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(40, 40, 40);
          const lines = pdf.splitTextToSize(line, 140);
          lines.forEach((l: string) => {
            pdf.text(l, indentX, leftY);
            leftY += lineHeight;
          });
          leftY += 1;
        }
      });
    }

    // Add Date Created
    addField('Date Created', new Date(letter.created_at).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }));

    // ── RIGHT SIDE: QR Code ────────────────────────────────
    const qrSize = 50;
    const qrX = 230;
    const qrY = 70;
    pdf.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // ── BOTTOM RIGHT: Signature area ───────────────────────
    const sigY = 135;
    const sigX = 200;

    if (statuses.length > 0) {
      const ns = statuses[0];
      
      // Signature line
      pdf.setLineWidth(0.5);
      pdf.setDrawColor(0, 0, 0);
      pdf.line(sigX, sigY, sigX + 60, sigY);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(fixNamePdf(ns.signed_by), sigX + 30, sigY + 5, { align: 'center' });
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const dateStr = new Date(ns.signed_at).toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      pdf.text(dateStr, sigX + 30, sigY + 10, { align: 'center' });
    }

    // Bangon logo at bottom right
    const bangonSize = 28;
    const bangonX = 245;
    const bangonY = 155;
    if (logoBangonGov) pdf.addImage(logoBangonGov, 'PNG', bangonX, bangonY, bangonSize, bangonSize);
    
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