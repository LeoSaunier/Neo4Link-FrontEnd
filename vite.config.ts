import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Lit les variables des fichiers .env (et .env.local) pour la config du serveur
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:8000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // Proxy de développement : le navigateur appelle /api/users sur le port 5173,
      // Vite retransmet la requête à http://localhost:8000/users.
      // Comme le navigateur ne parle qu'à une seule origine, pas besoin de CORS côté back.
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
