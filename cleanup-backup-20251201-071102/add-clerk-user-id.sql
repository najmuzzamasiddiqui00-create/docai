-- ============================================
-- Add clerk_user_id to user_profiles
-- ============================================
-- This adds the missing clerk_user_id column to user_profiles table

-- First, let's see what columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Add clerk_user_id column if it doesn't exist
ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

-- If the table has a different user identifier column, you might need to:
-- 1. Check if there's a 'user_id' column instead
-- 2. Rename it to 'clerk_user_id'
-- Uncomment if needed:
-- ALTER TABLE user_profiles RENAME COLUMN user_id TO clerk_user_id;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_clerk_id ON user_profiles(clerk_user_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'clerk_user_id';
