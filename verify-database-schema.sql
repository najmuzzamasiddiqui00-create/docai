-- ================================================
-- VERIFY DATABASE SCHEMA FOR ANALYSIS RESULTS
-- ================================================
-- Run this in Supabase SQL Editor to check if your database
-- has the required columns for storing analysis results

-- Check if processed_output column exists
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'documents'
    AND column_name IN ('processed_output', 'error', 'file_url')
ORDER BY column_name;

-- Expected Results:
-- error         | text  | YES
-- file_url      | text  | YES
-- processed_output | jsonb | YES

-- If any columns are missing, run: fix-documents-table.sql

-- Check current document status values
SELECT 
    status,
    COUNT(*) as count
FROM documents
GROUP BY status
ORDER BY status;

-- Expected Status Values: queued, processing, completed, failed

-- Sample query to check processed_output structure
SELECT 
    id,
    file_name,
    status,
    processed_output IS NOT NULL as has_output,
    jsonb_typeof(processed_output) as output_type,
    processed_output->'summary' IS NOT NULL as has_summary,
    processed_output->'keyPoints' IS NOT NULL as has_keypoints,
    processed_output->'keywords' IS NOT NULL as has_keywords
FROM documents
WHERE status = 'completed'
LIMIT 5;
