import { useState, useEffect, useCallback } from 'react'

/**
 * Hook réutilisable pour les menus déroulants.
 *
 * Gère :
 * - L'état ouvert/fermé
 * - La détection de clic extérieur via `data-menu-trigger` et `data-menu-dropdown`
 * - La fermeture automatique en cliquant ailleurs
 *
 * Usage :
 * ```tsx
 * const { isOpen, toggle, close, triggerProps, dropdownProps } = useDropdown()
 *
 * <div {...dropdownProps}>
 *   <button {...triggerProps}>Toggle</button>
 *   {isOpen && (
 *     <div data-menu-dropdown className="absolute ...">
 *       ...items...
 *     </div>
 *   )}
 * </div>
 * ```
 *
 * Pour des listes avec plusieurs menus (ex: lignes d'un tableau), utilisez
 * `useDropdownList` qui gère un id par menu.
 */
export function useDropdown(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen)

  const toggle = useCallback(() => setIsOpen((v) => !v), [])
  const close = useCallback(() => setIsOpen(false), [])
  const open = useCallback(() => setIsOpen(true), [])

  useEffect(() => {
    if (!isOpen) return

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (
        target &&
        !target.closest('[data-menu-dropdown]') &&
        !target.closest('[data-menu-trigger]')
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  return {
    isOpen,
    toggle,
    close,
    open,
    triggerProps: { 'data-menu-trigger': '' as const },
    dropdownProps: { 'data-menu-dropdown': '' as const },
  } as const
}

/**
 * Version pour listes avec plusieurs menus déroulants.
 *
 * Usage :
 * ```tsx
 * const { openId, toggle, close, getTriggerProps, getDropdownProps } = useDropdownList()
 *
 * {items.map(item => (
 *   <div key={item.id} className="relative">
 *     <button {...getTriggerProps(item.id)}>⋯</button>
 *     {openId === item.id && (
 *       <div {...getDropdownProps()} className="absolute ...">
 *         ...items...
 *       </div>
 *     )}
 *   </div>
 * ))}
 * ```
 */
export function useDropdownList() {
  const [openId, setOpenId] = useState<string | number | null>(null)

  const toggle = useCallback((id: string | number) => {
    setOpenId((current) => (current === id ? null : id))
  }, [])

  const close = useCallback(() => setOpenId(null), [])

  useEffect(() => {
    if (openId === null) return

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (
        target &&
        !target.closest('[data-menu-dropdown]') &&
        !target.closest('[data-menu-trigger]')
      ) {
        setOpenId(null)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openId])

  return {
    openId,
    toggle,
    close,
    getTriggerProps: (id: string | number) => ({
      'data-menu-trigger': '' as const,
      onClick: () => toggle(id),
    }),
    getDropdownProps: () => ({
      'data-menu-dropdown': '' as const,
    }),
  } as const
}
