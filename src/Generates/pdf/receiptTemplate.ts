import { Letter, LetterStatus } from '../../types';

/**
 * Generate receipt template content for PDF
 */
export function generateReceiptTemplate(letter: Letter, statuses: LetterStatus[]): string {
  const hasNoted = statuses.some((s) => s.status_type === 'noted');
  const hasReviewed = statuses.some((s) => s.status_type === 'reviewed');
  const hasApproved = statuses.some((s) => s.status_type === 'approved');
  const allComplete = hasNoted && hasReviewed && hasApproved;
  
  const notedStatuses = statuses.filter((s) => s.status_type === 'noted');
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <!-- Header -->
      <div style="background-color: #004526; color: white; padding: 15px; text-align: center; border-radius: 5px 5px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">DOCUMENT TRACKING RECEIPT</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Official Status Record</p>
      </div>
      
      <!-- Main Content -->
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <!-- Reference & Status -->
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <div>
              <strong style="color: #666; font-size: 12px;">REFERENCE NUMBER</strong>
              <p style="font-size: 18px; font-weight: bold; margin: 5px 0; color: #004526;">${letter.reference_number}</p>
            </div>
            <div>
              <strong style="color: #666; font-size: 12px;">STATUS</strong>
              <p style="font-size: 16px; font-weight: bold; margin: 5px 0; color: ${allComplete ? '#28a745' : '#ffc107'}">
                ${allComplete ? '✓ COMPLETE' : '⏳ IN PROGRESS'}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Document Information -->
        <div style="margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #eee;">
          <h2 style="color: #004526; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #004526; padding-left: 10px;">
            DOCUMENT INFORMATION
          </h2>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
            <div>
              <strong style="color: #666; font-size: 11px; display: block; margin-bottom: 3px;">TITLE</strong>
              <p style="margin: 0; font-size: 14px;">${letter.title}</p>
            </div>
            
            ${letter.document_type ? `
            <div>
              <strong style="color: #666; font-size: 11px; display: block; margin-bottom: 3px;">DOCUMENT TYPE</strong>
              <p style="margin: 0; font-size: 14px; text-transform: uppercase;">${letter.document_type}</p>
            </div>
            ` : ''}
            
            ${letter.document_subject ? `
            <div>
              <strong style="color: #666; font-size: 11px; display: block; margin-bottom: 3px;">SUBJECT</strong>
              <p style="margin: 0; font-size: 14px;">${letter.document_subject}</p>
            </div>
            ` : ''}
            
            <div>
              <strong style="color: #666; font-size: 11px; display: block; margin-bottom: 3px;">CREATED DATE</strong>
              <p style="margin: 0; font-size: 14px;">${new Date(letter.created_at).toLocaleString()}</p>
            </div>
          </div>
          
          ${letter.description ? `
          <div style="margin-top: 15px;">
            <strong style="color: #666; font-size: 11px; display: block; margin-bottom: 3px;">DESCRIPTION</strong>
            <p style="margin: 0; font-size: 14px; line-height: 1.5;">${letter.description}</p>
          </div>
          ` : ''}
        </div>
        
        <!-- Signature History -->
        <div style="margin-bottom: 25px;">
          <h2 style="color: #004526; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #004526; padding-left: 10px;">
            SIGNATURE HISTORY
          </h2>
          
          ${notedStatuses.length > 0 ? `
          <div style="display: grid; gap: 15px;">
            ${notedStatuses.map((status, index) => `
            <div style="border: 2px solid #004526; border-radius: 8px; padding: 15px; background-color: #f8fff8;">
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <div style="background-color: #004526; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">
                  ${index + 1}
                </div>
                <h3 style="margin: 0; color: #004526; font-size: 16px;">Noted #${index + 1}</h3>
              </div>
              
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                <div>
                  <strong style="color: #666; font-size: 11px; display: block; margin-bottom: 3px;">SIGNED BY</strong>
                  <p style="margin: 0; font-size: 14px; font-weight: bold;">${status.signed_by}</p>
                </div>
                
                <div>
                  <strong style="color: #666; font-size: 11px; display: block; margin-bottom: 3px;">DATE & TIME</strong>
                  <p style="margin: 0; font-size: 14px;">${new Date(status.signed_at).toLocaleString()}</p>
                </div>
              </div>
              
              ${status.notes ? `
              <div style="margin-top: 10px;">
                <strong style="color: #666; font-size: 11px; display: block; margin-bottom: 3px;">NOTES</strong>
                <p style="margin: 0; font-size: 14px; line-height: 1.4;">${status.notes}</p>
              </div>
              ` : ''}
            </div>
            `).join('')}
          </div>
          ` : `
          <div style="border: 1px dashed #ccc; border-radius: 8px; padding: 20px; text-align: center; background-color: #f9f9f9;">
            <p style="margin: 0; color: #666; font-style: italic;">No signatures recorded yet</p>
          </div>
          `}
        </div>
        
        <!-- Attached Document -->
        ${letter.file_url && letter.file_name ? `
        <div style="margin-bottom: 25px; padding: 15px; border: 2px solid #9CAF88; border-radius: 8px; background-color: #DFF5E1;">
          <h2 style="color: #004526; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">📎</span> ATTACHED DOCUMENT
          </h2>
          
          <div>
            <strong style="color: #666; font-size: 11px; display: block; margin-bottom: 3px;">FILE NAME</strong>
            <p style="margin: 0; font-size: 14px; font-weight: bold; word-break: break-all;">${letter.file_name}</p>
          </div>
          
          <div style="margin-top: 10px;">
            <strong style="color: #666; font-size: 11px; display: block; margin-bottom: 3px;">DOCUMENT URL</strong>
            <p style="margin: 0; font-size: 12px; word-break: break-all; color: #0066cc;">${letter.file_url}</p>
          </div>
        </div>
        ` : ''}
        
        <!-- Footer -->
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 5px 0;">This is an official tracking receipt</p>
          <p style="margin: 5px 0;">Generated on ${new Date().toLocaleString()}</p>
          <p style="margin: 5px 0; font-weight: bold;">DocuTrack</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate simple text version for accessibility
 */
export function generateReceiptText(letter: Letter, statuses: LetterStatus[]): string {
  const hasNoted = statuses.some((s) => s.status_type === 'noted');
  const hasReviewed = statuses.some((s) => s.status_type === 'reviewed');
  const hasApproved = statuses.some((s) => s.status_type === 'approved');
  const allComplete = hasNoted && hasReviewed && hasApproved;
  
  const notedStatuses = statuses.filter((s) => s.status_type === 'noted');
  
  let text = `DOCUMENT TRACKING RECEIPT\n`;
  text += `========================\n\n`;
  text += `Reference Number: ${letter.reference_number}\n`;
  text += `Status: ${allComplete ? 'COMPLETE' : 'IN PROGRESS'}\n\n`;
  text += `DOCUMENT INFORMATION\n`;
  text += `-------------------\n`;
  text += `Title: ${letter.title}\n`;
  if (letter.document_type) text += `Type: ${letter.document_type}\n`;
  if (letter.document_subject) text += `Subject: ${letter.document_subject}\n`;
  text += `Created: ${new Date(letter.created_at).toLocaleString()}\n`;
  if (letter.description) text += `Description: ${letter.description}\n\n`;
  
  text += `SIGNATURE HISTORY\n`;
  text += `-----------------\n`;
  
  if (notedStatuses.length > 0) {
    notedStatuses.forEach((status, index) => {
      text += `Noted #${index + 1}\n`;
      text += `  Signed by: ${status.signed_by}\n`;
      text += `  Date & Time: ${new Date(status.signed_at).toLocaleString()}\n`;
      if (status.notes) text += `  Notes: ${status.notes}\n`;
      text += `\n`;
    });
  } else {
    text += `No signatures recorded yet\n\n`;
  }
  
  if (letter.file_url && letter.file_name) {
    text += `ATTACHED DOCUMENT\n`;
    text += `-----------------\n`;
    text += `File: ${letter.file_name}\n`;
    text += `URL: ${letter.file_url}\n\n`;
  }
  
  text += `Generated on ${new Date().toLocaleString()}\n`;
  text += `DocuTrack\n`;
  
  return text;
}