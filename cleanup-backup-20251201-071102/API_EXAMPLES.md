# API Usage Examples

This document shows how to interact with the API routes programmatically.

## Authentication

All protected endpoints require a valid Clerk session. When using the API from the frontend, Clerk automatically includes the session token.

For external API calls, you need to include the Clerk session token in the Authorization header:

```typescript
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
  },
});
```

## User Profile

### Get User Profile

```typescript
const getProfile = async () => {
  const response = await fetch('/api/user/profile');
  const data = await response.json();
  
  return data;
  // Returns: { profile: {...}, subscription: {...} }
};
```

### Update User Profile

```typescript
const updateProfile = async (fullName: string) => {
  const response = await fetch('/api/user/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      full_name: fullName,
    }),
  });
  
  const data = await response.json();
  return data;
};
```

## Document Management

### Upload Document

```typescript
const uploadDocument = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  const data = await response.json();
  return data.document;
};

// Usage
const file = document.getElementById('file-input').files[0];
try {
  const document = await uploadDocument(file);
  console.log('Uploaded:', document);
} catch (error) {
  console.error('Upload failed:', error.message);
}
```

### List All Documents

```typescript
const listDocuments = async () => {
  const response = await fetch('/api/documents/list');
  const data = await response.json();
  
  return data.documents;
};

// Usage
const documents = await listDocuments();
documents.forEach(doc => {
  console.log(`${doc.filename} - ${doc.status}`);
  if (doc.processed_results[0]) {
    console.log('Summary:', doc.processed_results[0].summary);
  }
});
```

### Get Single Document

```typescript
const getDocument = async (documentId: string) => {
  const response = await fetch(`/api/documents/${documentId}`);
  
  if (!response.ok) {
    throw new Error('Document not found');
  }
  
  const data = await response.json();
  return data.document;
};

// Usage
const doc = await getDocument('uuid-here');
console.log('Document:', doc);
```

### Delete Document

```typescript
const deleteDocument = async (documentId: string) => {
  const response = await fetch(`/api/documents/${documentId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete document');
  }
  
  const data = await response.json();
  return data.success;
};

// Usage
await deleteDocument('uuid-here');
console.log('Document deleted');
```

## Subscription Management

### Check Subscription Status

```typescript
const checkSubscription = async () => {
  const response = await fetch('/api/subscription/status');
  const data = await response.json();
  
  return data;
  // Returns: { isActive: true, plan: 'pro', subscription: {...} }
};

// Usage
const status = await checkSubscription();
if (status.plan === 'free') {
  console.log('User is on free plan');
} else if (status.plan === 'pro') {
  console.log('User is on pro plan');
}
```

### Create Razorpay Order

```typescript
const createOrder = async (plan: 'pro' | 'premium') => {
  const response = await fetch('/api/subscription/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ plan }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  const data = await response.json();
  return data;
  // Returns: { orderId, amount, currency, keyId }
};
```

### Complete Payment Flow

```typescript
const subscribeToplan = async (plan: 'pro' | 'premium') => {
  try {
    // 1. Create order
    const orderData = await createOrder(plan);
    
    // 2. Initialize Razorpay
    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'DocProcess',
      description: `${plan.toUpperCase()} Plan Subscription`,
      order_id: orderData.orderId,
      handler: async (response: any) => {
        // 3. Verify payment
        const verifyResponse = await fetch('/api/subscription/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });
        
        const verifyData = await verifyResponse.json();
        
        if (verifyResponse.ok) {
          alert('Payment successful!');
          window.location.reload();
        } else {
          alert('Payment verification failed');
        }
      },
      prefill: {
        email: 'user@example.com',
      },
      theme: {
        color: '#4F46E5',
      },
    };
    
    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();
  } catch (error: any) {
    console.error('Subscription error:', error.message);
  }
};

// Usage
await subscribeToplan('pro');
```

## React Component Examples

### Upload Component

```typescript
'use client';

import { useState } from 'react';

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) return;
    
    setUploading(true);
    setMessage('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      
      setMessage('File uploaded successfully!');
      setFile(null);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleUpload}>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        accept=".pdf,.docx,.txt"
      />
      <button type="submit" disabled={uploading || !file}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
```

### Documents List Component

```typescript
'use client';

import { useEffect, useState } from 'react';

interface Document {
  id: string;
  filename: string;
  status: string;
  uploaded_at: string;
  processed_results: Array<{
    summary: string | null;
  }>;
}

export default function DocumentsList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents/list');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Your Documents</h2>
      {documents.length === 0 ? (
        <p>No documents yet</p>
      ) : (
        <ul>
          {documents.map((doc) => (
            <li key={doc.id}>
              <h3>{doc.filename}</h3>
              <p>Status: {doc.status}</p>
              {doc.processed_results[0]?.summary && (
                <p>Summary: {doc.processed_results[0].summary}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Error Handling

### Handling API Errors

```typescript
const apiCall = async () => {
  try {
    const response = await fetch('/api/endpoint');
    
    if (!response.ok) {
      // Parse error response
      const errorData = await response.json();
      
      // Handle specific error codes
      if (response.status === 401) {
        // Redirect to login
        window.location.href = '/sign-in';
      } else if (response.status === 403) {
        // Subscription required
        alert('Please upgrade your plan');
      } else {
        // Generic error
        throw new Error(errorData.error || 'Something went wrong');
      }
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('API Error:', error.message);
    throw error;
  }
};
```

## Webhook Testing

### Test Clerk Webhook Locally

Use ngrok to expose your local server:

```bash
ngrok http 3000
```

Then update Clerk webhook URL to: `https://your-ngrok-url.ngrok.io/api/webhooks/clerk`

### Test Razorpay Webhook

Razorpay provides webhook testing in their dashboard:

1. Go to Webhooks section
2. Click "Test Webhook"
3. Select event type
4. Send test payload

### Manual Webhook Trigger

```bash
# Test Clerk webhook
curl -X POST http://localhost:3000/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -H "svix-id: msg_123" \
  -H "svix-timestamp: 1234567890" \
  -H "svix-signature: your-signature" \
  -d '{"type":"user.created","data":{...}}'

# Test Razorpay webhook
curl -X POST http://localhost:3000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: your-signature" \
  -d '{"event":"payment.captured","payload":{...}}'
```

## Rate Limiting (Future Enhancement)

To add rate limiting, you can use middleware:

```typescript
// lib/rate-limit.ts
import { auth } from '@clerk/nextjs';

const rateLimit = new Map();

export function checkRateLimit(userId: string, limit: number = 10) {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  
  if (!rateLimit.has(userId)) {
    rateLimit.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  const userData = rateLimit.get(userId);
  
  if (now > userData.resetTime) {
    rateLimit.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userData.count >= limit) {
    return false;
  }
  
  userData.count++;
  return true;
}
```

Usage in API route:

```typescript
export async function POST(req: Request) {
  const { userId } = auth();
  
  if (!checkRateLimit(userId, 10)) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  // Process request...
}
```

---

These examples should help you integrate and extend the API!
