import { useEffect, useRef, useState, useCallback } from 'react'
import { Eye, EyeOff, Check, X, ShieldCheck } from 'lucide-react'
import { apiPost } from '../lib/api'
import { useI18n } from '../lib/i18n'
import { useAuth } from '../lib/auth'
import { useToast } from './Toast'
import { Modal, Button } from './ui'
import { useNavigate } from 'react-router-dom'

function strengthScore(pw: string, t: (key: string) => string): { score: number; label: string; color: string; barColor: string } {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (s <= 1) return { score: 1, label: t('header.pw.strength.weak'), color: 'text-rose-500', barColor: 'bg-rose-500' }
  if (s <= 3) return { score: 2, label: t('header.pw.strength.medium'), color: 'text-amber-500', barColor: 'bg-amber-500' }
  return { score: 3, label: t('header.pw.strength.strong'), color: 'text-emerald-500', barColor: 'bg-emerald-500' }
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  id,
  autoComplete,
  ref,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  id: string
  autoComplete?: string
  ref?: React.Ref<HTMLInputElement>
}) {
  const [visible, setVisible] = useState(false)
  const { t } = useI18n()

  return (
    <div className="relative group/input">
      <input
        ref={ref}
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="peer w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3.5 pr-10 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-brand-400 dark:focus:bg-slate-600 dark:focus:ring-brand-400/10"
      />
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-black/0 transition-all duration-300 peer-focus:ring-2 peer-focus:ring-brand-500/20 dark:peer-focus:ring-brand-400/20" />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-600 dark:hover:text-slate-300 active:scale-90"
        aria-label={visible ? t('header.pw.hide') : t('header.pw.show')}
        tabIndex={-1}
      >
        <span className={`block transition-transform duration-200 ${visible ? 'rotate-0 scale-100' : 'rotate-0 scale-100'}`}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </span>
      </button>
    </div>
  )
}

export default function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useI18n()

  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const currentRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const glowInnerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (open) {
      setCurrent('')
      setNewPass('')
      setConfirm('')
      setError('')
      setLoading(false)
      setTimeout(() => currentRef.current?.focus(), 50)
    }
  }, [open])

  const close = useCallback(() => {
    setCurrent('')
    setNewPass('')
    setConfirm('')
    setError('')
    setLoading(false)
    onClose()
  }, [onClose])

  const isSubmitDisabled =
    loading || !current || !newPass || newPass.length < 8 || newPass !== confirm

  const strength = strengthScore(newPass, t)
  const showStrength = newPass.length > 0
  const matchesConfirm = confirm.length > 0 && newPass === confirm

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const container = containerRef.current
      const glow = glowRef.current
      const glowInner = glowInnerRef.current
      if (!container || !glow || !glowInner) return
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      glow.style.setProperty('--glow-x', `${x}px`)
      glow.style.setProperty('--glow-y', `${y}px`)
      glowInner.style.setProperty('--glow-x', `${x}px`)
      glowInner.style.setProperty('--glow-y', `${y}px`)
    })
  }

  function handleMouseLeave() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const glow = glowRef.current
    const glowInner = glowInnerRef.current
    if (glow) {
      glow.style.setProperty('--glow-x', '-200px')
      glow.style.setProperty('--glow-y', '-200px')
    }
    if (glowInner) {
      glowInner.style.setProperty('--glow-x', '-200px')
      glowInner.style.setProperty('--glow-y', '-200px')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPass.length < 8) { setError(t('header.pw.error.length')); return }
    if (newPass !== confirm) { setError(t('header.pw.error.mismatch')); return }
    setLoading(true)
    try {
      await apiPost('/auth/change-password', { currentPassword: current, newPassword: newPass })
      toast.success(t('header.pw.success'))
      close()
      await logout()
      navigate('/login')
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : t('header.pw.error.default')
      if (raw.includes('incorrect') || raw.includes('INVALID_PASSWORD')) {
        setError(t('header.pw.error.invalid'))
      } else if (raw.includes('WEAK_PASSWORD') || raw.includes('8 caractères') || raw.includes('8 characters')) {
        setError(t('header.pw.error.weak'))
      } else if (raw.includes('SAME_PASSWORD') || raw.includes('identique') || raw.includes('same')) {
        setError(t('header.pw.error.same'))
      } else {
        setError(raw || t('header.pw.error.default'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title={t('header.changePassword')} subtitle={t('header.pw.subtitle')}>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative overflow-hidden rounded-2xl"
        style={{
          '--glow-x': '-200px',
          '--glow-y': '-200px',
        } as React.CSSProperties}
      >
        {/* Outer diffuse glow */}
        <div
          ref={glowRef}
          className="pointer-events-none absolute -inset-px transition-all duration-500 ease-out"
          style={{
            background: 'rgba(99,102,241,0.06)',
          }}
        />
        {/* Inner sharp highlight */}
        <div
          ref={glowInnerRef}
          className="pointer-events-none absolute inset-0 transition-all duration-300 ease-out"
          style={{
            background: 'rgba(99,102,241,0.04)',
          }}
        />
        {/* Border glow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl transition-all duration-500 ease-out"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(139,92,246,0.06), inset 0 0 30px -10px rgba(139,92,246,0.08)',
          }}
        />
        <form onSubmit={handleSubmit} className="relative space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
              <X className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="pw-current" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('header.pw.current')}
            </label>
            <PasswordInput
              id="pw-current"
              ref={currentRef}
              value={current}
              onChange={setCurrent}
              placeholder={t('header.pw.current.placeholder')}
              autoComplete="current-password"
            />
          </div>

          <div>
            <label htmlFor="pw-new" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('header.pw.new')}
            </label>
            <PasswordInput
              id="pw-new"
              value={newPass}
              onChange={setNewPass}
              placeholder={t('header.pw.new.placeholder')}
              autoComplete="new-password"
            />
            {showStrength && (
              <div className="mt-2.5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.barColor}`}
                      style={{ width: strength.score === 1 ? '33%' : strength.score === 2 ? '66%' : '100%' }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${strength.color}`}>{strength.label}</span>
                </div>
                <div className="space-y-1">
                  <ValidationRule met={newPass.length >= 8} label={t('header.pw.rule.length')} />
                  <ValidationRule met={/[A-Z]/.test(newPass)} label={t('header.pw.rule.uppercase')} />
                  <ValidationRule met={/[0-9]/.test(newPass)} label={t('header.pw.rule.number')} />
                  <ValidationRule met={/[^A-Za-z0-9]/.test(newPass)} label={t('header.pw.rule.special')} />
                  <ValidationRule met={newPass.length > 0 && newPass !== current} label={t('header.pw.rule.different')} />
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="pw-confirm" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('header.pw.confirm')}
            </label>
            <PasswordInput
              id="pw-confirm"
              value={confirm}
              onChange={setConfirm}
              placeholder={t('header.pw.confirm.placeholder')}
              autoComplete="new-password"
            />
            {confirm.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5">
                {matchesConfirm ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('header.pw.match')}</span>
                  </>
                ) : (
                  <>
                    <X className="h-3.5 w-3.5 text-rose-500" />
                    <span className="text-xs text-rose-600 dark:text-rose-400">{t('header.pw.noMatch')}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
            <span>{t('header.pw.securityNote')}</span>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-700/50">
            <Button type="button" variant="ghost" onClick={close} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitDisabled} loading={loading}>
              {t('header.pw.submit')}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

function ValidationRule({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {met ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <span className="h-3 w-3 rounded-full border border-slate-300 dark:border-slate-600" />
      )}
      <span className={`text-xs ${met ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
        {label}
      </span>
    </div>
  )
}
