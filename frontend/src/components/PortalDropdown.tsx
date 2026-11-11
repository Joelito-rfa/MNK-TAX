import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  width?: number
  /** Aligne la largeur du menu sur celle de l'élément déclencheur. */
  matchAnchor?: boolean
  children: ReactNode
  dropdownProps?: Record<string, unknown>
}

export default function PortalDropdown({ anchorRef, open, onClose, width = 224, matchAnchor = false, children, dropdownProps }: Props) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    if (open && anchorRef.current && dropdownRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      const gap = 4
      const resolvedWidth = matchAnchor ? Math.max(200, rect.width) : width
      const dropdownHeight = dropdownRef.current.getBoundingClientRect().height
      let left = rect.right - resolvedWidth
      left = Math.max(8, Math.min(left, window.innerWidth - resolvedWidth - 8))
      let top = rect.bottom + gap
      if (top + dropdownHeight > window.innerHeight - 8) {
        top = rect.top - dropdownHeight - gap
        if (top < 8) top = Math.max(8, window.innerHeight - dropdownHeight - 8)
      }
      setPos({ top, left, width: resolvedWidth })
    } else {
      setPos(null)
    }
  }, [open, anchorRef, width, matchAnchor])

  if (!open) return null
  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/5" onClick={(e) => { e.stopPropagation(); onClose() }} />
      <div
        ref={dropdownRef}
        {...(dropdownProps as object)}
        className="fixed z-50 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-xl shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-black/30"
        style={pos ? { top: pos.top, left: pos.left, width: pos.width } : { top: -9999, left: -9999, width }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body,
  )
}
