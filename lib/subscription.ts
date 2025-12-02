import { auth } from '@clerk/nextjs/server';
import { getAdminClient, isBuildPhase } from './supabase';
import { Subscription } from '@/types';

export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  // Build phase guard
  if (isBuildPhase()) {
    return null;
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return null;
  }

  return data as Subscription;
}

export async function checkSubscriptionStatus(userId: string): Promise<{
  isActive: boolean;
  plan: string;
  subscription: Subscription | null;
}> {
  const subscription = await getUserSubscription(userId);

  if (!subscription) {
    return {
      isActive: false,
      plan: 'free',
      subscription: null,
    };
  }

  // Check if subscription is expired
  if (subscription.end_date && new Date(subscription.end_date) < new Date()) {
    // Update subscription status to expired
    const supabase = getAdminClient();
    await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('id', subscription.id);

    return {
      isActive: false,
      plan: 'free',
      subscription: null,
    };
  }

  return {
    isActive: true,
    plan: subscription.plan,
    subscription,
  };
}

export async function requireSubscription(minPlan: 'free' | 'pro' | 'premium' = 'pro') {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  const { isActive, plan } = await checkSubscriptionStatus(userId);

  const planHierarchy = { free: 0, pro: 1, premium: 2 };

  if (planHierarchy[plan as keyof typeof planHierarchy] < planHierarchy[minPlan]) {
    throw new Error('Subscription required');
  }

  return { userId, plan, isActive };
}
