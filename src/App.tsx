import { Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { PlayerHomePage } from '@/features/player/PlayerHomePage'
import { id } from '@/i18n/id'
import { CreatorLayout } from '@/routes/CreatorLayout'
import { NotFoundPage } from '@/routes/NotFoundPage'
import { PlaceholderPage } from '@/routes/PlaceholderPage'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlayerHomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<CreatorLayout />}>
          <Route
            path="/dashboard"
            element={
              <PlaceholderPage
                title={id.placeholders.dashboard.title}
                description={id.placeholders.dashboard.description}
              />
            }
          />
          <Route
            path="/quizzes/new"
            element={
              <PlaceholderPage
                title={id.placeholders.newQuiz.title}
                description={id.placeholders.newQuiz.description}
              />
            }
          />
          <Route
            path="/quizzes/:id/edit"
            element={
              <PlaceholderPage
                title={id.placeholders.editQuiz.title}
                description={id.placeholders.editQuiz.description}
              />
            }
          />
          <Route
            path="/quizzes/:id/results"
            element={
              <PlaceholderPage
                title={id.placeholders.results.title}
                description={id.placeholders.results.description}
              />
            }
          />
        </Route>
      </Route>

      <Route
        path="/play/:code"
        element={
          <PlaceholderPage
            title={id.placeholders.play.title}
            description={id.placeholders.play.description}
          />
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
