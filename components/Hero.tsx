'use client';

interface HeroProps {
  onGetStarted?: () => void;
}

export default function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="relative bg-gradient-to-br from-indigo-50 via-white to-purple-50 pt-20 pb-32 px-4 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-indigo-100 mb-6">
            <span className="text-sm font-semibold text-indigo-600">✨ AI-Powered Processing</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Process Documents
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Lightning Fast
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Upload any document and get instant AI-powered summaries, text extraction, and analysis. 
            Start free with 5 credits, no card required.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-2xl hover:scale-105 transform transition-all duration-200"
            >
              Get Started Free →
            </button>
            <a
              href="#pricing"
              className="w-full sm:w-auto bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-gray-200 hover:border-indigo-300 hover:shadow-lg transform transition-all duration-200"
            >
              View Pricing
            </a>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>5 free credits</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Secure & private</span>
            </div>
          </div>
        </div>

        {/* Hero Image / Demo */}
        <div className="mt-16 relative">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 max-w-4xl mx-auto">
            <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">📄</div>
                <p className="text-gray-600 font-medium">Upload • Process • Download</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
