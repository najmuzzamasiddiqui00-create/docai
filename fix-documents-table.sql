-- ================================================
-- CRITICAL DATABASE MIGRATION - Run in Supabase SQL Editor
-- ================================================
-- This fixes the documents table structure to match your application code
-- Run this BEFORE testing the upload pipeline

-- Step 1: Add missing columns
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS processed_output JSONB,
ADD COLUMN IF NOT EXISTS error TEXT;

-- Step 2: Update status constraint to allow correct values
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE documents ADD CONSTRAINT documents_status_check 
CHECK (status IN ('queued', 'processing', 'completed', 'failed'));

-- Step 3: Change default status from 'uploaded' to 'queued'
ALTER TABLE documents ALTER COLUMN status SET DEFAULT 'queued';

-- Step 4: Update any existing 'uploaded' status to 'queued'
UPDATE documents SET status = 'queued' WHERE status = 'uploaded';

-- Step 5: Verify structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'documents'
ORDER BY ordinal_position;

-- Expected output should include:
-- id (uuid)
-- user_id (text)
-- file_name (text)
-- file_path (text)
-- file_url (text) ← NEW
-- file_size (bigint)
-- file_type (text)
-- status (text with default 'queued')
-- processed_output (jsonb) ← NEW
-- error (text) ← NEW
-- created_at (timestamp)
-- processed_at (timestamp)
-- updated_at (timestamp)
