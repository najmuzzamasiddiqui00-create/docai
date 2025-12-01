-- Create user_profiles table
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

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES user_profiles(clerk_user_id) ON DELETE CASCADE,
    plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'premium')),
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'cancelled', 'expired')),
    razorpay_subscription_id TEXT,
    razorpay_order_id TEXT,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES user_profiles(clerk_user_id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create processed_results table
CREATE TABLE IF NOT EXISTS processed_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES user_profiles(clerk_user_id) ON DELETE CASCADE,
    extracted_text TEXT,
    summary TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_clerk_user_id ON user_profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_processed_results_document_id ON processed_results(document_id);
CREATE INDEX IF NOT EXISTS idx_processed_results_user_id ON processed_results(user_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" 
    ON user_profiles FOR SELECT 
    USING (clerk_user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own profile" 
    ON user_profiles FOR UPDATE 
    USING (clerk_user_id = current_setting('app.current_user_id', true));

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" 
    ON subscriptions FOR SELECT 
    USING (user_id = current_setting('app.current_user_id', true));

-- RLS Policies for documents
CREATE POLICY "Users can view their own documents" 
    ON documents FOR SELECT 
    USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert their own documents" 
    ON documents FOR INSERT 
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own documents" 
    ON documents FOR UPDATE 
    USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete their own documents" 
    ON documents FOR DELETE 
    USING (user_id = current_setting('app.current_user_id', true));

-- RLS Policies for processed_results
CREATE POLICY "Users can view their own processed results" 
    ON processed_results FOR SELECT 
    USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert their own processed results" 
    ON processed_results FOR INSERT 
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
