-- ============================================
-- N8N Integration Schema Migration - SAFE VERSION
-- ============================================
-- This migration adds support for n8n architecture:
-- 1. Creates user_profiles table with clerk_user_id
-- 2. Adds 'queued' status to documents
-- 3. Adds file_url, processed_output, error columns
-- ============================================

-- STEP 1: Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    free_credits_used INTEGER DEFAULT 0 NOT NULL,
    plan TEXT DEFAULT 'free' NOT NULL CHECK (plan IN ('free', 'pro', 'premium')),
    subscription_status TEXT DEFAULT 'inactive' NOT NULL CHECK (subscription_status IN ('inactive', 'active', 'cancelled', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 2: Create index on clerk_user_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_clerk_id ON user_profiles(clerk_user_id);

-- STEP 3: Add new columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processed_output TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS error TEXT;

-- STEP 4: Drop old status constraint if exists
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;

-- STEP 5: Add new CHECK constraint with 'queued' status
ALTER TABLE documents 
    ADD CONSTRAINT documents_status_check 
    CHECK (status IN ('uploaded', 'queued', 'processing', 'completed', 'failed'));

-- STEP 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_file_url ON documents(file_url);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- DONE! Show what we created:
SELECT 
    'user_profiles columns:' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
