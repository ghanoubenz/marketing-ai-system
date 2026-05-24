'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Bot, Inbox, Package, Users, FileText,
  Send, FileSignature, BarChart3, Settings, ChevronLeft, ChevronRight, Workflow
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/inbox', label: 'Agent Inbox', icon: Inbox },
  { href: '/workflows', label: 'Workflows', icon: Workflow },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/leads', label: 'Leads CRM', icon: Users },
  { href: '/content', label: 'Content', icon: FileText },
  { href: '/outreach', label: 'Outreach', icon: Send },
  { href: '/proposals', label: 'Proposals', icon: FileSignature },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-200 z-30',
      collapsed ? 'w-16' : 'w-60'
    )}>
      <div className={cn('flex items-center border-b border-gray-200 h-16 px-4', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">AI Growth Desk</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn('text-gray-400 hover:text-gray-600', collapsed && 'absolute -right-3 top-5 bg-white border border-gray-200 rounded-full w-6 h-6 flex items-center justify-center shadow-sm')}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-blue-600' : 'text-gray-400')} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-700">O</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Operator</p>
              <p className="text-xs text-gray-500 truncate">CEO / Operator</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
