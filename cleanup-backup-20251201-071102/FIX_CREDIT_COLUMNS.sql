-- ===================================================================
-- CREDIT SYSTEM FIX - Run this in Supabase SQL Editor
-- ===================================================================
-- This adds the missing credit system columns to user_profiles table
-- After running this, credit checking will work properly
-- ===================================================================

-- Add credit system columns
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS free_credits_used INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' NOT NULL,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' NOT NULL;

-- Verify columns were added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
  AND column_name IN ('free_credits_used', 'plan', 'subscription_status')
ORDER BY column_name;

-- Expected output:
-- column_name          | data_type | column_default | is_nullable
-- ---------------------|-----------|----------------|-------------
-- free_credits_used    | integer   | 0              | NO
-- plan                 | text      | 'free'         | NO
-- subscription_status  | text      | 'inactive'     | NO

-- If you see 3 rows, the migration succeeded! ✅
