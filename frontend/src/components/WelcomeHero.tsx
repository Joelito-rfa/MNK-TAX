import { useCallback, useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { fmtDate } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { useDropdown } from '../lib/useDropdown'
import PortalDropdown from './PortalDropdown'

/* ═══════════════════════════════════════════════════════════════════
   WelcomeHero — Bandeau institutionnel « Bienvenue, {Admin} »
   Structure : BackgroundSlider (3 slides en crossfade + effet 3D :
              zoom Ken Burns + parallaxe souris en perspective)
              → Overlay subtil
              → HeroContent (logo, DRI Manakara, bienvenue, période)
   Les slides sont facilement remplaçables (WebP/AVIF recommandé).
   ═══════════════════════════════════════════════════════════════════ */

export interface HeroSlide {
  src: string
  labelKey: string
}

/** Slides du Hero — Image 1 : administration fiscale · Image 2 : Manakara · Image 3 : fiscalité/finances */
export const heroSlides: HeroSlide[] = [
  { src: '/hero/administration-fiscale.svg', labelKey: 'welcome.slide.admin' },
  { src: '/hero/manakara.svg', labelKey: 'welcome.slide.manakara' },
  { src: '/hero/fiscalite-finances.svg', labelKey: 'welcome.slide.finance' },
]

/** Périodes prédéfinies pour le sélecteur du bandeau — labels via i18n (clés period.*) */
export const PERIOD_PRESETS = [
  { id: 'year', labelKey: 'period.year', months: 12 },
  { id: 'quarter', labelKey: 'period.quarter', months: 3 },
  { id: 'month', labelKey: 'period.month', months: 1 },
  { id: '6months', labelKey: 'period.6months', months: 6 },
  { id: 'all', labelKey: 'period.all', months: 0 },
]

const AUTOPLAY_MS = 5000
const FADE_MS = 900
/** Amplitude max de la parallaxe souris (px) */
const PARALLAX_PX = 14

/** Respecte prefers-reduced-motion : slideshow figé, navigation manuelle conservée */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/* ── BackgroundSlider : les 3 images empilées en crossfade + effet 3D ── */
function BackgroundSlider({
  slides,
  index,
  fadeMs,
  tilt,
}: {
  slides: HeroSlide[]
  index: number
  fadeMs: number
  tilt: { x: number; y: number }
}) {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden rounded-2xl" aria-hidden="true">
      {/* Scène 3D : perspective + translation contre la souris + inclinaison */}
      <div
        className="absolute inset-[-24px]"
        style={{
          perspective: '1200px',
          transform: `translate3d(${tilt.x}px, ${tilt.y}px, 0)`,
          transition: 'transform 300ms ease-out',
        }}
      >
        {slides.map((slide, i) => (
          <img
            key={slide.src}
            src={slide.src}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            draggable={false}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity ease-out ${
              i === index ? 'opacity-100' : 'opacity-0'
            } ${i === index ? 'hero-ken-burns' : ''}`}
            style={{
              transitionDuration: `${fadeMs}ms`,
              // translateZ négatif : l'image « recule » légèrement derrière l'overlay
              transform: 'translateZ(-30px) scale(1.12)',
            }}
          />
        ))}
      </div>
      {/* Overlay subtil — assombrit à peine, garde le texte parfaitement lisible */}
      <div className="absolute inset-0 bg-brand-950/65" />
      <div className="absolute inset-x-0 bottom-0 h-14 bg-black/20" />
    </div>
  )
}

/* ── Composant principal ── */
export interface WelcomeHeroProps {
  firstName: string
  periodPreset: string
  onPeriodChange: (id: string) => void
  fromDate: string
  toDate: string
  onDownload: () => void
  size?: 'normal' | 'large'
  slides?: HeroSlide[]
}

export default function WelcomeHero({
  firstName,
  periodPreset,
  onPeriodChange,
  fromDate,
  toDate,
  onDownload,
  size = 'normal',
  slides = heroSlides,
}: WelcomeHeroProps) {
  const { t } = useI18n()
  const count = slides.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = usePrefersReducedMotion()
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const {
    isOpen: periodOpen,
    toggle: togglePeriod,
    close: closePeriod,
    triggerProps: periodTriggerProps,
    dropdownProps: periodDropdownProps,
  } = useDropdown()
  const {
    isOpen: dlOpen,
    toggle: toggleDl,
    close: closeDl,
    triggerProps: dlTriggerProps,
    dropdownProps: dlDropdownProps,
  } = useDropdown()
  const periodBtnRef = useRef<HTMLButtonElement>(null)
  const dlBtnRef = useRef<HTMLButtonElement>(null)
  const year = new Date().getFullYear()
  const dateRangeLabel = `${fmtDate(fromDate)} — ${fmtDate(toDate)}`
  const currentPresetLabel = t(PERIOD_PRESETS.find((p) => p.id === periodPreset)?.labelKey ?? 'period.year')
  const isLarge = size === 'large'

  /* Le déclencheur d'un menu ferme l'autre */
  const handlePeriodToggle = () => { togglePeriod(); closeDl() }
  const handleDlToggle = () => { toggleDl(); closePeriod() }

  /* Navigation manuelle (boucle infinie) */
  const goTo = useCallback((i: number) => setIndex(((i % count) + count) % count), [count])

  /* Autoplay — le chrono repart après une navigation manuelle ou un survol */
  useEffect(() => {
    if (reduced || paused || count < 2) return
    const t = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS)
    return () => window.clearInterval(t)
  }, [reduced, paused, count, index])

  /* Préchargement de l'image suivante (transition fluide même connexion moyenne) */
  useEffect(() => {
    if (count < 2) return
    const img = new Image()
    img.src = slides[(index + 1) % count].src
  }, [index, slides, count])

  /* Parallaxe souris : le fond suit légèrement le curseur (désactivé si reduced-motion) */
  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduced) return
      const rect = e.currentTarget.getBoundingClientRect()
      const nx = (e.clientX - rect.left) / rect.width - 0.5 // -0.5 → 0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5
      setTilt({ x: -nx * PARALLAX_PX * 2, y: -ny * PARALLAX_PX })
    },
    [reduced],
  )

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); setTilt({ x: 0, y: 0 }) }}
      onMouseMove={onMouseMove}
      className={`hero-3d relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-brand-700 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between ${
        isLarge ? 'px-6 py-5 sm:px-8 sm:py-6' : 'px-5 py-5 sm:px-6'
      }`}
    >
      {/* ── Fond : carrousel des 3 images (uniquement dans ce bloc) ── */}
      <BackgroundSlider
        slides={slides}
        index={index}
        fadeMs={reduced ? 200 : FADE_MS}
        tilt={tilt}
      />

      {/* ── HeroContent ── */}
      {/* Left: Logo + texte — placement d'origine : logo accolé au coin haut-gauche, texte décalé */}
      <div className="relative z-10 flex min-w-0 flex-1 items-center gap-4">
        <div className={`absolute left-0 top-0 flex shrink-0 items-center justify-center rounded-br-xl bg-white/15 backdrop-blur-sm ${isLarge ? 'h-14 w-14' : 'h-11 w-11'}`}>
          <img src="/logo.webp" alt="" className={`rounded-lg object-contain ${isLarge ? 'h-10 w-10' : 'h-7 w-7'}`} />
        </div>
        <div className={`min-w-0 ${isLarge ? 'pl-16' : ''}`}>
          <h1 className={`font-bold leading-tight tracking-tight drop-shadow-sm ${isLarge ? 'text-[28px] sm:text-[34px]' : 'text-[26px] sm:text-[32px]'}`}>
            {t('welcome.greeting', { name: firstName })}
          </h1>
          <p className={`mt-1 text-white/70 ${isLarge ? 'text-sm' : 'text-[13px]'}`}>
            {dateRangeLabel} · {t('welcome.fiscalYear', { year })}
          </p>
        </div>
      </div>

      {/* Right content */}
      <div className="relative z-10 flex shrink-0 items-center gap-2">
          {/* ── Sélecteur de période ── */}
          <div className="relative">
            <button
              ref={periodBtnRef}
              {...periodTriggerProps}
              onClick={handlePeriodToggle}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-medium backdrop-blur-sm transition hover:bg-white/25"
            >
              <CalendarDays className="h-4 w-4" />
              {currentPresetLabel}
              <ChevronDown className={`h-4 w-4 transition-transform ${periodOpen ? 'rotate-180' : ''}`} />
            </button>
            <PortalDropdown
              anchorRef={periodBtnRef}
              open={periodOpen}
              onClose={closePeriod}
              width={256}
              dropdownProps={periodDropdownProps as unknown as Record<string, unknown>}
            >
              <div>
                <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('welcome.selectPeriod')}</p>
                </div>
                <div className="p-1.5">
                  {PERIOD_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => { onPeriodChange(preset.id); closePeriod() }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        periodPreset === preset.id
                          ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className={`flex h-2 w-2 shrink-0 rounded-full ${periodPreset === preset.id ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      {t(preset.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            </PortalDropdown>
          </div>

          {/* ── Télécharger rapport ── */}
          <div className="relative">
            <button
              ref={dlBtnRef}
              {...dlTriggerProps}
              onClick={handleDlToggle}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-brand-700 shadow-sm transition hover:bg-white/90"
            >
              <Download className="h-4 w-4" />
              {t('welcome.downloadReport')}
              <ChevronDown className={`h-4 w-4 transition-transform ${dlOpen ? 'rotate-180' : ''}`} />
            </button>
            <PortalDropdown
              anchorRef={dlBtnRef}
              open={dlOpen}
              onClose={closeDl}
              width={224}
              dropdownProps={dlDropdownProps as unknown as Record<string, unknown>}
            >
              <div className="p-1.5">
                <button
                  onClick={() => { onDownload(); closeDl() }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-medium">{t('welcome.csvData')}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{t('welcome.csvHint')}</p>
                  </div>
                </button>
              </div>
            </PortalDropdown>
          </div>
      </div>

      {/* ── Navigation du carrousel : flèches + dots discrets ── */}
      <div className="absolute bottom-2.5 right-3 z-20 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label={t('welcome.prevImage')}
          className="rounded-full bg-white/15 p-1 backdrop-blur-sm transition hover:bg-white/30"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-1.5" role="group" aria-label={t('welcome.chooseBg')}>
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              onClick={() => goTo(i)}
              aria-label={t('welcome.show', { label: t(slide.labelKey) })}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label={t('welcome.nextImage')}
          className="rounded-full bg-white/15 p-1 backdrop-blur-sm transition hover:bg-white/30"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}