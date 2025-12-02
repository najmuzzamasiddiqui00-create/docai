import { auth } from '@clerk/nextjs/server';
import { getRazorpay } from '@/lib/razorpay';
import { createAdminClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return Response.json({ message: 'Skip during build' });
    }

    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { plan } = body;

    // Define plan configurations
    const planConfigs = {
      pro: {
        amount: 49900, // ₹499
        name: 'Pro Plan',
        description: 'Unlimited uploads, Advanced AI processing, Priority support',
      },
      premium: {
        amount: 99900, // ₹999
        name: 'Premium Plan',
        description: 'Everything in Pro + Batch processing, API access, Premium support',
      },
    };

    if (!plan || !['pro', 'premium'].includes(plan)) {
      return Response.json({ error: 'Invalid plan. Choose "pro" or "premium"' }, { status: 400 });
    }

    const selectedPlan = planConfigs[plan as keyof typeof planConfigs];

    // Validate Razorpay configuration
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay credentials missing in environment variables');
      return Response.json({ error: 'Payment system not configured' }, { status: 500 });
    }

    console.log(`Creating Razorpay order for user: ${userId}, plan: ${plan} (${selectedPlan.name})`);

    // Generate short receipt ID (max 40 chars for Razorpay)
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits
    const userIdShort = userId.slice(-10); // Last 10 chars of userId
    const receipt = `ord_${userIdShort}_${timestamp}`; // Format: ord_{userId}_{timestamp}
    
    console.log('Generated receipt:', receipt, 'Length:', receipt.length);

    // Create Razorpay order with proper error handling
    let order;
    try {
      const razorpay = getRazorpay();
      order = await razorpay.orders.create({
        amount: selectedPlan.amount,
        currency: 'INR',
        receipt: receipt,
        notes: {
          user_id: userId,
          plan: plan,
          plan_name: selectedPlan.name,
        },
      });
      console.log('Razorpay order created successfully:', order.id);
    } catch (razorpayError: any) {
      console.error('Razorpay order creation failed:', {
        error: razorpayError.message,
        statusCode: razorpayError.statusCode,
        description: razorpayError.error?.description,
      });
      return Response.json(
        { 
          error: 'Failed to create payment order',
          details: razorpayError.error?.description || razorpayError.message,
        },
        { status: 500 }
      );
    }

    const supabase = createAdminClient();
    // Create or update subscription in database
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingSubscription) {
      await supabase
        .from('subscriptions')
        .update({
          plan: plan,
          razorpay_order_id: order.id,
          status: 'inactive', // Will be activated on payment
        })
        .eq('user_id', userId);
    } else {
      await supabase.from('subscriptions').insert({
        user_id: userId,
        plan: plan,
        razorpay_order_id: order.id,
        status: 'inactive',
      });
    }

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      console.error('NEXT_PUBLIC_RAZORPAY_KEY_ID is not set');
      return Response.json({ error: 'Payment configuration error' }, { status: 500 });
    }

    return Response.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error('Unexpected error in create-order route:', {
      message: error.message,
      stack: error.stack,
    });
    return Response.json(
      { 
        error: 'Failed to create order',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
