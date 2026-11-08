import { supabase } from '@/lib/supabase'
import { mapQuizLoadError } from './quiz-errors'

export type ActiveMaterial = {
  id: string
  subject: string
  grade: number
  topic: string
  description: string | null
}

type MaterialRecord = {
  id: string
  subject: string
  grade: number
  topic: string
  description: string | null
}

export async function listActiveMaterials(): Promise<ActiveMaterial[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('id, subject, grade, topic, description')
    .eq('is_active', true)
    .order('subject', { ascending: true })
    .order('grade', { ascending: true })
    .order('topic', { ascending: true })

  if (error) throw mapQuizLoadError(error)

  return (data ?? []) as MaterialRecord[]
}
