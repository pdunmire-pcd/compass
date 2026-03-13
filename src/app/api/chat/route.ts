import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/db'
import { COMPASS_SYSTEM, DEADLINE_EXTRACT_SYSTEM } from '@/lib/prompts'
import type { ChatRequest, Deadline } from '@/lib/types'
import type { ResultSetHeader } from 'mysql2'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json()
    const { sessionId, message, context } = body

    if (!sessionId || !message) {
      return NextResponse.json({ error: 'Missing sessionId or message' }, { status: 400 })
    }

    const userContent = context
      ? `Here is my current schedule and task list for context:\n\n${context}\n\n---\n\n${message}`
      : message

    // Fetch last 40 messages for conversation history
    const [historyRows] = await db.query(
      `SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 40`,
      [sessionId]
    ) as [Array<{ role: string; content: string }>, unknown]

    const history = historyRows.map(row => ({
      role: row.role as 'user' | 'assistant',
      content: row.content,
    }))

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const systemWithDate = `${COMPASS_SYSTEM}\n\nToday's date is: ${today}.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemWithDate,
      messages: [...history, { role: 'user', content: userContent }],
    })

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Something went wrong — please try again.'

    await db.query(
      `INSERT INTO messages (session_id, role, content, display_content) VALUES (?, ?, ?, ?)`,
      [sessionId, 'user', userContent, message]
    )

    await db.query(
      `INSERT INTO messages (session_id, role, content, display_content) VALUES (?, ?, ?, ?)`,
      [sessionId, 'assistant', assistantMessage, assistantMessage]
    )

    const newDeadlines = await extractDeadlines(sessionId, userContent, assistantMessage)

    return NextResponse.json({ message: assistantMessage, newDeadlines })
  } catch (err) {
    console.error('Chat API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function extractDeadlines(
  sessionId: string,
  userText: string,
  assistantText: string
): Promise<Deadline[]> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const combined = `Today is ${today}.\n\nUser said:\n${userText}\n\nAssistant said:\n${assistantText}`

    const extractRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: DEADLINE_EXTRACT_SYSTEM,
      messages: [{ role: 'user', content: combined }],
    })

    const raw = extractRes.content[0].type === 'text' ? extractRes.content[0].text.trim() : '[]'
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return []

    const [existing] = await db.query(
      `SELECT task FROM deadlines WHERE session_id = ?`,
      [sessionId]
    ) as [Array<{ task: string }>, unknown]

    const existingTasks = new Set(existing.map((d: { task: string }) => d.task.toLowerCase()))

    const toInsert = parsed.filter((d: { task: string; date: string }) =>
      d.task && d.date && !existingTasks.has(d.task.toLowerCase())
    )

    if (toInsert.length === 0) return []

    const inserted: Deadline[] = []
    for (const d of toInsert) {
      const [result] = await db.query(
        `INSERT INTO deadlines (session_id, task, due_date, raw_date, completed) VALUES (?, ?, ?, ?, 0)`,
        [sessionId, d.task, d.date, d.raw || null]
      ) as [ResultSetHeader, unknown]

      const [rows] = await db.query(
        `SELECT * FROM deadlines WHERE id = ?`,
        [result.insertId]
      ) as [Deadline[], unknown]

      if (rows[0]) inserted.push(rows[0])
    }

    return inserted
  } catch (err) {
    console.error('Deadline extraction failed (non-fatal):', err)
    return []
  }
}
