export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  display_content?: string
  created_at: string
}

export interface Deadline {
  id: string
  session_id: string
  task: string
  due_date: string       // ISO date string: 'YYYY-MM-DD'
  raw_date?: string
  completed: boolean
  created_at: string
}

export interface ChatRequest {
  sessionId: string
  message: string
  context?: string       // Optional pasted calendar/task context
}

export interface ChatResponse {
  message: string
  newDeadlines: Deadline[]
}
