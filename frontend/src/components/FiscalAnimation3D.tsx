import { useMemo } from 'react'
import {
  Users,
  FileText,
  Receipt,
  TrendingDown,
  Wallet,
  ShieldCheck,
  BarChart3,
  Banknote,
  Landmark,
  Scale,
  Percent,
  Calculator,
} from 'lucide-react'

/* ═══════════ Palette module ═══════════ */
const MODULE = {
  violet: '#5B4BDB',
  sky: '#0EA5E9',
  green: '#22C55E',
  orange: '#F59E0B',
  blue: '#3B82F6',
  rose: '#F43F5E',
  emerald: '#10B981',
  indigo: '#6366F1',
  teal: '#14B8A6',
  pink: '#EC4899',
}

/* ═══════════ Cubes 3D — un par module ═══════════ */
const cubes = [
  { Icon: Users,        label: 'Contribuables',  delay: 0,   x: '10%', y: '15%', size: 64, color: MODULE.violet },
  { Icon: FileText,     label: 'Declarations',   delay: 0.4, x: '70%', y: '10%', size: 56, color: MODULE.sky },
  { Icon: Receipt,      label: 'Quittances',     delay: 0.8, x: '5%',  y: '55%', size: 52, color: MODULE.rose },
  { Icon: TrendingDown, label: 'Creances',       delay: 1.2, x: '65%', y: '60%', size: 60, color: MODULE.orange },
  { Icon: Wallet,       label: 'Paiements',      delay: 1.6, x: '15%', y: '80%', size: 54, color: MODULE.emerald },
  { Icon: ShieldCheck,  label: 'Controles',      delay: 0.2, x: '80%', y: '35%', size: 48, color: MODULE.indigo },
  { Icon: BarChart3,    label: 'Rapports',       delay: 1.0, x: '55%', y: '85%', size: 50, color: MODULE.pink },
  { Icon: Banknote,     label: 'Recettes',       delay: 1.4, x: '85%', y: '75%', size: 46, color: MODULE.green },
  { Icon: Calculator,   label: 'TVA',            delay: 0.6, x: '40%', y: '5%',  size: 44, color: MODULE.violet },
  { Icon: Scale,        label: 'Reglementation', delay: 1.8, x: '35%', y: '75%', size: 42, color: MODULE.sky },
  { Icon: Landmark,     label: 'Tresor public',  delay: 0.5, x: '25%', y: '40%', size: 40, color: MODULE.indigo },
  { Icon: Percent,      label: 'Recouvrement',   delay: 1.1, x: '50%', y: '25%', size: 38, color: MODULE.blue },
]

/* ═══════════ Prismes flottants ═══════════ */
const floatingPrisms = [
  { x: '20%', y: '30%', size: 120, color: MODULE.violet,  delay: 0, speed: 18 },
  { x: '60%', y: '20%', size: 80,  color: MODULE.sky,     delay: 1, speed: 22 },
  { x: '75%', y: '55%', size: 100, color: MODULE.green,   delay: 2, speed: 15 },
  { x: '10%', y: '70%', size: 90,  color: MODULE.rose,    delay: 0.5, speed: 20 },
  { x: '45%', y: '45%', size: 70,  color: MODULE.orange,  delay: 1.5, speed: 25 },
]

/* ═══════════ Stats par module ═══════════ */
const moduleStats = [
  { label: 'Contribuables', value: '12 500+', x: '8%',  y: '28%', delay: 0,   color: MODULE.violet },
  { label: 'Declarations',  value: '3 200',   x: '78%', y: '50%', delay: 1.2, color: MODULE.sky },
  { label: 'Recettes',      value: '45 M Ar', x: '22%', y: '65%', delay: 0.8, color: MODULE.green },
  { label: 'Creances',      value: '12 M Ar', x: '65%', y: '78%', delay: 1.8, color: MODULE.orange },
  { label: 'Recouvrement',  value: '87%',     x: '88%', y: '22%', delay: 0.5, color: MODULE.blue },
  { label: 'Quittances',    value: '1 245',   x: '50%', y: '90%', delay: 1.5, color: MODULE.rose },
]

/* ═══════════ Anneaux 3D ═══════════ */
const rings = [
  { cx: 50, cy: 50, r: 40, color: MODULE.violet, dasharray: '4 8', speed: 30, dir: 1 },
  { cx: 50, cy: 50, r: 30, color: MODULE.sky,    dasharray: '3 10', speed: 45, dir: -1 },
  { cx: 50, cy: 50, r: 20, color: MODULE.green,  dasharray: '2 12', speed: 60, dir: 1 },
]

