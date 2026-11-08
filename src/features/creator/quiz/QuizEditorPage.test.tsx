import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiQuizDraft } from '@/api/ai'
import { getQuizForEdit, saveQuiz, type QuizEditorData } from '@/api/quizzes'
import { QuizApiError } from '@/api/quiz-errors'
import { id } from '@/i18n/id'
import { QuizEditorPage } from './QuizEditorPage'

vi.mock('@/api/quizzes', () => ({
  getQuizForEdit: vi.fn(),
  saveQuiz: vi.fn(),
}))

const mockedGetQuizForEdit = vi.mocked(getQuizForEdit)
const mockedSaveQuiz = vi.mocked(saveQuiz)

function renderEditor(path: string, state?: unknown) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: path, state }]}>
        <Routes>
          <Route path="/quizzes/new" element={<QuizEditorPage />} />
          <Route path="/quizzes/:id/edit" element={<QuizEditorPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const existingQuiz: QuizEditorData = {
  id: 'quiz-1',
  title: 'Pecahan kelas 5',
  description: 'Latihan dasar',
  source: 'ai',
  status: 'published',
  materialId: 'material-1',
  revealAnswers: false,
  questions: [
    {
      key: 'question-key',
      type: 'text',
      body: 'Ibu kota Indonesia?',
      points: 2,
      explanation: 'Jakarta adalah ibu kota Indonesia.',
      options: [],
      correctOptionKey: '',
      acceptedAnswers: [{ key: 'answer-key', text: 'Jakarta' }],
    },
  ],
}

describe('QuizEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedSaveQuiz.mockResolvedValue({ id: 'quiz-1', share_code: 'AB12CD' })
  })

  it('menampilkan pesan saat judul dan soal belum diisi', async () => {
    const user = userEvent.setup()
    renderEditor('/quizzes/new')

    await user.click(screen.getByRole('button', { name: id.editor.save }))

    expect(await screen.findByText(id.editor.validation.titleRequired)).toBeInTheDocument()
    expect(screen.getByText(id.editor.validation.questionRequired)).toBeInTheDocument()
    expect(mockedSaveQuiz).not.toHaveBeenCalled()
  })

  it('menyimpan pilihan ganda baru sebagai draf', async () => {
    const user = userEvent.setup()
    renderEditor('/quizzes/new')

    await user.type(screen.getByLabelText(id.editor.titleLabel), 'Pecahan kelas 5')
    await user.click(
      screen.getByRole('button', { name: id.editor.addMultipleChoice }),
    )

    await user.type(screen.getByLabelText(id.editor.question.bodyLabel), '1/2 + 1/4 = ?')
    await user.type(screen.getByLabelText('Teks pilihan A'), '1/4')
    await user.type(screen.getByLabelText('Teks pilihan B'), '3/4')
    await user.click(
      screen.getByRole('radio', {
        name: 'Tandai pilihan B sebagai jawaban benar',
      }),
    )
    await user.click(screen.getByRole('button', { name: id.editor.save }))

    await waitFor(() => {
      expect(mockedSaveQuiz).toHaveBeenCalledTimes(1)
    })

    expect(mockedSaveQuiz).toHaveBeenCalledWith({
      material_id: null,
      title: 'Pecahan kelas 5',
      description: null,
      source: 'manual',
      status: 'draft',
      settings: { reveal_answers: true },
      questions: [
        {
          type: 'multiple_choice',
          body: '1/2 + 1/4 = ?',
          options: ['1/4', '3/4'],
          correct_index: 1,
          explanation: undefined,
          points: 1,
        },
      ],
    })

    expect(
      await screen.findByRole('heading', { name: id.editor.savedDraftTitle }),
    ).toBeInTheDocument()
    expect(screen.getByText('AB12CD')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: id.editor.editTitle }),
    ).toBeInTheDocument()
  })

  it('memuat draf AI, menampilkan pengingat review, lalu menyimpan sebagai AI', async () => {
    const aiDraft: AiQuizDraft = {
      material_id: 'material-1',
      title: 'Pecahan dari AI',
      description: null,
      source: 'ai',
      status: 'draft',
      settings: { reveal_answers: false },
      questions: [
        {
          type: 'multiple_choice',
          body: '1/2 + 1/4 = ?',
          options: ['1/4', '3/4'],
          correct_index: 1,
          explanation: null,
          points: 1,
        },
      ],
    }
    const user = userEvent.setup()
    renderEditor('/quizzes/new', { aiDraft })

    expect(screen.getByText(id.ai.reviewNotice)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Pecahan dari AI')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1/2 + 1/4 = ?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: id.editor.save }))

    await waitFor(() => {
      expect(mockedSaveQuiz).toHaveBeenCalledWith({
        material_id: 'material-1',
        title: 'Pecahan dari AI',
        description: null,
        source: 'ai',
        status: 'draft',
        settings: { reveal_answers: false },
        questions: [
          {
            type: 'multiple_choice',
            body: '1/2 + 1/4 = ?',
            options: ['1/4', '3/4'],
            correct_index: 1,
            explanation: undefined,
            points: 1,
          },
        ],
      })
    })

    expect(
      await screen.findByRole('heading', { name: id.editor.savedDraftTitle }),
    ).toBeInTheDocument()
    expect(screen.queryByText(id.ai.reviewNotice)).not.toBeInTheDocument()
  })

  it('memuat kuis yang sudah ada dan menyimpannya kembali', async () => {
    mockedGetQuizForEdit.mockResolvedValue(existingQuiz)
    const user = userEvent.setup()
    renderEditor('/quizzes/quiz-1/edit')

    expect(await screen.findByDisplayValue('Pecahan kelas 5')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Ibu kota Indonesia?')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Jakarta')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^terbit/i })).toBeChecked()

    await user.click(screen.getByRole('button', { name: id.editor.save }))

    await waitFor(() => {
      expect(mockedSaveQuiz).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'quiz-1',
          material_id: 'material-1',
          source: 'ai',
          status: 'published',
          settings: { reveal_answers: false },
        }),
      )
    })

    expect(
      await screen.findByRole('heading', { name: id.editor.savedPublishedTitle }),
    ).toBeInTheDocument()
  })

  it('menampilkan error saat kuis tidak ditemukan', async () => {
    mockedGetQuizForEdit.mockRejectedValue(new QuizApiError('quiz_not_found'))
    renderEditor('/quizzes/tidak-ada/edit')

    expect(
      await screen.findByRole('heading', { name: id.editor.loadErrorTitle }),
    ).toBeInTheDocument()
    expect(screen.getByText(id.editor.errors.quiz_not_found)).toBeInTheDocument()
  })
})
