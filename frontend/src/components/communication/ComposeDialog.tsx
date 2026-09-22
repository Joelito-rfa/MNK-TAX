import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
  Search,
  Smartphone,
  X,
} from 'lucide-react'
import { apiErrorMessageI18n, apiGet, apiPost } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import type {
  CommChannel,
  CommComposePreview,
  CommComposeRequest,
  CommComposeResult,
  CommPriority,
  CommSender,
  CommTemplate,
} from '../../types'
import { Badge, Button, Field, Input, Modal, Select, Textarea } from '../ui'
import { useToast } from '../Toast'

const CHANNELS: { value: CommChannel; icon: React.ReactNode; labelKey: string }[] = [
  { value: 'IN_APP', icon: <MessageSquare className="h-4 w-4" />, labelKey: 'comm.compose.channel.site' },
  { value: 'EMAIL', icon: <Mail className="h-4 w-4" />, labelKey: 'comm.compose.channel.email' },
  { value: 'SMS', icon: <Smartphone className="h-4 w-4" />, labelKey: 'comm.compose.channel.sms' },
]

const PRIORITIES: CommPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const FALLBACK_SENDERS = ['no-reply@mnk-tax.mg', 'contact@mnk-tax.mg']

interface TargetInfo {
  taxpayerId: number
  name: string
  nif: string
  email: string | null
  phone: string | null
}

interface TaxpayerContact {
  id: number
  nif: string
  name: string
  email: string | null
  phone: string | null
  phoneNormalized: string | null
  language: string | null
  preferredChannels: string | null
}

