'use client';

import { useState, useEffect } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function SubscriptionPlans() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => setError('Failed to load payment system');
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const plans = [
    {
      id: 'pro',
      name: 'Pro',
      price: 499,
      features: [
        '50 uploads per month',
        'AI text extraction',
        'Document summarization',
        'Priority processing',
        'Email support',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 999,
      features: [
        'Unlimited uploads',
        'AI text extraction',
        'Advanced document analysis',
        'Instant processing',
        'Priority support',
        'API access',
      ],
    },
  ];

  const handleSubscribe = async (planId: string) => {
    if (!razorpayLoaded) {
      setError('Payment system is still loading. Please try again.');
      return;
    }

    setLoading(planId);
    setError(null);

    try {
      console.log('Creating order for plan:', planId);
      
      // Create order
      const response = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await response.json();
      console.log('Order creation response:', { ok: response.ok, data });

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to create order');
      }

      if (!data.orderId || !data.keyId) {
        throw new Error('Invalid order data received from server');
      }

      console.log('Opening Razorpay checkout with order:', data.orderId);

      // Initialize Razorpay
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'DocProcess',
        description: `${planId.toUpperCase()} Plan Subscription`,
        order_id: data.orderId,
        handler: async function (response: any) {
          // Verify payment
          const verifyResponse = await fetch('/api/subscription/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyResponse.json();

          if (verifyResponse.ok) {
            alert('Payment successful! Your subscription is now active.');
            window.location.reload();
          } else {
            alert('Payment verification failed: ' + verifyData.error);
          }
        },
        prefill: {
          email: '',
        },
        theme: {
          color: '#4F46E5',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        alert('Payment failed: ' + response.error.description);
      });
      razorpay.open();
    } catch (error: any) {
      console.error('Subscription error:', error);
      const errorMessage = error.message || 'An unexpected error occurred';
      setError(errorMessage);
      alert('Error: ' + errorMessage);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Upgrade Your Plan</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      
      {!razorpayLoaded && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 text-sm">Loading payment system...</p>
        </div>
      )}
      
      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-500 transition"
          >
            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold">₹{plan.price}</span>
              <span className="text-gray-600">/month</span>
            </div>
            
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={loading === plan.id || !razorpayLoaded}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg
                hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                transition font-semibold"
            >
              {loading === plan.id ? 'Processing...' : 
               !razorpayLoaded ? 'Loading...' : 'Subscribe Now'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
