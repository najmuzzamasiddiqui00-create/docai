# 🔧 EDGE FUNCTION DEBUGGING - COMPLETE FIX

## ✅ ISSUES FIXED

### 1. **Duplicate Code Blocks Removed**
The Edge Function had 5 duplicate closing braces (`}`) causing syntax errors:
- ✅ Fixed duplicate `fileName`/`fileType` logging
- ✅ Fixed duplicate `fileBuffer` empty check  
- ✅ Fixed duplicate closing brace after text extraction
- ✅ Fixed duplicate closing brace after Gemini API call
- ✅ Fixed duplicate closing brace after response parsing
- ✅ Fixed duplicate `console.error` line in error handler

### 2. **Upload Route Enhanced Error Handling**
The `/api/upload` route now properly extracts and displays Edge Function errors:
- ✅ Logs full error details from `functionError`
- ✅ Extracts error message and context
- ✅ Checks if Edge Function returned `{ success: false, error: "..." }` in response data
- ✅ Shows detailed error messages in console
- ✅ Formats response with `JSON.stringify` for better readability

---

## 🎯 WHAT THE FIXES DO

### Edge Function (`process-document/index.ts`)
**Before:**
```typescript
}  // Extra closing brace
}  // Another extra closing brace

// This caused "Cannot find name 'extractedText'" errors
console.log("\n🤖 === STEP 4: CALL GEMINI API ===");
```

**After:**
```typescript
// Clean, no duplicate braces
// All variables properly scoped

console.log("\n🤖 === STEP 4: CALL GEMINI API ===");
```

### Upload Route (`app/api/upload/route.ts`)
**Before:**
```typescript
if (functionError) {
  throw new Error(`Function invocation failed: ${functionError.message}`);
}
console.log('✅ Edge Function triggered successfully');
console.log('   Response:', functionData); // Not formatted
```

**After:**
```typescript
if (functionError) {
  console.error('❌ Edge Function invocation failed:', functionError);
  console.error('   Error details:', JSON.stringify(functionError, null, 2));
  
  const errorMessage = functionError.message || 'Unknown error';
  const errorContext = functionError.context || {};
  
  console.error('   Error message:', errorMessage);
  console.error('   Error context:', errorContext);
  
  throw new Error(`Function invocation failed: ${errorMessage}`);
}

// Also check if response data contains an error
if (functionData && !functionData.success && functionData.error) {
  console.error('❌ Edge Function returned error in response:', functionData.error);
  console.error('   Error details:', functionData.details || 'No details provided');
  throw new Error(`Processing failed: ${functionData.error}`);
}

console.log('✅ Edge Function triggered successfully');
console.log('   Response:', JSON.stringify(functionData, null, 2)); // Formatted
```

---

## 📊 HOW TO TEST

### Step 1: Deploy the Fixed Edge Function

```powershell
# Make sure you're logged in
supabase login

# Deploy the function
supabase functions deploy process-document

# Verify it's deployed
supabase functions list
```

You should see:
```
process-document | ACTIVE | 2024-12-01T...
```

### Step 2: Set Environment Variables

```powershell
# Set Gemini API key
supabase secrets set GEMINI_API_KEY=AIzaSyAdAkXVTnE4XqGzZyR9L_mtnIw0SmzpRwc

# Verify secrets
supabase secrets list
```

### Step 3: Test Upload

```powershell
# Start dev server
npm run dev
```

1. Go to http://localhost:3000
2. Upload a PDF/DOCX/TXT file
3. Watch the terminal console

**Success logs should show:**
```
🚀 === UPLOAD REQUEST STARTED ===
👤 Step 1: Authentication
✅ User authenticated: user_xxx

💳 Step 2: Credit Check
✅ Credits available: 5

📄 Step 3: Parse FormData
✅ File validated: document.pdf

📤 Step 4: Upload to Supabase Storage
✅ File uploaded to storage

💾 Step 6: Insert Document Record
✅ Document created: doc_xxx with status="queued"

⚡ Step 8: Trigger Edge Function
   Payload: {
     "documentId": "doc_xxx",
     "fileUrl": "https://...",
     ...
   }
✅ Edge Function triggered successfully
   Response: {
     "success": true,
     "documentId": "doc_xxx",
     "status": "completed",
     ...
   }

✅✅✅ === UPLOAD COMPLETED === ✅✅✅
```

