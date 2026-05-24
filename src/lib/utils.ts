import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(date: string): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function timeAgo(date: string): string {
  if (!date) return '—'
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export const statusColors: Record<string, string> = {
  // Product statuses
  idea: 'bg-gray-100 text-gray-700',
  testing: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-orange-100 text-orange-700',
  validated: 'bg-blue-100 text-blue-700',
  // Agent statuses
  idle: 'bg-gray-100 text-gray-600',
  working: 'bg-blue-100 text-blue-700',
  waiting_approval: 'bg-amber-100 text-amber-700',
  blocked: 'bg-red-100 text-red-700',
  // Message statuses
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  edited: 'bg-purple-100 text-purple-700',
  done: 'bg-gray-100 text-gray-600',
  // Lead statuses
  new: 'bg-blue-100 text-blue-700',
  researched: 'bg-indigo-100 text-indigo-700',
  message_drafted: 'bg-purple-100 text-purple-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  replied: 'bg-cyan-100 text-cyan-700',
  interested: 'bg-emerald-100 text-emerald-700',
  meeting_booked: 'bg-green-100 text-green-700',
  proposal_needed: 'bg-orange-100 text-orange-700',
  proposal_sent: 'bg-teal-100 text-teal-700',
  won: 'bg-green-200 text-green-800',
  lost: 'bg-red-100 text-red-700',
  not_relevant: 'bg-gray-100 text-gray-500',
  // Content & outreach
  draft: 'bg-gray-100 text-gray-600',
  needs_review: 'bg-amber-100 text-amber-700',
  posted: 'bg-green-100 text-green-700',
  sent: 'bg-blue-100 text-blue-700',
  // Task
  in_progress: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
