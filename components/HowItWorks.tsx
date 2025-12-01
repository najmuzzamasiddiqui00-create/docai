const steps = [
  {
    number: '1',
    title: 'Upload Your Document',
    description: 'Drag and drop or click to upload any PDF, DOCX, TXT, or image file. Files up to 10MB supported.',
    icon: '📤'
  },
  {
    number: '2',
    title: 'AI Processing',
    description: 'Our Google Gemini AI extracts text, generates summaries, and analyzes your document in seconds.',
    icon: '🤖'
  },
  {
    number: '3',
    title: 'Get Results',
    description: 'View extracted text, AI summaries, and insights. Download or copy results instantly.',
    icon: '✨'
  }
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-4 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600">
            Three simple steps to process any document
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connection Lines (desktop only) */}
          <div className="hidden md:block absolute top-20 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-indigo-200 -z-10"></div>

          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Step Card */}
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
                {/* Step Number */}
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-6 shadow-lg">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="text-5xl mb-4">{step.icon}</div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <a
            href="/sign-up"
            className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-2xl hover:scale-105 transform transition-all duration-200"
          >
            Start Processing Now →
          </a>
        </div>
      </div>
    </section>
  );
}
