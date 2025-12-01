import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();

    if (error || !profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get subscription
    const { data: subscription } = await supabaseAdmin
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
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { full_name } = body;

    const { data, error } = await supabaseAdmin
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
