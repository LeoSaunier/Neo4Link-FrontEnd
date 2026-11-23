import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import './index.css'

// Point d'entrée : React prend le contrôle de la <div id="root"> de index.html.
// BrowserRouter permet d'avoir plusieurs "pages" (URL) sans recharger le navigateur.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
