import { cn, statusColors, formatStatus } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      statusColors[status] || 'bg-gray-100 text-gray-600',
      className
    )}>
      {formatStatus(status)}
    </span>
  )
}
