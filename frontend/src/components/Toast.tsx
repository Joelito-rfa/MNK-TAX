import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, Info, X, type LucideIcon } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  type: ToastType
  message: string
  leaving: boolean
}

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const DURATIONS: Record<ToastType, number> = { success: 3500, error: 5000, info: 4500 }
const EXIT_MS = 200
const MAX_VISIBLE = 4

let nextId = 1

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>.')
  return ctx
}

const typeStyles: Record<ToastType, { border: string; icon: string; Icon: LucideIcon }> = {
  success: { border: 'border-emerald-200 dark:border-emerald-800', icon: 'bg-emerald-500', Icon: Check },
  error: { border: 'border-rose-200 dark:border-rose-800', icon: 'bg-rose-500', Icon: AlertTriangle },
  info: { border: 'border-sky-200 dark:border-sky-800', icon: 'bg-sky-500', Icon: Info },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    const remove = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      timers.current.delete(id)
    }, EXIT_MS)
    timers.current.set(id, remove)
  }, [])

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId++
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, type, message, leaving: false }])
      const timer = setTimeout(() => dismiss(id), DURATIONS[type])
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  useEffect(() => {
    const map = timers.current
    return () => map.forEach((t) => clearTimeout(t))
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-20 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const { border, icon, Icon } = typeStyles[toast.type]
  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white p-3.5 shadow-popover dark:bg-slate-800 ${border} ${
        toast.leaving ? 'animate-toast-out' : 'animate-toast-in'
      }`}
    >
      <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${icon} text-white shadow-sm`}>
        <span className="absolute inset-0 animate-ring-pulse rounded-full bg-white/50" />
        <Icon className="relative h-4.5 w-4.5 animate-check-pop" strokeWidth={3} />
      </span>
      <p className="flex-1 pt-1 text-sm font-medium leading-snug text-slate-800 dark:text-slate-200">{toast.message}</p>
      <button
        onClick={onClose}
        className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
