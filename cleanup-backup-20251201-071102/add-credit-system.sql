-- Add credit system columns to user_profiles table
-- This enforces server-side credit limits for free users

DO $$ 
BEGIN
    -- Add free_credits_used column (default 0)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'free_credits_used'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN free_credits_used INTEGER DEFAULT 0 NOT NULL;
        RAISE NOTICE 'Added free_credits_used column';
    END IF;

    -- Add plan column (default 'free')
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'plan'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN plan TEXT DEFAULT 'free' NOT NULL;
        RAISE NOTICE 'Added plan column';
    END IF;

    -- Add subscription_status column (default 'inactive')
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN subscription_status TEXT DEFAULT 'inactive' NOT NULL;
        RAISE NOTICE 'Added subscription_status column';
    END IF;

    -- Add check constraint for plan values
    ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_plan_check;
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_plan_check 
        CHECK (plan IN ('free', 'pro', 'premium'));
    RAISE NOTICE 'Added plan check constraint';

    -- Add check constraint for subscription_status values
    ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_subscription_status_check;
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_subscription_status_check 
        CHECK (subscription_status IN ('inactive', 'active', 'cancelled', 'expired'));
    RAISE NOTICE 'Added subscription_status check constraint';

    -- Add check constraint to ensure free_credits_used is not negative
    ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_free_credits_used_check;
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_free_credits_used_check 
        CHECK (free_credits_used >= 0);
    RAISE NOTICE 'Added free_credits_used check constraint';

END $$;

-- Update existing users to have default values
UPDATE user_profiles 
SET 
    free_credits_used = COALESCE(free_credits_used, 0),
    plan = COALESCE(plan, 'free'),
    subscription_status = COALESCE(subscription_status, 'inactive')
WHERE 
    free_credits_used IS NULL 
    OR plan IS NULL 
    OR subscription_status IS NULL;

-- Create index for faster credit queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status 
    ON user_profiles(subscription_status);

CREATE INDEX IF NOT EXISTS idx_user_profiles_plan 
    ON user_profiles(plan);

-- Verify the changes
DO $$
BEGIN
    RAISE NOTICE 'Credit system schema updated successfully';
    RAISE NOTICE 'Columns added: free_credits_used, plan, subscription_status';
    RAISE NOTICE 'Free users get 5 free credits before requiring subscription';
END $$;
