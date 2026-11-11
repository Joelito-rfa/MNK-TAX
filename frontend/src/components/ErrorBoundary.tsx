import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Filet de sécurité global : une erreur de rendu (ou un chunk lazy qui ne se
 * charge pas) ne doit jamais laisser une page blanche. On affiche un écran de
 * secours avec un bouton de rechargement.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erreur de rendu interceptée :', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center text-slate-900 dark:bg-[#0f1117] dark:text-slate-200">
          <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
          <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
            L&apos;interface n&apos;a pas pu se charger complètement. Vérifiez votre connexion puis
            rechargez la page.
          </p>
          {import.meta.env.DEV && (
            <pre className="max-w-full overflow-auto rounded-lg bg-slate-900/5 p-3 text-left text-xs text-rose-600 dark:bg-white/5 dark:text-rose-400">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-500"
          >
            Recharger la page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
