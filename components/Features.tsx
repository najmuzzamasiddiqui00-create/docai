const features = [
  {
    icon: '⚡',
    title: 'Lightning Fast Processing',
    description: 'Upload any document and get results in seconds. Powered by Google Gemini AI for instant text extraction and intelligent summaries.'
  },
  {
    icon: '🔒',
    title: 'Secure & Private',
    description: 'Your documents are encrypted and stored securely. We never share your data. Files are automatically deleted after processing.'
  },
  {
    icon: '📊',
    title: 'Smart Analysis',
    description: 'Get AI-powered summaries, keyword extraction, and document insights. Perfect for research, legal docs, and reports.'
  },
  {
    icon: '🎯',
    title: 'Multiple Formats',
    description: 'Support for PDF, DOCX, TXT, images, and more. Extract text from any document type with high accuracy.'
  },
  {
    icon: '💳',
    title: 'Flexible Plans',
    description: 'Start free with 5 credits. Upgrade to Pro or Premium for unlimited processing. Cancel anytime, no questions asked.'
  },
  {
    icon: '🚀',
    title: 'API Access',
    description: 'Premium users get API access to integrate document processing into their own apps and workflows.'
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Everything You Need
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Powerful features designed to make document processing effortless
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 bg-white"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transform transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
