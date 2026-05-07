# QA Test Script — Document Tracking System (DTS)
## Deployment Verification Checklist

> Run these tests in order. Each section is grouped by role and feature area.
> Mark each item: ✅ PASS | ❌ FAIL | ⚠️ PARTIAL

---

# PART 1 — SYSTEM ACCESS & AUTHENTICATION

## 1.1 Public Landing Page
- [ ] Landing page loads without login
- [ ] Logo and office name display correctly
- [ ] "Track Document" button is visible and clickable
- [ ] "Staff Login" button opens login modal
- [ ] Bottom ticker (live document feed) is visible and scrolling
- [ ] Page is responsive on mobile

## 1.2 Login Modal
- [ ] Login modal opens when "Staff Login" is clicked
- [ ] Username and password fields are present
- [ ] Submitting empty fields shows an error
- [ ] Entering wrong credentials shows "Invalid username or password"
- [ ] Successful login closes modal and loads dashboard
- [ ] Role is stored in localStorage (`dts_role`)
- [ ] Token is stored in localStorage (`dts_token`)
- [ ] Username is stored in localStorage (`dts_username`)

## 1.3 Logout
- [ ] Logout button is visible in the top bar or sidebar
- [ ] Clicking logout clears `dts_token`, `dts_role`, `dts_username` from localStorage
- [ ] After logout, user is returned to landing page
- [ ] Accessing protected views after logout redirects to login

## 1.4 Change Password (All Roles)
- [ ] Change password option is accessible in Settings
- [ ] Entering wrong current password shows an error
- [ ] Entering mismatched new passwords shows an error
- [ ] Successful password change shows confirmation
- [ ] Old password no longer works after change
- [ ] New password works on next login

---

# PART 2 — STAFF ROLE

> Login as any staff account (e.g., `jonarleen.cabago@pto`)

## 2.1 Navigation & Access Control
- [ ] Dashboard tab is visible and accessible
- [ ] Create Document tab is visible and accessible
- [ ] Track Document tab is visible and accessible
- [ ] Document Library tab is visible and accessible
- [ ] Settings tab is visible and accessible
- [ ] Archive tab is NOT visible (staff cannot access archive)
- [ ] Send Document tab is NOT visible
- [ ] Active Sessions is NOT visible

## 2.2 Dashboard
- [ ] Dashboard loads with statistics cards:
  - [ ] Total Documents count
  - [ ] Pending count
  - [ ] Completed count
  - [ ] Incoming count
  - [ ] Outgoing count
  - [ ] Overdue count
- [ ] Search bar is present and functional (search by reference number)
- [ ] Recent documents list shows documents from the last 7 days
- [ ] Document type distribution chart is visible
- [ ] Office communication patterns section is visible
- [ ] Office performance metrics section is visible
- [ ] Clicking "Pending" filter navigates to library filtered by pending
- [ ] Clicking "Completed" filter navigates to library filtered by completed

## 2.3 Create Document
- [ ] Form loads with all fields
- [ ] Document type dropdown includes: Letter, Certificate, Memorandum, Report, Disbursement Voucher, Endorsement, and any custom types
- [ ] Title field is required
- [ ] Subject field is present
- [ ] Description field is present
- [ ] Transmittal direction toggle works (Sending / Receiving)
- [ ] When "Receiving" is selected, sender info fields appear:
  - [ ] Sender Name
  - [ ] Sender Office
  - [ ] Sender Phone
  - [ ] Sender Email
- [ ] Required actions checkboxes are present:
  - [ ] For Approval
  - [ ] For Review
  - [ ] For Information
  - [ ] Other
- [ ] Handler PIN field is present (minimum 4 characters)
- [ ] File attachment field accepts PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- [ ] File size limit is enforced (up to 500MB)
- [ ] Submitting without required fields shows validation errors
- [ ] Submitting with valid data creates document and shows reference number (e.g., DOC-2026-XXXX)
- [ ] Endorsement type shows extra fields: Document For, Thru, Document From
- [ ] Memorandum type shows extra fields: Memo Order No., To
- [ ] After creation, document appears in Document Library

