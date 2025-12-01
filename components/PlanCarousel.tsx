'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import SubscriptionButton from './SubscriptionButton';

export interface Plan {
  id: 'pro' | 'premium';
  title: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  badge?: string;
  gradient: string;
  icon: string;
  recommended?: boolean;
}

interface PlanCarouselProps {
  plans: Plan[];
  onSuccess?: () => void;
  className?: string;
}

export default function PlanCarousel({ plans, onSuccess, className = '' }: PlanCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(plans.findIndex(p => p.recommended) || 0);
  const [direction, setDirection] = useState(0);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigatePlan(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigatePlan(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex]);

  const navigatePlan = (dir: number) => {
    const newIndex = selectedIndex + dir;
    if (newIndex >= 0 && newIndex < plans.length) {
      setDirection(dir);
      setSelectedIndex(newIndex);
      // Announce to screen readers
      announceToScreenReader(`Selected ${plans[newIndex].title} plan`);
    }
  };

  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };

  const handleDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold) {
      navigatePlan(-1);
    } else if (info.offset.x < -threshold) {
      navigatePlan(1);
    }
  };

  const selectedPlan = plans[selectedIndex];

  return (
    <div className={`relative w-full ${className}`} role="region" aria-label="Subscription plans">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
          Choose Your Plan
        </h2>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Select the perfect plan for your needs. Upgrade or downgrade anytime.
        </p>
      </motion.div>

      {/* Navigation Arrows - Desktop */}
      <div className="hidden lg:flex absolute top-1/2 left-0 right-0 -translate-y-1/2 z-10 justify-between pointer-events-none">
        <motion.button
          whileHover={{ scale: 1.15, x: -4 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigatePlan(-1)}
          disabled={selectedIndex === 0}
          className={`pointer-events-auto w-14 h-14 -ml-7 rounded-full bg-white shadow-2xl border-2 border-gray-200 flex items-center justify-center transition-all ${
            selectedIndex === 0 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-indigo-50 hover:border-indigo-300'
          }`}
          aria-label="Previous plan"
        >
          <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.15, x: 4 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigatePlan(1)}
          disabled={selectedIndex === plans.length - 1}
          className={`pointer-events-auto w-14 h-14 -mr-7 rounded-full bg-white shadow-2xl border-2 border-gray-200 flex items-center justify-center transition-all ${
            selectedIndex === plans.length - 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-indigo-50 hover:border-indigo-300'
          }`}
          aria-label="Next plan"
        >
          <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>
      </div>

      {/* Carousel Container */}
      <div className="relative overflow-hidden py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={selectedIndex}
              custom={direction}
              initial={{ 
                x: direction > 0 ? 400 : -400, 
                opacity: 0, 
                scale: 0.85 
              }}
              animate={{ 
                x: 0, 
                opacity: 1, 
                scale: 1,
                transition: {
                  type: 'spring',
                  stiffness: 260,
                  damping: 25
                }
              }}
              exit={{ 
                x: direction > 0 ? -400 : 400, 
                opacity: 0, 
                scale: 0.85,
                transition: {
                  duration: 0.25,
                  ease: 'easeInOut'
                }
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="cursor-grab active:cursor-grabbing touch-pan-y"
            >
              <PlanCard 
                plan={selectedPlan} 
                isSelected={true}
                onSuccess={onSuccess}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Side Preview Cards (Desktop Only) */}
        <div className="hidden xl:block">
          {selectedIndex > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -120 }}
              animate={{ opacity: 0.35, x: 0 }}
              exit={{ opacity: 0, x: -120 }}
              transition={{ duration: 0.3 }}
              className="absolute left-8 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ width: '320px', maxWidth: '320px' }}
            >
              <div className="transform scale-[0.7] origin-right">
                <PlanCard plan={plans[selectedIndex - 1]} isSelected={false} />
              </div>
            </motion.div>
          )}

          {selectedIndex < plans.length - 1 && (
            <motion.div
              initial={{ opacity: 0, x: 120 }}
              animate={{ opacity: 0.35, x: 0 }}
              exit={{ opacity: 0, x: 120 }}
              transition={{ duration: 0.3 }}
              className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ width: '320px', maxWidth: '320px' }}
            >
              <div className="transform scale-[0.7] origin-left">
                <PlanCard plan={plans[selectedIndex + 1]} isSelected={false} />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Pagination Dots */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center gap-3 mt-10"
        role="tablist"
        aria-label="Plan selection"
      >
        {plans.map((plan, index) => (
          <motion.button
            key={plan.id}
            onClick={() => {
              setDirection(index > selectedIndex ? 1 : -1);
              setSelectedIndex(index);
              announceToScreenReader(`Selected ${plan.title} plan`);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`relative h-3 rounded-full transition-all duration-300 ${
              index === selectedIndex 
                ? 'w-16 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg' 
                : 'w-3 bg-gray-300 hover:bg-gray-400'
            }`}
            role="tab"
            aria-selected={index === selectedIndex}
            aria-label={`Select ${plan.title} plan`}
          >
            <span className="sr-only">{plan.title}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Mobile Swipe Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="md:hidden text-center mt-6"
      >
        <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
          <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          Swipe to explore plans
          <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </p>
      </motion.div>
    </div>
  );
}

interface PlanCardProps {
  plan: Plan;
  isSelected: boolean;
  onSuccess?: () => void;
}

function PlanCard({ plan, isSelected, onSuccess }: PlanCardProps) {
  return (
    <motion.div
      layout
      className={`relative bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
        isSelected ? 'ring-4 ring-offset-4 ring-indigo-500' : 'ring-1 ring-gray-200'
      }`}
      style={{
        background: isSelected ? plan.gradient : 'white',
      }}
    >
      {/* Badge */}
      {plan.badge && isSelected && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute top-6 right-6 z-10"
        >
          <div className="bg-yellow-400 text-gray-900 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
            {plan.badge}
          </div>
        </motion.div>
      )}

      <div className={`p-8 md:p-12 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
            isSelected ? 'bg-white/20 backdrop-blur-sm' : 'bg-gradient-to-br from-indigo-100 to-purple-100'
          }`}
        >
          <span className="text-5xl">{plan.icon}</span>
        </motion.div>

        {/* Title */}
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-4xl font-bold text-center mb-3"
        >
          {plan.title}
        </motion.h3>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`text-center mb-8 text-lg ${isSelected ? 'text-white/90' : 'text-gray-600'}`}
        >
          {plan.description}
        </motion.p>

        {/* Price */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 0.25 }}
          className={`text-center mb-8 p-8 rounded-2xl ${
            isSelected ? 'bg-white/10 backdrop-blur-sm' : 'bg-gradient-to-br from-gray-50 to-gray-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl font-semibold">₹</span>
            <span className="text-6xl font-bold">{plan.price}</span>
          </div>
          <p className={`text-lg ${isSelected ? 'text-white/80' : 'text-gray-600'}`}>
            {plan.period}
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4 mb-10"
        >
          {plan.features.map((feature, index) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + index * 0.05 }}
              className="flex items-start gap-3"
            >
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                isSelected ? 'bg-white/30' : 'bg-gradient-to-br from-indigo-100 to-purple-100'
              }`}>
                <svg 
                  className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-indigo-600'}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className={`font-medium text-base ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                {feature}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Button */}
        {isSelected && onSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              type: 'spring',
              stiffness: 200,
              delay: 0.5 
            }}
          >
            <SubscriptionButton
              plan={plan.id}
              amount={plan.price}
              className="w-full bg-white text-indigo-600 hover:bg-gray-50 font-bold text-lg py-5 shadow-2xl"
              onSuccess={onSuccess}
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center text-white/80 text-sm mt-4 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Secure payment with Razorpay
            </motion.p>
          </motion.div>
        )}

        {!isSelected && (
          <div className="text-center">
            <div className="inline-block px-6 py-3 bg-gray-100 text-gray-400 rounded-xl font-semibold">
              Select to view details
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