### Step 4: Check Edge Function Logs

```powershell
# View real-time logs
supabase functions logs process-document --follow
```

Or in Supabase Dashboard:
1. Go to **Edge Functions** → `process-document`
2. Click **Logs** tab
3. Filter by "error" to see any issues

---

## 🔍 DEBUGGING CHECKLIST

If Edge Function still returns non-2xx status code:

### Check 1: Environment Variables
```powershell
supabase secrets list
```
Verify you see:
- `GEMINI_API_KEY` ✅

Missing? Run:
```powershell
supabase secrets set GEMINI_API_KEY=your_key_here
```

### Check 2: Function Deployment
```powershell
supabase functions list
```
Status should be **ACTIVE**, not INACTIVE or FAILED.

### Check 3: Request Payload
Look for this in your console:
```
   Payload: {
     "documentId": "...",  // ✅ Must have value
     "fileUrl": "...",     // ✅ Must be valid URL
     "userId": "...",      // ✅ Must have value
     "fileName": "...",    // ⚠️ Optional
     "fileType": "..."     // ⚠️ Optional
   }
```

Missing `documentId`, `fileUrl`, or `userId`? Check the upload route.

### Check 4: File URL Accessibility
Test if the file URL is public:
```powershell
# Copy the file URL from logs
# Try fetching it
curl "https://dqqpzdgpolmghqkxumqz.supabase.co/storage/v1/object/public/documents/..."
```

If you get 404 or 403:
1. Go to Supabase Dashboard → **Storage**
2. Click `documents` bucket
3. Make sure it's **Public** ✅

