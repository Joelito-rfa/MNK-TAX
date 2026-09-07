import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../lib/auth'
import Header from './Header'
import Sidebar from './Sidebar'
import FallingMoney from './FallingMoney'
import AiAssistant from './AiAssistant'

export default function Layout() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  function toggleSidebar() {
    if (window.innerWidth >= 1024) {
      setSidebarOpen((o) => !o)
    } else {
      setMobileOpen(true)
    }
  }

  const permissions = user?.permissions ?? []

  return (
    <div className="h-screen overflow-hidden">
      {/* Fond animé global du site */}
      <div className="site-bg" aria-hidden="true">
        <span className="site-bg-orb site-bg-orb-1" />
        <span className="site-bg-orb site-bg-orb-2" />
        <span className="site-bg-orb site-bg-orb-3" />
        <FallingMoney />
      </div>
      <Sidebar
        open={sidebarOpen}
        permissions={permissions}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className={`relative flex h-screen flex-col transition-all duration-300 ${sidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        <Header onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 overflow-y-auto px-4 py-6 lg:px-6 lg:py-8">
          <div key={location.pathname} className="animate-page-in">
            <Outlet />
          </div>
        </main>
      </div>
      <AiAssistant />
    </div>
  )
}
