import { auth } from '@clerk/nextjs/server';
import { getUserCreditStatus } from '@/lib/credits';
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

    const creditStatus = await getUserCreditStatus(userId);

    return Response.json(creditStatus);
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Credit status error:', error);
    }
    return Response.json(
      { error: 'Failed to fetch credit status' },
      { status: 500 }
    );
  }
}
