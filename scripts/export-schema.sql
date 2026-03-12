-- Database Schema Export
-- Document Tracking System
-- Generated: 2026-03-12

-- Drop existing tables if they exist
DROP TABLE IF EXISTS letter_statuses CASCADE;
DROP TABLE IF EXISTS letters CASCADE;

-- Letters Table
CREATE TABLE letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text DEFAULT ''::text,
  handler_pin text NOT NULL,
  created_at timestamptz DEFAULT now(),
  document_type text DEFAULT 'letter'::text,
  document_subject text DEFAULT ''::text,
  file_url text,
  file_name text
);

ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to letters"
  ON letters FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to letters"
  ON letters FOR INSERT
  WITH CHECK (true);

-- Letter Statuses Table
CREATE TABLE letter_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  status_type text NOT NULL CHECK (status_type IN ('noted', 'approved', 'reviewed')),
  signed_by text NOT NULL,
  signed_at timestamptz DEFAULT now(),
  notes text DEFAULT ''::text
);

ALTER TABLE letter_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to letter_statuses"
  ON letter_statuses FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to letter_statuses"
  ON letter_statuses FOR INSERT
  WITH CHECK (true);

-- Indexes for better performance
CREATE INDEX idx_letters_reference_number ON letters(reference_number);
CREATE INDEX idx_letter_statuses_letter_id ON letter_statuses(letter_id);
CREATE INDEX idx_letter_statuses_status_type ON letter_statuses(status_type);
