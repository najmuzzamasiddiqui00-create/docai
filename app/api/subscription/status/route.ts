import { auth } from '@clerk/nextjs/server';
import { checkSubscriptionStatus } from '@/lib/subscription';

export async function GET() {
  try {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return Response.json({ message: 'Skip during build' });
    }

    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await checkSubscriptionStatus(userId);

    return Response.json(status);
  } catch (error) {
    console.error('Error checking subscription:', error);
    return Response.json({ error: 'Failed to check subscription' }, { status: 500 });
  }
}
