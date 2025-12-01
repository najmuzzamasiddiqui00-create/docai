# 🐛 DEBUG GUIDE - Document Processing Pipeline

## 🎯 Debugging Strategy

Your Edge Function now has **comprehensive logging at every step**. This guide helps you identify exactly where the failure occurs.

---

## 📊 Step-by-Step Debugging Process

### **Step 1: Verify Edge Function is Deployed**

```powershell
supabase functions list
```

Expected output:
```
NAME               VERSION  STATUS  CREATED
process-document   X        ACTIVE  <timestamp>
```

If not deployed:
```powershell
supabase functions deploy process-document
```

---

### **Step 2: Check Environment Secrets**

```powershell
supabase secrets list
```

Expected output:
```
NAME              DIGEST
GEMINI_API_KEY    abc123...
```

If missing:
```powershell
supabase secrets set GEMINI_API_KEY=AIzaSyAdAkXVTnE4XqGzZyR9L_mtnIw0SmzpRwc
```

---

### **Step 3: Start Dev Server & Upload Test File**

```powershell
npm run dev
```

1. Go to http://localhost:3000/dashboard
2. Upload a test file (PDF, DOCX, or TXT)
3. **Watch TWO console outputs simultaneously:**

---

## 🔍 What to Look For in Logs

### **A. Next.js Server Console**

You should see:
```
🚀 === FAST UPLOAD REQUEST ===
✅ User authenticated: user_xxx
✅ Credits available: 5
✅ File validated: test.pdf (156234 bytes, application/pdf)
✅ File uploaded to storage: user_xxx/1234567890_test.pdf
📎 Public URL: https://dqqpzdgpolmghqkxumqz.supabase.co/storage/v1/object/public/documents/...
✅ Document created: xxx-uuid with status="queued"
⚡ === TRIGGERING SUPABASE EDGE FUNCTION ===
📦 Payload: {
  "documentId": "xxx-uuid",
  "fileUrl": "https://...",
  "userId": "user_xxx",
  "fileName": "test.pdf",
  "fileType": "application/pdf"
}
✅ Edge Function triggered successfully
```

**If you see an error here:**
- ❌ `Failed to invoke function` → Edge Function not deployed
- ❌ `Function invocation failed` → Check Supabase Dashboard → Edge Functions → Logs

---

### **B. Supabase Edge Function Logs**

Go to: https://supabase.com/dashboard/project/dqqpzdgpolmghqkxumqz/functions

Click on **process-document** → **Logs**

You should see this **exact sequence**:

```
🚀 === EDGE FUNCTION STARTED ===
⏰ Timestamp: 2025-11-30T...
🔧 Method: POST
📍 URL: https://...

🔐 Environment check:
   SUPABASE_URL: ✅ Set
   SUPABASE_SERVICE_ROLE_KEY: ✅ Set
   GEMINI_API_KEY: ✅ Set
✅ Supabase client initialized

📦 Parsing request body...
✅ Body parsed successfully
📋 Raw payload: {
  "documentId": "xxx",
  "fileUrl": "https://...",
  "userId": "user_xxx",
  ...
}

📊 Extracted fields:
   documentId: xxx-uuid
   fileUrl: https://...
   userId: user_xxx
   fileName: test.pdf
   fileType: application/pdf

📝 === STEP 1: UPDATE STATUS TO PROCESSING ===
   Updating document: xxx-uuid
✅ Document marked as processing
   Updated rows: 1

📥 === STEP 2: DOWNLOAD FILE FROM STORAGE ===
   File URL: https://...
   Fetching file...
   Response status: 200 OK
✅ File downloaded successfully
   File size: 156234 bytes (152.57 KB)

📄 === STEP 3: EXTRACT TEXT FROM FILE ===
   Detected file type: application/pdf
   📕 Attempting PDF extraction...
   🔧 PDF extraction starting...
      Buffer size: 156234 bytes
      Importing pdf-parse library...
      ✅ pdf-parse imported
      Parsing PDF...
      ✅ PDF parsed successfully
      Extracted text length: 2543
   ✅ PDF extraction successful: 2543 characters
   📊 Text extraction complete:
      Total characters: 2543
      First 100 chars: This is a sample document...

🤖 === STEP 4: CALL GEMINI API ===
   Prompt length: 2800 characters
   Text being analyzed (first 200 chars): This is a sample...
   Calling Gemini API...
   Gemini API response status: 200 OK
✅ Gemini API response received
   Response structure: {
     "candidates": [...]
   }

📊 === STEP 5: PARSE AI RESPONSE ===
   AI text extracted: ✅ Success
   AI text length: 450
   AI text preview: {"summary":"This document...
   Cleaned text: {"summary":"...
   Attempting JSON parse...
✅ JSON parsed successfully
   Parsed fields:
      summary: ✅ This document discusses...
      keyPoints: ✅ 5 items
      keywords: ✅ 8 items
      category: Business
      sentiment: Positive
      wordCount: 380

💾 === STEP 6: SAVE RESULTS TO DATABASE ===
   Document ID: xxx-uuid
   Updating with status: completed
✅ Results saved successfully
   Updated rows: 1
   Document status: completed

✅✅✅ === PROCESSING COMPLETE === ✅✅✅
   Document ID: xxx-uuid
   Status: completed
   Summary length: 120 chars
   Key points: 5
   Keywords: 8
   Category: Business
```

