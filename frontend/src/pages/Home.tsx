import { Suspense, lazy, useEffect } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import FallingMoney from '../components/FallingMoney'
import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'

// Sections sous la ligne de flottaison : chargées en différé pour un
// premier affichage instantané (retour login → accueil sans blanc).
const WhySection = lazy(() => import('../components/landing/WhySection'))
const Features = lazy(() => import('../components/landing/Features'))
const TaxCycle = lazy(() => import('../components/landing/TaxCycle'))
const Security = lazy(() => import('../components/landing/Security'))
const About = lazy(() => import('../components/landing/About'))
const DashboardPreview = lazy(() => import('../components/landing/DashboardPreview'))
const AudienceSections = lazy(() =>
  import('../components/landing/AudienceSections').then((m) => ({
    default: function Sections({
      onLogin,
      onRequestAccess,
    }: {
      onLogin: () => void
      onRequestAccess: () => void
    }) {
      return (
        <>
          <m.ForAgents onLogin={onLogin} />
          <m.ForTaxpayers onRequestAccess={onRequestAccess} />
          <m.Transparency />
        </>
      )
    },
  })),
)
const FinalCTA = lazy(() => import('../components/landing/FinalCTA'))
const Footer = lazy(() => import('../components/landing/Footer'))

function BelowFoldFallback() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-6 py-16" aria-hidden="true">
      <div className="mx-auto h-8 w-64 rounded-xl bg-slate-200/60 dark:bg-white/5" />
      <div className="mx-auto mt-4 h-4 w-96 max-w-full rounded-lg bg-slate-200/40 dark:bg-white/5" />
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 rounded-3xl bg-slate-200/40 dark:bg-white/5" />
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Navigation SPA depuis /login (Link to="/#hero") : le routeur ne scrolle
  // pas automatiquement vers l'ancre → on le fait ici.
  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    if (location.key !== 'default') window.scrollTo({ top: 0 })
  }, [location.hash, location.key, location.pathname])

  /* Spotlight + tilt 3D : chaque encadré suit le curseur (désactivé
     automatiquement si prefers-reduced-motion ou écran tactile). */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(hover: none)').matches) return
    let raf = 0
    const attach = () => {
      const cards = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.landing [class*="hover:-translate-y-1"], .landing section [class*="rounded-3xl"][class*="border"]',
        ),
      )
      const cleanups: Array<() => void> = []
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
          const px = (e.clientX - r.left) / r.width
          const py = (e.clientY - r.top) / r.height
          tx = px * 100
          ty = py * 100
          ry = (px - 0.5) * 9
          rx = (0.5 - py) * 9
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
      return cleanups
    }
    // Les sections lazy arrivent après : on ré-attache quand elles montent.
    let cleanups = attach()
    const obs = new MutationObserver(() => {
      cleanups.forEach((fn) => fn())
      cleanups = attach()
    })
    obs.observe(document.body, { childList: true, subtree: true })
    const stop = window.setTimeout(() => obs.disconnect(), 5000)
    return () => {
      cleanups.forEach((fn) => fn())
      obs.disconnect()
      window.clearTimeout(stop)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  if (user) return <Navigate to="/dashboard" replace />

  function handleLogin() { navigate('/login') }
  function handleRequestAccess() { navigate('/register') }

  return (
    <div className="landing relative min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0f1117] dark:text-slate-200">
      {/* Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <span className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-brand-500/[0.06] blur-[100px]" />
        <span className="absolute right-[-200px] top-[30%] h-[400px] w-[400px] rounded-full bg-indigo-500/[0.05] blur-[100px]" />
        <span className="absolute bottom-[-200px] left-[40%] h-[500px] w-[500px] rounded-full bg-emerald-500/[0.04] blur-[100px]" />
        <FallingMoney />
      </div>

      <div className="relative z-10">
        <Navbar onLogin={handleLogin} onRequestAccess={handleRequestAccess} />
        <Hero onLogin={handleLogin} onRequestAccess={handleRequestAccess} />
        <Suspense fallback={<BelowFoldFallback />}>
          <WhySection />
          <Features />
          <TaxCycle />
          <Security />
          <About onLogin={handleLogin} />
          <AudienceSections onLogin={handleLogin} onRequestAccess={handleRequestAccess} />
          <DashboardPreview />
          <FinalCTA onLogin={handleLogin} onRequestAccess={handleRequestAccess} />
          <Footer onLogin={handleLogin} onRequestAccess={handleRequestAccess} />
        </Suspense>
      </div>
    </div>
  )
}
