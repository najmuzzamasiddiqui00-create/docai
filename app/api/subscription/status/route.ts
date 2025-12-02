import { auth } from '@clerk/nextjs/server';
import { checkSubscriptionStatus } from '@/lib/subscription';
import { isBuildPhase, handleRuntimeError } from '@/lib/runtime';

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

    const status = await checkSubscriptionStatus(userId);

    return Response.json(status);
  } catch (error: any) {
    console.error('Error checking subscription:', error);
    return handleRuntimeError(error);
  }
}
