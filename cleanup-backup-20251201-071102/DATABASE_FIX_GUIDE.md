# Database Schema Fix - Step by Step Guide

## Problem
The database schema has column name mismatches causing errors:
- Schema has `filename` but code uses `file_name`
- Schema has `uploaded_at` but code references `created_at` in some places
- Missing `updated_at` column
- `processed_at` column might be missing in some setups

## Solution

### Step 1: Run the migration in Supabase SQL Editor

Copy and paste the contents of `fix-documents-schema.sql` into your Supabase SQL Editor and run it.

This will:
1. Rename `filename` → `file_name`
2. Rename `uploaded_at` → `created_at`
3. Add `processed_at` if missing
4. Add `updated_at` with auto-update trigger
5. Fix status check constraints

### Step 2: Verify the schema

After running the migration, run this query to verify:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'documents'
ORDER BY ordinal_position;
```

You should see these columns:
- id (uuid)
- user_id (text)
- file_name (text)
- file_path (text)
- file_size (bigint)
- file_type (text)
- status (text)
- created_at (timestamp with time zone)
- processed_at (timestamp with time zone)
- updated_at (timestamp with time zone)

### Step 3: Check RLS policies

Run this to verify RLS policies are working:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'documents';
```

### Step 4: Test the fix

1. Restart your Next.js dev server
2. Upload a new document
3. Check the terminal for any errors
4. The document should process successfully

## What was fixed in the code

### Files updated:
1. ✅ `supabase-schema.sql` - Updated to use correct column names
2. ✅ `fix-documents-schema.sql` - Migration to fix existing database
3. ✅ `app/api/documents/list/route.ts` - Changed order by from `uploaded_at` to `created_at`
4. ✅ `lib/process-document.ts` - Already using correct `file_name` and `processed_at`
5. ✅ `app/api/documents/upload/route.ts` - Already using correct `file_name`

### Column mapping (OLD → NEW):
- `filename` → `file_name`
- `uploaded_at` → `created_at`
- *(new)* → `updated_at`
- *(verified)* → `processed_at`

## Expected behavior after fix

✅ Upload → Creates document with status='uploaded'
✅ Processing → Updates status to 'processing'
✅ Completion → Updates status to 'completed', sets processed_at timestamp
✅ Display → Frontend polls and shows completed results
✅ No more schema errors in terminal
