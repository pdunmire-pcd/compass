'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Deadline } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('compass:sessionId')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('compass:sessionId', id)
  }
  return id
}

function getDaysUntil(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(dateStr + 'T00:00:00')
  return Math.ceil((due.getTime() - now.getTime()) / 86400000)
}

function formatDeadlineDate(dateStr: string): { label: string; urgency: 'overdue' | 'urgent' | 'soon' | 'normal' } {
  const days = getDaysUntil(dateStr)
  if (days < 0) return { label: 'overdue', urgency: 'overdue' }
  if (days === 0) return { label: 'today', urgency: 'urgent' }
  if (days === 1) return { label: 'tomorrow', urgency: 'urgent' }
  if (days <= 3) return { label: `${days} days`, urgency: 'soon' }
  const d = new Date(dateStr + 'T00:00:00')
  return {
    label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    urgency: 'normal',
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const STARTERS = [
  'Help me figure out what to tackle first this week.',
  'I feel behind on everything. Help me make sense of it.',
  'I have a big deadline coming up. Help me build a plan.',
  'Quick check-in — what should I be doing right now?',
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex flex-col items-start max-w-[86%] message-enter">
      <div className="text-[10px] font-medium uppercase tracking-widest text-compass-hint mb-1">compass</div>
      <div className="flex gap-1 px-3 py-3 bg-compass-sidebar border border-compass-border rounded-[13px] rounded-tl-[3px]">
        <div className="typing-dot w-[5px] h-[5px] rounded-full bg-compass-hint" />
        <div className="typing-dot w-[5px] h-[5px] rounded-full bg-compass-hint" />
        <div className="typing-dot w-[5px] h-[5px] rounded-full bg-compass-hint" />
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: UIMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex flex-col max-w-[86%] message-enter ${isUser ? 'self-end items-end' : 'self-start items-start'}`}>
      <div className="text-[10px] font-medium uppercase tracking-widest text-compass-hint mb-1">
        {isUser ? 'you' : 'compass'}
      </div>
      <div
        className={`px-3 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-compass-bubble-user text-compass-bubble-user-text rounded-[13px] rounded-br-[3px]'
            : 'bg-compass-bubble-assistant text-compass-text border border-compass-border rounded-[13px] rounded-tl-[3px]'
        }`}
      >
        {msg.content}
      </div>
      <div className="text-[10px] text-compass-hint mt-1">{formatTime(msg.created_at)}</div>
    </div>
  )
}

function DeadlineItem({
  deadline,
  onToggle,
  onDelete,
}: {
  deadline: Deadline
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}) {
  const { label, urgency } = formatDeadlineDate(deadline.due_date)
  const urgencyColor =
    urgency === 'overdue' ? 'text-compass-urgent' :
    urgency === 'urgent' ? 'text-compass-urgent' :
    urgency === 'soon' ? 'text-compass-soon' :
    'text-compass-hint'

  return (
    <div className={`px-2.5 py-2 rounded-lg border border-compass-border bg-white mb-1.5 group transition-opacity ${deadline.completed ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-2">
        <button
          onClick={() => onToggle(deadline.id, !deadline.completed)}
          className={`mt-0.5 w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors ${
            deadline.completed
              ? 'bg-compass-accent border-compass-accent'
              : 'border-compass-border hover:border-compass-muted'
          }`}
        >
          {deadline.completed && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-[12px] text-compass-text leading-snug ${deadline.completed ? 'line-through' : ''}`}>
            {deadline.task}
          </div>
          <div className={`text-[11px] mt-0.5 ${urgencyColor}`}>{label}</div>
        </div>
        <button
          onClick={() => onDelete(deadline.id)}
          className="opacity-0 group-hover:opacity-100 text-compass-hint hover:text-compass-muted transition-opacity text-xs"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CompassApp() {
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [input, setInput] = useState('')
  const [context, setContext] = useState('')
  const [showContext, setShowContext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState('')
  const [followUpItems, setFollowUpItems] = useState<Deadline[]>([])
  const [showFollowUp, setShowFollowUp] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Initialize session and load data
  useEffect(() => {
    const id = getOrCreateSessionId()
    setSessionId(id)

    async function init(sid: string) {
      try {
        const [msgsRes, dlRes] = await Promise.all([
          fetch(`/api/messages?sessionId=${sid}`),
          fetch(`/api/deadlines?sessionId=${sid}`),
        ])
        const msgsData = await msgsRes.json()
        const dlData = await dlRes.json()

        const loadedMessages: UIMessage[] = (msgsData.messages || []).map((m: {
          id: string; role: string; display_content: string; created_at: string
        }) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.display_content || '',
          created_at: m.created_at,
        }))

        const loadedDeadlines: Deadline[] = dlData.deadlines || []

        setMessages(loadedMessages)
        setDeadlines(loadedDeadlines)

        // Check for follow-ups: deadlines due within 3 days that aren't completed
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const upcoming = loadedDeadlines.filter(d => {
          if (d.completed) return false
          const days = getDaysUntil(d.due_date)
          return days >= 0 && days <= 3
        })
        if (upcoming.length > 0 && loadedMessages.length > 0) {
          setFollowUpItems(upcoming)
          setShowFollowUp(true)
        }
      } catch (e) {
        console.error('Init error:', e)
      } finally {
        setIsInitializing(false)
      }
    }

    init(id)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || isLoading || !sessionId) return

    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    setError('')
    setShowFollowUp(false)

    const tempId = crypto.randomUUID()
    const tempMsg: UIMessage = {
      id: tempId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: text,
          context: context.trim() || undefined,
        }),
      })

      // Clear context after first use
      if (context.trim()) setContext('')

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')

      const assistantMsg: UIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])

      // Add any new deadlines
      if (data.newDeadlines?.length > 0) {
        setDeadlines(prev => {
          const existingIds = new Set(prev.map(d => d.id))
          const fresh = data.newDeadlines.filter((d: Deadline) => !existingIds.has(d.id))
          return [...prev, ...fresh].sort((a, b) =>
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          )
        })
      }
    } catch (e) {
      setError('Something went wrong. Try again.')
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, sessionId, context])

  const handleToggleDeadline = async (id: string, completed: boolean) => {
    setDeadlines(prev => prev.map(d => d.id === id ? { ...d, completed } : d))
    await fetch('/api/deadlines', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, completed }),
    })
  }

  const handleDeleteDeadline = async (id: string) => {
    setDeadlines(prev => prev.filter(d => d.id !== id))
    await fetch('/api/deadlines', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  const handleClearAll = async () => {
    if (!confirm('Clear all conversations and deadlines? This cannot be undone.')) return
    const newId = crypto.randomUUID()
    localStorage.setItem('compass:sessionId', newId)
    setSessionId(newId)
    setMessages([])
    setDeadlines([])
    setFollowUpItems([])
    setShowFollowUp(false)
  }

  const activeDeadlines = deadlines.filter(d => {
    if (d.completed) return false
    const days = getDaysUntil(d.due_date)
    return days >= -1
  })

  const completedDeadlines = deadlines.filter(d => d.completed).slice(-3)

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-compass-bg">
        <div className="text-compass-hint text-sm font-sans">Loading your schedule...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-compass-bg" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* ── Sidebar ─────────────────────────────────────── */}
      <div className="w-[220px] flex-shrink-0 border-r border-compass-border flex flex-col bg-compass-sidebar">
        {/* Logo */}
        <div className="px-4 pt-5 pb-4 border-b border-compass-border">
          <div style={{ fontFamily: "'Lora', Georgia, serif" }} className="text-[20px] font-medium text-compass-text">
            Compass
          </div>
          <div className="text-[10px] text-compass-hint uppercase tracking-widest mt-0.5">your week, organized</div>
        </div>

        {/* Deadlines */}
        <div className="flex-1 overflow-y-auto px-3 pt-4">
          <div className="text-[10px] font-medium uppercase tracking-widest text-compass-hint mb-3 px-1">
            Upcoming
          </div>

          {activeDeadlines.length === 0 ? (
            <div className="text-[12px] text-compass-hint italic px-1">
              No deadlines tracked yet. Mention one in chat!
            </div>
          ) : (
            activeDeadlines.map(d => (
              <DeadlineItem
                key={d.id}
                deadline={d}
                onToggle={handleToggleDeadline}
                onDelete={handleDeleteDeadline}
              />
            ))
          )}

          {completedDeadlines.length > 0 && (
            <>
              <div className="text-[10px] font-medium uppercase tracking-widest text-compass-hint mb-2 mt-4 px-1">
                Done
              </div>
              {completedDeadlines.map(d => (
                <DeadlineItem
                  key={d.id}
                  deadline={d}
                  onToggle={handleToggleDeadline}
                  onDelete={handleDeleteDeadline}
                />
              ))}
            </>
          )}
        </div>

        {/* Clear button */}
        <div className="p-3 border-t border-compass-border">
          <button
            onClick={handleClearAll}
            className="w-full text-left text-[11px] text-compass-hint hover:text-compass-muted py-1.5 px-2 rounded hover:bg-compass-bg transition-colors"
          >
            Clear all data
          </button>
        </div>
      </div>

      {/* ── Main area ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-compass-border flex items-center justify-between flex-shrink-0 bg-white">
          <div style={{ fontFamily: "'Lora', Georgia, serif" }} className="text-[15px] font-medium text-compass-text">
            Chat
          </div>
          <button
            onClick={() => setShowContext(v => !v)}
            className="text-[11px] text-compass-muted bg-compass-sidebar border border-compass-border rounded-lg px-3 py-1 hover:bg-compass-bg transition-colors"
          >
            {showContext ? '− hide context' : '+ add calendar / tasks'}
          </button>
        </div>

        {/* Context panel */}
        {showContext && (
          <div className="px-5 py-3 border-b border-compass-border bg-compass-sidebar flex-shrink-0">
            <div className="text-[10px] font-medium uppercase tracking-widest text-compass-hint mb-2">
              Your schedule &amp; tasks
            </div>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="Paste your calendar events, Canvas assignments, to-dos, deadlines... Compass will use this as context for your next message."
              className="w-full min-h-[80px] resize-y border border-compass-border rounded-lg px-3 py-2 text-[12px] bg-white text-compass-text placeholder:text-compass-hint focus:outline-none focus:border-compass-muted leading-relaxed"
            />
            <div className="text-[10px] text-compass-hint mt-1.5">
              This context will be sent with your next message, then cleared.
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
          {/* Follow-up banner */}
          {showFollowUp && followUpItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 message-enter">
              <div className="text-[12px] font-medium text-amber-800 mb-1">Welcome back — heads up</div>
              <div className="text-[12px] text-amber-700 leading-relaxed">
                {followUpItems.map(d => {
                  const { label } = formatDeadlineDate(d.due_date)
                  return `• ${d.task} — due ${label}`
                }).join('\n')}
              </div>
              <button
                onClick={() => sendMessage(`I'm back! Can you help me figure out what to focus on? I have these coming up soon: ${followUpItems.map(d => d.task).join(', ')}.`)}
                className="mt-2 text-[11px] text-amber-700 border border-amber-300 rounded-lg px-3 py-1 hover:bg-amber-100 transition-colors"
              >
                Let's tackle these ↗
              </button>
            </div>
          )}

          {/* Welcome screen */}
          {messages.length === 0 && !showFollowUp && (
            <div className="text-center py-10">
              <div style={{ fontFamily: "'Lora', Georgia, serif" }} className="text-[32px] italic text-compass-text mb-2">
                ◎
              </div>
              <h2 style={{ fontFamily: "'Lora', Georgia, serif" }} className="text-[17px] font-medium text-compass-text mb-2">
                Hey, I&apos;m Compass.
              </h2>
              <p className="text-[13px] text-compass-muted leading-relaxed max-w-[360px] mx-auto mb-5">
                Tell me what&apos;s on your plate — or paste in your calendar and assignments above — and I&apos;ll help you figure out where to start. I&apos;ll remember everything we talk about.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {STARTERS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-[11px] text-compass-muted bg-compass-sidebar border border-compass-border rounded-full px-3 py-1.5 hover:bg-compass-bg hover:text-compass-text transition-colors"
                  >
                    {s.replace('.', '')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {isLoading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 pb-5 pt-3 border-t border-compass-border flex-shrink-0 bg-white">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                autoResize(e.target)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="What's on your mind? (Shift+Enter for new line)"
              rows={1}
              className="flex-1 resize-none border border-compass-border rounded-xl px-3.5 py-2.5 text-[13px] bg-white text-compass-text placeholder:text-compass-hint focus:outline-none focus:border-compass-muted leading-relaxed min-h-[40px] max-h-[120px] overflow-y-auto"
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="w-9 h-9 rounded-full bg-compass-text text-white flex items-center justify-center flex-shrink-0 hover:opacity-80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 13V3M8 3L3.5 7.5M8 3L12.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          {error && <div className="text-[11px] text-compass-urgent mt-2 text-center">{error}</div>}
        </div>
      </div>
    </div>
  )
}
