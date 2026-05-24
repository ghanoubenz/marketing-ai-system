'use client'

import { useState } from 'react'

interface Post {
  type: string
  title: string
  body: string
  cta: string
  visual_direction: string
}

interface CarouselSlide {
  slide_number: number
  slide_role: string
  headline: string
  body: string
  visual_direction?: string
  layout_direction?: string
}

interface CarouselDesignStyle {
  tone?: string
  colors?: string
  typography?: string
  layout?: string
  avoid?: string[]
}

interface Carousel {
  title: string
  target_reader?: string
  business_goal?: string
  carousel_angle?: string
  slides: CarouselSlide[] | string[]
  design_style?: CarouselDesignStyle
  cta: string
  image_prompts?: string[]
  visual_direction?: string
}

interface CalendarDay {
  day: string
  content_type: string
  topic: string
}

interface ContentOutput {
  summary?: string
  linkedin_posts?: Post[]
  carousel_outlines?: Carousel[]
  one_pager_outline?: { title: string; sections: string[]; cta: string }
  weekly_calendar?: CalendarDay[]
  recommended_next_action?: string
}

const TYPE_LABELS: Record<string, string> = {
  problem: 'Problem/Pain',
  mistake: 'Mistake',
  before_after: 'Before/After',
  educational: 'Educational',
  objection: 'Objection-Handling',
  proof: 'Proof/Credibility',
  direct_offer: 'Direct Offer',
  founder_insight: 'Founder Insight',
  checklist: 'Checklist',
  why_now: 'Why Now',
}

const TYPE_COLORS: Record<string, string> = {
  problem: 'bg-red-50 text-red-700',
  mistake: 'bg-orange-50 text-orange-700',
  before_after: 'bg-green-50 text-green-700',
  educational: 'bg-blue-50 text-blue-700',
  objection: 'bg-purple-50 text-purple-700',
  proof: 'bg-indigo-50 text-indigo-700',
  direct_offer: 'bg-emerald-50 text-emerald-700',
  founder_insight: 'bg-amber-50 text-amber-700',
  checklist: 'bg-teal-50 text-teal-700',
  why_now: 'bg-rose-50 text-rose-700',
}

const SLIDE_ROLE_COLORS: Record<string, string> = {
  Hook: 'bg-red-600 text-white',
  Problem: 'bg-orange-600 text-white',
  Insight: 'bg-blue-600 text-white',
  Framework: 'bg-indigo-600 text-white',
  Proof: 'bg-emerald-600 text-white',
  Outcome: 'bg-green-600 text-white',
  CTA: 'bg-purple-600 text-white',
}

function isStructuredSlide(slide: CarouselSlide | string): slide is CarouselSlide {
  return typeof slide === 'object' && 'headline' in slide
}

