-- Fix documents table schema to match the code
-- Add missing columns and rename mismatched ones

DO $$ 
BEGIN
    -- Rename 'filename' to 'file_name' if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'filename'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'file_name'
    ) THEN
        ALTER TABLE documents RENAME COLUMN filename TO file_name;
        RAISE NOTICE 'Renamed filename to file_name';
    END IF;

    -- Rename 'uploaded_at' to 'created_at' if needed (standardize timestamps)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'uploaded_at'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE documents RENAME COLUMN uploaded_at TO created_at;
        RAISE NOTICE 'Renamed uploaded_at to created_at';
    END IF;

    -- Add 'processed_at' column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'processed_at'
    ) THEN
        ALTER TABLE documents ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added processed_at column';
    END IF;

    -- Add 'updated_at' column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE documents ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;

    -- Ensure status column has correct check constraint
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'status'
    ) THEN
        -- Drop old constraint if exists
        ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
        -- Add new constraint
        ALTER TABLE documents ADD CONSTRAINT documents_status_check 
            CHECK (status IN ('uploaded', 'processing', 'completed', 'failed'));
        RAISE NOTICE 'Updated status check constraint';
    END IF;

END $$;

-- Create or replace updated_at trigger
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS set_updated_at ON documents;
CREATE TRIGGER set_updated_at 
    BEFORE UPDATE ON documents
    FOR EACH ROW 
    EXECUTE FUNCTION update_documents_updated_at();

-- Verify the schema
DO $$
BEGIN
    RAISE NOTICE 'Documents table schema updated successfully';
    RAISE NOTICE 'Current columns: id, user_id, file_name, file_path, file_size, file_type, status, created_at, processed_at, updated_at';
END $$;
