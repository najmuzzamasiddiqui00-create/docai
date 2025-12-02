import { getSupabaseAdminClient, isBuildPhase } from './runtime';

// Credit system constants
export const FREE_CREDIT_LIMIT = 5;

export interface UserCredits {
  clerk_user_id: string;
  free_credits_used: number;
  plan: 'free' | 'pro' | 'premium';
  subscription_status: 'inactive' | 'active' | 'cancelled' | 'expired';
}

export interface CreditCheckResult {
  allowed: boolean;
  reason?: string;
  creditsRemaining?: number;
  requiresSubscription?: boolean;
}

/**
 * Server-side credit check - CANNOT BE BYPASSED FROM FRONTEND
 * 
 * Rules:
 * - Active paid subscription: Always allowed
 * - Free plan with credits < 5: Allowed
 * - Free plan with credits >= 5: Blocked - must subscribe
 */
export async function checkUserCredits(clerkUserId: string): Promise<CreditCheckResult> {
  // Build phase guard
  if (isBuildPhase()) {
    return { allowed: true, creditsRemaining: FREE_CREDIT_LIMIT, requiresSubscription: false };
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    // Fetch user profile from database (server-side only)
    const { data: user, error } = await supabaseAdmin
      .from('user_profiles')
      .select('clerk_user_id, free_credits_used, plan, subscription_status')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (error || !user) {
      console.error('❌ Failed to fetch user credits:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      
      // If user doesn't exist, create profile with defaults
      if (error?.code === 'PGRST116') { // Not found
        console.log(`📝 Creating new user profile for ${clerkUserId}...`);
        try {
          await createUserProfile(clerkUserId);
          console.log(`✅ User profile created successfully`);
          return {
            allowed: true,
            creditsRemaining: FREE_CREDIT_LIMIT,
            requiresSubscription: false,
          };
        } catch (createError: any) {
          console.error('❌ Failed to create user profile:', createError);
          console.error('Create error details:', createError.message);
          // Allow upload even if profile creation fails
          return {
            allowed: true,
            creditsRemaining: FREE_CREDIT_LIMIT,
            requiresSubscription: false,
          };
        }
      }
      throw new Error(`Failed to fetch user profile: ${error?.message || 'Unknown error'}`);
    }

    // Rule 1: Active paid subscription always has access
    if (user.subscription_status === 'active' && user.plan !== 'free') {
      console.log(`✅ User ${clerkUserId} has active ${user.plan} subscription - unlimited access`);
      return {
        allowed: true,
        creditsRemaining: -1, // Unlimited
        requiresSubscription: false,
      };
    }

    // Rule 2: Free plan with credits remaining
    if (user.plan === 'free' && user.free_credits_used < FREE_CREDIT_LIMIT) {
      const remaining = FREE_CREDIT_LIMIT - user.free_credits_used;
      console.log(`✅ User ${clerkUserId} has ${remaining} free credits remaining`);
      return {
        allowed: true,
        creditsRemaining: remaining,
        requiresSubscription: false,
      };
    }

    // Rule 3: Free plan with no credits left
    console.log(`❌ User ${clerkUserId} has exhausted all ${FREE_CREDIT_LIMIT} free credits`);
    return {
      allowed: false,
      reason: `You have used your ${FREE_CREDIT_LIMIT} free credits. Please subscribe to continue.`,
      creditsRemaining: 0,
      requiresSubscription: true,
    };

  } catch (error: any) {
    console.error('❌ Credit check error:', error);
    throw error;
  }
}

/**
 * Increment credit usage counter - SERVER-SIDE ONLY
 * This is called AFTER successful document upload/processing
 */
export async function incrementCreditUsage(clerkUserId: string): Promise<void> {
  // Build phase guard
  if (isBuildPhase()) {
    return;
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    // Fetch current user data
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('free_credits_used, plan, subscription_status')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (fetchError || !user) {
      console.error('❌ Failed to fetch user for credit increment:', fetchError);
      throw new Error('Failed to fetch user profile');
    }

    // Only increment for free users (paid users have unlimited)
    if (user.plan === 'free' && user.subscription_status !== 'active') {
      const newCount = user.free_credits_used + 1;
      
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({ 
          free_credits_used: newCount,
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_user_id', clerkUserId);

      if (updateError) {
        console.error('❌ Failed to increment credit usage:', updateError);
        throw new Error('Failed to update credit usage');
      }

      const remaining = FREE_CREDIT_LIMIT - newCount;
      console.log(`📊 Credit used. User ${clerkUserId} has ${remaining} credits remaining (${newCount}/${FREE_CREDIT_LIMIT} used)`);
    } else {
      console.log(`📊 User ${clerkUserId} has unlimited credits (${user.plan} plan)`);
    }

  } catch (error: any) {
    console.error('❌ Credit increment error:', error);
    throw error;
  }
}

/**
 * Create user profile with default credit values
 */
export async function createUserProfile(
  clerkUserId: string, 
  email?: string, 
  fullName?: string
): Promise<void> {
  // Build phase guard
  if (isBuildPhase()) {
    return;
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        clerk_user_id: clerkUserId,
        user_id: clerkUserId, // Fix: Also set user_id to satisfy NOT NULL constraint
        email: email || '',
        full_name: fullName || '',
        free_credits_used: 0,
        plan: 'free',
        subscription_status: 'inactive',
      });

    if (error && error.code !== '23505') { // Ignore duplicate key error
      console.error('❌ Failed to create user profile:', error);
      throw new Error('Failed to create user profile');
    }

    console.log(`✅ Created user profile for ${clerkUserId} with ${FREE_CREDIT_LIMIT} free credits`);
  } catch (error: any) {
    console.error('❌ User profile creation error:', error);
    throw error;
  }
}

/**
 * Update user subscription status - Called after successful payment
 */
export async function activateSubscription(
  clerkUserId: string, 
  plan: 'pro' | 'premium'
): Promise<void> {
  // Build phase guard
  if (isBuildPhase()) {
    return;
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        plan: plan,
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('clerk_user_id', clerkUserId);

    if (error) {
      console.error('❌ Failed to activate subscription:', error);
      throw new Error('Failed to activate subscription');
    }

    console.log(`✅ Activated ${plan} subscription for user ${clerkUserId}`);
  } catch (error: any) {
    console.error('❌ Subscription activation error:', error);
    throw error;
  }
}

/**
 * Get user credit status for display
 */
export async function getUserCreditStatus(clerkUserId: string) {
  // Build phase guard
  if (isBuildPhase()) {
    return {
      creditsUsed: 0,
      creditsRemaining: FREE_CREDIT_LIMIT,
      plan: 'free',
      hasUnlimitedAccess: false,
    };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('free_credits_used, plan, subscription_status')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (error || !user) {
      return {
        creditsUsed: 0,
        creditsRemaining: FREE_CREDIT_LIMIT,
        plan: 'free',
        hasUnlimitedAccess: false,
      };
    }

    const hasUnlimitedAccess = user.subscription_status === 'active' && user.plan !== 'free';
    const creditsRemaining = hasUnlimitedAccess 
      ? -1 
      : Math.max(0, FREE_CREDIT_LIMIT - user.free_credits_used);

    return {
      creditsUsed: user.free_credits_used,
      creditsRemaining,
      plan: user.plan,
      hasUnlimitedAccess,
    };
  } catch (error: any) {
    console.error('❌ Get credit status error:', error);
    throw error;
  }
}
