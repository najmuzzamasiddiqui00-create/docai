import { auth } from '@clerk/nextjs/server';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    // Verify payment signature
    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return Response.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Update subscription status
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .single();

    if (!subscription) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Activate subscription
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      })
      .eq('id', subscription.id);

    return Response.json({
      success: true,
      message: 'Payment verified successfully',
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return Response.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}
