# 🚀 Quick Start - Upload & n8n Integration

## ✅ Current Status
All code is **PRODUCTION READY**. Only database migration needed.

---

## 🔧 Setup (One Time)

### 1. Database Migration (5 minutes)
```bash
# Open Supabase SQL Editor
npm run open-sql-editor

# Then paste and run: add-clerk-user-id.sql
```

### 2. Verify Setup
```bash
npm run verify-schema
```

Expected output:
```
✅ user_profiles.clerk_user_id exists
✅ documents.file_url exists
✅ documents.processed_output exists  
✅ 'queued' status is supported
✅ N8N_WEBHOOK_URL configured
```

### 3. Import n8n Workflow
1. Open n8n: http://localhost:5678
2. Workflows → Import from File
3. Import the n8n workflow JSON
4. Set environment variables in n8n:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
5. Activate workflow (toggle to Active)

---

## 🏃 Running

### Terminal 1: Next.js
```bash
npm run dev
```

### Terminal 2: n8n
```bash
n8n start
```

### Browser
http://localhost:3000

---

## 🧪 Test Upload

1. Sign in
2. Upload PDF file
3. Watch status progression:
   - 🟣 **Queued** (instant, purple)
   - 🟡 **Processing** (n8n working, yellow)
   - 🟢 **Complete** (results shown, green)

---

## 📊 Upload Flow

```
User uploads file
    ↓
/api/upload creates document (status: 'queued')
    ↓
/api/upload triggers n8n webhook
    ↓
n8n downloads file & processes
    ↓
n8n updates Supabase (status: 'completed')
    ↓
Frontend polling detects change
    ↓
Shows results to user
```

---

## 🐛 Common Issues

### "clerk_user_id does not exist"
Run database migration (Step 1 above)

### Webhook not triggered
1. Check `N8N_WEBHOOK_URL` in .env.local
2. Restart Next.js: `npm run dev`
3. Verify n8n workflow is Active

### Stuck in "Queued"
1. Check n8n workflow is Active
2. Check n8n Executions tab for errors
3. Verify webhook URL matches

---

## 📁 Key Files

**Upload Logic:**
- `app/api/upload/route.ts` - Uploads & triggers n8n

**Polling Logic:**
- `app/api/documents/[id]/route.ts` - Returns status
- `components/UploadBox.tsx` - Frontend UI & polling

**Configuration:**
- `.env.local` - N8N_WEBHOOK_URL
- n8n workflow JSON - Processing pipeline

**Documentation:**
- `N8N_INTEGRATION_COMPLETE.md` - Full details

---

## ✅ Checklist

Setup:
- [ ] Run database migration
- [ ] `npm run verify-schema` shows all ✅
- [ ] Import n8n workflow
- [ ] Set n8n environment variables
- [ ] Activate n8n workflow

Test:
- [ ] Upload file
- [ ] See purple "Queued" immediately
- [ ] Status changes to yellow "Processing"
- [ ] Status changes to green "Complete"
- [ ] AI results displayed

---

## 🎯 What Changed

**Fixed:**
- ✅ `/api/documents/[id]` now reads from `documents` table (not `processed_results`)
- ✅ Deleted `/api/process-document` route (n8n handles all processing)

**Already Working:**
- ✅ `/api/upload` triggers n8n webhook correctly
- ✅ `UploadBox.tsx` polls and shows all states correctly
- ✅ n8n workflow JSON ready to import

**Nothing broken!** Just minor fixes to align with n8n architecture.

---

**Need help?** See `N8N_INTEGRATION_COMPLETE.md` for detailed troubleshooting.