---

## 🚨 Common Failure Patterns

### **Pattern 1: Environment Variables Missing**

**Logs show:**
```
❌ Missing required environment variables: GEMINI_API_KEY
```

**Fix:**
```powershell
supabase secrets set GEMINI_API_KEY=AIzaSyAdAkXVTnE4XqGzZyR9L_mtnIw0SmzpRwc
```

---

### **Pattern 2: File Download Fails**

**Logs show:**
```
📥 === STEP 2: DOWNLOAD FILE FROM STORAGE ===
   File URL: https://...
   Fetching file...
❌ Fetch failed: Failed to fetch
```

**Possible causes:**
1. **Storage bucket not public**
   - Go to Supabase Dashboard → Storage → documents
   - Make bucket public OR add RLS policy for service role

2. **Wrong file URL**
   - Check if `file_url` in documents table is correct
   - Should be: `https://dqqpzdgpolmghqkxumqz.supabase.co/storage/v1/object/public/documents/...`

**Fix:**
```sql
-- In Supabase SQL Editor, make bucket public
UPDATE storage.buckets
SET public = true
WHERE name = 'documents';
```

---

### **Pattern 3: PDF Extraction Fails**

**Logs show:**
```
📄 === STEP 3: EXTRACT TEXT FROM FILE ===
   📕 Attempting PDF extraction...
   🔧 PDF extraction starting...
      Buffer size: 156234 bytes
      Importing pdf-parse library...
      ✅ pdf-parse imported
      Parsing PDF...
❌ pdf-parse failed: Invalid PDF structure
   🔄 Attempting fallback text extraction...
❌ Fallback also failed: Could not extract readable text
```

**Possible causes:**
1. **Scanned PDF (no text layer)** - Needs OCR
2. **Encrypted/Password-protected PDF**
3. **Corrupted PDF file**

**Solutions:**
- For scanned PDFs: Add Tesseract.js for OCR (future enhancement)
- For encrypted PDFs: Show user error "PDF is password-protected"
- For corrupted: Show user error "Invalid PDF file"

---

### **Pattern 4: DOCX Extraction Fails**

**Logs show:**
```
📄 === STEP 3: EXTRACT TEXT FROM FILE ===
   📘 Attempting DOCX extraction...
   🔧 DOCX extraction starting...
      Buffer size: 45678 bytes
      Importing mammoth library...
      ✅ mammoth imported
      Extracting text from DOCX...
❌ DOCX extraction failed: Invalid DOCX format
```

**Possible causes:**
1. **Old .doc format (not .docx)** - mammoth only supports .docx
2. **Corrupted DOCX file**

**Solution:**
- Show user error: "Please save as .docx format"
- Or add support for old .doc format with different library

---

### **Pattern 5: Gemini API Fails**

**Logs show:**
```
🤖 === STEP 4: CALL GEMINI API ===
   Calling Gemini API...
❌ Gemini API fetch failed: Failed to fetch
```

**Possible causes:**
1. **Invalid API key**
2. **API key not set in Supabase secrets**
3. **Rate limit exceeded** (15 requests/minute on free tier)
4. **Network issue**

