# Quick Setup Guide

Follow these steps to get your application running:

## Step 1: Install Dependencies

Open PowerShell in your project directory and run:

```powershell
npm install
```

## Step 2: Set Up Clerk

1. Go to https://clerk.com and sign up
2. Create a new application
3. Copy your API keys from the Clerk Dashboard
4. Update these in `.env.local`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

5. **Set up Clerk Webhook** (Important!):
   - In Clerk Dashboard, go to **Webhooks**
   - Click **Add Endpoint**
   - URL: `http://localhost:3000/api/webhooks/clerk` (for local testing)
   - Select events: `user.created`, `user.updated`, `user.deleted`
   - Copy the **Signing Secret** and add it to `.env.local` as `WEBHOOK_SECRET`

## Step 3: Set Up Supabase

1. Go to https://supabase.com and create account
2. Create a new project
3. Wait for database to be ready

4. **Run Database Schema**:
   - Go to **SQL Editor** in Supabase Dashboard
   - Copy contents of `supabase-schema.sql`
   - Paste and click **RUN**
   - Then copy contents of `supabase-storage.sql`
   - Paste and click **RUN**

5. **Get API Keys**:
   - Go to **Project Settings** → **API**
   - Copy:
     - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
     - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
   - Update these in `.env.local`

## Step 4: Set Up Razorpay

1. Go to https://razorpay.com and sign up
2. Go to **Test Mode** (toggle in top bar)
3. Go to **Account & Settings** → **API Keys**
4. Generate test keys if not already created
5. Copy:
   - Key ID → `RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - Key Secret → `RAZORPAY_KEY_SECRET`
6. Update these in `.env.local`

7. **Set up Razorpay Webhook** (for production):
   - Go to **Webhooks** in Razorpay Dashboard
   - Add webhook URL: `https://your-domain.com/api/webhooks/razorpay`
   - Select all payment and subscription events
   - Generate webhook secret

## Step 5: Get OpenAI API Key

1. Go to https://platform.openai.com
2. Sign up or log in
3. Go to **API Keys**
4. Create new secret key
5. Copy and add to `.env.local` as `OPENAI_API_KEY`

## Step 6: Configure Environment Variables

Your `.env.local` should look like this (with your actual keys):

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_XXXXXXXX
CLERK_SECRET_KEY=sk_test_XXXXXXXX
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://XXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJXXXXX...
SUPABASE_SERVICE_ROLE_KEY=eyJXXXXX...

# Razorpay
RAZORPAY_KEY_ID=rzp_test_XXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXX
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_XXXXXXXX

# OpenAI
OPENAI_API_KEY=sk-XXXXXXXX

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
WEBHOOK_SECRET=whsec_XXXXXXXX
```

## Step 7: Run the Application

```powershell
npm run dev
```

Open http://localhost:3000 in your browser.

## Step 8: Test the Application

1. **Sign Up**: Create a new account
2. **Dashboard**: You should be redirected to the dashboard
3. **Upload**: Try uploading a PDF, DOCX, or TXT file
4. **Wait**: The file will be processed (check console for progress)
5. **View Results**: Refresh the page to see extracted text and summary
6. **Test Subscription**: Try the subscription flow with Razorpay test cards

### Razorpay Test Cards

For testing payments:
- **Success**: `4111 1111 1111 1111`
- **CVV**: Any 3 digits
- **Expiry**: Any future date

## Troubleshooting

### Clerk Webhook Not Working

If users aren't being created in Supabase:
1. Check Clerk webhook is configured
2. Verify `WEBHOOK_SECRET` matches Clerk's signing secret
3. For local testing, use **ngrok** to expose localhost:
   ```powershell
   ngrok http 3000
   ```
   Then update Clerk webhook URL to ngrok URL

### File Upload Fails

1. Check Supabase storage bucket "documents" exists
2. Run `supabase-storage.sql` again
3. Verify `SUPABASE_SERVICE_ROLE_KEY` is set

### Processing Not Working

1. Check `OPENAI_API_KEY` is valid
2. Ensure you have OpenAI API credits
3. Check browser console and terminal for errors

### Payment Issues

1. Make sure you're in Razorpay **Test Mode**
2. Use test card numbers provided above
3. Check webhook signature verification

## Production Deployment

When deploying to production:

1. Update `NEXT_PUBLIC_APP_URL` to your production domain
2. Update Clerk webhook URL to production URL
3. Update Razorpay webhook URL to production URL
4. Switch Razorpay to **Live Mode** and use live keys
5. Consider using environment variables in your hosting platform

## Need Help?

Check the main README.md for detailed documentation and API reference.
