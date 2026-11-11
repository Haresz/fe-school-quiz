import { Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { AiQuizPage } from '@/features/creator/ai/AiQuizPage'
import { DashboardPage } from '@/features/creator/dashboard/DashboardPage'
import { QuizEditorPage } from '@/features/creator/quiz/QuizEditorPage'
import { QuizAttemptDetailPage } from '@/features/creator/results/QuizAttemptDetailPage'
import { QuizResultsPage } from '@/features/creator/results/QuizResultsPage'
import { PlayQuizPage } from '@/features/player/PlayQuizPage'
import { PlayerHomePage } from '@/features/player/PlayerHomePage'
import { CreatorLayout } from '@/routes/CreatorLayout'
import { NotFoundPage } from '@/routes/NotFoundPage'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlayerHomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<CreatorLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/quizzes/ai" element={<AiQuizPage />} />
          <Route path="/quizzes/new" element={<QuizEditorPage />} />
          <Route path="/quizzes/:id/edit" element={<QuizEditorPage />} />
          <Route path="/quizzes/:id/results" element={<QuizResultsPage />} />
          <Route
            path="/quizzes/:id/results/:attemptId"
            element={<QuizAttemptDetailPage />}
          />
        </Route>
      </Route>

      <Route path="/play/:code" element={<PlayQuizPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
