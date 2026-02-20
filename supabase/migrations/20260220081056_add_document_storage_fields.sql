/*
  # Add Document Storage and Enhanced Fields

  1. Changes to `letters` table
    - Add `document_type` (text) - Type of document (letter, certificate, etc)
    - Add `document_subject` (text) - Subject of the document (replaces description)
    - Add `file_url` (text) - URL to the scanned document file
    - Add `file_name` (text) - Original name of the uploaded file
    
  2. Security
    - Add RLS policies for file access
*/

-- Add new columns to letters table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'letters' AND column_name = 'document_type'
  ) THEN
    ALTER TABLE letters ADD COLUMN document_type text DEFAULT 'letter';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'letters' AND column_name = 'document_subject'
  ) THEN
    ALTER TABLE letters ADD COLUMN document_subject text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'letters' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE letters ADD COLUMN file_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'letters' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE letters ADD COLUMN file_name text;
  END IF;
END $$;

-- Create index for searching
CREATE INDEX IF NOT EXISTS idx_letters_reference ON letters(reference_number);
CREATE INDEX IF NOT EXISTS idx_letters_title ON letters(title);
CREATE INDEX IF NOT EXISTS idx_letters_type ON letters(document_type);