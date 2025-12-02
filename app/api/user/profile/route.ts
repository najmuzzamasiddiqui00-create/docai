import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdminClient, isBuildPhase, handleRuntimeError } from '@/lib/runtime';

export async function GET() {
  try {
    // Build phase guard
    if (isBuildPhase()) {
      return Response.json({ message: 'Skip during build' });
    }

    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();

    if (error || !profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    return Response.json({
      profile,
      subscription: subscription || null,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    // Build phase guard
    if (isBuildPhase()) {
      return Response.json({ message: 'Skip during build' });
    }

    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { full_name } = body;

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ full_name })
      .eq('clerk_user_id', userId)
      .select()
      .single();

    if (error) {
      return Response.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    console.error('Error updating profile:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
