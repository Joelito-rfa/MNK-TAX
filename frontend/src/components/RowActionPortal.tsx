import { useRef, type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { useDropdown } from '../lib/useDropdown'
import PortalDropdown from './PortalDropdown'

export default function RowActionPortal({
  children,
  width = 224,
  ariaLabel = 'Actions',
}: {
  children: ReactNode
  width?: number
  ariaLabel?: string
}) {
  const { isOpen, toggle, close, triggerProps, dropdownProps } = useDropdown()
  const btnRef = useRef<HTMLButtonElement>(null)

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        {...triggerProps}
        onClick={(e) => {
          e.stopPropagation()
          ;(triggerProps as unknown as { onClick: () => void }).onClick()
        }}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        aria-label={ariaLabel}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <PortalDropdown anchorRef={btnRef} open={isOpen} onClose={close} width={width} dropdownProps={dropdownProps as unknown as Record<string, unknown>}>
        <div className="space-y-0.5" onClick={close}>
          {children}
        </div>
      </PortalDropdown>
    </div>
  )
}