export default function FiscalAnimation3D() {
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const colors = Object.values(MODULE)
        return {
          id: i,
          cx: 5 + Math.random() * 90,
          cy: 5 + Math.random() * 90,
          r: 0.5 + Math.random() * 1.5,
          opacity: 0.04 + Math.random() * 0.08,
          delay: Math.random() * 6,
          duration: 5 + Math.random() * 8,
          color: colors[i % colors.length],
        }
      }),
    [],
  )

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true" style={{ perspective: '1200px' }}>
      {/* Background 3D grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          transform: 'rotateX(60deg) translateZ(-100px)',
          transformOrigin: 'center center',
        }}
      />

      {/* 3D rotating rings — couleurs modules */}
      <svg
        className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2"
        viewBox="0 0 100 100"
      >
        {rings.map((ring, i) => (
          <g
            key={i}
            style={{
              animation: `spin3d ${ring.speed}s linear infinite${ring.dir < 0 ? ' reverse' : ''}`,
              transformOrigin: '50px 50px',
            }}
          >
            <ellipse
              cx={ring.cx}
              cy={ring.cy}
              rx={ring.r}
              ry={ring.r * 0.4}
              fill="none"
              stroke={ring.color}
              strokeWidth="0.2"
              strokeDasharray={ring.dasharray}
              opacity="0.15"
            />
          </g>
        ))}

        {/* Particules colorees */}
        {particles.map((p) => (
          <circle
            key={p.id}
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fill={p.color}
            style={{
              opacity: p.opacity,
              animation: `particlePulse ${p.duration}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}
      </svg>

      {/* 3D floating prisms — couleur module */}
      {floatingPrisms.map((prism, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: prism.x,
            top: prism.y,
            width: prism.size,
            height: prism.size,
            animation: `float3d ${prism.speed}s ease-in-out ${prism.delay}s infinite`,
            perspective: '600px',
          }}
        >
          <div
            className="h-full w-full rounded-2xl border backdrop-blur-sm"
            style={{
              background: `${prism.color}10`,
              borderColor: `${prism.color}18`,
              transformStyle: 'preserve-3d',
              animation: `rotatePrism ${prism.speed * 1.5}s ease-in-out ${prism.delay}s infinite`,
            }}
          />
        </div>
      ))}

      {/* 3D Cube icons — couleur du module */}
      {cubes.map((cube, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: cube.x,
            top: cube.y,
            animation: `float3d ${14 + i * 2}s ease-in-out ${cube.delay}s infinite`,
            perspective: '500px',
          }}
        >
          <div
            className="relative"
            style={{
              transformStyle: 'preserve-3d',
              animation: `rotateCube ${16 + i * 1.5}s ease-in-out ${cube.delay}s infinite`,
            }}
          >
            {/* Front face */}
            <div
              className="flex items-center justify-center rounded-xl border backdrop-blur-md shadow-lg shadow-black/10"
              style={{
                width: cube.size,
                height: cube.size,
                background: `${cube.color}15`,
                borderColor: `${cube.color}20`,
                transform: `translateZ(${cube.size / 2}px)`,
              }}
            >
              <cube.Icon style={{ width: cube.size * 0.45, height: cube.size * 0.45, color: cube.color, opacity: 0.5 }} strokeWidth={1.5} />
            </div>
            {/* Back face */}
            <div
              className="absolute inset-0 flex items-center justify-center rounded-xl border backdrop-blur-md"
              style={{
                background: `${cube.color}08`,
                borderColor: `${cube.color}10`,
                transform: `translateZ(-${cube.size / 2}px) rotateY(180deg)`,
                opacity: 0.4,
              }}
            >
              <span className="text-[10px] font-bold" style={{ color: cube.color, opacity: 0.3 }}>{cube.label}</span>
            </div>
            {/* Shadow */}
            <div
              className="absolute left-1/2 top-full -translate-x-1/2 rounded-full blur-xl"
              style={{ width: cube.size * 0.8, height: cube.size * 0.2, marginTop: 8, background: `${cube.color}15` }}
            />
          </div>
          <span
            className="mt-2 block text-center text-[9px] font-semibold tracking-wide"
            style={{ color: cube.color, opacity: 0.3 }}
          >
            {cube.label}
          </span>
        </div>
      ))}

      {/* Central 3D wireframe globe */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ perspective: '800px' }}>
        <div
          className="h-48 w-48 rounded-full border"
          style={{
            borderColor: `${MODULE.violet}15`,
            transformStyle: 'preserve-3d',
            animation: 'rotateGlobe 20s linear infinite',
          }}
        >
          {[0, 60, 120].map((angle) => (
            <div key={angle} className="absolute inset-0 rounded-full border" style={{ borderColor: `${MODULE.violet}10`, transform: `rotateY(${angle}deg)` }} />
          ))}
          {[0, 60, 120].map((angle) => (
            <div key={`h-${angle}`} className="absolute inset-0 rounded-full border" style={{ borderColor: `${MODULE.sky}10`, transform: `rotateX(${angle}deg)` }} />
          ))}
        </div>
      </div>

      {/* Stats par module — valeur + label colore */}
      {moduleStats.map((s, i) => (
        <div
          key={i}
          className="absolute flex flex-col items-center"
          style={{
            left: s.x,
            top: s.y,
            animation: `float3d ${12 + i * 2}s ease-in-out ${s.delay}s infinite`,
            transform: `translateZ(${10 + i * 5}px)`,
          }}
        >
          <span className="text-sm font-bold" style={{ color: s.color, opacity: 0.3 }}>{s.value}</span>
          <span className="text-[9px] font-semibold" style={{ color: s.color, opacity: 0.2 }}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}