export default function ComposeDialog({
  open,
  onClose,
  preselected,
}: {
  open: boolean
  onClose: (sent?: boolean) => void
  preselected?: TargetInfo | null
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [target, setTarget] = useState<TargetInfo | null>(preselected ?? null)
  const [channels, setChannels] = useState<CommChannel[]>(['IN_APP'])
  const [templateCode, setTemplateCode] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<CommPriority>('NORMAL')
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now')
  const [scheduleAt, setScheduleAt] = useState('')
  const [preview, setPreview] = useState<CommComposePreview | null>(null)
  // Sélection email avant envoi (destinataire + expéditeur)
  const [emailMode, setEmailMode] = useState<'fiche' | 'custom'>('fiche')
  const [emailTo, setEmailTo] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [updateContact, setUpdateContact] = useState(false)
  // Destinataire : fiche existante (auto) ou personne externe (email libre)
  const [recipientKind, setRecipientKind] = useState<'fiche' | 'externe'>('fiche')
  const [externalName, setExternalName] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setStep(1)
      setTarget(preselected ?? null)
      setEmailTo(preselected?.email ?? '')
      setEmailMode('fiche')
      setSenderEmail('')
      setUpdateContact(false)
      setRecipientKind('fiche')
      setExternalName('')
      setPreview(null)
    }
  }, [open, preselected])

  // Recherche de contribuables (NIF, nom, raison sociale, téléphone, email)
  // via l'endpoint dédié du composeur (MESSAGE_WRITE).
  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ['taxpayers', 'comm-contacts', search],
    queryFn: () =>
      apiGet<{ content: TaxpayerContact[] }>(
        `/taxpayers/contacts?q=${encodeURIComponent(search)}&page=0&size=8`,
      ),
    enabled: open && searchOpen && search.trim().length >= 2,
  })

  const { data: templates } = useQuery({
    queryKey: ['comm-templates'],
    queryFn: () => apiGet<CommTemplate[]>('/communication/templates'),
    enabled: open,
  })

  const { data: senders } = useQuery({
    queryKey: ['comm-senders'],
    queryFn: () => apiGet<CommSender[]>('/communication/senders'),
    enabled: open,
  })

  const senderOptions = useMemo(() => {
    const list = (senders ?? []).map((s) => s.email).filter(Boolean)
    if (list.length > 0) return list
    return FALLBACK_SENDERS
  }, [senders])

  useEffect(() => {
    if (!senderEmail && senderOptions.length > 0) setSenderEmail(senderOptions[0])
  }, [senderOptions, senderEmail])

  // Sélection automatique : si la recherche retourne un seul résultat dont le
  // NIF ou l'email correspond exactement, on le sélectionne sans clic.
  useEffect(() => {
    if (recipientKind !== 'fiche' || target || !searchOpen) return
    const list = searchResults?.content ?? []
    if (list.length !== 1) return
    const q = search.trim().toLowerCase()
    const tp = list[0]
    if (tp.nif.toLowerCase() === q || (tp.email ?? '').toLowerCase() === q) {
      pickTarget(tp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResults, recipientKind])

  // Rendu du modèle sélectionné (variables de base)
  useEffect(() => {
    if (!templateCode) {
      return
    }
    apiPost<import('../../types').CommTemplateRenderResult>('/communication/templates/render', {
      templateCode,
      language: 'FR',
      variables: { taxpayer_name: isExternal ? externalName : (target?.name ?? ''), nif: target?.nif ?? '' },
    })
      .then((r) => {
        if (r.subject) setSubject(r.subject)
        if (r.body) setContent(r.body)
      })
      .catch(() => undefined)
  }, [templateCode, target, isExternal, externalName])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function pickTarget(tp: TaxpayerContact) {
    setTarget({
      taxpayerId: tp.id,
      name: tp.name,
      nif: tp.nif,
      email: tp.email,
      phone: tp.phoneNormalized ?? tp.phone,
    })
    setEmailTo(tp.email ?? '')
    setEmailMode('fiche')
    setUpdateContact(false)
    setSearchOpen(false)
    // Donnée existante sélectionnée : on active le canal EMAIL si un email est fiché.
    if (tp.email && EMAIL_RE.test(tp.email.trim())) {
      setChannels((prev) => (prev.includes('EMAIL') ? prev : [...prev, 'EMAIL']))
    }
  }

  function switchRecipientKind(kind: 'fiche' | 'externe') {
    setRecipientKind(kind)
    setPreview(null)
    if (kind === 'externe') {
      // Externe : email uniquement, canaux forcés.
      setChannels(['EMAIL'])
    } else {
      setExternalName('')
    }
  }

  const isExternal = recipientKind === 'externe'
  const needsEmail = isExternal || channels.includes('EMAIL')
  const emailTrimmed = emailTo.trim()
  const emailValid = EMAIL_RE.test(emailTrimmed)
  const ficheEmail = (target?.email ?? '').trim()
  const emailChanged = needsEmail && emailValid && ficheEmail !== '' && emailTrimmed.toLowerCase() !== ficheEmail.toLowerCase()
  const emailIsNew = needsEmail && emailValid && ficheEmail === ''

  const buildRequest = (confirmed: boolean): CommComposeRequest => ({
    taxpayerId: isExternal ? null : (target?.taxpayerId ?? null),
    audience: 'SINGLE',
    channels: isExternal ? ['EMAIL'] : channels,
    subject: subject || null,
    content,
    templateCode: templateCode || null,
    priority,
    messageType: 'GENERAL',
    scheduledAt:
      scheduleMode === 'later' && scheduleAt
        ? new Date(scheduleAt).toISOString()
        : null,
    requireConfirmation: confirmed,
    emailOverride: needsEmail ? emailTrimmed || null : null,
    senderEmail: needsEmail ? senderEmail.trim() || null : null,
    updateContact: !isExternal && needsEmail && updateContact && (emailChanged || emailIsNew) ? true : null,
    externalName: isExternal ? externalName.trim() || null : null,
  })

  // Aperçu avant envoi (résumé UX)
  const previewMutation = useMutation({
    mutationFn: () => apiPost<CommComposePreview>('/communication/preview', buildRequest(false)),
    onSuccess: (p) => setPreview(p),
    onError: (err) => toast.error(apiErrorMessageI18n(err, t)),
  })

  const sendMutation = useMutation({
    mutationFn: (confirmed: boolean) =>
      apiPost<CommComposeResult>('/communication/send', buildRequest(confirmed)),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['comm-sent'] })
      queryClient.invalidateQueries({ queryKey: ['comm-stats'] })
      queryClient.invalidateQueries({ queryKey: ['taxpayers'] })
      setPreview(null)
      onClose(true)
      toast.success(
        result.status === 'SCHEDULED' ? t('comm.compose.scheduled') : t('comm.compose.queued'),
      )
    },
    onError: (err) => toast.error(apiErrorMessageI18n(err, t)),
  })

  const warnings = preview?.warnings ?? []
  const needsConfirm = (preview?.recipientCount ?? 0) > 100

  function stepError(n: 1 | 2 | 3): string | null {
    if (n === 1) {
      if (isExternal) {
        if (!emailValid) return t('comm.compose.email.required')
        return null
      }
      if (!target) return t('comm.compose.error.noRecipient')
      if (channels.length === 0) return t('comm.compose.error.channel')
      return null
    }
    if (n === 2) {
      if (!content.trim()) return t('comm.compose.error.content')
      return null
    }
    if (needsEmail && !emailValid) return t('comm.compose.email.required')
    if (needsEmail && !EMAIL_RE.test(senderEmail.trim())) return t('comm.compose.email.invalid')
    if (!content.trim()) return t('comm.compose.error.content')
    return null
  }

  function goNext() {
    const err = stepError(step)
    if (err) {
      toast.error(err)
      return
    }
    if (step < 3) {
      const next = (step + 1) as 1 | 2 | 3
      setStep(next)
      if (next === 3) {
        setPreview(null)
        previewMutation.mutate()
      }
    }
  }

  function toggleChannel(c: CommChannel) {
    if (isExternal) return
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  const scheduledInvalid = scheduleMode === 'later' && !scheduleAt

  const minSchedule = useMemo(() => {
    const d = new Date(Date.now() + 60 * 1000)
    return d.toISOString().slice(0, 16)
  }, [])

  const steps = [
    { n: 1 as const, label: t('comm.compose.steps.recipient') },
    { n: 2 as const, label: t('comm.compose.steps.content') },
    { n: 3 as const, label: t('comm.compose.steps.verify') },
  ]

  return (
    <Modal open={open} onClose={() => onClose(false)} title={t('comm.tab.compose')} size="full">
      {/* Stepper moderne */}
      <div className="border-b border-slate-200/70 px-5 pb-3 pt-4 dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.n} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => s.n < step && setStep(s.n)}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 ${
                  step === s.n
                    ? 'bg-brand-600 text-white shadow-md scale-105'
                    : s.n < step
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-700'
                }`}
              >
                {s.n < step ? <CheckCircle2 className="h-4 w-4" /> : s.n}
              </button>
              <span
                className={`hidden text-xs font-medium sm:block ${
                  step === s.n ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className={`mx-1 h-0.5 flex-1 rounded-full transition-colors ${s.n < step ? 'bg-emerald-500' : 'bg-slate-150 bg-slate-200 dark:bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div key={step} className="animate-fade-in space-y-4 px-5 py-4">
        {step === 1 && (
          <>
            {/* Type de destinataire : fiche existante (auto) ou externe */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => switchRecipientKind('fiche')}
                aria-pressed={!isExternal}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
                  !isExternal
                    ? 'border-brand-600 bg-brand-600 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Search className="h-4 w-4" /> {t('comm.compose.recipient.fiche')}
              </button>
              <button
                type="button"
                onClick={() => switchRecipientKind('externe')}
                aria-pressed={isExternal}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
                  isExternal
                    ? 'border-brand-600 bg-brand-600 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Mail className="h-4 w-4" /> {t('comm.compose.recipient.externe')}
              </button>
            </div>

            {isExternal ? (
              <div className="space-y-3 rounded-2xl border border-brand-200/70 bg-brand-50/50 p-4 dark:border-brand-800/40 dark:bg-brand-900/10">
                <Field label={t('comm.compose.recipient.externalName')}>
                  <Input
                    value={externalName}
                    onChange={(e) => setExternalName(e.target.value)}
                    placeholder={t('comm.compose.recipient.externalNamePlaceholder')}
                    className="rounded-2xl"
                  />
                </Field>
                <Field label={t('comm.compose.email.to')}>
                  <Input
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder={t('comm.compose.email.placeholder')}
                    className="rounded-2xl"
                    inputMode="email"
                  />
                </Field>
                {emailTo.trim() !== '' && !emailValid && (
                  <p className="text-xs text-rose-600">{t('comm.compose.email.invalid')}</p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('comm.compose.recipient.externalHint')}</p>
              </div>
            ) : (
            <>
            {/* Destinataire */}
            <div className="relative" ref={searchRef}>
              <Field label={t('comm.compose.recipient')}>
                {target ? (
                  <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 transition dark:border-emerald-800/40 dark:bg-emerald-900/20">
                    <div className="text-sm">
                      <span className="font-medium text-slate-800 dark:text-slate-100">{target.name}</span>
                      <span className="ml-2 text-slate-400">{target.nif}</span>
                      {target.email && <span className="ml-2 text-xs text-slate-400">{target.email}</span>}
                    </div>
                    <button
                      onClick={() => {
                        setTarget(null)
                        setEmailTo('')
                        setSearch('')
                      }}
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-slate-600 dark:hover:bg-slate-700"
                      aria-label={t('common.remove')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value)
                          setSearchOpen(true)
                        }}
                        placeholder={t('comm.compose.recipient.search')}
                        className="rounded-2xl pl-9"
                      />
                      {searching && (
                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                      )}
                    </div>
                    {searchOpen && searchResults && searchResults.content.length > 0 && (
                      <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-600 dark:bg-slate-800">
                        {searchResults.content.map((tp) => (
                          <button
                            key={tp.id}
                            onClick={() => pickTarget(tp)}
                            className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-brand-50 dark:hover:bg-slate-700"
                          >
                            <span>
                              <span className="block font-medium text-slate-700 dark:text-slate-200">{tp.name}</span>
                              <span className="block text-xs text-slate-400">
                                {tp.nif}{tp.email ? ` · ${tp.email}` : ` · ${t('comm.compose.email.missing')}`}
                              </span>
                            </span>
                            <span className="text-xs text-slate-400">{tp.nif}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Field>
            </div>

            {/* Canaux (plusieurs simultanés) */}
            <Field label={t('comm.compose.channels')}>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((c) => {
                  const active = channels.includes(c.value)
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => toggleChannel(c.value)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 active:scale-95 ${
                        active
                          ? 'border-brand-600 bg-brand-600 text-white shadow-md'
                          : 'border-slate-200 bg-white text-slate-600 hover:-translate-y-px hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {c.icon}
                      {t(c.labelKey)}
                    </button>
                  )
                })}
              </div>
              {needsEmail && !ficheEmail && target && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> {t('comm.compose.email.missing')}
                </p>
              )}
            </Field>
            </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            {/* Modèle */}
            <Field label={t('comm.compose.template')}>
              <Select value={templateCode} onChange={(e) => setTemplateCode(e.target.value)} className="rounded-2xl">
                <option value="">{t('comm.compose.template.none')}</option>
                {(templates ?? [])
                  .filter((tpl) => tpl.enabled)
                  .map((tpl) => (
                    <option key={tpl.code} value={tpl.code}>
                      {tpl.code}
                    </option>
                  ))}
              </Select>
            </Field>

            {/* Objet + contenu */}
            <Field label={t('comm.compose.subject')}>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('comm.compose.subject.placeholder')} className="rounded-2xl" />
            </Field>
            <Field label={t('comm.compose.message')}>
              <Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder={t('comm.compose.message.placeholder')} className="rounded-2xl" />
              <p className={`mt-1 text-right text-xs ${content.trim() ? 'text-slate-400' : 'text-rose-500'}`}>
                {content.length} · {content.trim() ? t('comm.compose.email.verified') : t('comm.compose.error.content')}
              </p>
            </Field>

            {/* Priorité + programmation */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('comm.compose.priority')}>
                <Select value={priority} onChange={(e) => setPriority(e.target.value as CommPriority)} className="rounded-2xl">
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {t(`comm.priority.${p}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('comm.compose.schedule')}>
                <div className="space-y-2 rounded-2xl border border-slate-200/70 p-3 dark:border-slate-700/50">
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input type="radio" checked={scheduleMode === 'now'} onChange={() => setScheduleMode('now')} className="accent-brand-600" />
                    {t('comm.compose.schedule.now')}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input type="radio" checked={scheduleMode === 'later'} onChange={() => setScheduleMode('later')} className="accent-brand-600" />
                    {t('comm.compose.schedule.later')}
                  </label>
                  {scheduleMode === 'later' && (
                    <Input type="datetime-local" min={minSchedule} value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                  )}
                </div>
              </Field>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            {/* Sélection email destinataire avant envoi */}
            {needsEmail && (
              <div className="space-y-3 rounded-2xl border border-brand-200/70 bg-brand-50/50 p-4 dark:border-brand-800/40 dark:bg-brand-900/10">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <Mail className="h-4 w-4 text-brand-600" /> {t('comm.compose.email.to')}
                  </p>
                  {emailValid ? (
                    <Badge tone="green">{t('comm.compose.email.verified')}</Badge>
                  ) : (
                    <Badge tone="red">{t('comm.compose.email.toFix')}</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('comm.compose.email.toHint')}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select
                    value={emailMode}
                    onChange={(e) => {
                      const mode = e.target.value as 'fiche' | 'custom'
                      setEmailMode(mode)
                      if (mode === 'fiche') {
                        setEmailTo(ficheEmail)
                        setUpdateContact(false)
                      } else {
                        setEmailTo('')
                      }
                    }}
                    className="rounded-2xl"
                  >
                    <option value="fiche">
                      {t('comm.compose.email.fiche')}{ficheEmail ? ` · ${ficheEmail}` : ''}
                    </option>
                    <option value="custom">{t('comm.compose.email.custom')}</option>
                  </Select>
                  <Input
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder={t('comm.compose.email.placeholder')}
                    className="rounded-2xl"
                    inputMode="email"
                  />
                </div>
                {!emailValid && emailTrimmed !== '' && (
                  <p className="text-xs text-rose-600">{t('comm.compose.email.invalid')}</p>
                )}
                {!ficheEmail && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> {t('comm.compose.email.missing')}
                  </p>
                )}
                {(emailChanged || emailIsNew) && emailValid && target && (
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={updateContact}
                      onChange={(e) => setUpdateContact(e.target.checked)}
                      className="accent-brand-600"
                    />
                    {t('comm.compose.email.updateContact')}
                  </label>
                )}

                {/* Expéditeur */}
                <div className="space-y-2 border-t border-brand-200/60 pt-3 dark:border-brand-800/40">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('comm.compose.email.from')}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('comm.compose.email.fromHint')}</p>
                  <Select value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} className="rounded-2xl">
                    {senderOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </div>
              </div>
            )}

            {/* Résumé avant envoi */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-600 dark:bg-slate-700/40">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold text-slate-700 dark:text-slate-200">{t('comm.compose.preview.title')}</p>
                <Button variant="ghost" size="sm" onClick={() => previewMutation.mutate()} loading={previewMutation.isPending}>
                  {t('comm.compose.steps.verifyAction')}
                </Button>
              </div>
              {previewMutation.isPending && !preview ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading')}
                </div>
              ) : preview ? (
                <>
                  <div className="grid gap-1.5 text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                    <span>
                      {t('comm.compose.recipient')} : <strong>{isExternal ? (externalName.trim() || emailTrimmed) : target?.name} · {preview.recipientCount}</strong>
                    </span>
                    <span>
                      {t('comm.compose.channels')} : {preview.channels.map((c) => t(`comm.channel.${c}`)).join(' + ')}
                    </span>
                    {needsEmail && (
                      <span className="truncate">
                        {t('comm.compose.email.to')} : <strong>{emailTrimmed || '—'}</strong>
                      </span>
                    )}
                    {needsEmail && (
                      <span className="truncate">
                        {t('comm.compose.email.from')} : <strong>{senderEmail || '—'}</strong>
                      </span>
                    )}
                    {preview.missingEmail > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">{t('comm.compose.missingEmail', { count: preview.missingEmail })}</span>
                    )}
                    {preview.missingPhone > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">{t('comm.compose.missingPhone', { count: preview.missingPhone })}</span>
                    )}
                  </div>
                  {warnings.length > 0 && (
                    <ul className="mt-2 list-inside list-disc text-xs text-amber-600 dark:text-amber-400">
                      {warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}
                  {needsConfirm && (
                    <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      {t('comm.compose.confirm.bulk', { count: preview.recipientCount })}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400">{t('common.loading')}</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Actions fluides */}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 bg-white/80 px-5 py-4 backdrop-blur dark:border-slate-700/50 dark:bg-slate-800/80">
        <div>
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep((step - 1) as 1 | 2 | 3)}>
              <ArrowLeft className="h-4 w-4" /> {t('comm.compose.steps.back')}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => onClose(false)}>
            {t('comm.compose.preview.cancel')}
          </Button>
          {step < 3 ? (
            <Button onClick={goNext}>
              {t('comm.compose.steps.next')} <ArrowRight className="h-4 w-4" />
            </Button>
          ) : needsConfirm ? (
            <Button
              onClick={() => sendMutation.mutate(true)}
              loading={sendMutation.isPending || previewMutation.isPending}
              disabled={!!stepError(3) || scheduledInvalid}
            >
              {t('comm.compose.confirm.bulkAction')}
            </Button>
          ) : scheduleMode === 'later' ? (
            <Button
              onClick={() => sendMutation.mutate(false)}
              loading={sendMutation.isPending || previewMutation.isPending}
              disabled={!!stepError(3) || scheduledInvalid}
            >
              {t('comm.compose.preview.schedule')}
            </Button>
          ) : (
            <Button
              onClick={() => sendMutation.mutate(false)}
              loading={sendMutation.isPending || previewMutation.isPending}
              disabled={!!stepError(3) || scheduledInvalid}
            >
              {t('comm.compose.preview.send')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