**Fix:**
```powershell
# Verify API key
supabase secrets list

# If missing, set it
supabase secrets set GEMINI_API_KEY=your_key_here

# Test API key manually
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

---

### **Pattern 6: Gemini Response Parse Fails**

**Logs show:**
```
📊 === STEP 5: PARSE AI RESPONSE ===
   AI text extracted: ✅ Success
   AI text length: 450
   AI text preview: Here is the analysis: {"summary"...
   Attempting JSON parse...
❌ JSON parse failed: Unexpected token H in JSON at position 0
   ⚠️ Using fallback analysis
```

**Cause:** Gemini returned text outside JSON format

**Fix:** The function now uses a fallback analysis - this is OK!

---

### **Pattern 7: Database Update Fails**

**Logs show:**
```
💾 === STEP 6: SAVE RESULTS TO DATABASE ===
   Document ID: xxx-uuid
   Updating with status: completed
❌ Failed to save results: {
  "code": "42P01",
  "message": "relation 'documents' does not exist"
}
```

**Cause:** Database schema issue

**Fix:**
```sql
-- Check if documents table exists
SELECT * FROM documents LIMIT 1;

-- If missing, run schema migration
-- See run-credit-migration.sql or fix-n8n-schema.sql
```

---

## 🧪 Testing Checklist

After deploying the updated Edge Function:

- [ ] Upload a **PDF file** - should complete successfully
- [ ] Upload a **DOCX file** - should complete successfully
- [ ] Upload a **TXT file** - should complete successfully
- [ ] Upload an **invalid file type** (e.g., .exe) - should fail with clear error
- [ ] Upload a **very large file** (> 5MB) - should process but take longer
- [ ] Check **Supabase Edge Function logs** - should show all steps
- [ ] Check **documents table** - should have:
  - `status`: "completed"
  - `processed_output`: JSON with summary, keyPoints, etc.
  - `error`: null
- [ ] Check **browser console** - should show status transitions
- [ ] Check **failed uploads** - error message should be clear in UI

---

## 📋 Quick Debug Commands

### View Edge Function Logs (Live)
```powershell
supabase functions logs process-document --tail
```

### Check Document Status in Database
```sql
-- In Supabase SQL Editor
SELECT 
  id, 
  file_name, 
  status, 
  error, 
  created_at,
  processed_at
FROM documents
ORDER BY created_at DESC
LIMIT 10;
```

### Check If File Exists in Storage
```sql
-- In Supabase SQL Editor
SELECT 
  name, 
  bucket_id,
  created_at
FROM storage.objects
WHERE bucket_id = 'documents'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 Where the Failure Occurs

Based on the logs, identify the **last successful step**:

| Last Successful Step | Failure Location | What to Check |
|---------------------|------------------|---------------|
| "EDGE FUNCTION STARTED" | Environment setup | Missing secrets |
| "Body parsed successfully" | Payload validation | Check Next.js /api/upload payload |
| "Document marked as processing" | Database connection | Check Supabase credentials |
| "File downloaded successfully" | File extraction | Check file type/format |
| "Text extracted" | Gemini API | Check API key, rate limits |
| "Gemini API response received" | JSON parsing | Check Gemini response format |
| "JSON parsed successfully" | Database update | Check documents table schema |

---

## 💡 Pro Tips

1. **Always check Supabase Dashboard → Edge Functions → Logs first**
   - This shows the most detailed error information

2. **Enable live log streaming**
   ```powershell
   supabase functions logs process-document --tail
   ```

3. **Check documents table after each upload**
   - Look at `error` column for specific error messages

4. **Test with a simple TXT file first**
   - Easiest to debug since no extraction library needed

5. **If Gemini fails, check quota**
   - Free tier: 15 requests/minute, 1500/day
   - Go to: https://ai.google.dev/gemini-api/docs/api-key

6. **Browser DevTools Network Tab**
   - Check if `/api/upload` POST succeeds
   - Check polling requests to `/api/documents/[id]`

---

## 🆘 Still Stuck?

If you're still seeing failures:

1. **Copy the complete Edge Function logs** (from Supabase Dashboard)
2. **Copy the Next.js console output**
3. **Copy the browser console output**
4. **Check the documents table** for the error column
5. **Share all four logs** for detailed analysis

The comprehensive logging will show **exactly** where the failure occurs!

---

## ✅ Success Indicators

You'll know everything is working when you see:

1. **Next.js console:**
   ```
   ✅ Edge Function triggered successfully
   ```

2. **Supabase Edge Function logs:**
   ```
   ✅✅✅ === PROCESSING COMPLETE === ✅✅✅
   ```

3. **Browser console:**
   ```
   ✅✅✅ Status: COMPLETED ✅✅✅
   ```

4. **Database:**
   - status: "completed"
   - processed_output: {...} (valid JSON)
   - error: null

5. **UI:**
   - Green checkmark
   - "Document processed successfully!"

---

**The debugging is now bulletproof. Every step logs its success or failure with details!** 🎯
