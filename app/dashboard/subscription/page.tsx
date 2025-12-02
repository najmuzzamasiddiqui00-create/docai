'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PlanCarousel, { Plan } from '@/components/PlanCarousel';

interface SubscriptionData {
  isActive: boolean;
  plan: string;
  documentsProcessed: number;
  creditsRemaining?: number;
  nextBillingDate?: string;
  status?: string;
}

export default function SubscriptionPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    } else if (isLoaded && user) {
      loadSubscription();
    }
  }, [isLoaded, user, router]);

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

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading subscription...</p>
        </div>
      </div>
    );
  }

  const isPro = subscription?.isActive && subscription?.plan !== 'free';
  const creditsRemaining = subscription?.creditsRemaining ?? 5;
  const documentCount = subscription?.documentsProcessed ?? 0;

  // Plan configurations
  const plans: Plan[] = [
    {
      id: 'pro',
      title: 'Pro Plan',
      price: 499,
      period: 'per month',
      description: 'Perfect for individuals',
      icon: '✨',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      features: [
        'Unlimited uploads',
        'Advanced AI processing',
        'Priority support',
        'Faster processing',
        'No credit limits',
        'Email notifications',
      ],
    },
    {
      id: 'premium',
      title: 'Premium Plan',
      price: 999,
      period: 'per month',
      description: 'Best for power users',
      icon: '🚀',
      badge: 'BEST VALUE',
      recommended: true,
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 50%, #EC4899 100%)',
      features: [
        'Everything in Pro',
        'Batch processing (100+ docs)',
        'API access',
        'Premium support (24/7)',
        'Custom integrations',
        'Advanced analytics',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg"
              >
                <span className="text-white font-bold text-lg">D</span>
              </motion.div>
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                DocAI
              </Link>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-gray-600 hover:text-indigo-600 transition text-sm font-medium">
                Dashboard
              </Link>
              <Link href="/" className="text-gray-600 hover:text-indigo-600 transition text-sm font-medium">
                Home
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </motion.nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Subscription & Billing
          </h1>
          <p className="text-xl text-gray-600">Manage your plan and unlock premium features</p>
        </motion.div>

        {/* Current Status Bar */}
        {subscription && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 mb-12"
          >
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={`px-6 py-3 rounded-2xl font-bold text-lg ${
                    isPro ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {isPro ? (subscription?.plan === 'premium' ? '🚀 PREMIUM' : '✨ PRO') : '🆓 FREE'}
                </motion.div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Current Plan</h3>
                  <p className="text-sm text-gray-600">
                    {isPro ? 'Active subscription' : 'Free plan'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {documentCount}
                  </div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Documents</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {isPro ? '∞' : creditsRemaining}
                  </div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Credits</div>
                </div>
                {subscription?.nextBillingDate && (
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {new Date(subscription.nextBillingDate).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-600 uppercase tracking-wide">Next Billing</div>
                  </div>
                )}
              </div>
            </div>

            {!isPro && creditsRemaining === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-2xl"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-base text-red-900 mb-1">Free credits exhausted!</p>
                    <p className="text-sm text-red-700">You've used all 5 free uploads. Choose a plan below to continue.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Plan Carousel - Only show if not subscribed */}
        {!isPro ? (
          <PlanCarousel 
            plans={plans} 
            onSuccess={loadSubscription}
            className="mb-12"
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-12"
          >
            <div className="text-center max-w-2xl mx-auto">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"
              >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h3 className="text-3xl font-bold text-gray-900 mb-3">
                {subscription?.plan === 'premium' ? "You're on Premium! 🚀" : "You're on Pro! 🎉"}
              </h3>
              <p className="text-gray-600 text-lg mb-6">
                Enjoying unlimited document processing and premium features
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 text-left">
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold text-gray-900">Unlimited uploads</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">Process as many documents as you need</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold text-gray-900">Priority support</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">Get help when you need it</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold text-gray-900">Advanced AI</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">Powered by Gemini-2.5-pro</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold text-gray-900">Faster processing</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">Priority queue access</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Additional Info Section */}
        <div className="grid lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-3"
          >
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Plan Features Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-4 px-4 font-semibold text-gray-900">Feature</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-900">Free</th>
                      <th className="text-center py-4 px-4 font-semibold text-indigo-600">Pro</th>
                      <th className="text-center py-4 px-4 font-semibold text-purple-600">Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-4 px-4 text-gray-700">Document uploads</td>
                      <td className="text-center py-4 px-4">5/month</td>
                      <td className="text-center py-4 px-4 text-indigo-600 font-semibold">Unlimited</td>
                      <td className="text-center py-4 px-4 text-purple-600 font-semibold">Unlimited</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-4 px-4 text-gray-700">AI Processing</td>
                      <td className="text-center py-4 px-4">Basic</td>
                      <td className="text-center py-4 px-4 text-indigo-600 font-semibold">Advanced</td>
                      <td className="text-center py-4 px-4 text-purple-600 font-semibold">Advanced</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-4 px-4 text-gray-700">Batch processing</td>
                      <td className="text-center py-4 px-4">-</td>
                      <td className="text-center py-4 px-4">-</td>
                      <td className="text-center py-4 px-4 text-purple-600 font-semibold">✓ 100+ docs</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-4 px-4 text-gray-700">API Access</td>
                      <td className="text-center py-4 px-4">-</td>
                      <td className="text-center py-4 px-4">-</td>
                      <td className="text-center py-4 px-4 text-purple-600 font-semibold">✓</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-4 px-4 text-gray-700">Support</td>
                      <td className="text-center py-4 px-4">Community</td>
                      <td className="text-center py-4 px-4 text-indigo-600 font-semibold">Priority</td>
                      <td className="text-center py-4 px-4 text-purple-600 font-semibold">24/7 Premium</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-8 border border-indigo-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h4>
                <p className="text-sm text-gray-600">Yes, you can cancel your subscription at any time. Your access will continue until the end of the billing period.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">How secure is payment?</h4>
                <p className="text-sm text-gray-600">We use Razorpay for secure payment processing. Your payment information is encrypted and never stored on our servers.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Can I upgrade/downgrade?</h4>
                <p className="text-sm text-gray-600">Yes! You can change your plan anytime. Changes take effect at the start of your next billing cycle.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">What file formats are supported?</h4>
                <p className="text-sm text-gray-600">We support PDF and DOCX files. More formats coming soon!</p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
