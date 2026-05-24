'use client'

interface ImagePrompt {
  use_case: string
  title: string
  prompt: string
  negative_prompt: string
  style: string
  aspect_ratio: string
  placement: string
  tool_recommendation: string
}

interface BrandDirection {
  primary_colors: string
  typography_style: string
  visual_mood: string
  avoid: string
}

interface ImagePromptOutput {
  summary?: string
  image_prompts?: ImagePrompt[]
  brand_direction?: BrandDirection
  recommended_next_action?: string
}

const USE_CASE_LABELS: Record<string, string> = {
  hero_image: 'Hero Image',
  linkedin_post: 'LinkedIn Post',
  carousel_cover: 'Carousel Cover',
  carousel_slide: 'Carousel Slide',
  service_card: 'Service Card',
  one_pager: 'One-Pager',
  ad_visual: 'Ad Visual',
  website_section: 'Website Section',
}

export default function ImagePromptPreview({ output }: { output: ImagePromptOutput }) {
  return (
    <div className="space-y-6">
      {/* Brand Direction */}
      {output.brand_direction && (
        <div className="bg-gradient-to-br from-gray-50 to-purple-50 rounded-xl p-5 border border-purple-100">
          <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-3">Brand Direction</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="font-medium text-gray-500">Colors:</span> <span className="text-gray-700">{output.brand_direction.primary_colors}</span></div>
            <div><span className="font-medium text-gray-500">Typography:</span> <span className="text-gray-700">{output.brand_direction.typography_style}</span></div>
            <div><span className="font-medium text-gray-500">Mood:</span> <span className="text-gray-700">{output.brand_direction.visual_mood}</span></div>
            <div><span className="font-medium text-gray-500">Avoid:</span> <span className="text-red-600">{output.brand_direction.avoid}</span></div>
          </div>
        </div>
      )}

      {/* Image Prompts */}
      {output.image_prompts && output.image_prompts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">
            Image Prompts ({output.image_prompts.length})
          </p>
          <div className="space-y-3">
            {output.image_prompts.map((img, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">
                      {USE_CASE_LABELS[img.use_case] || img.use_case}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{img.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="px-1.5 py-0.5 bg-gray-100 rounded">{img.aspect_ratio}</span>
                    <span>{img.tool_recommendation}</span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg mb-2">
                  <p className="text-xs font-mono text-gray-700 whitespace-pre-line">{img.prompt}</p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-500">Style: {img.style}</span>
                  <span className="text-gray-500">For: {img.placement}</span>
                </div>
                {img.negative_prompt && (
                  <p className="text-xs text-red-500 mt-1">Avoid: {img.negative_prompt}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {output.recommended_next_action && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700"><span className="font-semibold">Next step:</span> {output.recommended_next_action}</p>
        </div>
      )}
    </div>
  )
}
