'use client'

import { useState } from 'react'
import { agentsApi } from '@/lib/api-client'
import { Loader2, Image as ImageIcon, Copy, Check, MessageSquare, Layout, Download } from 'lucide-react'

interface CarouselDesignPreviewProps {
  data: Record<string, unknown>
  messageId?: string
}

export default function CarouselDesignPreview({ data, messageId }: CarouselDesignPreviewProps) {
  const slides = (data.slides as Array<Record<string, unknown>>) || []
  const caption = data.linkedin_caption as Record<string, unknown> | undefined
  const generatedImages = (data.generated_images as Array<{ slide_number: number; url: string }>) || []
  const imageFolder = data.image_folder as string | undefined
  const hasImages = !!data.images_generated_at || generatedImages.length > 0

  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [tab, setTab] = useState<'caption' | 'slides'>('slides')

  const handleGenerate = async () => {
    if (!messageId) return
    setGenerating(true)
    setGenError(null)
    try {
      await agentsApi.generateCarouselImages(messageId)
      window.location.reload()
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const fullCaption = caption
    ? [
        caption.hook as string,
        '',
        caption.body as string,
        '',
        caption.cta as string,
        '',
        ((caption.hashtags as string[]) || []).map(h => h.startsWith('#') ? h : `#${h}`).join(' '),
      ].join('\n')
    : ''

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">{data.summary as string || 'Carousel'}</h3>
            {data.design_style_chosen ? (
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                {String(data.design_style_chosen)}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-gray-500 mt-1">{slides.length} slides</p>
          {hasImages && (
            <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
              <Check className="w-3 h-3" /> {generatedImages.length} images generated
              {imageFolder && <span className="text-gray-400 ml-1">· {imageFolder.split('/').pop()}</span>}
            </span>
          )}
        </div>

        {messageId && !hasImages && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
            Generate All Images
          </button>
        )}
      </div>

      {genError && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{genError}</div>
      )}

      {/* Image Gallery — show at top when images exist */}
      {hasImages && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">Carousel Images</h4>
            {generatedImages.length > 0 && (
              <a
                href={generatedImages[0].url.substring(0, generatedImages[0].url.lastIndexOf('/'))}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Download className="w-3 h-3" /> Open folder
              </a>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(generatedImages.length > 0
              ? generatedImages
              : slides.filter(s => s.generated_image_url).map(s => ({ slide_number: s.slide_number as number, url: s.generated_image_url as string }))
            ).map((img, i) => (
              <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="block">
                <div className="aspect-[4/5] rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors">
                  <img src={img.url} alt={`Slide ${img.slide_number}`} className="w-full h-full object-cover" />
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-1">Slide {img.slide_number}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab('slides')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            tab === 'slides' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layout className="w-3.5 h-3.5" /> Slides ({slides.length})
        </button>
        <button
          onClick={() => setTab('caption')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            tab === 'caption' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> LinkedIn Caption
        </button>
      </div>

      {/* Slides Tab */}
      {tab === 'slides' && (
        <div className="space-y-2">
          {slides.map((slide, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-stretch">
                <div className="w-10 bg-gray-900 flex flex-col items-center justify-center text-white flex-shrink-0">
                  <span className="text-sm font-bold">{slide.slide_number as number}</span>
                </div>
                <div className="flex-1 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-blue-600 uppercase">{slide.slide_role as string}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{slide.headline as string}</p>
                  {slide.body ? <p className="text-xs text-gray-600 mt-0.5">{String(slide.body)}</p> : null}
                </div>
                <button
                  onClick={() => copy(`p-${idx}`, slide.image_prompt as string)}
                  className="px-3 flex items-center text-gray-300 hover:text-gray-500 border-l border-gray-100"
                  title="Copy image prompt"
                >
                  {copied === `p-${idx}` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Caption Tab */}
      {tab === 'caption' && caption && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">Copy this to your LinkedIn post</h4>
            <button
              onClick={() => copy('caption', fullCaption)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {copied === 'caption' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied === 'caption' ? 'Copied!' : 'Copy All'}
            </button>
          </div>
          <div className="space-y-3 text-sm">
            <p className="font-bold text-gray-900">{caption.hook as string}</p>
            <p className="text-gray-700 whitespace-pre-line">{caption.body as string}</p>
            <p className="font-medium text-gray-800">{caption.cta as string}</p>
            <div className="flex flex-wrap gap-1.5">
              {((caption.hashtags as string[]) || []).map((tag, i) => (
                <span key={i} className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'caption' && !caption && (
        <p className="text-sm text-gray-400 text-center py-4">No caption in this output.</p>
      )}
    </div>
  )
}
