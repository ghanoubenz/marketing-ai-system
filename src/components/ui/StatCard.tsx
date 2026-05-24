import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  className?: string
}

export default function StatCard({ title, value, icon: Icon, change, changeType = 'neutral', className }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-5', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={cn(
              'text-xs mt-1 font-medium',
              changeType === 'positive' && 'text-green-600',
              changeType === 'negative' && 'text-red-600',
              changeType === 'neutral' && 'text-gray-500',
            )}>
              {change}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
      </div>
    </div>
  )
}
