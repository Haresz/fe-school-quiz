import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiQuizDraft } from '@/api/ai'
import {
  getQuizForEdit,
  saveQuiz,
  updateQuizMeta,
  type QuizEditorData,
} from '@/api/quizzes'
import { QuizApiError } from '@/api/quiz-errors'
import { id } from '@/i18n/id'
import { formatMessage } from '@/lib/message'
import { QuizEditorPage } from './QuizEditorPage'

vi.mock('@/api/quizzes', () => ({
  getQuizForEdit: vi.fn(),
  saveQuiz: vi.fn(),
  updateQuizMeta: vi.fn(),
}))

const mockedGetQuizForEdit = vi.mocked(getQuizForEdit)
const mockedSaveQuiz = vi.mocked(saveQuiz)
const mockedUpdateQuizMeta = vi.mocked(updateQuizMeta)

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
  shareCode: 'AB12CD',
  hasAttempts: false,
  settings: {
    reveal_answers: false,
    shuffle_questions: false,
    shuffle_options: false,
    timer: { mode: 'none' },
    legacy_note: 'dipertahankan',
  },
  revealAnswers: false,
  shuffleQuestions: false,
  shuffleOptions: false,
  timer: { mode: 'none' },
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
    mockedUpdateQuizMeta.mockResolvedValue(undefined)
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
      settings: {
        reveal_answers: true,
        shuffle_questions: true,
        shuffle_options: true,
        timer: { mode: 'none' },
      },
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
        settings: {
          reveal_answers: false,
          shuffle_questions: true,
          shuffle_options: true,
          timer: { mode: 'none' },
        },
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
          settings: {
            reveal_answers: false,
            shuffle_questions: false,
            shuffle_options: false,
            timer: { mode: 'none' },
            legacy_note: 'dipertahankan',
          },
        }),
      )
    })

    expect(
      await screen.findByRole('heading', { name: id.editor.savedPublishedTitle }),
    ).toBeInTheDocument()
  })

  it('menampilkan nilai efektif acak lama dan menyimpan pengaturan waktu', async () => {
    mockedGetQuizForEdit.mockResolvedValue(existingQuiz)
    const user = userEvent.setup()
    renderEditor('/quizzes/quiz-1/edit')

    await screen.findByDisplayValue('Pecahan kelas 5')
    expect(
      screen.getByRole('checkbox', {
        name: new RegExp(`^${id.editor.shuffleQuestions}`),
      }),
    ).not.toBeChecked()
    expect(
      screen.getByRole('checkbox', {
        name: new RegExp(`^${id.editor.shuffleOptions}`),
      }),
    ).not.toBeChecked()

    await user.click(screen.getByRole('radio', { name: id.editor.timerTotal }))
    const minutes = screen.getByLabelText(id.editor.timerTotalLabel)
    await user.clear(minutes)
    await user.type(minutes, '20')

    expect(
      screen.getByText(
        formatMessage(id.editor.timerTotalPreview, { minutes: '20' }),
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: id.editor.save }))

    await waitFor(() => {
      expect(mockedSaveQuiz).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: {
            reveal_answers: false,
            shuffle_questions: false,
            shuffle_options: false,
            timer: { mode: 'total', seconds: 1200 },
            legacy_note: 'dipertahankan',
          },
        }),
      )
    })
  })

  it('menolak waktu di luar batas sebelum mengirim', async () => {
    mockedGetQuizForEdit.mockResolvedValue(existingQuiz)
    const user = userEvent.setup()
    renderEditor('/quizzes/quiz-1/edit')

    await screen.findByDisplayValue('Pecahan kelas 5')
    await user.click(screen.getByRole('radio', { name: id.editor.timerTotal }))
    const minutes = screen.getByLabelText(id.editor.timerTotalLabel)
    await user.clear(minutes)
    await user.type(minutes, '121')
    await user.click(screen.getByRole('button', { name: id.editor.save }))

    expect(
      await screen.findByText(id.editor.validation.timerTotalRange),
    ).toBeInTheDocument()
    expect(mockedSaveQuiz).not.toHaveBeenCalled()
  })

  it('menampilkan soal hanya-baca dan menyimpan metadata lewat update langsung', async () => {
    mockedGetQuizForEdit.mockResolvedValue({
      ...existingQuiz,
      hasAttempts: true,
    })
    const user = userEvent.setup()
    renderEditor('/quizzes/quiz-1/edit')

    expect(
      await screen.findByRole('heading', { name: id.editor.readOnlyTitle }),
    ).toBeInTheDocument()
    expect(screen.getByText(id.editor.readOnlyBody)).toBeInTheDocument()
    expect(screen.getByText('Ibu kota Indonesia?')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: id.editor.addMultipleChoice }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^draf/i })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /^terbit/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: id.editor.save }))

    await waitFor(() => {
      expect(mockedUpdateQuizMeta).toHaveBeenCalledWith({
        id: 'quiz-1',
        title: 'Pecahan kelas 5',
        description: 'Latihan dasar',
        settings: {
          reveal_answers: false,
          shuffle_questions: false,
          shuffle_options: false,
          timer: { mode: 'none' },
          legacy_note: 'dipertahankan',
        },
      })
    })
    expect(mockedSaveQuiz).not.toHaveBeenCalled()
  })

  it('menampilkan detail error pengaturan dari server', async () => {
    mockedGetQuizForEdit.mockResolvedValue(existingQuiz)
    mockedSaveQuiz.mockRejectedValue(
      new QuizApiError('invalid_quiz', 'settings.timer.seconds harus 60-7200'),
    )
    const user = userEvent.setup()
    renderEditor('/quizzes/quiz-1/edit')

    await screen.findByDisplayValue('Pecahan kelas 5')
    await user.click(screen.getByRole('button', { name: id.editor.save }))

    expect(
      await screen.findByText(
        formatMessage(id.editor.validation.invalidQuizFromServer, {
          detail: 'settings.timer.seconds harus 60-7200',
        }),
      ),
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
