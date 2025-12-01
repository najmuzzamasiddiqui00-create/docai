-- Add metadata column to processed_results table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'processed_results' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE processed_results ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;
