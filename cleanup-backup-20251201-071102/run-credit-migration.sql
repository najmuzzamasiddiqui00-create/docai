-- Simple credit system migration
-- Run this in Supabase SQL Editor

-- Add columns if they don't exist
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS free_credits_used INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' NOT NULL,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' NOT NULL;

-- Add constraints
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_plan_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_plan_check 
  CHECK (plan IN ('free', 'pro', 'premium'));

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_subscription_status_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_subscription_status_check 
  CHECK (subscription_status IN ('inactive', 'active', 'cancelled', 'expired'));

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_free_credits_used_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_free_credits_used_check 
  CHECK (free_credits_used >= 0);

-- Update existing users
UPDATE user_profiles 
SET 
  free_credits_used = COALESCE(free_credits_used, 0),
  plan = COALESCE(plan, 'free'),
  subscription_status = COALESCE(subscription_status, 'inactive');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status 
  ON user_profiles(subscription_status);

CREATE INDEX IF NOT EXISTS idx_user_profiles_plan 
  ON user_profiles(plan);

-- Verify
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name IN ('free_credits_used', 'plan', 'subscription_status')
ORDER BY column_name;
