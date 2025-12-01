import Razorpay from 'razorpay';
import crypto from 'crypto';

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('Razorpay credentials are not configured. Please check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment variables.');
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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
