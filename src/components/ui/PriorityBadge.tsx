import { cn, priorityColors } from '@/lib/utils'

interface PriorityBadgeProps {
  priority: string
  className?: string
}

export default function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      priorityColors[priority] || 'bg-gray-100 text-gray-600',
      className
    )}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}
