import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/messages?sessionId=xxx
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  try {
    const [rows] = await db.query(
      `SELECT id, role, display_content, created_at FROM messages
       WHERE session_id = ?
       ORDER BY created_at ASC`,
      [sessionId]
    ) as [Array<{ id: number; role: string; display_content: string; created_at: string }>, unknown]

    return NextResponse.json({ messages: rows })
  } catch (err) {
    console.error('Messages fetch error:', err)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}
