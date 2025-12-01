// Type definitions for the application

export interface UserProfile {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'pro' | 'premium';
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  razorpay_subscription_id: string | null;
  razorpay_order_id: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  file_url?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  processed_output: ProcessedOutput | null;
  error: string | null;
  error_message?: string | null;
}

export interface ProcessedOutput {
  summary?: string;
  extracted_text?: string;
  keyPoints?: string[];
  keywords?: string[];
  sentiment?: string;
  category?: string;
  wordCount?: number;
  charCount?: number;
  metadata?: Record<string, any>;
}

export interface ProcessedResult {
  id: string;
  document_id: string;
  user_id: string;
  extracted_text: string | null;
  summary: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export type DocumentStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type DocumentSortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'status';

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  created_at: number;
}

export interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        status: string;
        amount: number;
      };
    };
    subscription?: {
      entity: {
        id: string;
        status: string;
        plan_id: string;
      };
    };
  };
}
