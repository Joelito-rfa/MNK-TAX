import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../lib/i18n'
import { ThemeProvider } from '../lib/theme'
import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import WhySection from '../components/landing/WhySection'
import Features from '../components/landing/Features'
import TaxCycle from '../components/landing/TaxCycle'
import Security from '../components/landing/Security'
import About from '../components/landing/About'
import { ForAgents, ForTaxpayers, Transparency } from '../components/landing/AudienceSections'
import DashboardPreview from '../components/landing/DashboardPreview'
import FinalCTA from '../components/landing/FinalCTA'
import Footer from '../components/landing/Footer'

beforeAll(() => {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
  }
  vi.stubGlobal('IntersectionObserver', IO)
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }))
})

afterEach(() => cleanup())

function Landing() {
  const noop = () => {}
  return (
    <MemoryRouter>
      <ThemeProvider>
        <I18nProvider>
          <Navbar onLogin={noop} onRequestAccess={noop} />
          <Hero onLogin={noop} onRequestAccess={noop} />
          <WhySection />
          <Features />
          <TaxCycle />
          <Security />
          <About onLogin={noop} />
          <ForAgents onLogin={noop} />
          <ForTaxpayers onRequestAccess={noop} />
          <Transparency />
          <DashboardPreview />
          <FinalCTA onLogin={noop} onRequestAccess={noop} />
          <Footer onLogin={noop} onRequestAccess={noop} />
        </I18nProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

function switchLang(currentAria: string, targetLabel: string) {
  fireEvent.click(screen.getAllByLabelText(currentAria)[0])
  fireEvent.click(screen.getAllByText(targetLabel)[0])
}

describe('landing i18n switch', () => {
  it('switches every section FR -> MG -> EN', { timeout: 20000 }, () => {
    localStorage.clear()
    localStorage.setItem('mnktax-locale', 'fr')
    render(<Landing />)

    // FR
    expect(screen.getAllByText('La gestion fiscale,').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Une plateforme pensée').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tout le cycle fiscal,').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Un workflow clair').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sécurité, contrôle').length).toBeGreaterThan(0)
    expect(screen.getAllByText('À propos de MNK-TAX').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Conçu pour les agents,').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Un accès plus simple').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Chaque action est traçable.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Une vision claire').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Prêt à moderniser').length).toBeGreaterThan(0)

    // MG
    switchLang('Langue', 'Malagasy')
    expect(screen.queryAllByText('La gestion fiscale,')).toHaveLength(0)
    expect(screen.getAllByText('Ny fitantanana ny hetra,').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sehatra natao').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ny dingana hetra manontolo,').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dingana mazava').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Fiarovana, fanaraha-maso').length).toBeGreaterThan(0)
    expect(screen.getAllByText("Mombamomba an'i MNK-TAX").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Natao ho an'ny mpandraharaha,").length).toBeGreaterThan(0)
    expect(screen.getAllByText('Fidirana tsotra kokoa').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ny asa rehetra dia azo dinihina.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Fijery mazava').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Vonona hanavao').length).toBeGreaterThan(0)

    // EN
    switchLang('Fiteny', 'Anglisy')
    expect(screen.queryAllByText('Ny fitantanana ny hetra,')).toHaveLength(0)
    expect(screen.getAllByText('Tax management,').length).toBeGreaterThan(0)
    expect(screen.getAllByText('A platform designed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('The entire tax cycle,').length).toBeGreaterThan(0)
    expect(screen.getAllByText('A clear workflow').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Security, control').length).toBeGreaterThan(0)
    expect(screen.getAllByText('About MNK-TAX').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Built for agents,').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Simpler access').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Every action is traceable.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('A clear view').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ready to modernise').length).toBeGreaterThan(0)
  })
})
