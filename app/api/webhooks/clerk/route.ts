import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { getSupabaseAdminClient, isBuildPhase } from '@/lib/runtime';

export async function POST(req: Request) {
  // Build phase guard
  if (isBuildPhase()) {
    return new Response('Skip during build', { status: 200 });
  }

  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('WEBHOOK_SECRET not configured');
    return new Response('Webhook secret missing', { status: 500 });
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400,
    });
  }

  const eventType = evt.type;
  const supabase = getSupabaseAdminClient();

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;

    // Create user profile in Supabase
    const { error } = await supabase.from('user_profiles').insert({
      clerk_user_id: id,
      email: email_addresses[0].email_address,
      full_name: `${first_name || ''} ${last_name || ''}`.trim() || null,
    });

    if (error) {
      console.error('Error creating user profile:', error);
      return new Response('Error creating user profile', { status: 500 });
    }

    // Create default free subscription
    await supabase.from('subscriptions').insert({
      user_id: id,
      plan: 'free',
      status: 'active',
    });
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data;

    await supabase
      .from('user_profiles')
      .update({
        email: email_addresses[0].email_address,
        full_name: `${first_name || ''} ${last_name || ''}`.trim() || null,
      })
      .eq('clerk_user_id', id);
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    // Delete user profile (cascade will handle related data)
    await supabase.from('user_profiles').delete().eq('clerk_user_id', id);
  }

  return new Response('', { status: 200 });
}
