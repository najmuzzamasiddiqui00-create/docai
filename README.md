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
```

2. **Configure environment variables**:

Copy `.env.local` and fill in your credentials:

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

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
WEBHOOK_SECRET=your-webhook-secret
```

3. **Set up Supabase Database**:

Run the SQL scripts in your Supabase SQL Editor:

a. First, run `supabase-schema.sql` to create tables and RLS policies
b. Then, run `supabase-storage.sql` to set up the storage bucket

4. **Configure Clerk Webhooks**:

- Go to Clerk Dashboard → Webhooks
- Create a new endpoint: `https://your-domain.com/api/webhooks/clerk`
- Subscribe to events: `user.created`, `user.updated`, `user.deleted`
- Copy the signing secret to `WEBHOOK_SECRET` in `.env.local`

5. **Configure Razorpay Webhooks**:

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

- **Row Level Security (RLS)**: All Supabase tables have RLS policies ensuring users can only access their own data
- **Authentication**: Clerk handles all authentication securely
- **API Protection**: All API routes verify user identity via Clerk
- **Webhook Verification**: Razorpay webhooks are signature-verified
- **File Validation**: Upload size (10MB) and type restrictions enforced

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

### Premium Plan (₹999/month)
- Unlimited uploads
- Advanced document analysis
- Instant processing
- Priority support
- API access

## 🔄 How It Works

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
