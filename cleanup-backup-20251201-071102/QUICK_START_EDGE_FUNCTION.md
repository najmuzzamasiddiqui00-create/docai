# 🚀 Quick Start: Supabase Edge Function Migration

## 📦 Files Generated

```
supabase/
  functions/
    process-document/
      index.ts          ← Complete Edge Function code (Deno/TypeScript)
      config.toml       ← Function configuration
    deno.json           ← Deno compiler config
    import_map.json     ← ESM imports for dependencies

app/
  api/
    upload/
      route.ts          ← Updated to use supabase.functions.invoke()

EDGE_FUNCTION_DEPLOYMENT.md  ← Complete deployment guide
```

---

## ⚡ Quick Deploy (5 minutes)

### 1. Install Supabase CLI
```powershell
npm install -g supabase
```

### 2. Login & Link
```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Set Environment Secret
```powershell
supabase secrets set GEMINI_API_KEY=AIza...your_key_here
```

### 4. Deploy
```powershell
supabase functions deploy process-document
```

### 5. Test
```powershell
npm run dev
```
Upload a document at http://localhost:3000/dashboard

---

## 🔐 Environment Variables

### Update `.env.local` - REMOVE n8n:
```env
# ❌ DELETE THIS LINE:
# N8N_WEBHOOK_URL=http://localhost:5678/webhook/...

# ✅ KEEP THESE:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
GEMINI_API_KEY=AIza...
```

---

## 📊 What Changed?

### Before (n8n):
```
Next.js Upload → n8n Webhook → n8n Workflow → Update Supabase
```

### After (Edge Function):
```
Next.js Upload → Supabase Edge Function → Update Supabase
```

**Benefits:**
- ✅ No external service to maintain
- ✅ Free tier covers 500K requests/month
- ✅ Global edge deployment (faster)
- ✅ All code in your repo
- ✅ Built-in monitoring & logs

---

## 🧪 Testing Checklist

After deployment:

1. ✅ Run `npm run dev`
2. ✅ Upload a PDF/DOCX/TXT file
3. ✅ Check Next.js console: Should say "Edge Function triggered"
4. ✅ Watch Supabase Dashboard → Edge Functions → Logs
5. ✅ Verify document status changes: queued → processing → completed
6. ✅ Check `documents` table for `processed_output` JSON

---

## 🐛 Common Issues

### "Failed to invoke function"
```powershell
# Redeploy
supabase functions deploy process-document

# Check if deployed
supabase functions list
```

### "Missing GEMINI_API_KEY"
```powershell
# Set secret
supabase secrets set GEMINI_API_KEY=your_key

# Verify
supabase secrets list
```

### "Cannot read file from storage"
- Check Storage bucket is public OR has proper RLS policies
- Verify `file_url` in documents table is correct

---

## 📖 Full Documentation

Read `EDGE_FUNCTION_DEPLOYMENT.md` for:
- Detailed deployment steps
- Local development setup
- Troubleshooting guide
- Cost breakdown
- Monitoring & logs

---

## 🎯 Architecture Overview

### Edge Function (`supabase/functions/process-document/index.ts`)
```typescript
// 1. Accept request
{ documentId, fileUrl, userId }

// 2. Mark as processing
UPDATE documents SET status='processing'

// 3. Download file from Storage
fetch(fileUrl)

// 4. Extract text (PDF/DOCX/TXT)
extractText(buffer)

// 5. Call Gemini AI
fetch('generativelanguage.googleapis.com')

// 6. Parse JSON response
{ summary, keyPoints, keywords, category, sentiment }

// 7. Save results
UPDATE documents SET status='completed', processed_output={...}
```

### Next.js Upload (`app/api/upload/route.ts`)
```typescript
// 1. Auth check
const { userId } = await auth()

// 2. Credit check
await checkUserCredits(userId)

// 3. Upload to Storage
await supabaseAdmin.storage.upload()

// 4. Create document record
await supabaseAdmin.from('documents').insert({ status: 'queued' })

// 5. Trigger Edge Function
await supabaseAdmin.functions.invoke('process-document', { body: {...} })

// 6. Return documentId
return { success: true, documentId }
```

### Frontend (`components/UploadBox.tsx`)
```typescript
// 1. Upload file
POST /api/upload

// 2. Poll for status
setInterval(() => GET /api/documents/{id}, 2000)

// 3. Update UI
queued → processing → completed
```

---

## 🎉 You're Ready!

Your document processing pipeline now uses:
- ✅ Supabase Edge Functions (replaces n8n)
- ✅ Supabase Storage (file hosting)
- ✅ Supabase Database (status tracking)
- ✅ Gemini AI (document analysis)
- ✅ Next.js API Routes (upload handling)
- ✅ React Frontend (UI & polling)

**Total external dependencies:** 0 (except Gemini API)  
**Monthly cost:** $1-10 for most projects  
**Deployment complexity:** Simple (one command)  

🚀 **Deploy now:** `supabase functions deploy process-document`
