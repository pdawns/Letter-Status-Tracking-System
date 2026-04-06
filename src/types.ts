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
