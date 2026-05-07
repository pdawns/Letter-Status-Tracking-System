# Document Display Summary

## Document Tracking Receipt (Receipt.tsx)
The Document Tracking Receipt is a printable receipt that shows:

### Always Displayed:
- **Reference Number**: User-provided tracking number (e.g., LTR-2026-001)
- **Document Type**: Letter, Endorsement, Memorandum, etc.
- **Title**: Document title
- **Subject**: Contains all document-specific fields formatted with line breaks
- **Created Date**: Date the document was created
- **Date Sent/Received**: Depending on document direction
- **QR Code**: For tracking the document
- **Noted By**: Status showing if Sir Ronald has noted the document

### For Letter Documents, the Subject field contains:
```
Document No.: PGMO-PTO-001-7234
Document For: MR. RONALD JME D. VIOLON, Provincial Treasurer
Thru: GJTU
Document From: ANALIZA U. MISO / CSEA MANAGER FDC MPC
Document Subject: Budget request for Q1
```

### For Endorsement Documents, the Subject field contains:
```
Document For: MR. RONALD JME D. VIOLON, Provincial Treasurer
Thru: GJTU
Document From: ANALIZA U. MISO / CSEA MANAGER FDC MPC
[Additional subject/notes]
```

### For Memorandum Documents, the Subject field contains:
```
Memo Order No: GJTU No. 813 - 2026
To: ALL DEPARTMENT HEADS/CHIEFS OF OFFICES
[Additional subject/notes]
```

---

## Document Info (DocumentInfo.tsx)
The Document Info page shows comprehensive details including:

### Basic Information:
- **Reference Number**: Tracking number
- **Document Type**: Type of document
- **Title**: Document title
- **Subject**: All document-specific fields (same as Receipt)
- **Created Date**: When document was created
- **Created By**: Username who created it

### Sender Information (for incoming documents):
- **Sender Name**: Name of the person sending
- **Sender Office**: Office/Department
- **Phone**: Contact number
- **Email**: Email address
- **Date Received**: When the document was received

### File Management:
- **File Preview**: Embedded preview of PDF/images
- **View Button**: Open file in new tab
- **Download Button**: Download the file
- **Replace File Button**: Upload a new version

### Action Tracking:
- **Action Tickler Slips**: List of all action tickets created
- **Activity Logs**: Complete history of status changes
- **Notify Sender Button**: Send SMS/Email to sender

---

## Key Differences

| Feature | Document Tracking Receipt | Document Info |
|---------|--------------------------|---------------|
| Purpose | Printable receipt for tracking | Full document management |
| Reference Number | ✓ | ✓ |
| Document Type | ✓ | ✓ |
| Title | ✓ | ✓ |
| Subject (with all fields) | ✓ | ✓ |
| Created Date | ✓ | ✓ |
| QR Code | ✓ | ✗ |
| Noted By Status | ✓ | ✗ |
| Created By | ✗ | ✓ |
| Sender Info | ✗ | ✓ (if receiving) |
| File Preview | ✗ | ✓ |
| Action Tickets | ✗ | ✓ |
| Activity Logs | ✗ | ✓ |
| Printable | ✓ | ✗ |

---

## How Fields Are Stored

All document-specific fields are stored in the `document_subject` column with newline separators (`\n`):

### Example for Letter:
```
Budget request for Q1
Document No.: PGMO-PTO-001-7234
Document For: MR. RONALD JME D. VIOLON, Provincial Treasurer
Thru: GJTU
Document From: ANALIZA U. MISO / CSEA MANAGER FDC MPC
Document Subject: Budget request for Q1
```

This format allows:
1. **Automatic display** in Receipt and DocumentInfo without parsing
2. **Proper line breaks** when displayed
3. **All fields preserved** in the database
4. **Backward compatibility** with existing documents

---

## Important Notes

1. **Old documents** created before the new fields were added will NOT have Document No., Document For, etc. Only new documents will have complete information.

2. **Reference Number vs Document No.**:
   - **Reference Number**: User-provided tracking number (e.g., LTR-2026-001)
   - **Document No.**: Generated from office, sequence, and unique number (e.g., PGMO-PTO-001-7234)
   - They are separate and serve different purposes

3. **Display is automatic**: Both Receipt and DocumentInfo read from `document_subject` and display it with proper formatting. No additional code changes needed.

4. **Printing**: The Receipt component has a "Print / Save Receipt" button that generates a PDF with all the information formatted properly.
