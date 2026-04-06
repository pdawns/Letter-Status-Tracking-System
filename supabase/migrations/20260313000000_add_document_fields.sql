/*
  # Add Document Form Fields

  1. Changes to `letters` table
    - Add `document_for` (text) - Who the document is for
    - Add `document_thru` (text) - Through whom the document goes
    - Add `document_from` (text) - Who the document is from
*/

-- Add new columns to letters table safely
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'letters' AND column_name = 'document_for'
  ) THEN
    ALTER TABLE letters ADD COLUMN document_for text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'letters' AND column_name = 'document_thru'
  ) THEN
    ALTER TABLE letters ADD COLUMN document_thru text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'letters' AND column_name = 'document_from'
  ) THEN
    ALTER TABLE letters ADD COLUMN document_from text;
  END IF;
END $;