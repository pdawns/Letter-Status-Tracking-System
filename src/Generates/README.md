# Generates Folder

This folder contains PDF generation utilities for the Document Tracking System.

## PDF Generation Module

### Files:

1. **`pdf/generateReceiptPDF.ts`** - Main PDF generation functions
   - `generateReceiptPDF()` - Generate professional PDF with table layout
   - `generatePDFFromElement()` - Generate PDF from HTML element (screenshot)
   - `downloadPDF()` - Download PDF file
   - `openPDF()` - Open PDF in new tab

2. **`pdf/receiptTemplate.ts`** - PDF template generation (HTML templates)
   - `generateReceiptTemplate()` - Generate HTML template for PDF
   - `generateReceiptText()` - Generate text version for accessibility

3. **`pdf/PDFInstructions.tsx`** - React component for PDF instructions

### Usage:

```typescript
import { generateReceiptPDF, downloadPDF } from './Generates/pdf';

// Generate and download PDF
const pdf = await generateReceiptPDF(letter, statuses);
downloadPDF(pdf, `receipt-${letter.reference_number}.pdf`);
```

### PDF Design Features:

- **Professional Header**: Simple bordered header with title
- **Table Layout**: Document information displayed in clean table format
- **Signature History**: Numbered signature boxes with clear formatting
- **File Attachments**: Highlighted section for attached documents
- **Footer**: Page numbers and generation timestamp
- **Clean Design**: Professional appearance suitable for official documents

### Button:

- Single "Print/Save Receipt" button that generates and downloads PDF
- Loading state with spinner during PDF generation
- Disabled state to prevent multiple clicks

### Dependencies:

- `jspdf` - PDF generation library
- `html2canvas` - HTML to image conversion (for screenshot method)