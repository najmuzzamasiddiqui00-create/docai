import Razorpay from 'razorpay';
import crypto from 'crypto';

// Razorpay client - created at runtime only, not during build
let razorpayInstance: Razorpay | null = null;

/**
 * Get Razorpay client instance (runtime only)
 * Uses singleton pattern for efficiency
 */
export function getRazorpay(): Razorpay {
  // Skip during build phase
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('Razorpay client not available during build');
  }

  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials are not configured. Please check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment variables.');
    }

    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  return razorpayInstance;
}

// Legacy export for backwards compatibility - DO NOT USE at module level
// Use getRazorpay() instead
export const razorpay = null as unknown as Razorpay;

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const text = `${orderId}|${paymentId}`;
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(text)
    .digest('hex');

  return generatedSignature === signature;
}

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex');

  return expectedSignature === signature;
}