## 2.4 Document Library
- [ ] Library loads and shows all active (non-archived) documents
- [ ] Search by reference number works
- [ ] Search by title works
- [ ] Search by subject works
- [ ] Filter by document type works
- [ ] Filter by status (pending/completed) works
- [ ] Filter by transmittal direction (incoming/outgoing) works
- [ ] Filter by month/year works
- [ ] Sort by date (oldest first) works
- [ ] Sort by date (newest first) works
- [ ] Each document card shows: reference number, title, type, date, status
- [ ] Clicking a document opens Document Info view

## 2.5 Document Info (Staff View)
- [ ] Full document details are displayed
- [ ] Attached file is viewable (opens in browser or Google Docs viewer)
- [ ] File download button works
- [ ] QR code is displayed
- [ ] Action tickets assigned to this document are visible
- [ ] Activity log for this document is visible
- [ ] Status progression is shown
- [ ] Staff CANNOT archive from this view
- [ ] Staff CANNOT delete from this view

## 2.6 Track Document (QR Scanner)
- [ ] QR Scanner view loads
- [ ] Camera permission prompt appears
- [ ] Scanning a valid QR code navigates to the correct document
- [ ] Scanning an invalid QR shows an error
- [ ] Manual reference number entry works as fallback

## 2.7 Handler Update (Status Recording — Staff)
- [ ] Accessing handler update requires PIN entry
- [ ] Wrong PIN is rejected
- [ ] Correct PIN proceeds to status workflow
- [ ] Step 2 (Review step) is available to staff:
  - [ ] "Mark as Reviewed" button is present
  - [ ] Notes field is present
  - [ ] Optional file attachment for review is present
  - [ ] Submitting marks document as reviewed
- [ ] Step 1 (Assign Reviewer) is NOT available to staff (admin only)
- [ ] Step 3 (Note Document) is NOT available to staff (admin only)

## 2.8 Receipt
- [ ] Receipt view loads for a document
- [ ] Document info is displayed on receipt
- [ ] QR code is on the receipt
- [ ] Reference number is displayed
- [ ] Status is displayed
- [ ] "For Released" button is present
- [ ] "Returned" button is present with reason field
- [ ] Clicking "For Released" marks document as released
- [ ] Clicking "Returned" requires a reason and marks document as returned
- [ ] Print/Download receipt as PDF works

## 2.9 Notifications (Staff)
- [ ] Notification bell is visible in top bar
- [ ] Bell shows count of pending notifications
- [ ] Clicking bell opens notification panel
- [ ] Notifications are categorized: Overdue, Pending, New, Completed
- [ ] Overdue documents (3+ days without completion) appear in overdue category
- [ ] Clicking a notification navigates to the relevant document

## 2.10 Settings (Staff — Limited)
- [ ] Settings page loads
- [ ] Change Password section is accessible
- [ ] Office Info section is visible (read or edit depending on config)
- [ ] Theme section is visible
- [ ] Activity Log is NOT visible to staff
- [ ] Cloudinary Config is NOT visible to staff
- [ ] Active Sessions is NOT visible to staff

---

# PART 3 — ADMIN ROLE (HEAD ADMIN)

> Login as admin account (e.g., `ronaldjame.violon@pto`)

## 3.1 Navigation & Access Control
- [ ] All staff tabs are visible
- [ ] Archive tab IS visible
- [ ] Send Document tab IS visible
- [ ] Settings tab with full options is accessible
- [ ] Active Sessions is NOT visible (developer only)

## 3.2 All Staff Features
- [ ] All features from Part 2 (Staff) work for admin
- [ ] Admin can create documents
- [ ] Admin can view document library
- [ ] Admin can track documents via QR

## 3.3 Handler Update (Admin-Specific Steps)
- [ ] Step 1 — Assign Reviewer:
  - [ ] Reviewer dropdown shows: Linmark G. Benlot, Floramae Constantino, Other
  - [ ] Selecting "Other" allows custom name entry
  - [ ] Assigning reviewer creates an action ticket
  - [ ] Action ticket is visible in Document Info
- [ ] Step 3 — Note Document (Final Approval):
  - [ ] "Note Document" button is present after review is complete
  - [ ] Notes field is present
  - [ ] Submitting marks document as noted/approved
  - [ ] Document moves to completed status
- [ ] Re-assignment after review:
  - [ ] Admin can reassign document for additional review
  - [ ] New action ticket is created for reassignment