export default function ContentPreview({ output }: { output: ContentOutput }) {
  const [expandedPost, setExpandedPost] = useState<number | null>(null)
  const [expandedCarousel, setExpandedCarousel] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      {/* LinkedIn Posts */}
      {output.linkedin_posts && output.linkedin_posts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
            LinkedIn Posts ({output.linkedin_posts.length})
          </p>
          <div className="space-y-2">
            {output.linkedin_posts.map((post, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div
                  className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => setExpandedPost(expandedPost === i ? null : i)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[post.type] || 'bg-gray-50 text-gray-700'}`}>
                      {TYPE_LABELS[post.type] || post.type}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{post.title}</span>
                  </div>
                  <span className="text-xs text-gray-400">{expandedPost === i ? '▲' : '▼'}</span>
                </div>
                {expandedPost === i && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <p className="text-sm text-gray-700 whitespace-pre-line mb-3">{post.body}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-blue-600 font-medium">CTA: {post.cta}</span>
                      {post.visual_direction && (
                        <span className="text-gray-400">Visual: {post.visual_direction}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Premium Carousels */}
      {output.carousel_outlines && output.carousel_outlines.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-3">
            Carousel Outlines ({output.carousel_outlines.length})
          </p>
          {output.carousel_outlines.map((carousel, i) => {
            const isExpanded = expandedCarousel === i
            const hasStructuredSlides = carousel.slides.length > 0 && isStructuredSlide(carousel.slides[0])

            return (
              <div key={i} className="bg-white rounded-lg border border-gray-200 mb-3 overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedCarousel(isExpanded ? null : i)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{carousel.title}</p>
                      {carousel.carousel_angle && (
                        <p className="text-xs text-purple-600 mt-1">Angle: {carousel.carousel_angle}</p>
                      )}
                      {carousel.target_reader && (
                        <p className="text-xs text-gray-500 mt-0.5">For: {carousel.target_reader}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{carousel.slides.length} slides</span>
                      <span className="text-xs text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {/* Slide previews */}
                    {hasStructuredSlides ? (
                      <div className="p-4">
                        <div className="flex gap-3 overflow-x-auto pb-3">
                          {(carousel.slides as CarouselSlide[]).map((slide, j) => (
                            <div key={j} className="flex-shrink-0 w-52 rounded-lg border border-gray-200 overflow-hidden bg-gradient-to-b from-gray-50 to-white">
                              <div className="px-3 py-1.5 flex items-center justify-between bg-gray-100 border-b border-gray-200">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SLIDE_ROLE_COLORS[slide.slide_role] || 'bg-gray-600 text-white'}`}>
                                  {slide.slide_role}
                                </span>
                                <span className="text-[10px] text-gray-400">#{slide.slide_number}</span>
                              </div>
                              <div className="p-3 min-h-[120px] flex flex-col justify-center">
                                <p className="text-sm font-bold text-gray-900 leading-tight">{slide.headline}</p>
                                {slide.body && (
                                  <p className="text-[11px] text-gray-600 mt-1.5 leading-snug">{slide.body}</p>
                                )}
                              </div>
                              {(slide.layout_direction || slide.visual_direction) && (
                                <div className="px-3 pb-2">
                                  {slide.layout_direction && (
                                    <p className="text-[10px] text-gray-400 italic">{slide.layout_direction}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {(carousel.slides as string[]).map((slide, j) => (
                            <div key={j} className="flex-shrink-0 w-44 h-28 bg-purple-50 rounded-lg p-3 border border-purple-100 flex items-center justify-center">
                              <p className="text-xs text-purple-800 text-center line-clamp-4">{slide}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Design style */}
                    {carousel.design_style && (
                      <div className="px-4 pb-3">
                        <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
                          {carousel.design_style.colors && (
                            <div><span className="font-medium text-gray-500">Colors:</span> <span className="text-gray-700">{carousel.design_style.colors}</span></div>
                          )}
                          {carousel.design_style.typography && (
                            <div><span className="font-medium text-gray-500">Type:</span> <span className="text-gray-700">{carousel.design_style.typography}</span></div>
                          )}
                          {carousel.design_style.layout && (
                            <div><span className="font-medium text-gray-500">Layout:</span> <span className="text-gray-700">{carousel.design_style.layout}</span></div>
                          )}
                          {carousel.design_style.avoid && carousel.design_style.avoid.length > 0 && (
                            <div><span className="font-medium text-gray-500">Avoid:</span> <span className="text-red-500">{carousel.design_style.avoid.join(', ')}</span></div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Image prompts */}
                    {carousel.image_prompts && carousel.image_prompts.length > 0 && (
                      <div className="px-4 pb-3">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Image Prompts</p>
                        {carousel.image_prompts.map((p, j) => (
                          <p key={j} className="text-xs text-gray-600 font-mono bg-gray-50 rounded p-2 mb-1">{p}</p>
                        ))}
                      </div>
                    )}

                    <div className="px-4 pb-3">
                      <p className="text-xs text-purple-600 font-medium">CTA: {carousel.cta}</p>
                      {carousel.business_goal && (
                        <p className="text-xs text-gray-400 mt-1">Goal: {carousel.business_goal}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* One-Pager */}
      {output.one_pager_outline && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">One-Pager Outline</p>
          <p className="text-sm font-semibold text-gray-900 mb-2">{output.one_pager_outline.title}</p>
          <ul className="space-y-1">
            {output.one_pager_outline.sections.map((s, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">{i + 1}.</span> {s}
              </li>
            ))}
          </ul>
          <p className="text-xs text-amber-600 mt-2">CTA: {output.one_pager_outline.cta}</p>
        </div>
      )}

      {/* Weekly Calendar */}
      {output.weekly_calendar && output.weekly_calendar.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-3">Weekly Content Calendar</p>
          <div className="grid grid-cols-5 gap-2">
            {output.weekly_calendar.map((day, i) => (
              <div key={i} className="bg-green-50 rounded-lg p-2 border border-green-100 text-center">
                <p className="text-xs font-semibold text-green-800">{day.day}</p>
                <p className="text-xs text-green-600 mt-1">{day.content_type}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{day.topic}</p>
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
