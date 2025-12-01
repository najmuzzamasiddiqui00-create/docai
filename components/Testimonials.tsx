const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Product Manager',
    company: 'TechCorp',
    image: '👩‍💼',
    content: 'This tool saved me hours of manual work. I can now process hundreds of PDFs in minutes. The AI summaries are incredibly accurate!',
    rating: 5
  },
  {
    name: 'Michael Rodriguez',
    role: 'Legal Researcher',
    company: 'Law Firm',
    image: '👨‍💼',
    content: 'Perfect for extracting key information from legal documents. The text extraction is flawless and the summaries help me quickly identify relevant cases.',
    rating: 5
  },
  {
    name: 'Emily Parker',
    role: 'Content Writer',
    company: 'Marketing Agency',
    image: '👩‍💻',
    content: 'Game-changer for content research! I use it daily to analyze articles and reports. The premium plan is worth every penny.',
    rating: 5
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Loved by Professionals
          </h2>
          <p className="text-xl text-gray-600">
            Join thousands of users who process documents smarter
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-shadow duration-300"
            >
              {/* Rating Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-yellow-400 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Testimonial Content */}
              <p className="text-gray-700 leading-relaxed mb-6 text-lg italic">
                "{testimonial.content}"
              </p>

              {/* Author Info */}
              <div className="flex items-center gap-4">
                <div className="text-4xl">{testimonial.image}</div>
                <div>
                  <div className="font-bold text-gray-900">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {testimonial.role} at {testimonial.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Social Proof Numbers */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-indigo-600 mb-2">10K+</div>
            <div className="text-gray-600">Documents Processed</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-indigo-600 mb-2">5K+</div>
            <div className="text-gray-600">Happy Users</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-indigo-600 mb-2">99.9%</div>
            <div className="text-gray-600">Uptime</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-indigo-600 mb-2">4.9/5</div>
            <div className="text-gray-600">User Rating</div>
          </div>
        </div>
      </div>
    </section>
  );
}
