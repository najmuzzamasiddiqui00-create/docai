# 🚀 Supabase Edge Function Deployment Guide

This guide explains how to deploy and configure the `process-document` Edge Function that replaces n8n.

---

## 📋 Prerequisites

1. **Supabase CLI installed**
   ```bash
   npm install -g supabase
   ```

2. **Supabase project created** at https://supabase.com/dashboard

3. **Environment variables ready**:
   - `SUPABASE_URL` - Your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (not anon key!)
   - `GEMINI_API_KEY` - Google Gemini API key

---

## 🔧 Local Development Setup

### 1. Login to Supabase CLI
```bash
supabase login
```

### 2. Link to your project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Find your project ref in Supabase Dashboard → Settings → General → Reference ID

### 3. Set local environment secrets
```bash
supabase secrets set GEMINI_API_KEY=your_gemini_key_here
```

### 4. Test locally (optional)
```bash
supabase functions serve process-document --env-file .env.local
```

Test with curl:
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/process-document' \
  --header 'Content-Type: application/json' \
  --data '{"documentId":"test-123","fileUrl":"https://example.com/test.pdf","userId":"user-123"}'
```

---

## 🚀 Production Deployment

### 1. Deploy the Edge Function
```bash
supabase functions deploy process-document
```

This will:
- ✅ Bundle the TypeScript code
- ✅ Deploy to Supabase's global edge network
- ✅ Return a function URL

### 2. Set production environment secrets
```bash
# Set Gemini API key
supabase secrets set GEMINI_API_KEY=your_production_gemini_key

# Verify secrets are set
supabase secrets list
```

**Note:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in Edge Functions.

### 3. Verify deployment
Check Supabase Dashboard → Edge Functions → process-document

You should see:
- ✅ Status: Active
- ✅ Last deployed: Recent timestamp
- ✅ Secrets: GEMINI_API_KEY configured

---

## 🔐 Environment Variables in Next.js

Your `.env.local` should have:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # Service role key, NOT anon key!

# Google Gemini AI
GEMINI_API_KEY=AIza...

# Razorpay (if using subscriptions)
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
```

**Remove these (no longer needed):**
```env
# ❌ DELETE - n8n is removed
# N8N_WEBHOOK_URL=http://localhost:5678/webhook/...
```

---

## 🧪 Testing the Complete Flow

### 1. Start your Next.js dev server
```bash
npm run dev
```

### 2. Upload a test document
- Go to http://localhost:3000/dashboard
- Upload a PDF, DOCX, or TXT file
- Watch the server console for logs

### 3. Expected console output

**Next.js server (upload route):**
```
🚀 === FAST UPLOAD REQUEST ===
✅ User authenticated: user_2abc...
✅ Credits available: 5
✅ File validated: test.pdf (156234 bytes, application/pdf)
✅ File uploaded to storage: user_2abc.../1234567890_test.pdf
✅ Document created: doc-uuid with status="queued"
⚡ === TRIGGERING SUPABASE EDGE FUNCTION ===
✅ Edge Function triggered successfully
```

**Supabase Edge Function logs (check in Dashboard → Edge Functions → Logs):**
```
🚀 Process Document Function Started
📝 Step 1: Updating document status to 'processing'
✅ Document marked as processing
📥 Step 2: Downloading file from Storage
✅ File downloaded: 156234 bytes
📄 Step 3: Extracting text from file
✅ Text extracted: 2543 characters
🤖 Step 4: Calling Gemini API for analysis
✅ Gemini API response received
📊 Step 5: Parsing AI response
✅ Response parsed successfully: Business
💾 Step 6: Saving results to database
✅✅✅ Document processing completed successfully ✅✅✅
```

### 4. Verify in database
Check Supabase Dashboard → Table Editor → documents

Your uploaded document should have:
- `status`: "completed"
- `processed_output`: JSON with summary, keyPoints, etc.
- `processed_at`: Recent timestamp

---

## 🐛 Troubleshooting

### Error: "Failed to trigger Edge Function"
**Cause:** Edge Function not deployed or wrong project linked

**Fix:**
```bash
supabase functions list
supabase functions deploy process-document
```

### Error: "Missing required environment variables"
**Cause:** Secrets not set in Supabase

**Fix:**
```bash
supabase secrets set GEMINI_API_KEY=your_key_here
supabase secrets list  # Verify it's set
```

### Error: "Failed to download file"
**Cause:** Storage bucket not public or wrong URL

**Fix:**
1. Go to Supabase Dashboard → Storage → documents bucket
2. Click "Policies" → "New Policy"
3. Create policy: Allow SELECT for authenticated users
4. Or make bucket public (not recommended for production)

### Error: "No text could be extracted from PDF"
**Cause:** PDF is scanned image (no text layer) or encrypted

**Fix:**
- Use OCR for scanned PDFs (add Tesseract.js to Edge Function)
- Or show user-friendly error: "This PDF cannot be processed"

### Processing takes too long
**Cause:** Large files or Gemini API rate limits

**Fix:**
- Add timeout handling in Edge Function
- Implement queue system for large files
- Show user: "Processing may take a few minutes for large documents"

---

## 📊 Monitoring & Logs

### View Edge Function logs
```bash
supabase functions logs process-document --tail
```

Or in Supabase Dashboard → Edge Functions → process-document → Logs

### Key metrics to monitor
- ✅ Invocation count (should match uploads)
- ✅ Average execution time (should be < 30 seconds)
- ❌ Error rate (should be < 5%)
- ⚡ Cold start time

---

## 🔄 Updating the Edge Function

After making code changes:

```bash
# Deploy updated function
supabase functions deploy process-document

# Verify deployment
supabase functions list
```

Changes are live immediately (no restart needed).

---

## 💰 Cost Considerations

### Supabase Edge Functions
- **Free tier:** 500K invocations/month, 2 million compute seconds
- **Pro tier:** $10/month base + usage overage
- **Typical cost:** ~$0.000002 per invocation

### Gemini API
- **Free tier:** 15 requests/minute, 1500 requests/day
- **Paid tier:** Pay-per-token pricing
- **Typical cost:** ~$0.001-0.01 per document

**Estimate for 1000 documents/month:**
- Supabase: $0 (within free tier)
- Gemini: $1-10 depending on document size
- **Total: $1-10/month** (much cheaper than n8n hosting!)

---

## ✅ Migration Complete Checklist

- [ ] Edge Function deployed: `supabase functions deploy process-document`
- [ ] Secrets configured: `supabase secrets set GEMINI_API_KEY=...`
- [ ] Next.js updated: `/api/upload` uses `supabaseAdmin.functions.invoke()`
- [ ] n8n references removed from `.env.local`
- [ ] Test upload works end-to-end
- [ ] Monitor Edge Function logs for first few uploads
- [ ] Old n8n instance shut down (optional - keep as backup for 1 week)

---

## 🎉 Benefits of This Architecture

✅ **Simpler:** No external service (n8n) to maintain  
✅ **Cheaper:** Free tier covers most usage  
✅ **Faster:** Edge Functions deploy globally  
✅ **More reliable:** Managed by Supabase  
✅ **Better DX:** All code in your repo  
✅ **Production-ready:** Built-in monitoring & logs  

---

Need help? Check:
- Supabase Edge Functions docs: https://supabase.com/docs/guides/functions
- Gemini API docs: https://ai.google.dev/docs
- This project's GitHub issues (if applicable)
