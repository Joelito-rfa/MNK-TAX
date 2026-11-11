import ScrollReveal from './ScrollReveal'
import { useI18n } from '../../lib/i18n'

interface FooterProps {
  onLogin: () => void
  onRequestAccess: () => void
}

export default function Footer({ onLogin, onRequestAccess }: FooterProps) {
  const { t } = useI18n()

  return (
    <footer className="relative border-t border-white/[0.06] py-12">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal animation="blur-up">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src="/logo.webp" alt="MNK-TAX" className="h-7 w-7 rounded-lg" />
                <span className="text-sm font-bold text-white">MNK-TAX</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{t('landing.footer.tagline1')}<br />{t('landing.footer.tagline2')}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{t('landing.footer.navigation')}</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><a href="#features" className="transition-colors hover:text-white">{t('landing.footer.features')}</a></li>
                <li><a href="#security" className="transition-colors hover:text-white">{t('landing.footer.security')}</a></li>
                <li><a href="#about" className="transition-colors hover:text-white">{t('landing.footer.about')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{t('landing.footer.platform')}</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><button onClick={onLogin} className="transition-colors hover:text-white text-left">{t('landing.footer.login')}</button></li>
                <li><button onClick={onRequestAccess} className="transition-colors hover:text-white text-left">{t('landing.footer.requestAccess')}</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{t('landing.footer.aboutHeading')}</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> {t('landing.footer.academic')}</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> {t('landing.footer.fictionalData')}</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> {t('landing.footer.prototype')}</li>
              </ul>
            </div>
          </div>
        </ScrollReveal>
        <ScrollReveal animation="blur-up" delay={100}>
          <div className="mt-10 border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-slate-600">
              {t('landing.footer.copyright', { year: new Date().getFullYear() })}
            </p>
            <p className="text-[11px] text-slate-600">
              {t('landing.footer.directorate')}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </footer>
  )
}
