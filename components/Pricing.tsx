const plans = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    description: 'Perfect for trying out',
    features: [
      '5 document uploads',
      'AI text extraction',
      'Basic summaries',
      'Email support',
      'Standard processing speed'
    ],
    cta: 'Start Free',
    href: '/sign-up',
    popular: false,
    color: 'gray'
  },
  {
    name: 'Pro',
    price: '₹499',
    period: 'per month',
    description: 'For professionals',
    features: [
      '50 document uploads/month',
      'Advanced AI analysis',
      'Priority processing',
      'Priority email support',
      'Batch processing',
      'Export to multiple formats'
    ],
    cta: 'Upgrade to Pro',
    href: '/sign-up',
    popular: true,
    color: 'indigo'
  },
  {
    name: 'Premium',
    price: '₹999',
    period: 'per month',
    description: 'For power users',
    features: [
      'Unlimited uploads',
      'Advanced AI insights',
      'Instant processing',
      '24/7 priority support',
      'API access',
      'Custom integrations',
      'Team collaboration',
      'Dedicated account manager'
    ],
    cta: 'Go Premium',
    href: '/sign-up',
    popular: false,
    color: 'purple'
  }
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600">
            Choose the plan that's right for you. Upgrade or cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl shadow-lg border-2 ${
                plan.popular
                  ? 'border-indigo-500 shadow-2xl scale-105'
                  : 'border-gray-200'
              } p-8 hover:shadow-2xl transition-all duration-300`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-600">/ {plan.period}</span>
                </div>
              </div>

              {/* Features List */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <svg
                      className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <a
                href={plan.href}
                className={`block w-full text-center px-6 py-4 rounded-xl font-semibold transition-all duration-200 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl hover:scale-105'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center mt-12 text-gray-600">
          <p>All plans include secure storage and automatic backups.</p>
          <p className="mt-2">Need a custom plan? <a href="#" className="text-indigo-600 hover:underline font-semibold">Contact us</a></p>
        </div>
      </div>
    </section>
  );
}
