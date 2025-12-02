# Document Processing App

A full-stack Next.js application for document upload, processing, and analysis with AI-powered features. Built with Clerk authentication, Supabase for data storage, and Razorpay for payments.

## 🏗️ Architecture

This application follows a clean, internal architecture:

- **Authentication**: Clerk (no external auth system)
- **Database & Storage**: Supabase (PostgreSQL + File Storage)
- **Backend Logic**: Next.js API Routes (no n8n, no external workflow engines)
- **Payments**: Razorpay (webhook-based subscription management)
- **Frontend**: Next.js 14 with React Server Components

## ✨ Features

- ✅ User authentication with Clerk
- ✅ Secure file uploads (PDF, DOCX, TXT, images, and more)
- ✅ AI-powered text extraction and summarization (Google Gemini)
- ✅ Document analysis (word count, character count)
- ✅ Subscription management with Razorpay
- ✅ Server-side credit system (5 free credits per user)
- ✅ Row-level security (RLS) for data protection
- ✅ Real-time document processing
- ✅ User dashboard with document management
- ✅ Production-ready (works on Vercel)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Clerk account (https://clerk.com)
- Supabase account (https://supabase.com)
- Razorpay account (https://razorpay.com)
- Google Gemini API key (https://aistudio.google.com/app/apikey)

### Installation

1. **Install dependencies**:
```bash
npm install
npm install -D husky  # For pre-commit hooks
```

2. **Setup security system**:
```bash
npm run security:setup  # Configure pre-commit hooks
```

3. **Install GitLeaks** (for secret scanning):

**Windows (with Chocolatey):**
```bash
choco install gitleaks
```

**Or download from:** https://github.com/gitleaks/gitleaks/releases

4. **Configure environment variables**:

Copy `.env.example` to `.env.local` and fill in your credentials:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your-secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...

# Google Gemini AI
GEMINI_API_KEY=AIza...

# N8N Webhook (Optional - for external processing)
N8N_WEBHOOK_URL=https://your-n8n.app/webhook/document-process
N8N_WEBHOOK_SECRET=your-n8n-secret  # Optional security

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
WEBHOOK_SECRET=your-webhook-secret
```

### N8N Integration (Optional)

If you want to use N8N for document processing instead of the built-in processor:

1. Set `N8N_WEBHOOK_URL` to your N8N webhook trigger URL
2. Optionally set `N8N_WEBHOOK_SECRET` for security
3. The upload API will POST to N8N with: `{ documentId, fileUrl, userId, fileName, fileType }`
4. N8N should call back to `/api/webhooks/n8n` with the processing result:
   ```json
   {
     "documentId": "uuid",
     "status": "completed",
     "processed_output": { "summary": "...", "keyPoints": [...], "keywords": [...] }
   }
   ```

If `N8N_WEBHOOK_URL` is not set, the app uses the built-in `/api/process-document` route.

5. **Set up Supabase Database**:

Run the SQL scripts in your Supabase SQL Editor:

a. First, run `supabase-schema.sql` to create tables and RLS policies
b. Then, run `supabase-storage.sql` to set up the storage bucket

6. **Configure Clerk Webhooks**:

- Go to Clerk Dashboard → Webhooks
- Create a new endpoint: `https://your-domain.com/api/webhooks/clerk`
- Subscribe to events: `user.created`, `user.updated`, `user.deleted`
- Copy the signing secret to `WEBHOOK_SECRET` in `.env.local`

7. **Configure Razorpay Webhooks**:

- Go to Razorpay Dashboard → Webhooks
- Create webhook: `https://your-domain.com/api/webhooks/razorpay`
- Subscribe to all payment and subscription events
- Use the webhook secret for signature verification

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
v1/
├── app/
│   ├── api/
│   │   ├── documents/        # Document upload, process, list APIs
│   │   ├── subscription/     # Razorpay order & payment APIs
│   │   ├── user/            # User profile APIs
│   │   └── webhooks/        # Clerk & Razorpay webhooks
│   ├── dashboard/           # Protected dashboard page
│   ├── sign-in/             # Clerk sign-in page
│   ├── sign-up/             # Clerk sign-up page
│   ├── layout.tsx           # Root layout with ClerkProvider
│   └── page.tsx             # Landing page
├── components/
│   ├── UploadForm.tsx       # File upload component
│   └── SubscriptionPlans.tsx # Razorpay subscription UI
├── lib/
│   ├── supabase.ts          # Supabase client setup
│   ├── razorpay.ts          # Razorpay & signature verification
│   ├── subscription.ts      # Subscription check utilities
│   └── document-processor.ts # AI text extraction & summarization
├── types/
│   └── index.ts             # TypeScript type definitions
├── middleware.ts            # Clerk route protection
├── .env.local               # Environment variables
├── package.json
└── tsconfig.json
```

## 🔒 Security

This application implements production-grade security measures:

### Environment Variable Safety
- ✅ Type-safe environment variable access (`lib/safeEnv.ts`)
- ✅ Runtime validation with clear error messages
- ✅ Build-phase detection to prevent Vercel crashes
- ✅ Centralized configuration management

### Secret Protection
- ✅ GitLeaks integration for secret scanning
- ✅ Pre-commit hooks prevent accidental secret commits
- ✅ CI/CD workflows with automated security checks
- ✅ `.env.local` never committed to Git

### Data Security
- ✅ **Row Level Security (RLS)**: All Supabase tables have RLS policies
- ✅ **Authentication**: Clerk handles all authentication securely
- ✅ **API Protection**: All API routes verify user identity
- ✅ **Webhook Verification**: Razorpay webhooks are signature-verified
- ✅ **File Validation**: Upload size (10MB) and type restrictions

### Security Scripts

```bash
# Run complete security audit
npm run security:audit

# Scan for secrets in codebase
npm run security:scan

# Setup pre-commit hooks
npm run security:setup

# Pre-deployment validation
npm run predeploy
```

### Security Monitoring

- **Health Check**: `GET /api/health` - Validates environment and service health
- **CI/CD**: Automated security scans on every push
- **Documentation**: See `docs/security-playbook.md` for incident response

For complete security documentation, see `SECURITY_IMPLEMENTATION_COMPLETE.md`.

## 💳 Subscription Plans

### Free Plan
- 5 uploads per month
- Basic text extraction
- Document summarization

### Pro Plan (₹499/month)
- 50 uploads per month
- AI text extraction
- Priority processing
- Email support

## 🚢 Deployment

### Pre-Deployment Checklist

Before deploying to production:

```bash
# Run complete security audit
npm run predeploy

# This will:
# - Run security audit
# - Check for secrets
# - Validate TypeScript
# - Run linter
# - Test build
```

### Deploy to Vercel

1. **Setup Environment Variables in Vercel**:
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all variables from `.env.local` (see `.env.example` for reference)
   - **Required secrets**: `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `GEMINI_API_KEY`, `WEBHOOK_SECRET`

2. **Push code to GitHub**:
```bash
git add .
git commit -m "feat: production-ready deployment"
git push
```

3. **Import project in Vercel**:
   - Connect your GitHub repository
   - Vercel will auto-detect Next.js
   - Deploy

4. **Monitor CI/CD**:
   - GitHub Actions will run security scans automatically
   - Check workflow status in GitHub Actions tab

5. **Verify Deployment**:
   - Visit `https://your-domain.com/api/health` to check system health It Works

1. **User Signs Up**: Clerk handles authentication
2. **Webhook Sync**: Clerk webhook creates user profile in Supabase with free subscription
3. **Upload Document**: User uploads file → stored in Supabase Storage
4. **Processing**: Background job extracts text, generates summary using OpenAI
5. **Results Stored**: Processed data saved to Supabase database
6. **Dashboard Display**: User views documents and results in real-time
7. **Upgrade**: User can subscribe via Razorpay for more features

## 🛠️ API Routes

### Documents
- `POST /api/documents/upload` - Upload file
- `POST /api/documents/process` - Process document (internal)
- `GET /api/documents/list` - List user documents
- `GET /api/documents/[id]` - Get document details
- `DELETE /api/documents/[id]` - Delete document

### Subscription
- `POST /api/subscription/create-order` - Create Razorpay order
- `POST /api/subscription/verify-payment` - Verify payment
- `GET /api/subscription/status` - Check subscription status

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile

### Webhooks
- `POST /api/webhooks/clerk` - Clerk user events
- `POST /api/webhooks/razorpay` - Razorpay payment events

## 🚢 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Update Webhook URLs

After deployment, update webhook URLs in:
- Clerk Dashboard
- Razorpay Dashboard

Replace `http://localhost:3000` with your production URL in environment variables.

## 🐛 Troubleshooting

**TypeScript Errors**: The compile errors you see are due to missing `node_modules`. Run `npm install` to install all dependencies.

**Clerk Authentication Issues**: Ensure all Clerk environment variables are correctly set.

**Supabase Connection**: Verify Supabase URL and keys are correct. Check RLS policies if data access fails.

**Razorpay Payments**: Test in Razorpay test mode first. Ensure webhook signature verification is working.

**File Upload Fails**: Check Supabase Storage bucket exists and RLS policies allow user uploads.

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

---

Built with ❤️ using Next.js, Clerk, Supabase, and Razorpay