## 3.4 Action Tickler Slips (Admin)
- [ ] Admin can assign action tickets to staff
- [ ] Ticket form includes: Assigned To, Due Date, Instructions
- [ ] Created ticket appears in Document Info
- [ ] Ticket has a unique ticket number
- [ ] Ticket PDF can be generated and printed
- [ ] Ticket shows status: Pending / Completed
- [ ] Admin can mark ticket as completed

## 3.5 Archive (Admin Only)
- [ ] Archive tab loads
- [ ] Archived documents are listed
- [ ] Search works in archive
- [ ] Filter by type works in archive
- [ ] "Restore" button is present per document
- [ ] Restoring a document moves it back to active library
- [ ] "Delete" button is present per document
- [ ] Deleting permanently removes the document (with confirmation prompt)
- [ ] Archiving a document from Document Info works (admin only)

## 3.6 Send Document (Admin Only)
- [ ] Send Document view loads
- [ ] Search by reference number finds the document
- [ ] Recipient Name field is present
- [ ] Recipient Office field is present
- [ ] Notes field is present
- [ ] Submitting logs the dispatch
- [ ] Document is marked as sent
- [ ] Activity log records the dispatch action

## 3.7 Notify Sender (Admin)
- [ ] "Notify Sender" option is available on documents with sender email
- [ ] Email notification can be sent to sender
- [ ] System marks `email_sent_at` after sending
- [ ] Sending again is possible (or blocked with a warning)

## 3.8 Settings (Admin — Full Access)
- [ ] Office Info section:
  - [ ] Office name is editable
  - [ ] Province is editable
  - [ ] Address is editable
  - [ ] Email is editable
  - [ ] Logo upload works
  - [ ] Changes save and reflect in top bar
- [ ] System Theme section:
  - [ ] Predefined themes are selectable
  - [ ] Custom color picker is available
  - [ ] Theme change applies immediately across the UI
- [ ] Cloudinary Config section:
  - [ ] Cloud Name field is present
  - [ ] API Key field is present
  - [ ] API Secret field is present
  - [ ] Saving updates the config
- [ ] Activity Log section:
  - [ ] All system actions are listed
  - [ ] Filter by date works
  - [ ] Filter by action type works
  - [ ] Filter by user works
  - [ ] Each log entry shows: action, description, performed by, timestamp
- [ ] Change Password works (same as staff)

## 3.9 Document Management (Admin)
- [ ] Replace File: Upload a new version of an attached file
- [ ] Old file is replaced, new file is accessible
- [ ] Archive document from Document Info view
- [ ] Activity log records the archive action

---

# PART 4 — VIEWER ROLE

> Login as viewer account (`ptomisor@pto`)

## 4.1 Navigation & Access Control
- [ ] Dashboard is accessible (read-only)
- [ ] Track Document is accessible
- [ ] Document Library is accessible (Memorandum documents only)
- [ ] Create Document is NOT accessible
- [ ] Archive is NOT accessible
- [ ] Settings is NOT accessible (or limited to read-only)
- [ ] Send Document is NOT accessible

## 4.2 Dashboard (Viewer)
- [ ] Statistics are visible
- [ ] Search works
- [ ] Recent documents are visible
- [ ] Cannot click to create or edit documents

## 4.3 Document Library (Viewer)
- [ ] Only Memorandum-type documents are shown
- [ ] Other document types are hidden
- [ ] Viewer can click to view document details
- [ ] Viewer cannot create, edit, archive, or delete

## 4.4 Track Document (Viewer)
- [ ] QR scanner is accessible
- [ ] Viewer can track a document by QR or reference number
- [ ] Viewer sees document status but cannot update it

---

# PART 5 — DEVELOPER ROLE

> Login as developer account (`dev@system`)

## 5.1 Navigation & Access Control
- [ ] All admin tabs are visible
- [ ] Active Sessions tab IS visible (developer only)

## 5.2 All Admin Features
- [ ] All features from Part 3 (Admin) work for developer

## 5.3 Active Sessions (Developer Only)
- [ ] Active Sessions view loads
- [ ] List of currently logged-in users is shown
- [ ] Each session shows: username, role, login time
- [ ] Developer can view but not forcibly terminate sessions (unless implemented)

