import { useMemo } from 'react'
import {
  Calculator,
  FileText,
  Receipt,
  TrendingDown,
  Wallet,
  ShieldCheck,
  Percent,
  CreditCard,
  BarChart3,
  PiggyBank,
  Landmark,
  Scale,
} from 'lucide-react'

const floatingIcons = [
  { Icon: Calculator, label: 'TVA 20%', delay: 0, x: '8%', y: '12%', size: 'lg' },
  { Icon: FileText, label: 'Declaration', delay: 0.6, x: '72%', y: '8%', size: 'md' },
  { Icon: Receipt, label: 'Quittance', delay: 1.2, x: '5%', y: '55%', size: 'md' },
  { Icon: TrendingDown, label: 'Recouvrement', delay: 1.8, x: '68%', y: '62%', size: 'lg' },
  { Icon: Wallet, label: 'Paiement', delay: 2.4, x: '12%', y: '82%', size: 'md' },
  { Icon: ShieldCheck, label: 'Controle', delay: 0.3, x: '75%', y: '35%', size: 'sm' },
  { Icon: Percent, label: 'Taux', delay: 1.5, x: '35%', y: '5%', size: 'sm' },
  { Icon: CreditCard, label: 'Remise', delay: 2.1, x: '55%', y: '85%', size: 'sm' },
  { Icon: BarChart3, label: 'Stats', delay: 0.9, x: '85%', y: '15%', size: 'sm' },
  { Icon: PiggyBank, label: 'Epargne', delay: 2.7, x: '2%', y: '35%', size: 'md' },
  { Icon: Landmark, label: 'Tresor', delay: 1.0, x: '60%', y: '45%', size: 'sm' },
  { Icon: Scale, label: 'Loi', delay: 1.9, x: '40%', y: '75%', size: 'sm' },
]

const taxValues = [
  { value: '10%', x: '18%', y: '28%', delay: 0 },
  { value: '20%', x: '78%', y: '50%', delay: 1.2 },
  { value: '5%', x: '45%', y: '15%', delay: 2.4 },
  { value: '15%', x: '25%', y: '68%', delay: 0.8 },
  { value: '25%', x: '65%', y: '78%', delay: 1.8 },
  { value: 'MG', x: '88%', y: '88%', delay: 0.5 },
]

const chartBars = [
  { height: 45, delay: 0, x: '20%' },
  { height: 70, delay: 0.2, x: '28%' },
  { height: 55, delay: 0.4, x: '36%' },
  { height: 85, delay: 0.6, x: '44%' },
  { height: 40, delay: 0.8, x: '52%' },
  { height: 65, delay: 1.0, x: '60%' },
  { height: 90, delay: 1.2, x: '68%' },
  { height: 50, delay: 1.4, x: '76%' },
]

function ringPath(cx: number, cy: number, r: number) {
  return `M ${cx - r},${cy} A ${r},${r} 0 1,1 ${cx + r},${cy} A ${r},${r} 0 1,1 ${cx - r},${cy}`
}

export default function FiscalAnimation() {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        cx: 8 + Math.random() * 84,
        cy: 5 + Math.random() * 90,
        r: 0.8 + Math.random() * 1.5,
        opacity: 0.02 + Math.random() * 0.04,
        delay: Math.random() * 8,
        duration: 6 + Math.random() * 10,
      })),
    [],
  )

  const lines = useMemo(() => {
    const pts = particles.slice(0, 10)
    return pts
      .flatMap((a, i) =>
        pts
          .slice(i + 1)
          .map((b) => {
            const dist = Math.hypot(a.cx - b.cx, a.cy - b.cy)
            return dist < 25
              ? { x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy, key: `${a.id}-${b.id}` }
              : null
          })
          .filter(Boolean),
      )
      .filter(Boolean) as { x1: number; y1: number; x2: number; y2: number; key: string }[]
  }, [particles])

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Background SVG layer */}
      <svg
        className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2"
        viewBox="0 0 100 100"
      >
        {/* Anneaux rotatifs */}
        <g className="fiscal-ring" style={{ animationDuration: '100s' }}>
          <path
            d={ringPath(50, 50, 42)}
            fill="none"
            stroke="var(--color-brand-400)"
            strokeWidth="0.15"
            strokeDasharray="3 6"
            opacity="0.04"
          />
        </g>
        <g className="fiscal-ring fiscal-ring-ccw" style={{ animationDuration: '75s' }}>
          <path
            d={ringPath(50, 50, 32)}
            fill="none"
            stroke="var(--color-brand-300)"
            strokeWidth="0.12"
            strokeDasharray="2 8"
            opacity="0.03"
          />
        </g>
        <g className="fiscal-ring" style={{ animationDuration: '50s' }}>
          <path
            d={ringPath(50, 50, 22)}
            fill="none"
            stroke="var(--color-brand-200)"
            strokeWidth="0.1"
            strokeDasharray="1.5 10"
            opacity="0.025"
          />
        </g>

        {/* Particules */}
        {particles.map((p) => (
          <circle
            key={p.id}
            className="fiscal-particle"
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fill="var(--color-brand-300)"
            style={{
              ['--p-op' as string]: p.opacity,
              ['--dur' as string]: `${p.duration}s`,
              ['--delay' as string]: `${p.delay}s`,
            }}
          />
        ))}

        {/* Lignes connectées */}
        {lines.map((l, i) => (
          <line
            key={l.key}
            className="fiscal-line"
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="var(--color-brand-400)"
            strokeWidth="0.05"
            style={{
              ['--delay' as string]: `${0.5 + (i % 4)}s`,
              ['--dur' as string]: `${7 + (i % 3) * 2}s`,
            }}
          />
        ))}
      </svg>

      {/* Mini graphique en barres animé */}
      <div className="fiscal-chart absolute" style={{ left: '15%', bottom: '12%', width: '70%', height: '80px' }}>
        {chartBars.map((bar, i) => (
          <div
            key={i}
            className="fiscal-chart-bar absolute bottom-0"
            style={{
              left: bar.x,
              height: `${bar.height}%`,
              width: '6%',
              animationDelay: `${bar.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Icones flottantes */}
      {floatingIcons.map((item, i) => {
        const sizeClass =
          item.size === 'lg'
            ? 'h-11 w-11'
            : item.size === 'md'
              ? 'h-9 w-9'
              : 'h-7 w-7'
        const textSize =
          item.size === 'lg'
            ? 'text-[10px]'
            : item.size === 'md'
              ? 'text-[9px]'
              : 'text-[8px]'
        return (
          <div
            key={i}
            className="fiscal-float-icon"
            style={{
              position: 'absolute',
              left: item.x,
              top: item.y,
              animationDelay: `${item.delay}s`,
            }}
          >
            <div className={`flex ${sizeClass} items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.05] backdrop-blur-md shadow-lg shadow-black/10`}>
              <item.Icon className={`${sizeClass.replace('h-', 'h-').replace('w-', 'w-')} text-brand-200/40`} strokeWidth={1.6} />
            </div>
            <span className={`mt-1 block text-center ${textSize} font-semibold tracking-wide text-brand-200/25`}>
              {item.label}
            </span>
          </div>
        )
      })}

      {/* Pourcentages flottants */}
      {taxValues.map((tv, i) => (
        <span
          key={i}
          className="fiscal-value"
          style={{
            position: 'absolute',
            left: tv.x,
            top: tv.y,
            animationDelay: `${tv.delay}s`,
          }}
        >
          {tv.value}
        </span>
      ))}
    </div>
  )
}
