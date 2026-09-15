import { useEffect } from 'react'

/**
 * Spotlight + tilt 3D style landing, généralisé à l'app.
 * Cible les `.fx-spot` (posés par Card/ui) : suit le curseur via
 * --mx/--my (spotlight) et --rx/--ry (tilt), en rAF.
 * Désactivé si prefers-reduced-motion ou tactile. Re-observe le DOM
 * à chaque changement de page (pathname) pour les contenus async.
 */
export function useSpotlight(dep: string) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(hover: none)').matches) return

    let raf = 0
    const cleanups: Array<() => void> = []

    // Petite attente pour laisser React peindre les listes async
    const t = setTimeout(() => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>('.fx-spot'))
      cards.forEach((card) => {
        let tx = 50
        let ty = -20
        let rx = 0
        let ry = 0
        const render = () => {
          raf = 0
          card.style.setProperty('--mx', `${tx.toFixed(1)}%`)
          card.style.setProperty('--my', `${ty.toFixed(1)}%`)
          card.style.setProperty('--rx', `${rx.toFixed(2)}deg`)
          card.style.setProperty('--ry', `${ry.toFixed(2)}deg`)
        }
        const schedule = () => {
          if (!raf) raf = requestAnimationFrame(render)
        }
        const onMove = (e: PointerEvent) => {
          const r = card.getBoundingClientRect()
          if (r.width === 0) return
          const px = (e.clientX - r.left) / r.width
          const py = (e.clientY - r.top) / r.height
          tx = px * 100
          ty = py * 100
          ry = (px - 0.5) * 7
          rx = (0.5 - py) * 7
          schedule()
        }
        const onLeave = () => {
          tx = 50
          ty = -20
          rx = 0
          ry = 0
          schedule()
        }
        card.addEventListener('pointermove', onMove)
        card.addEventListener('pointerleave', onLeave)
        cleanups.push(() => {
          card.removeEventListener('pointermove', onMove)
          card.removeEventListener('pointerleave', onLeave)
        })
      })
    }, 60)

    return () => {
      clearTimeout(t)
      cleanups.forEach((fn) => fn())
      if (raf) cancelAnimationFrame(raf)
    }
  }, [dep])
}
