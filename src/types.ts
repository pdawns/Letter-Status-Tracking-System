export interface Letter {
  id: string;
  reference_number: string;
  title: string;
  description: string;
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
