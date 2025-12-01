# Architecture Overview

This document explains how the entire system works together.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER BROWSER                         │
├─────────────────────────────────────────────────────────────┤
│  Landing Page → Sign Up/Sign In → Dashboard → Upload Files  │
└────────────┬────────────────────────────────────────────────┘
             │
             │ Authenticated Requests
             ↓
┌─────────────────────────────────────────────────────────────┐
│                    CLERK AUTHENTICATION                      │
├─────────────────────────────────────────────────────────────┤
│  • Handles all login/signup                                  │
│  • Issues JWT tokens                                         │
│  • Provides user ID in requests                              │
│  • Sends webhooks on user events                             │
└────────────┬────────────────────────────────────────────────┘
             │
             │ Protected API Calls
             ↓
┌─────────────────────────────────────────────────────────────┐
│                   NEXT.JS API ROUTES                         │
├─────────────────────────────────────────────────────────────┤
│  /api/webhooks/clerk     → Sync users to Supabase           │
│  /api/webhooks/razorpay  → Handle payment events            │
│  /api/user/profile       → Get/update user info             │
│  /api/documents/upload   → Upload file to storage            │
│  /api/documents/process  → Extract text & summarize          │
│  /api/documents/list     → Get user's documents              │
│  /api/subscription/*     → Handle payments                   │
└────────────┬────────────────────────────────────────────────┘
             │
       ┌─────┴──────┐
       │            │
       ↓            ↓
┌─────────────┐   ┌──────────────────────────────────────┐
│  SUPABASE   │   │          RAZORPAY                     │
│             │   │                                       │
│  Database:  │   │  • Create orders                      │
│  ─────────  │   │  • Process payments                   │
│  • users    │   │  • Send webhooks                      │
│  • docs     │   │  • Manage subscriptions               │
│  • subs     │   │                                       │
│  • results  │   └───────────────────────────────────────┘
│             │
│  Storage:   │   ┌──────────────────────────────────────┐
│  ─────────  │   │          OPENAI API                   │
│  • PDF      │   │                                       │
│  • DOCX     │   │  • Extract text from documents        │
│  • TXT      │   │  • Generate summaries                 │
└─────────────┘   │  • Analyze content                    │
                  └──────────────────────────────────────┘
```

## Authentication Flow

### 1. User Sign Up
```
User → Clerk Sign Up Page
        ↓
Clerk Creates User
        ↓
Clerk Sends Webhook → /api/webhooks/clerk
        ↓
API Creates User Profile in Supabase
        ↓
API Creates Free Subscription in Supabase
        ↓
User Redirected to Dashboard
```

### 2. User Sign In
```
User → Clerk Sign In Page
        ↓
Clerk Authenticates User
        ↓
Clerk Issues JWT Token
        ↓
User Redirected to Dashboard
        ↓
Dashboard Loads (Protected by Clerk Middleware)
```

## Document Upload & Processing Flow

### 1. Upload
```
User Selects File in Dashboard
        ↓
Frontend Sends to /api/documents/upload
        ↓
API Checks:
  • User is authenticated (Clerk)
  • User hasn't exceeded upload limit (based on plan)
  • File size < 10MB
  • File type is PDF/DOCX/TXT
        ↓
API Uploads File to Supabase Storage
        ↓
API Creates Document Record in Database
        ↓
API Returns Success to Frontend
```

### 2. Processing (Background)
```
Upload API Triggers → /api/documents/process
        ↓
API Downloads File from Supabase Storage
        ↓
API Extracts Text:
  • PDF → pdf-parse library
  • DOCX → mammoth library
  • TXT → direct read
        ↓
API Sends Text to OpenAI
        ↓
OpenAI Returns Summary
        ↓
API Analyzes Document (word count, etc.)
        ↓
API Saves Results to processed_results Table
        ↓
API Updates Document Status to "completed"
```

### 3. Display
```
Dashboard Loads
        ↓
Frontend Calls /api/documents/list
        ↓
API Queries Supabase (filtered by user_id)
        ↓
API Returns Documents with Results
        ↓
Dashboard Displays:
  • Filename
  • Upload date
  • Processing status
  • Summary
  • Word count
```

## Subscription & Payment Flow

### 1. User Wants to Subscribe
```
User Clicks "Subscribe" on Dashboard
        ↓
Frontend Calls /api/subscription/create-order
        ↓
API Creates Razorpay Order
        ↓
API Creates/Updates Subscription Record (status: inactive)
        ↓
API Returns Order Details to Frontend
        ↓
Frontend Opens Razorpay Checkout Modal
```

### 2. User Completes Payment
```
User Enters Card Details in Razorpay Modal
        ↓
Razorpay Processes Payment
        ↓
Razorpay Returns Payment Details to Frontend
        ↓
Frontend Calls /api/subscription/verify-payment
        ↓
API Verifies Razorpay Signature
        ↓
API Updates Subscription:
  • status: active
  • start_date: now
  • end_date: now + 30 days
        ↓
User Can Now Access Premium Features
```

### 3. Razorpay Webhook (Async)
```
Razorpay Sends Webhook → /api/webhooks/razorpay
        ↓
API Verifies Webhook Signature
        ↓
API Handles Events:
  • payment.captured → Activate subscription
  • payment.failed → Mark inactive
  • subscription.cancelled → Update status
        ↓
Database Updated
```

## Data Security (Row Level Security)

### How RLS Works

Every Supabase query is filtered by the user who owns the data:

```sql
-- Example: User tries to get their documents
SELECT * FROM documents WHERE user_id = current_user_id;

-- RLS Policy ensures they can ONLY see their own data:
CREATE POLICY "Users see own docs"
ON documents FOR SELECT
USING (user_id = current_setting('app.current_user_id', true));
```

### Protection Layers

1. **Clerk Middleware**: Protects routes, only authenticated users access protected pages
2. **API Auth Check**: Every API route verifies `auth().userId` from Clerk
3. **RLS Policies**: Database-level security ensures data isolation
4. **Service Role Key**: Only backend uses admin key, frontend uses anon key

## Key Design Decisions

### Why No n8n or External Workflows?

**Previous Problem**: External workflow engines add complexity:
- Extra service to maintain
- Potential single point of failure
- Network latency between services
- Harder to debug
- Additional costs

**Our Solution**: Everything in Next.js API routes
- Single codebase
- Easy to debug
- Fast (no external network calls)
- Simple deployment
- Better error handling

### Why Clerk Instead of Supabase Auth?

**Clerk Benefits**:
- Better UI/UX out of the box
- Social logins ready
- Webhooks for user events
- Better session management
- Easier to customize

**Supabase Role**: Pure data layer
- Store user profiles
- Store documents and results
- File storage
- RLS for data security

### Why Razorpay Webhooks?

**Reliability**: Webhooks ensure payment state is synced even if user closes browser

**Security**: Backend verifies signatures to prevent fake payment confirmations

**Async**: Don't block user experience waiting for payment confirmation

## Subscription Logic

### Upload Limits by Plan

```typescript
const limits = {
  free: 5,      // 5 uploads per month
  pro: 50,      // 50 uploads per month
  premium: -1,  // Unlimited
};
```

### Checking Before Upload

```typescript
// 1. Get user's plan from subscription table
const subscription = await checkSubscriptionStatus(userId);

// 2. Count uploads this month
const uploadCount = await countUserUploads(userId, startOfMonth);

// 3. Check limit
if (uploadCount >= limit) {
  return error("Upload limit reached");
}

// 4. Allow upload
```

### Expiration Handling

```typescript
// Every time subscription is checked:
if (subscription.end_date < now()) {
  // Mark as expired
  await updateSubscription({ status: 'expired' });
  
  // User reverts to free plan
  return { plan: 'free', isActive: false };
}
```

## Error Handling

### API Routes
- Try/catch blocks on all routes
- Specific error messages for users
- Console logging for debugging
- Appropriate HTTP status codes

### Frontend
- Loading states while uploading/processing
- Success/error messages displayed to user
- Retry mechanisms for failed operations

### Background Processing
- Failed processing marked in database
- User can see "failed" status
- Can delete and re-upload

## Scalability Considerations

### Current Design Supports:
- Thousands of users (Clerk scales automatically)
- Large file storage (Supabase storage scales)
- Database queries optimized with indexes
- RLS policies don't impact performance significantly

### Future Improvements:
- Queue system for processing (Bull, Inngest)
- Caching layer (Redis) for subscription checks
- CDN for file downloads
- Webhook retry logic
- Rate limiting on API routes

## Deployment Checklist

- [ ] Environment variables set in hosting platform
- [ ] Clerk webhook URL updated to production domain
- [ ] Razorpay webhook URL updated to production domain
- [ ] Razorpay switched to live mode with live keys
- [ ] Supabase RLS policies verified
- [ ] OpenAI API key has sufficient credits
- [ ] Domain configured with SSL
- [ ] Database backups enabled in Supabase
- [ ] Error monitoring setup (Sentry, LogRocket, etc.)
- [ ] Analytics setup (Google Analytics, Mixpanel, etc.)

---

This architecture is stable, maintainable, and ready for production use!
