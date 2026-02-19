/*
  # Letter Tracking System

  1. New Tables
    - `letters`
      - `id` (uuid, primary key) - Unique identifier for each letter
      - `reference_number` (text, unique) - Human-readable reference like "LTR-2024-001"
      - `title` (text) - Letter title/subject
      - `description` (text, optional) - Letter description
      - `handler_pin` (text) - PIN code for handler authentication
      - `created_at` (timestamptz) - When the letter was created
      
    - `letter_statuses`
      - `id` (uuid, primary key) - Unique identifier for each status update
      - `letter_id` (uuid, foreign key) - References letters table
      - `status_type` (text) - Type: 'noted', 'approved', or 'reviewed'
      - `signed_by` (text) - Name of person who signed
      - `signed_at` (timestamptz) - When the status was updated
      - `notes` (text, optional) - Additional notes for this status update
      
  2. Security
    - Enable RLS on both tables
    - Public can read letters (for QR code scanning)
    - Public can read letter statuses (for receipt viewing)
    - Public can insert letters (for creating new letters)
    - Public can insert letter statuses (for updating status after PIN verification)
    - PIN verification will be handled in application logic
*/

-- Create letters table
CREATE TABLE IF NOT EXISTS letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  handler_pin text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create letter_statuses table
CREATE TABLE IF NOT EXISTS letter_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  status_type text NOT NULL CHECK (status_type IN ('noted', 'approved', 'reviewed')),
  signed_by text NOT NULL,
  signed_at timestamptz DEFAULT now(),
  notes text DEFAULT ''
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_letter_statuses_letter_id ON letter_statuses(letter_id);
CREATE INDEX IF NOT EXISTS idx_letters_reference_number ON letters(reference_number);

-- Enable RLS
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_statuses ENABLE ROW LEVEL SECURITY;

-- Letters policies - allow public access for QR code functionality
CREATE POLICY "Anyone can view letters"
  ON letters FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create letters"
  ON letters FOR INSERT
  WITH CHECK (true);

-- Letter statuses policies - allow public access for status updates and viewing
CREATE POLICY "Anyone can view letter statuses"
  ON letter_statuses FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create letter statuses"
  ON letter_statuses FOR INSERT
  WITH CHECK (true);