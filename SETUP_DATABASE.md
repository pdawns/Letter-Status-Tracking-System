# Database Setup Instructions

The `letters` table doesn't exist yet. You need to run the migrations in your Supabase dashboard.

## Steps:

1. **Go to Supabase Dashboard:**
   https://supabase.com/dashboard/project/vzpuoofzowpvixrilotk/sql/new

2. **Copy and paste ALL of this SQL:**

```sql
-- ============================================
-- Migration 1: Create Letter Tracking System
-- ============================================
CREATE TABLE IF NOT EXISTS letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  handler_pin text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS letter_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  status_type text NOT NULL CHECK (status_type IN ('noted', 'approved', 'reviewed')),
  signed_by text NOT NULL,
  signed_at timestamptz DEFAULT now(),
  notes text DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_letter_statuses_letter_id ON letter_statuses(letter_id);
CREATE INDEX IF NOT EXISTS idx_letters_reference_number ON letters(reference_number);

ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can view letters"
  ON letters FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can create letters"
  ON letters FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Anyone can view letter statuses"
  ON letter_statuses FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can create letter statuses"
  ON letter_statuses FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Migration 2: Add Document Storage Fields
-- ============================================
ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'letter';
ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_subject text DEFAULT '';
ALTER TABLE letters ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS file_name text;

CREATE INDEX IF NOT EXISTS idx_letters_reference ON letters(reference_number);
CREATE INDEX IF NOT EXISTS idx_letters_title ON letters(title);
CREATE INDEX IF NOT EXISTS idx_letters_type ON letters(document_type);

-- ============================================
-- Migration 3: Add Required Document Fields
-- ============================================
ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_for text;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_thru text;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_from text;

CREATE INDEX IF NOT EXISTS idx_letters_document_for ON letters(document_for);
CREATE INDEX IF NOT EXISTS idx_letters_document_from ON letters(document_from);
```

3. **Click the "Run" button** (or press Ctrl+Enter)

4. **Wait for it to complete** - You should see a success message

5. **Come back and test creating a document!**

## What this SQL does:

✅ Creates the `letters` table with all required fields
✅ Creates the `letter_statuses` table for tracking status updates
✅ Adds document storage fields (`file_url`, `file_name`, `document_type`, `document_subject`)
✅ Adds required document fields (`document_for`, `document_thru`, `document_from`)
✅ Creates indexes for better performance
✅ Sets up Row Level Security (RLS) policies for public access

## After Setup:

Once the SQL runs successfully, you can:
1. Create new documents with file uploads
2. Files will be saved to Supabase storage
3. File information will be stored in the database
4. Handler can view the uploaded files

---

**Need help?** Check the browser console (F12) for detailed logs when creating a document.
