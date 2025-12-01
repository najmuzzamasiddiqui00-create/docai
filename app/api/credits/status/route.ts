import { auth } from '@clerk/nextjs/server';
import { getUserCreditStatus } from '@/lib/credits';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creditStatus = await getUserCreditStatus(userId);

    return Response.json(creditStatus);
  } catch (error: any) {
    console.error('Credit status error:', error);
    return Response.json(
      { error: 'Failed to fetch credit status' },
      { status: 500 }
    );
  }
}
