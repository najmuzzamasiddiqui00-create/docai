/**
 * Razorpay Client Wrappers
 * 
 * Re-exports runtime-safe Razorpay client from /lib/runtime.ts
 * ZERO top-level initialization - all clients created at request time.
 */

import crypto from 'crypto';
export { getRazorpayClient as getRazorpay, getRazorpayClient, isBuildPhase } from './runtime';

// Legacy null export for backward compatibility - DO NOT USE
export const razorpay = null;

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new Error('RAZORPAY_KEY_SECRET not configured');
  }

  const text = `${orderId}|${paymentId}`;
  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(text)
    .digest('hex');

  return generatedSignature === signature;
}

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('WEBHOOK_SECRET not configured');
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  return expectedSignature === signature;
}
