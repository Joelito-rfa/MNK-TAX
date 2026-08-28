import { useMemo } from 'react'

/**
 * Pluie d'argent décorative : billets « Ar » qui tombent en fond de site.
 * Purement visuel : pointer-events none, opacité modérée, réduit à l'arrêt avec
 * prefers-reduced-motion (géré globalement dans index.css).
 */
export default function FallingMoney() {
  const items = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: -Math.random() * 26,
        duration: 13 + Math.random() * 10,
        size: 15 + Math.random() * 13,
        sway: (Math.random() - 0.5) * 180,
        opacity: 0.16 + Math.random() * 0.16,
      })),
    [],
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {items.map((m) => (
        <span
          key={m.id}
          className="money-note"
          style={{
            left: `${m.left}%`,
            width: m.size * 1.7,
            height: m.size,
            fontSize: m.size * 0.5,
            animationDuration: `${m.duration}s`,
            animationDelay: `${m.delay}s`,
            ['--sway' as string]: `${m.sway}px`,
            ['--money-opacity' as string]: m.opacity,
          }}
        >
          Ar
        </span>
      ))}
    </div>
  )
}
