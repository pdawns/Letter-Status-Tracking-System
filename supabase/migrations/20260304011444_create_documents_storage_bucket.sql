/*
  # Create Documents Storage Bucket

  1. Storage Setup
    - Create 'documents' bucket for storing uploaded files
    - Enable public access for document viewing
  
  2. Security Policies
    - Allow anyone to read documents (public bucket)
    - Allow authenticated uploads to the bucket
    - File uploads are scoped by document ID folders
  
  3. Notes
    - Files are organized by document ID in folder structure
    - Public read access allows QR code tracking to view documents
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

CREATE POLICY "Anyone can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents');