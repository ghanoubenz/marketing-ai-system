import TopBar from '@/components/layout/TopBar'

interface ComingSoonProps {
  title: string
  subtitle: string
  description: string
}

export default function ComingSoon({ title, subtitle, description }: ComingSoonProps) {
  return (
    <div>
      <TopBar title={title} subtitle={subtitle} />
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-gray-400">🚧</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h2>
          <p className="text-sm text-gray-500">{description}</p>
          <p className="text-xs text-gray-400 mt-4">This feature will be available after the core Product Strategy workflow is validated.</p>
        </div>
      </div>
    </div>
  )
}
