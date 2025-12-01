-- Run this after the migration to verify everything is correct
-- Copy and paste into Supabase SQL Editor

-- 1. Check documents table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'documents'
ORDER BY ordinal_position;

-- 2. Check if all required columns exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'file_name') 
        THEN '✅ file_name exists' 
        ELSE '❌ file_name MISSING' 
    END as file_name_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'created_at') 
        THEN '✅ created_at exists' 
        ELSE '❌ created_at MISSING' 
    END as created_at_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'processed_at') 
        THEN '✅ processed_at exists' 
        ELSE '❌ processed_at MISSING' 
    END as processed_at_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'updated_at') 
        THEN '✅ updated_at exists' 
        ELSE '❌ updated_at MISSING' 
    END as updated_at_check;

-- 3. Check processed_results table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'processed_results'
ORDER BY ordinal_position;

-- 4. Check RLS policies on documents table
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
    AND tablename = 'documents';

-- 5. Verify triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'documents';

-- 6. Test document update (won't actually update if no documents exist)
-- This just validates the syntax
DO $$
DECLARE
    test_id UUID;
BEGIN
    -- Get a document ID if any exist
    SELECT id INTO test_id FROM documents LIMIT 1;
    
    IF test_id IS NOT NULL THEN
        -- Test update (this should work now)
        UPDATE documents 
        SET status = 'processing', 
            processed_at = NOW()
        WHERE id = test_id;
        
        RAISE NOTICE '✅ Update syntax is valid';
        
        -- Rollback the test update
        RAISE EXCEPTION 'Test completed successfully (rolling back)';
    ELSE
        RAISE NOTICE 'ℹ️ No documents found to test (this is OK)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test result: %', SQLERRM;
END $$;
