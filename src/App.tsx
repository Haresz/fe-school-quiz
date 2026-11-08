import { Route, Routes } from 'react-router-dom'
import { PlayerHomePage } from '@/features/player/PlayerHomePage'
import { id } from '@/i18n/id'
import { NotFoundPage } from '@/routes/NotFoundPage'
import { PlaceholderPage } from '@/routes/PlaceholderPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlayerHomePage />} />
      <Route
        path="/login"
        element={
          <PlaceholderPage
            title={id.placeholders.login.title}
            description={id.placeholders.login.description}
          />
        }
      />
      <Route
        path="/signup"
        element={
          <PlaceholderPage
            title={id.placeholders.signup.title}
            description={id.placeholders.signup.description}
          />
        }
      />
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
