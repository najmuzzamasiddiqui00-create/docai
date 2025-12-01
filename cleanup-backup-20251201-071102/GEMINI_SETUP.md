# 🚀 Google Gemini API Setup Guide

## Why Gemini Instead of Ollama?

**Ollama:**
- ❌ Requires local server running
- ❌ Not compatible with Vercel/serverless
- ❌ Needs powerful hardware
- ❌ localhost:11434 doesn't work in production

**Gemini:**
- ✅ Cloud-based API (no local server needed)
- ✅ Works perfectly on Vercel
- ✅ Fast and reliable
- ✅ Free tier available
- ✅ Production-ready

---

## Step 1: Get Your Gemini API Key

### Option A: Google AI Studio (Recommended - Free!)

1. Go to: **https://aistudio.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Get API Key"** or **"Create API Key"**
4. Select a Google Cloud project (or create new one)
5. Click **"Create API key in existing project"**
6. Copy the generated API key (starts with `AIza...`)

### Option B: Google Cloud Console

1. Go to: **https://console.cloud.google.com/**
2. Create or select a project
3. Enable the **Generative Language API**
4. Go to **APIs & Services → Credentials**
5. Click **Create Credentials → API Key**
6. Copy the API key

---

## Step 2: Add API Key to Your Project

### For Local Development:

Open `.env.local` and replace:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

With your actual key:
```env
GEMINI_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstu
```

### For Vercel Production:

1. Go to your Vercel project dashboard
2. Click **Settings → Environment Variables**
3. Add new variable:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** Your API key (paste it)
   - **Environments:** Check Production, Preview, Development
4. Click **Save**
5. Redeploy your project

---

## Step 3: Verify It Works

### Test Locally:

1. Restart your dev server: `npm run dev`
2. Upload a document in the dashboard
3. Check terminal logs - you should see:
   ```
   🤖 Calling Google Gemini API...
   ✅ Gemini summary generated successfully in 2000ms
   ```

### Test in Production:

1. Deploy to Vercel: `vercel --prod`
2. Upload a document through your live site
3. Check Vercel logs for successful API calls

---

## Pricing & Limits

### Gemini 1.5 Flash (What we're using):

**Free Tier:**
- ✅ 15 requests per minute
- ✅ 1,500 requests per day
- ✅ 1 million tokens per minute
- **Perfect for most small to medium apps!**

**Paid Tier ($):**
- $0.075 per 1M input tokens
- $0.30 per 1M output tokens
- Much cheaper than GPT-4

**For your app:**
- Each document = 1 request
- 5 free credits per user = 5 requests
- Should easily stay within free tier initially

---

## What Changed in the Code

### Before (Ollama):
```typescript
// Calls localhost:11434
const response = await fetch(`http://localhost:11434/api/generate`, {...})
```

### After (Gemini):
```typescript
// Uses Google Gemini API
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const result = await model.generateContent(prompt);
```

### Files Modified:
- ✅ `lib/document-processor.ts` - Replaced Ollama with Gemini
- ✅ `.env.local` - Removed Ollama vars, added GEMINI_API_KEY
- ✅ `package.json` - Added @google/generative-ai

---

## Troubleshooting

### Error: "Gemini API key not configured"
**Fix:** Make sure `GEMINI_API_KEY` is set in `.env.local` (local) or Vercel environment variables (production)

### Error: "API key not valid"
**Fix:** 
1. Check if key starts with `AIza`
2. Make sure you copied the entire key
3. Try regenerating the key in Google AI Studio

### Error: "Quota exceeded"
**Fix:**
1. You hit the free tier limit (15 requests/min or 1500/day)
2. Wait a bit or upgrade to paid tier
3. Check usage at: https://aistudio.google.com/app/apikey

### Error: "Model not found"
**Fix:**
- We use `gemini-1.5-flash` (fast and free)
- If error persists, try `gemini-pro` instead

---

## Deployment Checklist

### Before Deploying to Vercel:

- [ ] Get Gemini API key from Google AI Studio
- [ ] Add `GEMINI_API_KEY` to Vercel environment variables
- [ ] Remove any Ollama references from code
- [ ] Test locally with Gemini first
- [ ] Commit and push changes
- [ ] Deploy: `vercel --prod`
- [ ] Test upload in production
- [ ] Check Vercel logs for successful API calls

---

## Benefits Summary

✅ **No localhost dependencies** - Works on Vercel
✅ **Fast processing** - Cloud-based, optimized
✅ **Free tier** - 1,500 requests/day free
✅ **Reliable** - Google infrastructure
✅ **Scalable** - Handles production traffic
✅ **Easy to deploy** - Just add API key

---

## Need Help?

- **Get API Key:** https://aistudio.google.com/app/apikey
- **Gemini Docs:** https://ai.google.dev/docs
- **Pricing:** https://ai.google.dev/pricing
- **Check Limits:** https://console.cloud.google.com/apis/dashboard

---

🎉 **You're ready for production!** Your app will now work perfectly on Vercel with no localhost dependencies.
