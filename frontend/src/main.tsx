import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

/* Un redémarrage du serveur Vite (ou un déploiement) invalide les chunks déjà
   référencés : le navigateur obtient alors « Failed to fetch dynamically
   imported module ». On recharge une seule fois pour récupérer les nouveaux
   fichiers. Le délai de garde évite une boucle si le serveur reste cassé ;
   dans ce cas l'ErrorBoundary affiche l'écran de secours. */
const CHUNK_RELOAD_KEY = 'mnktax:chunk-reload-at'
const CHUNK_RELOAD_COOLDOWN_MS = 10_000

window.addEventListener('vite:preloadError', (event) => {
  const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0)
  if (Date.now() - lastReload < CHUNK_RELOAD_COOLDOWN_MS) return
  event.preventDefault()
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
