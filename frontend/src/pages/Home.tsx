import { useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import FallingMoney from '../components/FallingMoney'
import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import WhySection from '../components/landing/WhySection'
import Features from '../components/landing/Features'
import TaxCycle from '../components/landing/TaxCycle'
import Security from '../components/landing/Security'
import About from '../components/landing/About'
import DashboardPreview from '../components/landing/DashboardPreview'
import { ForAgents, ForTaxpayers, Transparency } from '../components/landing/AudienceSections'
import FinalCTA from '../components/landing/FinalCTA'
import Footer from '../components/landing/Footer'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()

  /* Spotlight + tilt 3D : chaque encadré suit le curseur (désactivé
     automatiquement si prefers-reduced-motion ou écran tactile). */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(hover: none)').matches) return
    let raf = 0
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
    return () => {
      cleanups.forEach((fn) => fn())
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
        <WhySection />
        <Features />
        <TaxCycle />
        <Security />
        <About onLogin={handleLogin} />
        <ForAgents onLogin={handleLogin} />
        <ForTaxpayers onRequestAccess={handleRequestAccess} />
        <Transparency />
        <DashboardPreview />
        <FinalCTA onLogin={handleLogin} onRequestAccess={handleRequestAccess} />
        <Footer onLogin={handleLogin} onRequestAccess={handleRequestAccess} />
      </div>
    </div>
  )
}
