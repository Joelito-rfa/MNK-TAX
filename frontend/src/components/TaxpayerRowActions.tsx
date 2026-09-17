import { useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight, Copy, FileText, Shield, Check, MoreHorizontal } from 'lucide-react'
import { useDropdown } from '../lib/useDropdown'
import type { TaxpayerSummary } from '../types'

type Props = {
  taxpayer: TaxpayerSummary
  onViewProfile: () => void
  onViewDetails: () => void
  onCopyNif: () => void
  onSuspend: () => void
  onReactivate: () => void
}

export default function TaxpayerRowActions({
  taxpayer,
  onViewProfile,
  onViewDetails,
  onCopyNif,
  onSuspend,
  onReactivate,
}: Props) {
  const { isOpen, close, triggerProps, dropdownProps } = useDropdown()
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const dropdownWidth = 224 // w-56
      const gap = 4
      let top = rect.bottom + gap
      let left = rect.right - dropdownWidth
      // clamp horizontal
      left = Math.max(8, Math.min(left, window.innerWidth - dropdownWidth - 8))
      // if bottom overflow, show above
      const dropdownHeight = 260
      if (top + dropdownHeight > window.innerHeight - 8) {
        top = rect.top - dropdownHeight - gap
        if (top < 8) top = Math.max(8, window.innerHeight - dropdownHeight - 8)
      }
      setPos({ top, left })
    }
  }, [isOpen])

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        {...triggerProps}
        onClick={(e) => {
          e.stopPropagation()
          // triggerProps onClick toggles; we already have stopPropagation wrapper
          ;(triggerProps as unknown as { onClick: () => void }).onClick()
        }}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40 bg-black/5" onClick={(e) => { e.stopPropagation(); close() }} />
            <div
              {...dropdownProps}
              className="fixed z-50 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-xl shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-black/30"
              style={{ top: pos.top, left: pos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-0.5">
                <button
                  onClick={() => { onViewProfile(); close() }}
                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Voir le profil
                </button>
                <button
                  onClick={() => { onViewDetails(); close() }}
                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <FileText className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Voir les détails
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                <button
                  onClick={() => { onCopyNif(); close() }}
                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Copy className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> Copier le NIF
                </button>
                {taxpayer.status === 'ACTIVE' && (
                  <button
                    onClick={() => { onSuspend(); close() }}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                  >
                    <Shield className="h-4 w-4 shrink-0" /> Suspendre
                  </button>
                )}
                {taxpayer.status === 'SUSPENDED' && (
                  <button
                    onClick={() => { onReactivate(); close() }}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                  >
                    <Check className="h-4 w-4 shrink-0" /> Réactiver
                  </button>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  )
}
