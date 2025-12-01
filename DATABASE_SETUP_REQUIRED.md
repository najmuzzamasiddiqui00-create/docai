# ⚠️ CRITICAL: Database Schema Setup Required

## Issue
The analysis results are not visible because the database schema is missing required columns.

## Required Action

**You MUST run this migration in your Supabase SQL Editor:**

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/editor
2. Open SQL Editor
3. Run the migration file: `fix-documents-table.sql`

```sql
-- This adds the required columns:
-- • processed_output (JSONB) - stores AI analysis results
-- • error (TEXT) - stores error messages
-- • file_url (TEXT) - stores file URLs
-- • Updates status constraint to: queued, processing, completed, failed
```

## Verification

After running the migration, verify it worked:

1. Run `verify-database-schema.sql` in SQL Editor
2. Check that you see:
   - `processed_output` column (type: jsonb)
   - `error` column (type: text)
   - `file_url` column (type: text)

## Why This Matters

**Without `processed_output` column:**
- API returns results but database can't save them ❌
- Dashboard can't display analysis results ❌
- Documents appear as "completed" but show no data ❌

**With `processed_output` column:**
- Database stores full analysis as JSON ✅
- Dashboard shows summary, keywords, sentiment ✅
- Users can see all AI-generated insights ✅

## Data Structure

The `processed_output` JSONB column stores:

```json
{
  "summary": "AI-generated summary...",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "sentiment": "Positive",
  "category": "Business",
  "wordCount": 1234,
  "charCount": 5678,
  "extracted_text": "Full extracted text..."
}
```

## Code Already Fixed

✅ **API Route** (`/api/process-document`) - Already returns `processed_output`
✅ **Type Definitions** (`types/index.ts`) - Already has `ProcessedOutput` interface
✅ **UI Components** - Updated with safeguards (see below)

## What Was Fixed in This Update

### 1. DocumentCard Component
- Added safeguard: `const analysis = document.processed_output || {}`
- Now safely reads: `analysis?.summary`
- Won't crash if `processed_output` is null

### 2. Document Detail Page
- Added safeguard: `const analysis = document.processed_output || {}`
- Safely displays all fields: summary, keyPoints, keywords, sentiment, category
- Gracefully handles missing data

### 3. Type Safety
- `ProcessedOutput` interface already defined correctly
- All fields are optional (`summary?`, `keyPoints?`, etc.)
- Matches Gemini API response structure

## Next Steps

1. **RUN THE MIGRATION** (see above) ← DO THIS FIRST
2. Verify database schema (run `verify-database-schema.sql`)
3. Upload a test document
4. Trigger processing: `/api/process-document` with `documentId`
5. Check dashboard - analysis results should appear

## Troubleshooting

**If analysis still doesn't show:**

```bash
# Check if migration ran:
npm run verify:schema

# Test Gemini integration:
npm run test:gemini short

# Check browser console for errors
# Check Supabase logs for database errors
```

**Common Issues:**

1. **Migration not run** → Results show as null in database
2. **Old documents** → Reprocess them with retry button
3. **API key missing** → Check `.env.local` has `GEMINI_API_KEY`
4. **Wrong status** → Should be 'completed', not 'uploaded'

## Files Modified

- ✅ `components/DocumentCard.tsx` - Added safeguards
- ✅ `app/documents/[id]/page.tsx` - Added safeguards
- ✅ `verify-database-schema.sql` - Created verification script
- ✅ `DATABASE_SETUP_REQUIRED.md` - This file

## Migration File Location

📁 `fix-documents-table.sql` (already exists in root directory)
