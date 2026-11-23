import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { USE_MOCK } from '../api'
import { useCurrentUser } from '../context/currentUser'
import { Avatar } from './Avatar'
import { BackstagePanel } from './BackstagePanel'
import { HomeIcon, LogoutIcon, SparklesIcon, TerminalIcon, UsersIcon } from './icons'

// Mise en page commune à toutes les pages : barre du haut, contenu de la page (<Outlet />),
// et panneau « Coulisses » à droite (en bas sur mobile).

const PANEL_KEY = 'neo4link.backstageOpen'

function readPanelPreference(): boolean {
  try {
    const stored = localStorage.getItem(PANEL_KEY)
    if (stored !== null) return stored === 'true'
  } catch {
    // ignore
  }
  return window.matchMedia('(min-width: 1024px)').matches // ouvert par défaut sur grand écran
}

function savePanelPreference(open: boolean) {
  try {
    localStorage.setItem(PANEL_KEY, String(open))
  } catch {
    // ignore
  }
}

const NAV_ITEMS = [
  { to: '/', label: 'Fil', icon: HomeIcon, end: true },
  { to: '/people', label: 'Personnes', icon: UsersIcon, end: false },
  { to: '/suggestions', label: 'Suggestions', icon: SparklesIcon, end: false },
]

export function Layout() {
  const { user, logout } = useCurrentUser()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [panelOpen, setPanelOpen] = useState(readPanelPreference)

  // Revenir en haut de la page à chaque changement de page
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  function togglePanel(open: boolean) {
    setPanelOpen(open)
    savePanelPreference(open)
  }

  function switchProfile() {
    logout()
    navigate('/login')
  }

  const navLinks = user && (
    <>
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`
          }
        >
          <Icon className="size-4" />
          {label}
        </NavLink>
      ))}
    </>
  )

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
            <img src="/favicon.svg" alt="" className="size-7" />
            Neo4Link
          </Link>

          <nav className="hidden items-center gap-1 md:flex">{navLinks}</nav>

          <div className="ml-auto flex items-center gap-2">
            <span
              className={`hidden rounded-full px-2 py-0.5 text-xs font-medium sm:inline ${
                USE_MOCK ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
              title={USE_MOCK ? 'Données simulées dans le navigateur (VITE_USE_MOCK=true)' : 'Connecté au back FastAPI'}
            >
              {USE_MOCK ? 'API simulée' : 'API réelle'}
            </span>

            <button
              onClick={() => togglePanel(!panelOpen)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
                panelOpen ? 'bg-slate-900 text-white' : 'text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100'
              }`}
              aria-pressed={panelOpen}
            >
              <TerminalIcon className="size-4" />
              <span className="hidden sm:inline">Coulisses</span>
            </button>

            {user && (
              <>
                <Link to={`/users/${user.id}`} className="flex items-center gap-2 rounded-full py-1 pr-1 pl-1 hover:bg-slate-100 sm:pr-3" title="Mon profil">
                  <Avatar user={user} size="sm" />
                  <span className="hidden text-sm font-medium text-slate-700 lg:inline">{user.display_name}</span>
                </Link>
                <button
                  onClick={switchProfile}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  title="Changer de profil"
                  aria-label="Changer de profil"
                >
                  <LogoutIcon className="size-5" />
                </button>
              </>
            )}
          </div>
        </div>
        {user && <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">{navLinks}</nav>}
      </header>

      {/* Sur mobile, quand le tiroir est ouvert, on ajoute de la marge en bas pour pouvoir faire défiler le contenu au-dessus. */}
      <div className={`mx-auto flex max-w-7xl gap-6 px-4 py-6 ${panelOpen ? 'pb-[52vh] lg:pb-6' : ''}`}>
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-2xl">
            <Outlet />
          </div>
        </main>

        {/* Sur grand écran : colonne de droite collante. Sur mobile : tiroir en bas de l'écran. */}
        <aside
          className={
            panelOpen
              ? 'fixed inset-x-0 bottom-0 z-40 h-[50vh] p-2 lg:static lg:z-auto lg:h-auto lg:w-[420px] lg:shrink-0 lg:p-0'
              : 'hidden'
          }
        >
          <div className="h-full lg:sticky lg:top-20 lg:h-[calc(100vh-6.5rem)]">
            <BackstagePanel onClose={() => togglePanel(false)} />
          </div>
        </aside>
      </div>
    </div>
  )
}
