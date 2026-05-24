'use client'

import TopBar from '@/components/layout/TopBar'
import StatusBadge from '@/components/ui/StatusBadge'
import { Sparkles, Lock } from 'lucide-react'
import Link from 'next/link'

const AGENTS = [
  { name: 'Product Strategy Agent', role: 'Turns ideas into clear sellable offers', status: 'active', description: 'Analyzes product ideas and generates positioning, pricing, objections, and differentiation at B2B operator level.' },
  { name: 'CMO Review Agent', role: 'Reviews agent outputs for quality', status: 'active', description: 'Scores outputs on clarity, buyer pain, commercial value, proof, and pipeline impact. Run from Agent Inbox on any message.' },
  { name: 'ICP & Market Research Agent', role: 'Finds best customers', status: 'disabled', description: 'Creates ideal customer profiles, buyer personas, and market segments.' },
  { name: 'Landing Page Agent', role: 'Creates landing page copy', status: 'active', description: 'Generates complete landing page copy with hero, CTA, FAQ, and structure.' },
  { name: 'Content Agent', role: 'Creates sales-focused content', status: 'active', description: 'Creates LinkedIn posts, carousel outlines, one-pagers, and content calendars tied to the approved offer.' },
  { name: 'Image Prompt Agent', role: 'Creates image generation prompts', status: 'active', description: 'Generates premium image prompts for landing pages, LinkedIn, carousels, and ads.' },
  { name: 'Carousel / One-Pager Agent', role: 'Creates visual content outlines', status: 'disabled', description: 'Structures carousel slides and one-pager PDFs for LinkedIn and lead gen.' },
  { name: 'Lead Research Agent', role: 'Builds and scores lead lists', status: 'active', description: 'Suggests lead sources, search queries, qualification rules.' },
  { name: 'Outreach Agent', role: 'Drafts outreach messages', status: 'active', description: 'Creates personalized email sequences, LinkedIn messages, and call scripts.' },
  { name: 'Reply Handler Agent', role: 'Classifies and responds to replies', status: 'disabled', description: 'Analyzes prospect replies, classifies intent, and drafts responses.' },
  { name: 'Follow-Up Agent', role: 'Tracks follow-up timing', status: 'disabled', description: 'Monitors lead pipeline and reminds when follow-ups are due.' },
  { name: 'Proposal Agent', role: 'Creates proposals', status: 'active', description: 'Generates complete proposals with scope, pricing, and terms.' },
  { name: 'Meeting Prep Agent', role: 'Prepares for sales meetings', status: 'disabled', description: 'Researches leads and creates meeting agendas and closing strategies.' },
  { name: 'Weekly CEO Report Agent', role: 'Weekly ops + revenue tracking', status: 'active', description: 'Analyzes pipeline math, identifies bottlenecks, and gives you Monday actions to hit $500/week. Run from Dashboard.' },
  { name: 'Tool Scout Agent', role: 'Recommends tools', status: 'disabled', description: 'Finds tools that could help the project, requests approval before use.' },
  { name: 'Learning Agent', role: 'Improves based on results', status: 'disabled', description: 'Tracks what works and updates project memory and playbooks.' },
  { name: 'QA Agent', role: 'Quality checks outputs', status: 'disabled', description: 'Reviews content, outreach, and proposals for errors and consistency.' },
]

export default function AgentsPage() {
  return (
    <div>
      <TopBar title="Agents" subtitle="Your AI marketing team" />
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4">
          {AGENTS.map(agent => {
            const isActive = agent.status === 'active'
            return (
              <div key={agent.name} className={`bg-white rounded-xl border p-5 ${isActive ? 'border-blue-200 shadow-sm' : 'border-gray-200 opacity-60'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    {isActive ? <Sparkles className="w-5 h-5 text-blue-600" /> : <Lock className="w-5 h-5 text-gray-400" />}
                  </div>
                  <StatusBadge status={agent.status} />
                </div>

                <h3 className="font-semibold text-gray-900 text-sm">{agent.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{agent.role}</p>
                <p className="text-xs text-gray-400 mt-2">{agent.description}</p>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  {isActive ? (
                    <Link
                      href="/products"
                      className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" /> Run from Projects
                    </Link>
                  ) : (
                    <div className="text-center text-xs text-gray-400 py-2">Coming soon</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
