/*
  # Add Required Document Fields

  1. Changes to `letters` table
    - Add `document_for` (text, required) - Who the document is for
    - Add `document_thru` (text, optional) - Through whom the document goes
    - Add `document_from` (text, required) - Who the document is from
    
  2. Notes
    - document_for and document_from are required fields
    - document_thru is optional (can be null)
*/

-- Add new columns to letters table
ALTER TABLE letters 
  ADD COLUMN IF NOT EXISTS document_for text,
  ADD COLUMN IF NOT EXISTS document_thru text,
  ADD COLUMN IF NOT EXISTS document_from text;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_letters_document_for ON letters(document_for);
CREATE INDEX IF NOT EXISTS idx_letters_document_from ON letters(document_from);
