export interface Letter {
  id: string;
  reference_number: string;
  title: string;
  description?: string;
  document_subject?: string;
  document_type?: string;
  file_url?: string;
  file_name?: string;
  handler_pin: string;
  created_at: string;
  archived?: boolean;
  archived_at?: string;
  sender_name?: string;
  sender_office?: string;
  sender_phone?: string;
  sender_email?: string;
  required_statuses?: string; // comma-separated: 'noted,approved,reviewed'
  email_sent_at?: string | null;
}

export interface LetterStatus {
  id: string;
  letter_id: string;
  status_type: 'noted' | 'approved' | 'reviewed';
  signed_by: string;
  signed_at: string;
  notes: string;
}

export interface LetterWithStatuses extends Letter {
  statuses: LetterStatus[];
}
