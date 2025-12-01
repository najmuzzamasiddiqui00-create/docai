# 🔧 COMPLETE FIX GUIDE

## ✅ TypeScript Errors - ALREADY FIXED
The errors shown in VS Code are **cache issues only**. The files don't exist:
- `lib/process-document.ts` - DELETED ✅
- `lib/document-processor.ts` - DELETED ✅  
- `supabase/functions/**` - EXCLUDED from tsconfig ✅

**Solution**: Restart VS Code or run "Developer: Reload Window"

---

## ❌ ACTUAL PROBLEM 1: Edge Function File Download (400 Bad Request)

**Error**: `Failed to download file: 400 Bad Request`

**Root Cause**: Edge Function cannot download file from Storage bucket

**Fix Options**:

### Option A: Make bucket public (RECOMMENDED for this use case)
1. Go to Supabase Dashboard → Storage → `documents` bucket
2. Click Settings → Make bucket **Public**
3. Test upload again

### Option B: Use authenticated download in Edge Function
The Edge Function already has `SUPABASE_SERVICE_ROLE_KEY` and should be using it.
Need to verify the file URL format being passed.

**Current file URL format**:
```
https://dqqpzdgpolmghqkxumqz.supabase.co/storage/v1/object/public/documents/...
```

**Should be** (for service role access):
```
https://dqqpzdgpolmghqkxumqz.supabase.co/storage/v1/object/documents/...
```
(Remove `/public/` when using service role key)

---

## ❌ ACTUAL PROBLEM 2: Credit System Database Schema

**Error**: `null value in column "user_id" of relation "user_profiles" violates not-null constraint`

**Root Cause**: The `user_profiles` table has a `user_id` column with NOT NULL constraint, but we're only inserting `clerk_user_id`.

**Fix**: Run this SQL in Supabase SQL Editor:

```sql
-- Option A: Make user_id nullable (if it's not the primary key)
ALTER TABLE user_profiles ALTER COLUMN user_id DROP NOT NULL;

-- OR Option B: Use clerk_user_id as user_id
-- Check current schema first
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Then update insert logic to use clerk_user_id for both fields
```

**Better Solution**: Update `lib/credits.ts` to insert `clerk_user_id` into both columns:

```typescript
// In createUserProfile function:
const { data, error } = await supabaseAdmin
  .from('user_profiles')
  .insert({
    clerk_user_id: clerkUserId,
    user_id: clerkUserId,  // ADD THIS LINE
    free_credits_used: 0,
    plan: 'free',
    subscription_status: 'inactive',
  })
  .select()
  .single();
```

---

## 🎯 IMMEDIATE ACTIONS

1. **Fix Credit System** (5 minutes)
   - Update `lib/credits.ts` line 123
   - Add `user_id: clerkUserId` to insert

2. **Fix Storage Download** (2 minutes)
   - Go to Supabase Dashboard
   - Make `documents` bucket public
   - OR update Edge Function to use authenticated URL

3. **Clear VS Code Cache** (1 minute)
   - Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
   - Type "Developer: Reload Window"
   - Press Enter

4. **Test Upload** (2 minutes)
   - Go to http://localhost:3000
   - Upload a PDF file
   - Check if it processes successfully

---

## ✅ SUCCESS CRITERIA

After fixes:
- ✅ No TypeScript errors in Problems panel
- ✅ File upload creates user profile successfully
- ✅ Edge Function downloads file (no 400 error)
- ✅ Document processes and shows "completed" status
- ✅ AI summary appears in dashboard

---

## 📞 NEXT STEPS AFTER FIXES

1. Delete all backup folders:
   ```powershell
   Remove-Item cleanup-backup-* -Recurse -Force
   ```

2. Commit changes:
   ```bash
   git add .
   git commit -m "fix: resolve credit system schema and storage access issues"
   git push
   ```

3. Deploy Edge Function (if changed):
   ```bash
   supabase functions deploy process-document
   ```