## 5.4 Cloudinary Config (Developer)
- [ ] Cloudinary credentials are editable
- [ ] Saving updates the cloud storage config

---

# PART 6 — DOCUMENT LIFECYCLE (END-TO-END)

> This tests the full workflow from creation to completion.

## 6.1 Full Workflow Test
- [ ] **Step 1 (Staff)**: Create a new document (type: Letter, direction: Receiving)
  - Fill all fields, attach a PDF, set a PIN
  - Confirm reference number is generated
- [ ] **Step 2 (Admin)**: Open the document, go to Handler Update
  - Enter PIN, proceed to Step 1
  - Assign a reviewer (e.g., Linmark G. Benlot)
  - Confirm action ticket is created
- [ ] **Step 3 (Staff)**: Open Handler Update for the same document
  - Enter PIN, proceed to Step 2
  - Mark as reviewed, add notes, optionally attach a file
  - Confirm status updates to "reviewed"
- [ ] **Step 4 (Admin)**: Open Handler Update
  - Enter PIN, proceed to Step 3
  - Note the document (final approval)
  - Confirm status updates to "noted/approved"
  - Confirm document appears in Completed list
- [ ] **Step 5 (Staff)**: Open Receipt view
  - Mark as "For Released"
  - Confirm receipt is generated
  - Print/download receipt PDF
- [ ] **Step 6 (Admin)**: Archive the completed document
  - Confirm it disappears from active library
  - Confirm it appears in Archive
- [ ] **Step 7 (Admin)**: Restore the document from Archive
  - Confirm it reappears in active library
- [ ] **Step 8 (Admin)**: Permanently delete from Archive
  - Confirm it is removed from all views

---

# PART 7 — NOTIFICATIONS & COMMUNICATIONS

## 7.1 Notification Bell
- [ ] Bell shows correct count of pending/overdue documents
- [ ] Overdue documents (3+ days) appear with red/urgent indicator
- [ ] Clicking a notification item navigates to the document
- [ ] Notification count updates after documents are completed

## 7.2 Email Notification
- [ ] "Notify Sender" sends an email to the sender's email address
- [ ] Email contains document reference number and status
- [ ] `email_sent_at` is recorded in the system
- [ ] Email delivery is confirmed (check inbox)

## 7.3 Bottom Ticker
- [ ] Bottom ticker is visible on the landing page
- [ ] Ticker scrolls automatically
- [ ] Ticker shows recent incoming/outgoing documents
- [ ] Ticker updates when new documents are created

---

# PART 8 — FILE MANAGEMENT

## 8.1 File Upload
- [ ] PDF upload works
- [ ] DOCX upload works
- [ ] XLSX upload works
- [ ] PPTX upload works
- [ ] File over 500MB is rejected with an error
- [ ] Unsupported file types are rejected
- [ ] Uploaded file is stored in Cloudinary
- [ ] File URL is saved to the document record

## 8.2 File Viewing
- [ ] PDF opens in browser viewer
- [ ] DOCX opens in Google Docs viewer
- [ ] File viewer loads within the app (not a blank page)

## 8.3 File Download
- [ ] Download button downloads the correct file
- [ ] Downloaded file is not corrupted

## 8.4 File Replace
- [ ] Admin can replace an existing file
- [ ] New file is accessible after replacement
- [ ] Old file reference is removed

---

# PART 9 — PDF GENERATION

## 9.1 Receipt PDF
- [ ] Receipt PDF generates without errors
- [ ] PDF contains: document title, reference number, QR code, status, date
- [ ] PDF is printable

## 9.2 Tickler Slip PDF
- [ ] Tickler PDF generates without errors
- [ ] PDF contains: ticket number, assigned to, due date, instructions
- [ ] PDF is printable

## 9.3 Letter View PDF
- [ ] Letter View PDF generates without errors
- [ ] PDF contains formal letter format with document details
- [ ] PDF is printable

---

# PART 10 — ACTIVITY LOG & AUDIT TRAIL

## 10.1 Activity Log (Admin/Developer)
- [ ] Activity log is accessible in Settings
- [ ] Log records document creation (who created, when)
- [ ] Log records status updates (who updated, what status)
- [ ] Log records archive actions
- [ ] Log records restore actions
- [ ] Log records delete actions
- [ ] Log records file uploads
- [ ] Log records login/logout events
- [ ] Filter by date range works
- [ ] Filter by action type works
- [ ] Filter by user works

