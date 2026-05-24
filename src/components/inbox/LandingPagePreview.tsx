'use client'

interface HeroSection {
  headline: string
  subheadline: string
  primary_cta: string
  secondary_cta: string
}

interface ProblemSection {
  title: string
  body: string
  pain_points: string[]
}

interface SolutionSection {
  title: string
  body: string
  key_benefits: string[]
}

interface HowItWorksStep {
  step: number
  title: string
  description: string
}

interface PricingPackage {
  name: string
  price: string
  features: string[]
  best_for: string
}

interface PricingSection {
  headline: string
  packages: PricingPackage[]
}

interface ProofSection {
  title: string
  body: string
  proof_points: string[]
}

interface FAQ {
  question: string
  answer: string
}

interface FinalCTA {
  headline: string
  body: string
  button_text: string
}

interface LandingPageOutput {
  summary?: string
  hero?: HeroSection
  problem_section?: ProblemSection
  solution_section?: SolutionSection
  how_it_works?: HowItWorksStep[]
  what_you_get?: string[]
  pricing_section?: PricingSection
  proof_section?: ProofSection
  faq?: FAQ[]
  final_cta?: FinalCTA
  recommended_next_action?: string
}

export default function LandingPagePreview({ output }: { output: LandingPageOutput }) {
  return (
    <div className="space-y-6">
      {/* Hero */}
      {output.hero && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">Hero Section</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{output.hero.headline}</h2>
          <p className="text-sm text-gray-600 mb-4">{output.hero.subheadline}</p>
          <div className="flex items-center gap-3">
            <span className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg">{output.hero.primary_cta}</span>
            <span className="text-sm text-blue-600 font-medium">{output.hero.secondary_cta}</span>
          </div>
        </div>
      )}

      {/* Problem */}
      {output.problem_section && (
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Problem</p>
          <h3 className="text-base font-semibold text-gray-900 mb-2">{output.problem_section.title}</h3>
          <p className="text-sm text-gray-600 mb-3">{output.problem_section.body}</p>
          <ul className="space-y-1.5">
            {output.problem_section.pain_points.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-red-400 mt-0.5">&#x2022;</span> {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Solution */}
      {output.solution_section && (
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-2">Solution</p>
          <h3 className="text-base font-semibold text-gray-900 mb-2">{output.solution_section.title}</h3>
          <p className="text-sm text-gray-600 mb-3">{output.solution_section.body}</p>
          <ul className="space-y-1.5">
            {output.solution_section.key_benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">&#x2713;</span> {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* How It Works */}
      {output.how_it_works && output.how_it_works.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-3">How It Works</p>
          <div className="space-y-3">
            {output.how_it_works.map((step) => (
              <div key={step.step} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center">
                  {step.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What You Get */}
      {output.what_you_get && output.what_you_get.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-3">What You Get</p>
          <ul className="grid grid-cols-2 gap-2">
            {output.what_you_get.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-amber-500 mt-0.5">&#x2713;</span> {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pricing */}
      {output.pricing_section && (
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">Pricing</p>
          <h3 className="text-base font-semibold text-gray-900 mb-4">{output.pricing_section.headline}</h3>
          <div className="grid grid-cols-2 gap-4">
            {output.pricing_section.packages.map((pkg, i) => (
              <div key={i} className="p-4 border border-gray-200 rounded-lg">
                <p className="text-sm font-semibold text-gray-900">{pkg.name}</p>
                <p className="text-lg font-bold text-blue-600 mb-2">{pkg.price}</p>
                <ul className="space-y-1 mb-3">
                  {pkg.features.map((f, j) => (
                    <li key={j} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-green-500">&#x2713;</span> {f}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-400">Best for: {pkg.best_for}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proof */}
      {output.proof_section && (
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">Proof & Credibility</p>
          <h3 className="text-base font-semibold text-gray-900 mb-2">{output.proof_section.title}</h3>
          <p className="text-sm text-gray-600 mb-3">{output.proof_section.body}</p>
          <ul className="space-y-1.5">
            {output.proof_section.proof_points.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-indigo-400 mt-0.5">&#x2605;</span> {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* FAQ */}
      {output.faq && output.faq.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">FAQ</p>
          <div className="space-y-3">
            {output.faq.map((item, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-gray-900">{item.question}</p>
                <p className="text-sm text-gray-600 mt-0.5">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final CTA */}
      {output.final_cta && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white">
          <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide mb-2">Final CTA</p>
          <h3 className="text-lg font-bold mb-2">{output.final_cta.headline}</h3>
          <p className="text-sm text-gray-300 mb-4">{output.final_cta.body}</p>
          <span className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg inline-block">{output.final_cta.button_text}</span>
        </div>
      )}

      {/* Recommended Next Action */}
      {output.recommended_next_action && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700">
            <span className="font-semibold">Next step:</span> {output.recommended_next_action}
          </p>
        </div>
      )}
    </div>
  )
}
