'use client';

import { useRouter } from 'next/navigation';

interface SubscriptionBannerProps {
  creditsRemaining: number;
  plan: string;
}

export default function SubscriptionBanner({ creditsRemaining, plan }: SubscriptionBannerProps) {
  const router = useRouter();

  // Don't show banner if user is on a paid plan
  if (plan !== 'free') {
    return null;
  }

  // Show warning when credits are low (1-2 remaining)
  if (creditsRemaining > 0 && creditsRemaining <= 2) {
    return (
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Only {creditsRemaining} {creditsRemaining === 1 ? 'credit' : 'credits'} remaining!
            </h3>
            <p className="text-gray-700 mb-4">
              You're running low on free credits. Upgrade to Pro for unlimited document processing.
            </p>
            <button
              onClick={() => router.push('/dashboard/subscription')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all transform hover:scale-105"
            >
              Upgrade to Pro →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show critical warning when no credits left
  if (creditsRemaining === 0) {
    return (
      <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              Free credits exhausted! 🚀
            </h3>
            <p className="text-gray-700 mb-4">
              You've used all 5 free uploads. Upgrade to Pro to continue processing unlimited documents with advanced AI features.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/dashboard/subscription')}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:shadow-xl transition-all transform hover:scale-105"
              >
                Upgrade Now →
              </button>
              <button
                onClick={() => router.push('/#pricing')}
                className="bg-white text-gray-700 px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 hover:border-indigo-300 transition-colors"
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No banner needed if user has enough credits
  return null;
}
