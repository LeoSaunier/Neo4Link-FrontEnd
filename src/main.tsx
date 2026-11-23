import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import { CurrentUserProvider } from './context/CurrentUserProvider.tsx'
import './index.css'

// Point d'entrée : React prend le contrôle de la <div id="root"> de index.html.
//  - BrowserRouter : plusieurs "pages" (URL) sans recharger le navigateur
//  - CurrentUserProvider : partage l'utilisateur connecté avec toute l'application
//
// Remarque : on n'utilise pas <StrictMode>. En développement, il exécute chaque effet deux fois,
// donc chaque appel API partirait en double dans le panneau « Coulisses », ce qui brouille la démo.
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <CurrentUserProvider>
      <App />
    </CurrentUserProvider>
  </BrowserRouter>,
)
