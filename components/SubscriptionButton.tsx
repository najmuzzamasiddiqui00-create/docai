'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface SubscriptionButtonProps {
  plan: 'pro' | 'premium';
  amount: number;
  className?: string;
  onSuccess?: () => void;
}

// Declare Razorpay on window
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function SubscriptionButton({ 
  plan, 
  amount, 
  className = '',
  onSuccess 
}: SubscriptionButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const router = useRouter();

  // Load Razorpay script dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        setRazorpayLoaded(true);
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        setRazorpayLoaded(true);
        resolve(true);
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay SDK');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async () => {
    try {
      setIsProcessing(true);
      console.log(`🛒 Starting subscription flow for ${plan} plan...`);

      // Step 1: Load Razorpay script
      toast.loading('Initializing payment...', { id: 'payment-init' });
      const scriptLoaded = await loadRazorpayScript();
      
      if (!scriptLoaded) {
        toast.error('Failed to load payment system. Please try again.', { id: 'payment-init' });
        setIsProcessing(false);
        return;
      }

      console.log('✅ Razorpay script loaded');

      // Step 2: Create order on backend
      console.log('📝 Creating order on backend...');
      const orderResponse = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
        credentials: 'include',
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        console.error('❌ Order creation failed:', orderData);
        toast.error(orderData.error || 'Failed to create order', { id: 'payment-init' });
        setIsProcessing(false);
        return;
      }

      console.log('✅ Order created:', orderData);
      toast.success('Opening checkout...', { id: 'payment-init' });

      // Step 3: Configure Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: 'DocAI',
        description: `${plan.toUpperCase()} Plan Subscription`,
        image: '/logo.png', // Optional: Add your logo
        handler: async function (response: any) {
          console.log('✅ Payment successful:', response);
          
          // Step 4: Verify payment on backend
          toast.loading('Verifying payment...', { id: 'payment-verify' });
          
          try {
            const verifyResponse = await fetch('/api/subscription/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
              credentials: 'include',
            });

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
              console.error('❌ Payment verification failed:', verifyData);
              toast.error('Payment verification failed. Please contact support.', { id: 'payment-verify' });
              setIsProcessing(false);
              return;
            }

            console.log('✅ Payment verified successfully');
            toast.success('🎉 Subscription activated!', { id: 'payment-verify' });
            
            // Step 5: Poll subscription status to confirm activation
            let attempts = 0;
            const maxAttempts = 10;
            const pollInterval = setInterval(async () => {
              attempts++;
              
              try {
                const statusResponse = await fetch('/api/subscription/status', {
                  credentials: 'include',
                });
                const statusData = await statusResponse.json();
                
                if (statusData.isActive && statusData.plan === plan) {
                  console.log('✅ Subscription confirmed active');
                  clearInterval(pollInterval);
                  setIsProcessing(false);
                  
                  // Call success callback
                  if (onSuccess) {
                    onSuccess();
                  }
                  
                  // Show success modal
                  showSuccessModal();
                  
                  // Refresh the page after a delay
                  setTimeout(() => {
                    router.refresh();
                  }, 2000);
                } else if (attempts >= maxAttempts) {
                  console.warn('⚠️ Subscription status check timeout');
                  clearInterval(pollInterval);
                  setIsProcessing(false);
                  toast.success('Payment successful! Your subscription will be activated shortly.');
                  router.refresh();
                }
              } catch (error) {
                console.error('❌ Status check error:', error);
                if (attempts >= maxAttempts) {
                  clearInterval(pollInterval);
                  setIsProcessing(false);
                  router.refresh();
                }
              }
            }, 1000); // Check every second

          } catch (verifyError) {
            console.error('❌ Verification error:', verifyError);
            toast.error('Failed to verify payment. Please contact support.', { id: 'payment-verify' });
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function() {
            console.log('⚠️ Checkout dismissed by user');
            toast('Checkout closed. No payment was made.', {
              icon: 'ℹ️',
            });
            setIsProcessing(false);
          },
          // Prevent automatic closure
          escape: true,
          backdropclose: false,
        },
        prefill: {
          // Add user details if available from Clerk
          email: '', // You can get this from useUser() hook
          contact: '',
        },
        theme: {
          color: '#6366f1', // Indigo-500
        },
        // Enable retry on failure
        retry: {
          enabled: true,
          max_count: 3,
        },
      };

      // Step 6: Open Razorpay checkout
      console.log('🚀 Opening Razorpay checkout...');
      const razorpay = new window.Razorpay(options);
      razorpay.open();

      // Handle payment failure
      razorpay.on('payment.failed', function (response: any) {
        console.error('❌ Payment failed:', response.error);
        toast.error(`Payment failed: ${response.error.description}`, {
          duration: 5000,
        });
        setIsProcessing(false);
      });

    } catch (error: any) {
      console.error('❌ Subscription error:', error);
      toast.error(error.message || 'Something went wrong. Please try again.');
      setIsProcessing(false);
    }
  };

  const showSuccessModal = () => {
    // Create a success modal overlay
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-300';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl p-8 max-w-md mx-4 shadow-2xl animate-in zoom-in duration-500">
        <div class="text-center">
          <div class="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 class="text-3xl font-bold text-gray-900 mb-3">Welcome to ${plan.toUpperCase()}! 🎉</h2>
          <p class="text-gray-600 mb-4 text-lg">Your subscription is now active</p>
          <p class="text-sm text-gray-500">You now have unlimited access to all features!</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      modal.style.opacity = '0';
      modal.style.transition = 'opacity 300ms';
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 300);
    }, 3000);
  };

  return (
    <motion.button
      onClick={handleSubscribe}
      disabled={isProcessing}
      className={`
        relative overflow-hidden
        bg-gradient-to-r from-indigo-600 to-purple-600 
        text-white font-bold py-4 px-8 rounded-xl 
        hover:shadow-xl hover:scale-105
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        transition-all duration-300
        ${className}
      `}
      whileHover={{ scale: isProcessing ? 1 : 1.05 }}
      whileTap={{ scale: isProcessing ? 1 : 0.98 }}
    >
      {isProcessing ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          ✨ Subscribe for ₹{amount}
        </span>
      )}
      
      {/* Shimmer effect */}
      {!isProcessing && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: 'linear',
          }}
        />
      )}
    </motion.button>
  );
}
