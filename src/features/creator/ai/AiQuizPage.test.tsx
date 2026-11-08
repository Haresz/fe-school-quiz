import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AiApiError,
  generateQuizWithAi,
  type AiQuizDraft,
} from '@/api/ai'
import { listActiveMaterials } from '@/api/materials'
import { QuizApiError } from '@/api/quiz-errors'
import {
  AuthContext,
  type AuthContextValue,
} from '@/features/auth/auth-context'
import { id } from '@/i18n/id'
import { AiQuizPage } from './AiQuizPage'

vi.mock('@/api/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/ai')>()
  return {
    ...actual,
    generateQuizWithAi: vi.fn(),
  }
})

vi.mock('@/api/materials', () => ({
  listActiveMaterials: vi.fn(),
}))

const mockedGenerateQuizWithAi = vi.mocked(generateQuizWithAi)
const mockedListActiveMaterials = vi.mocked(listActiveMaterials)

const fakeUser = {
  id: 'user-1',
  email: 'guru@example.com',
  user_metadata: {},
} as unknown as User

const authValue: AuthContextValue = {
  session: { access_token: 'test-token', user: fakeUser } as unknown as Session,
  user: fakeUser,
  status: 'authenticated',
  signIn: async () => {
    throw new Error('tidak dipakai')
  },
  signUp: async () => {
    throw new Error('tidak dipakai')
  },
  signOut: async () => undefined,
}

const material = {
  id: 'material-1',
  subject: 'Matematika',
  grade: 5,
  topic: 'Pecahan',
  description: 'Penjumlahan dan pengurangan pecahan.',
}

const draft: AiQuizDraft = {
  material_id: 'material-1',
  title: 'Pecahan dari AI',
  description: 'Latihan pecahan.',
  source: 'ai',
  status: 'draft',
  settings: { reveal_answers: true },
  questions: [
    {
      type: 'multiple_choice',
      body: '1/2 + 1/4 = ?',
      options: ['1/4', '3/4'],
      correct_index: 1,
      explanation: 'Samakan penyebut terlebih dulu.',
      points: 1,
    },
  ],
}

function LocationProbe() {
  const location = useLocation()
  return <pre data-testid="location-state">{JSON.stringify(location.state)}</pre>
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/quizzes/ai']}>
          <Routes>
            <Route path="/quizzes/ai" element={<AiQuizPage />} />
            <Route path="/quizzes/new" element={<LocationProbe />} />
            <Route path="/dashboard" element={<p>Dasbor</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('AiQuizPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedListActiveMaterials.mockResolvedValue([material])
    mockedGenerateQuizWithAi.mockResolvedValue({
      generationId: 'generation-1',
      draft,
    })
  })

  it('mengirim arahan AI lalu membuka editor dengan draf', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(
      await screen.findByRole('heading', { name: id.ai.formTitle }),
    ).toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText(id.ai.materialLabel),
      'material-1',
    )
    await user.type(
      screen.getByLabelText(id.ai.promptLabel),
      'Fokus pada soal cerita.',
    )
    await user.selectOptions(
      screen.getByLabelText(id.ai.mixLabel),
      'text_only',
    )
    await user.selectOptions(
      screen.getByLabelText(id.ai.difficultyLabel),
      'sulit',
    )
    await user.click(screen.getByRole('button', { name: id.ai.submit }))

    await waitFor(() => {
      expect(mockedGenerateQuizWithAi).toHaveBeenCalledWith(
        {
          materialId: 'material-1',
          prompt: 'Fokus pada soal cerita.',
          numQuestions: 5,
          mix: 'text_only',
          difficulty: 'sulit',
        },
        'test-token',
      )
    })

    await waitFor(() => {
      const state = JSON.parse(
        screen.getByTestId('location-state').textContent ?? '{}',
      ) as { aiDraft?: AiQuizDraft }
      expect(state.aiDraft).toEqual(draft)
    })
  })

  it('menampilkan pesan dari kode error AI', async () => {
    mockedGenerateQuizWithAi.mockRejectedValue(new AiApiError('rate_limited'))
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: id.ai.formTitle })
    await user.selectOptions(
      screen.getByLabelText(id.ai.materialLabel),
      'material-1',
    )
    await user.click(screen.getByRole('button', { name: id.ai.submit }))

    expect(
      await screen.findByRole('heading', { name: id.ai.errorTitle }),
    ).toBeInTheDocument()
    expect(screen.getByText(id.ai.errors.rate_limited)).toBeInTheDocument()
    expect(screen.queryByTestId('location-state')).not.toBeInTheDocument()
  })

  it('menampilkan keadaan kosong saat belum ada materi aktif', async () => {
    mockedListActiveMaterials.mockResolvedValue([])
    renderPage()

    expect(
      await screen.findByRole('heading', { name: id.ai.materialEmptyTitle }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: id.ai.createManually }),
    ).toHaveAttribute('href', '/quizzes/new')
  })

  it('bisa mencoba lagi saat materi gagal dimuat', async () => {
    mockedListActiveMaterials
      .mockRejectedValueOnce(new QuizApiError('load_failed'))
      .mockResolvedValueOnce([material])
    const user = userEvent.setup()
    renderPage()

    expect(
      await screen.findByRole('heading', { name: id.ai.materialErrorTitle }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: id.common.retry }))

    expect(
      await screen.findByRole('heading', { name: id.ai.formTitle }),
    ).toBeInTheDocument()
  })
})
