import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Letter } from '../../types';

async function loadImg(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      if (!ctx) return reject(new Error('no ctx'));
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function generateLetterViewPDF(letter: Letter): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({ title: `Letter - ${letter.reference_number}`, creator: 'DocuTrack' });

  const base = typeof window !== 'undefined' ? window.location.origin : '';
  let logoBagong = '', logo1 = '', logo2 = '', logo3 = '', logoBangon = '';
  try { logoBagong = await loadImg(`${base}/bagong-pilipinas-v4.png`); } catch { /* skip */ }
  try { logo1    = await loadImg(`${base}/LOGO1.png`); } catch { /* skip */ }
  try { logo2    = await loadImg(`${base}/LOGO2.png`); } catch { /* skip */ }
  try { logo3    = await loadImg(`${base}/LOGO3.jpg`); } catch { /* skip */ }
  try { logoBangon = await loadImg(`${base}/bangon-misor-gov.png`); } catch { /* skip */ }

  // ── Letterhead ──────────────────────────────────────────
  const logoSz = 16, hY = 6;
  if (logoBagong) pdf.addImage(logoBagong, 'PNG', 10, hY, logoSz, logoSz);
  if (logo2)      pdf.addImage(logo2,      'PNG', 28, hY, logoSz, logoSz);
  if (logo1)      pdf.addImage(logo1,      'PNG', 166, hY, logoSz, logoSz);
  if (logo3)      pdf.addImage(logo3,      'PNG', 184, hY, logoSz, logoSz);

  pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81);
  pdf.text('Republic of the Philippines', 105, hY + 3.5, { align: 'center' });
  pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95);
  pdf.text('PROVINCE OF MISAMIS ORIENTAL', 105, hY + 8, { align: 'center' });
  pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95);
  pdf.text('OFFICE OF THE PROVINCIAL TREASURER', 105, hY + 13.5, { align: 'center' });
  pdf.setFontSize(6.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(107, 114, 128);
  pdf.text('www.misamisoriental.gov.ph', 105, hY + 17.5, { align: 'center' });

  pdf.setDrawColor(30, 58, 95); pdf.setLineWidth(0.7);
  pdf.line(10, hY + 21, 200, hY + 21);
  pdf.setLineWidth(0.25);
  pdf.line(10, hY + 23, 200, hY + 23);

  let y = hY + 30;

  // ── Date + Reference ────────────────────────────────────
  const dateStr = new Date(letter.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81);
  pdf.text(dateStr, 10, y); y += 6;

  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0, 0, 0);
  pdf.text(`Reference No.: ${letter.reference_number}`, 10, y); y += 8;

  // ── Document details table ───────────────────────────────
  const lX = 10, lW = 45, rX = 55, rW = 145, lh = 4, pad = 2.5;
  let cY = y;

  const drawRow = (label: string, value: string) => {
    const lines: string[] = pdf.splitTextToSize(value, rW - 3);
    const cellH = pad * 2 + lines.length * lh;
    pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.25);
    pdf.rect(lX, cY, lW, cellH); pdf.rect(rX, cY, rW, cellH);
    pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(80, 80, 80);
    pdf.text(label, lX + 2, cY + pad + lh - 1);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(0, 0, 0);
    lines.forEach((line, i) => pdf.text(line, rX + 2, cY + pad + lh - 1 + i * lh));
    cY += cellH;
  };

  drawRow('Document Type', (letter.document_type || 'Letter').toUpperCase());
  drawRow('Title', letter.title);
  if (letter.document_subject) drawRow('Subject', letter.document_subject);
  if (letter.description) drawRow('Description', letter.description);
  drawRow('Created Date', dateStr);

  y = cY + 8;

  // ── Letter body ─────────────────────────────────────────
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(0, 0, 0);

  pdf.text('Dear Sir/Ma\'am,', 10, y); y += 5;
  pdf.text('Good day!', 10, y); y += 6;

  const bodyText = `This is to inform you that your document titled "${letter.title}" with Reference No. ${letter.reference_number} has been officially received by the Provincial Treasurer's Office, Province of Misamis Oriental on ${dateStr}.`;
  const bodyLines: string[] = pdf.splitTextToSize(bodyText, 190);
  bodyLines.forEach(line => { pdf.text(line, 10, y); y += 4.5; });
  y += 2;

  pdf.text('For your information and guidance.', 10, y); y += 10;

  pdf.text('Respectfully yours,', 10, y); y += 14;

  pdf.setFont('helvetica', 'bold');
  pdf.text('RONALD JAME D. VIOLON, CPA, REB, REA, MDMG', 10, y); y += 4.5;
  pdf.setFont('helvetica', 'normal');
  pdf.text('Provincial Treasurer', 10, y); y += 8;

  // ── Footer — pinned to bottom of page ───────────────────
  const footerY = 268;
  pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.25);
  pdf.line(10, footerY, 200, footerY);

  const bangonSz = 24;
  if (logoBangon) pdf.addImage(logoBangon, 'PNG', 176, footerY + 3, bangonSz, bangonSz);

  pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(55, 65, 81);
  pdf.text('OFFICE OF THE PROVINCIAL TREASURER', 105, footerY + 6, { align: 'center' });
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(107, 114, 128);
  pdf.text('1st Floor, Provincial Capitol Building, Provincial Capitol Compound', 105, footerY + 10, { align: 'center' });
  pdf.text('Don Apolinar Velez St., Cagayan de Oro City', 105, footerY + 14, { align: 'center' });
  pdf.text('Email Address: misor.pto@gmail.com', 105, footerY + 18, { align: 'center' });
  pdf.text(`Generated on ${new Date().toLocaleString()}`, 105, footerY + 22, { align: 'center' });

  return pdf;
}
