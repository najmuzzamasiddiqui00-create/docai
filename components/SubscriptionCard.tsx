'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SubscriptionData {
  isActive: boolean;
  plan: 'free' | 'pro' | 'premium';
  creditsRemaining?: number;
  nextBillingDate?: string;
  status?: string;
}

export default function SubscriptionCard() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/status', {
        credentials: 'include',
      });
      const data = await response.json();
      setSubscription(data);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6">
        <p className="text-red-600">Failed to load subscription data</p>
      </div>
    );
  }

  const isPaid = subscription.isActive && subscription.plan !== 'free';
  const isFree = subscription.plan === 'free';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className={`p-6 ${isPaid ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-gradient-to-r from-gray-700 to-gray-900'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium mb-1">Current Plan</p>
            <h3 className="text-white text-2xl font-bold capitalize">
              {subscription.plan} {isPaid && '✨'}
            </h3>
          </div>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            isPaid ? 'bg-white/20' : 'bg-white/10'
          }`}>
            <span className="text-3xl">{isPaid ? '👑' : '🆓'}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Credits / Status */}
        {isFree && (
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-xl">🎫</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Credits Remaining</p>
                <p className="text-2xl font-bold text-gray-900">
                  {subscription.creditsRemaining ?? 0} / 5
                </p>
              </div>
            </div>
            {subscription.creditsRemaining === 0 && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full"
              >
                EXHAUSTED
              </motion.div>
            )}
          </div>
        )}

        {isPaid && (
          <>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-xl">✓</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className="text-lg font-bold text-green-700">Unlimited Access</p>
                </div>
              </div>
            </div>

            {subscription.nextBillingDate && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Next Billing Date</p>
                <p className="text-base font-semibold text-gray-900">
                  {new Date(subscription.nextBillingDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
          </>
        )}

        {/* Plan Benefits */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            {isPaid ? 'Your Benefits:' : 'Free Plan Includes:'}
          </p>
          {isFree ? (
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>5 free document uploads</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>AI-powered text extraction</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Basic document analysis</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-gray-400">✗</span>
                <span className="text-gray-400">Unlimited uploads</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-gray-400">✗</span>
                <span className="text-gray-400">Priority support</span>
              </li>
            </ul>
          ) : (
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span className="font-medium">Unlimited document uploads</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span className="font-medium">Advanced AI processing</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span className="font-medium">Priority support</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span className="font-medium">No credit limits</span>
              </li>
              {subscription.plan === 'premium' && (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span className="font-medium">Batch processing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span className="font-medium">API access</span>
                  </li>
                </>
              )}
            </ul>
          )}
        </div>

        {/* Warning for low credits */}
        {isFree && subscription.creditsRemaining !== undefined && subscription.creditsRemaining <= 2 && subscription.creditsRemaining > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-yellow-900 mb-1">
                  Running low on credits!
                </p>
                <p className="text-xs text-yellow-700">
                  You have {subscription.creditsRemaining} {subscription.creditsRemaining === 1 ? 'upload' : 'uploads'} remaining. Upgrade to continue.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          {isFree ? (
            <>
              {subscription.creditsRemaining === 0 ? (
                <Link
                  href="/dashboard/subscription"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl font-bold text-center hover:shadow-lg transform hover:scale-105 transition-all"
                >
                  🚀 Upgrade Now
                </Link>
              ) : (
                <Link
                  href="/dashboard/subscription"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl font-bold text-center hover:shadow-lg transform hover:scale-105 transition-all"
                >
                  ✨ View Plans
                </Link>
              )}
            </>
          ) : (
            <Link
              href="/dashboard/subscription"
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold text-center hover:bg-gray-200 transition-colors"
            >
              ⚙️ Manage Subscription
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}
