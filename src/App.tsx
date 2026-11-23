import { Link, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { RequireUser } from './components/RequireUser'
import { EmptyState } from './components/ui'
import { FeedPage } from './pages/FeedPage'
import { LoginPage } from './pages/LoginPage'
import { PeoplePage } from './pages/PeoplePage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'
import { SuggestionsPage } from './pages/SuggestionsPage'

/**
 * Table des routes : quelle URL affiche quelle page.
 * Toutes les pages sont dans <Layout> (barre du haut + panneau Coulisses).
 * Celles dans <RequireUser> demandent d'être connecté.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route element={<RequireUser />}>
          <Route index element={<FeedPage />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="suggestions" element={<SuggestionsPage />} />
          <Route path="users/:id" element={<ProfilePage />} />
        </Route>
        <Route
          path="*"
          element={
            <EmptyState title="Page introuvable">
              <Link to="/" className="font-medium text-neo hover:underline">
                Retour au fil
              </Link>
            </EmptyState>
          }
        />
      </Route>
    </Routes>
  )
}
