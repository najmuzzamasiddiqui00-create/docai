import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import HowItWorks from '@/components/HowItWorks';
import Testimonials from '@/components/Testimonials';
import Pricing from '@/components/Pricing';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                DocAI
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition text-sm font-medium">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition text-sm font-medium">
                How It Works
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition text-sm font-medium">
                Pricing
              </a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition text-sm font-medium">
                Testimonials
              </a>
            </div>

            <div className="flex items-center gap-4">
              <SignedOut>
                <Link
                  href="/sign-in"
                  className="text-gray-600 hover:text-gray-900 transition text-sm font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-lg hover:shadow-lg transition text-sm font-medium"
                >
                  Get Started
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-lg hover:shadow-lg transition text-sm font-medium"
                >
                  Dashboard
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <Features />

      {/* How It Works Section */}
      <HowItWorks />

      {/* Testimonials Section */}
      <Testimonials />

      {/* Pricing Section */}
      <Pricing />

      {/* Footer */}
      <Footer />
    </div>
  );
}
