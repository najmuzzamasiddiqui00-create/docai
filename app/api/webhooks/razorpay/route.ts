import { headers } from 'next/headers';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { supabaseAdmin } from '@/lib/supabase';
import { RazorpayWebhookEvent } from '@/types';
import { activateSubscription } from '@/lib/credits';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headerPayload = headers();
    const signature = headerPayload.get('x-razorpay-signature');

    if (!signature) {
      return new Response('No signature provided', { status: 400 });
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(body, signature);

    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }

    const event: RazorpayWebhookEvent = JSON.parse(body);

    // Handle different event types
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event);
        break;

      case 'subscription.activated':
        await handleSubscriptionActivated(event);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(event);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event);
        break;

      case 'subscription.completed':
        await handleSubscriptionCompleted(event);
        break;

      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    return new Response('Webhook processed', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook error', { status: 500 });
  }
}

async function handlePaymentCaptured(event: RazorpayWebhookEvent) {
  const payment = event.payload.payment.entity;

  // Find subscription by order_id
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('razorpay_order_id', payment.order_id)
    .single();

  if (subscription) {
    // Update subscription status in subscriptions table
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      })
      .eq('id', subscription.id);

    // ===== ACTIVATE SUBSCRIPTION IN USER PROFILE =====
    // This gives user unlimited access and bypasses credit limits
    try {
      await activateSubscription(subscription.user_id, subscription.plan as 'pro' | 'premium');
      console.log(`✅ Subscription activated for user ${subscription.user_id} - unlimited access granted`);
    } catch (error) {
      console.error('❌ Failed to activate subscription in user profile:', error);
    }
    // ===== END SUBSCRIPTION ACTIVATION =====
  }
}

async function handlePaymentFailed(event: RazorpayWebhookEvent) {
  const payment = event.payload.payment.entity;

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('razorpay_order_id', payment.order_id)
    .single();

  if (subscription) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'inactive' })
      .eq('id', subscription.id);
  }
}

async function handleSubscriptionActivated(event: RazorpayWebhookEvent) {
  const subscription = event.payload.subscription?.entity;

  if (subscription) {
    // Update subscription in database
    const { data: subData } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'active',
        razorpay_subscription_id: subscription.id,
      })
      .eq('razorpay_subscription_id', subscription.id)
      .select('user_id, plan')
      .single();

    // ===== ACTIVATE SUBSCRIPTION IN USER PROFILE =====
    if (subData) {
      try {
        await activateSubscription(subData.user_id, subData.plan as 'pro' | 'premium');
        console.log(`✅ Recurring subscription activated for user ${subData.user_id}`);
      } catch (error) {
        console.error('❌ Failed to activate recurring subscription:', error);
      }
    }
    // ===== END SUBSCRIPTION ACTIVATION =====
  }
}

async function handleSubscriptionCharged(event: RazorpayWebhookEvent) {
  // Extend subscription period on successful charge
  const subscription = event.payload.subscription?.entity;

  if (subscription) {
    await supabaseAdmin
      .from('subscriptions')
      .update({
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('razorpay_subscription_id', subscription.id);
  }
}

async function handleSubscriptionCancelled(event: RazorpayWebhookEvent) {
  const subscription = event.payload.subscription?.entity;

  if (subscription) {
    // Update subscription status
    const { data: subData } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('razorpay_subscription_id', subscription.id)
      .select('user_id')
      .single();

    // ===== DEACTIVATE USER SUBSCRIPTION =====
    if (subData) {
      try {
        await supabaseAdmin
          .from('user_profiles')
          .update({
            subscription_status: 'cancelled',
            plan: 'free', // Revert to free plan
            updated_at: new Date().toISOString(),
          })
          .eq('clerk_user_id', subData.user_id);
        console.log(`✅ Subscription cancelled for user ${subData.user_id} - reverted to free plan`);
      } catch (error) {
        console.error('❌ Failed to update user profile on cancellation:', error);
      }
    }
    // ===== END SUBSCRIPTION DEACTIVATION =====
  }
}

async function handleSubscriptionCompleted(event: RazorpayWebhookEvent) {
  const subscription = event.payload.subscription?.entity;

  if (subscription) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('razorpay_subscription_id', subscription.id);
  }
}