## 10.2 Document-Level Activity Log
- [ ] Each document has its own activity log in Document Info
- [ ] Log shows all actions taken on that specific document
- [ ] Timestamps are accurate

---

# PART 11 — UI & SYSTEM BEHAVIOR

## 11.1 Top Bar
- [ ] Office logo is displayed
- [ ] Office name is displayed
- [ ] Current date and time are displayed (live clock)
- [ ] Notification bell is visible
- [ ] Logged-in username is displayed
- [ ] Logout button is accessible

## 11.2 Sidebar (Mobile)
- [ ] Sidebar opens on mobile/small screens
- [ ] All accessible navigation items are listed
- [ ] Sidebar closes after selecting a view

## 11.3 Toast Notifications
- [ ] Success toast appears after creating a document
- [ ] Success toast appears after updating a status
- [ ] Error toast appears on failed operations
- [ ] Toasts auto-dismiss after a few seconds

## 11.4 Theme
- [ ] Default theme loads correctly
- [ ] Changing theme in Settings applies immediately
- [ ] Theme persists after page refresh

## 11.5 Responsive Design
- [ ] Dashboard is usable on mobile
- [ ] Document Library is usable on mobile
- [ ] Create Document form is usable on mobile
- [ ] QR Scanner works on mobile camera

## 11.6 Error Handling
- [ ] Network error shows a user-friendly message
- [ ] 401 Unauthorized redirects to login
- [ ] 404 Not Found shows appropriate message
- [ ] Form validation errors are clearly displayed

---

# PART 12 — SECURITY CHECKS

## 12.1 Authentication
- [ ] Accessing any `/api` endpoint without a token returns 401
- [ ] Expired/invalid token returns 401
- [ ] Token is not exposed in URL parameters

## 12.2 Role Enforcement
- [ ] Staff cannot call archive API directly (returns 403 or redirects)
- [ ] Viewer cannot call create document API
- [ ] Staff cannot access Settings activity log via direct navigation

## 12.3 PIN Security
- [ ] Handler PIN is required for all status updates
- [ ] Wrong PIN is rejected with an error message
- [ ] PIN is not visible in plain text in the UI

## 12.4 File Security
- [ ] Files are served via Cloudinary (not directly from server)
- [ ] File proxy endpoint requires authentication

---

# PART 13 — DOCUMENT TYPES (SPECIAL CASES)

## 13.1 Endorsement
- [ ] Creating an Endorsement shows extra fields: Document For, Thru, Document From
- [ ] These fields are saved and displayed in Document Info
- [ ] Letter View renders endorsement format correctly

## 13.2 Memorandum
- [ ] Creating a Memorandum shows extra fields: Memo Order No., To
- [ ] These fields are saved and displayed in Document Info
- [ ] Viewer role can see Memorandums in the library

## 13.3 Custom Document Types
- [ ] Admin can add a custom document type in Settings
- [ ] Custom type appears in the document type dropdown when creating
- [ ] Documents created with custom type are filterable in library

---

# PART 14 — QR CODE

## 14.1 QR Generation
- [ ] Every document has a QR code generated
- [ ] QR code is visible in Document Info
- [ ] QR code is visible on Receipt

## 14.2 QR Scanning
- [ ] Scanning QR code on a mobile device opens the correct document
- [ ] QR code contains the document ID or reference number
- [ ] Invalid QR shows an error

---

# SUMMARY CHECKLIST

| Area | Total Tests | Passed | Failed | Notes |
|------|-------------|--------|--------|-------|
| Authentication | | | | |
| Staff Role | | | | |
| Admin Role | | | | |
| Viewer Role | | | | |
| Developer Role | | | | |
| Document Lifecycle | | | | |
| Notifications | | | | |
| File Management | | | | |
| PDF Generation | | | | |
| Activity Log | | | | |
| UI/System | | | | |
| Security | | | | |
| Document Types | | | | |
| QR Code | | | | |
| **TOTAL** | | | | |

---

> Deployment is considered SUCCESSFUL when all critical items (authentication, role access control, document creation, status workflow, file upload) pass with no failures.
> Non-critical items (PDF formatting, theme, ticker) can be noted as minor issues.
