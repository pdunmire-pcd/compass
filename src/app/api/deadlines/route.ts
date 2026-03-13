import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/deadlines?sessionId=xxx
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  try {
    const [rows] = await db.query(
      `SELECT * FROM deadlines WHERE session_id = ? ORDER BY due_date ASC`,
      [sessionId]
    )
    return NextResponse.json({ deadlines: rows })
  } catch (err) {
    console.error('Deadlines fetch error:', err)
    return NextResponse.json({ error: 'Failed to load deadlines' }, { status: 500 })
  }
}

// PATCH /api/deadlines — toggle completed
// Body: { id: number, completed: boolean }
export async function PATCH(req: NextRequest) {
  const { id, completed } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    await db.query(
      `UPDATE deadlines SET completed = ? WHERE id = ?`,
      [completed ? 1 : 0, id]
    )
    const [rows] = await db.query(`SELECT * FROM deadlines WHERE id = ?`, [id])
    return NextResponse.json({ deadline: (rows as unknown[])[0] })
  } catch (err) {
    console.error('Deadline update error:', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

// DELETE /api/deadlines
// Body: { id: number }
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    await db.query(`DELETE FROM deadlines WHERE id = ?`, [id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Deadline delete error:', err)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
