// Tipe baris ditulis tangan karena Supabase CLI tidak tersedia di lingkungan ini.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type QuizSource = 'manual' | 'ai'
export type QuizStatus = 'draft' | 'published'
export type QuestionType = 'multiple_choice' | 'text'

export type QuizTimerSettings =
  | { mode: 'none' }
  | { mode: 'per_question'; seconds: number }
  | { mode: 'total'; seconds: number }

export type QuizSettings = {
  reveal_answers?: boolean
  shuffle_questions?: boolean
  shuffle_options?: boolean
  timer?: QuizTimerSettings
  [key: string]: unknown
}

export type ProfileRow = {
  id: string
  display_name: string
  role: 'creator' | 'admin'
  created_at: string
}

export type MaterialRow = {
  id: string
  subject: string
  grade: number
  topic: string
  description: string | null
  prompt_context: string
  is_active: boolean
  created_at: string
}

export type QuizRow = {
  id: string
  owner_id: string
  material_id: string | null
  title: string
  description: string | null
  source: QuizSource
  status: QuizStatus
  share_code: string
  settings: QuizSettings
  created_at: string
  updated_at: string
}

export type QuestionRow = {
  id: string
  quiz_id: string
  position: number
  type: QuestionType
  body: string
  options: string[] | null
  explanation: string | null
  points: number
}

export type QuestionKeyRow = {
  question_id: string
  correct_index: number | null
  accepted_answers: string[] | null
}

export type AttemptRow = {
  id: string
  quiz_id: string
  participant_name: string
  score: number
  max_score: number
  created_at: string
}

export type AttemptAnswerRow = {
  attempt_id: string
  question_id: string
  answer: Json
  is_correct: boolean
  points_awarded: number
}

export type AiGenerationRow = {
  id: string
  user_id: string
  material_id: string | null
  prompt: string
  model: string
  status: 'pending' | 'success' | 'invalid_json' | 'error'
  output: Json | null
  created_at: string
}