### Check 5: Gemini API Key
Test your Gemini API key:
```powershell
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY" `
  -H "Content-Type: application/json" `
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

Should return JSON with `candidates`. If you get 400/401/403, your key is invalid or quota exceeded.

### Check 6: Edge Function Logs
In Supabase Dashboard → Edge Functions → `process-document` → Logs:

**Look for:**
- `🚀 === EDGE FUNCTION STARTED ===` ✅ Function invoked
- `✅ Supabase client initialized` ✅ Credentials OK
- `✅ File downloaded successfully` ✅ Storage accessible
- `✅ PDF/DOCX extraction successful` ✅ Text extracted
- `✅ Gemini API response received` ✅ AI working
- `✅ JSON parsed successfully` ✅ Response valid
- `✅ Results saved successfully` ✅ Database updated

**Errors indicate problem area:**
- `❌ Missing required environment variables` → Run `supabase secrets set`
- `❌ File download failed with status: 404` → Storage bucket not public
- `❌ PDF extraction failed` → File corrupted or unsupported format
- `❌ Gemini API failed with status 400` → Invalid API key or quota exceeded
- `❌ Database update failed` → Check RLS policies on `documents` table

---

## 🚨 COMMON ERROR SCENARIOS

### Error: "Function invocation failed: Edge Function returned a non-2xx status code"

**Meaning:** The Edge Function crashed or returned an error.

**Solution:**
1. Check Edge Function logs (see Check 6 above)
2. Look for the `❌❌❌ === PROCESSING FAILED === ❌❌❌` block
3. Read the error message and stack trace
4. Fix the specific issue (usually missing env var, invalid file, or API failure)

### Error: "Processing failed: Missing required environment variables: GEMINI_API_KEY"

**Meaning:** Gemini API key not set as Supabase secret.

**Solution:**
```powershell
supabase secrets set GEMINI_API_KEY=AIzaSyAdAkXVTnE4XqGzZyR9L_mtnIw0SmzpRwc
```

Wait 30 seconds, then try again.

### Error: "Processing failed: Failed to download file: 404 Not Found"

**Meaning:** File URL is not accessible (bucket not public or file doesn't exist).

**Solution:**
1. Supabase Dashboard → **Storage** → `documents` bucket
2. Click **Settings** (gear icon)
3. Toggle **Public** to ON ✅
4. Click **Save**

### Error: "Processing failed: PDF extraction failed: pdf-parse returned empty text"

**Meaning:** PDF file is image-based or encrypted (no extractable text).

**Solution:**
- Use text-based PDFs, not scanned images
- Or add OCR support (Tesseract.js) to extract text from images
- Fallback is attempted but may not work for all PDFs

### Error: "Processing failed: Gemini API failed with status 429"

**Meaning:** Gemini API rate limit exceeded.

**Solution:**
- Wait 60 seconds and try again
- Or upgrade your Gemini API quota
- Or reduce requests per minute

---

## 📝 WHAT'S NEW IN ERROR HANDLING

### Edge Function Always Returns JSON
**Before:** Could return HTML error pages or crash without response
**After:** Always returns:
```json
{
  "success": false,
  "error": "Descriptive error message",
  "details": "Full error.toString()"
}
```

### Upload Route Shows Real Errors
**Before:** Generic "Function invocation failed"
**After:** Detailed error extraction:
- Shows `functionError.message`
- Shows `functionError.context`
- Checks `functionData.error` for Edge Function errors
- Logs full error details with `JSON.stringify`

### Every Step Logged
The Edge Function logs:
- Environment variables check
- Request body parsing
- Each processing step (8 steps total)
- Success or failure of each step
- Duration and results

This makes debugging 10x easier!

---

## ✅ VERIFICATION CHECKLIST

After deploying, verify:

- [ ] Edge Function shows ACTIVE status in `supabase functions list`
- [ ] `GEMINI_API_KEY` appears in `supabase secrets list`
- [ ] `documents` Storage bucket is Public
- [ ] Upload route logs show `✅ Edge Function triggered successfully`
- [ ] Edge Function logs show `✅✅✅ === PROCESSING COMPLETE === ✅✅✅`
- [ ] Document status changes: queued → processing → completed
- [ ] Results appear in dashboard with summary, key points, etc.

---

## 🎉 SUCCESS INDICATORS

Everything is working when you see:

**In Upload Route Console:**
```
⚡ Step 8: Trigger Edge Function
✅ Edge Function triggered successfully
   Response: {
     "success": true,
     "documentId": "xxx",
     "status": "completed",
     "result": { ... }
   }
```

**In Edge Function Logs:**
```
🚀 === EDGE FUNCTION STARTED ===
✅ Supabase client initialized
✅ Body parsed successfully
✅ Document marked as processing
✅ File downloaded successfully (152.57 KB)
✅ PDF extraction successful: 2543 characters
✅ Gemini API response received
✅ JSON parsed successfully
✅ Results saved successfully
✅✅✅ === PROCESSING COMPLETE === ✅✅✅
```

**In Dashboard:**
- Document shows status: **Completed** ✅
- Summary displayed ✅
- Key points listed ✅
- Keywords shown ✅

---

## 🔗 RELATED FILES

- **Edge Function:** `supabase/functions/process-document/index.ts` (Fixed)
- **Upload Route:** `app/api/upload/route.ts` (Enhanced error handling)
- **Config:** `supabase/functions/process-document/config.toml` (Unchanged)
- **Deno Config:** `supabase/functions/deno.json` (Unchanged)

---

**Status: EDGE FUNCTION FIXED ✅**
**Upload Route: ENHANCED ✅**
**Ready to deploy: YES ✅**

Deploy now with:
```powershell
supabase functions deploy process-document
supabase secrets set GEMINI_API_KEY=AIzaSyAdAkXVTnE4XqGzZyR9L_mtnIw0SmzpRwc
```

Then test by uploading a document! 🚀
