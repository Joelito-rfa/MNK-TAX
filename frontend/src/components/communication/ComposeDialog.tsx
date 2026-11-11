import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Search,
  Smartphone,
  User,
  X,
} from 'lucide-react'
import { apiErrorMessageI18n, apiGet, apiPost } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { normalizePhone } from '../../lib/phone'
import type {
  CommChannel,
  CommComposePreview,
  CommComposeRequest,
  CommComposeResult,
  CommPriority,
  CommProviderStatus,
  CommProvidersStatus,
  CommSender,
  CommTemplate,
} from '../../types'
import { Badge, Button, Field, Input, Modal, Select, Textarea } from '../ui'
import PortalDropdown from '../PortalDropdown'
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

/** Page Spring renvoyée par /taxpayers/contacts. */
interface TaxpayerContactPage {
  content: TaxpayerContact[]
  number: number
  totalPages: number
  totalElements: number
}

const CONTACTS_PAGE_SIZE = 200

/** Ligne d'information sur l'état d'un fournisseur (email / SMS). */
function ProviderLine({
  label,
  provider,
  readyText,
  koText,
}: {
  label: string
  provider: CommProviderStatus
  readyText: string
  koText: string
}) {
  const ready = provider.status === 'CONNECTED'
  return (
    <div className="flex flex-wrap items-start gap-2">
      <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <Badge tone={ready ? 'green' : 'red'}>
        {provider.provider} — {ready ? readyText : koText}
      </Badge>
      {provider.detail && (
        <span className="text-slate-500 dark:text-slate-400">{provider.detail}</span>
      )}
    </div>
  )
}

/**
 * Charge l'intégralité du registre des contribuables.
 * Endpoint dédié en priorité ; sinon repli sur l'endpoint paginé (backend
 * qui n'expose pas encore /contacts/all), pages parcourues jusqu'au bout.
 */
async function fetchAllContacts(): Promise<TaxpayerContact[]> {
  try {
    return await apiGet<TaxpayerContact[]>('/taxpayers/contacts/all')
  } catch {
    const first = await apiGet<TaxpayerContactPage>(
      `/taxpayers/contacts?page=0&size=${CONTACTS_PAGE_SIZE}`,
    )
    const all = [...first.content]
    for (let page = 1; page < first.totalPages; page++) {
      const next = await apiGet<TaxpayerContactPage>(
        `/taxpayers/contacts?page=${page}&size=${CONTACTS_PAGE_SIZE}`,
      )
      all.push(...next.content)
    }
    // La requête paginée peut doubler les lignes (jointure activités) : on dédoublonne.
    return Array.from(new Map(all.map((c) => [c.id, c])).values())
  }
}

export default function ComposeDialog({  open,
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
  const [pickerOpen, setPickerOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [target, setTarget] = useState<TargetInfo | null>(preselected ?? null)
  const [channels, setChannels] = useState<CommChannel[]>(['IN_APP'])
  const [templateCode, setTemplateCode] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<CommPriority>('NORMAL')
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now')
  const [scheduleAt, setScheduleAt] = useState('')
  const [preview, setPreview] = useState<CommComposePreview | null>(null)
  // Expéditeur (canal email)
  const [senderEmail, setSenderEmail] = useState('')
  const [updateContact, setUpdateContact] = useState(false)
  // Contact saisi manuellement (email / numéro) et nom du destinataire externe
  const [emailTo, setEmailTo] = useState('')
  const [phoneTo, setPhoneTo] = useState('')
  const [externalName, setExternalName] = useState('')
  const pickerButtonRef = useRef<HTMLButtonElement>(null)

  // ── Logique des canaux (cœur du composeur) ─────────────────────
  //  • site seul        → contributeur enregistré (obligatoire), aucun contact saisi
  //  • email seul / SMS seul → contact saisi, sans sélectionner de contributeur
  //  • les trois canaux → contributeur enregistré, contact repris de la fiche
  const useInApp = channels.includes('IN_APP')
  const useEmail = channels.includes('EMAIL')
  const useSms = channels.includes('SMS')
  const allChannels = useInApp && useEmail && useSms
  const locked = allChannels && target != null

  const ficheEmail = (target?.email ?? '').trim()
  const fichePhone = (target?.phone ?? '').trim()
  const fichePhoneNorm = normalizePhone(fichePhone)

  const emailValue = locked ? ficheEmail : emailTo.trim()
  const phoneValue = locked ? fichePhone : phoneTo.trim()
  const emailValid = EMAIL_RE.test(emailValue)
  const phoneNorm = normalizePhone(phoneValue)
  const phoneValid = phoneNorm !== null

  // Écarts par rapport à la fiche : envoyés comme surcharges (emailOverride / phoneOverride).
  const emailOverride =
    useEmail && !locked && emailValue !== '' && emailValue.toLowerCase() !== ficheEmail.toLowerCase()
      ? emailValue
      : null
  const phoneOverride =
    useSms && !locked && phoneNorm != null && phoneNorm !== fichePhoneNorm ? phoneNorm : null
  const contactChanged = emailOverride !== null || phoneOverride !== null

  // Libellé du destinataire affiché dans le récapitulatif.
  const recipientLabel = target?.name ?? (externalName.trim() || emailValue || '—')

  useEffect(() => {
    if (open) {
      setStep(1)
      setTarget(preselected ?? null)
      setChannels(['IN_APP'])
      setEmailTo(preselected?.email ?? '')
      setPhoneTo(preselected?.phone ?? '')
      setSenderEmail('')
      setUpdateContact(false)
      setExternalName('')
      setPickerOpen(false)
      setFilter('')
      setPreview(null)
    }
  }, [open, preselected])

  // Fermeture du sélecteur au clic extérieur (le menu est rendu dans un portail).
  useEffect(() => {
    if (!pickerOpen) return
    function onMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (pickerButtonRef.current?.contains(target)) return
      if (target.closest('[data-picker-dropdown]')) return
      setPickerOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [pickerOpen])

  // Tous les contribuables enregistrés sont chargés d'un coup : la sélection
  // affiche l'intégralité du registre (tri par nom), sans pagination.
  const {
    data: allContacts,
    isFetching: loadingContacts,
    error: contactsError,
  } = useQuery({
    queryKey: ['taxpayers', 'comm-contacts-all'],
    queryFn: fetchAllContacts,
    enabled: open && useInApp && pickerOpen,
  })

  // Filtre instantané côté client (la liste complète reste visible par défaut).
  const contacts = useMemo(() => {
    const list = allContacts ?? []
    const q = filter.trim().toLowerCase()
    if (q.length === 0) return list
    return list.filter((tp) =>
      [tp.name, tp.nif, tp.email, tp.phone]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    )
  }, [allContacts, filter])

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

  // État réel des fournisseurs : indispensable avant d'envoyer par email/SMS
  // (mode démonstration = aucun envoi réel, fournisseur absent = échec).
  const { data: providersData } = useQuery({
    queryKey: ['comm-providers'],
    queryFn: () => apiGet<CommProvidersStatus>('/communication/providers'),
    enabled: open && (useEmail || useSms),
  })

  const emailProvider: CommProviderStatus | undefined = providersData?.providers.find(
    (p) => p.channel === 'EMAIL',
  )
  const smsProvider: CommProviderStatus | undefined = providersData?.providers.find(
    (p) => p.channel === 'SMS',
  )

  const senderOptions = useMemo(() => {
    const list = (senders ?? []).map((s) => s.email).filter(Boolean)
    if (list.length > 0) return list
    return FALLBACK_SENDERS
  }, [senders])

  useEffect(() => {
    if (!senderEmail && senderOptions.length > 0) setSenderEmail(senderOptions[0])
  }, [senderOptions, senderEmail])

  // Rendu du modèle sélectionné (variables de base)
  useEffect(() => {
    if (!templateCode) {
      return
    }
    apiPost<import('../../types').CommTemplateRenderResult>('/communication/templates/render', {
      templateCode,
      language: 'FR',
      variables: { taxpayer_name: target?.name ?? externalName, nif: target?.nif ?? '' },
    })
      .then((r) => {
        if (r.subject) setSubject(r.subject)
        if (r.body) setContent(r.body)
      })
      .catch(() => undefined)
  }, [templateCode, target, externalName])

  function pickTarget(tp: TaxpayerContact) {
    const phone = tp.phoneNormalized ?? tp.phone ?? null
    setTarget({
      taxpayerId: tp.id,
      name: tp.name,
      nif: tp.nif,
      email: tp.email,
      phone,
    })
    // Le contact de la fiche pré-remplit les champs : il reste modifiable
    // sauf si les trois canaux sont sélectionnés (lecture seule).
    setEmailTo(tp.email ?? '')
    setPhoneTo(phone ?? '')
    setUpdateContact(false)
    setPickerOpen(false)
  }

  function clearTarget() {
    setTarget(null)
    setEmailTo('')
    setPhoneTo('')
  }

  const buildRequest = (confirmed: boolean): CommComposeRequest => ({
    taxpayerId: target?.taxpayerId ?? null,
    audience: 'SINGLE',
    channels,
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
    emailOverride,
    phoneOverride,
    senderEmail: useEmail ? senderEmail.trim() || null : null,
    updateContact: target && updateContact && contactChanged ? true : null,
    externalName: target ? null : externalName.trim() || null,
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
      if (channels.length === 0) return t('comm.compose.error.channel')
      if (useInApp && !target) return t('comm.compose.error.ficheRequired')
      if (useEmail && !emailValid) return t('comm.compose.email.required')
      if (useSms && !phoneValid) return t('comm.compose.phone.required')
      return null
    }
    if (n === 2) {
      if (!content.trim()) return t('comm.compose.error.content')
      return null
    }
    if (useEmail && !emailValid) return t('comm.compose.email.required')
    if (useSms && !phoneValid) return t('comm.compose.phone.required')
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
    setChannels((prev) => {
      const next = prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
      return next.length > 0 ? next : prev
    })
    // Sans le canal « site », le contributeur enregistré n'est plus ciblé :
    // le message part vers le contact saisi (email / numéro).
    if (c === 'IN_APP' && channels.includes('IN_APP')) {
      setTarget(null)
      setPickerOpen(false)
      setFilter('')
      setUpdateContact(false)
    }
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
            {/* Canaux — ils déterminent la logique du destinataire */}
            <Field
              label={t('comm.compose.channels')}
              hint={t('comm.compose.channels.hint')}
            >
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
              {allChannels && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400">
                  <Lock className="h-3.5 w-3.5" /> {t('comm.compose.locked.hint')}
                </p>
              )}
            </Field>

            {/* Contribuable enregistré — sélection dans la liste du registre */}
            {useInApp && (
            <div>
              <Field
                label={t('comm.compose.recipient.fiche.label')}
                hint={t('comm.compose.error.ficheRequired')}
              >
                {target ? (
                  <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 transition dark:border-emerald-800/40 dark:bg-emerald-900/20">
                    <div className="text-sm">
                      <span className="font-medium text-slate-800 dark:text-slate-100">{target.name}</span>
                      <span className="ml-2 text-slate-400">{target.nif}</span>
                      {target.email && <span className="ml-2 text-xs text-slate-400">{target.email}</span>}
                      {target.phone && <span className="ml-2 text-xs text-slate-400">{target.phone}</span>}
                    </div>
                    <button
                      onClick={clearTarget}
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-slate-600 dark:hover:bg-slate-700"
                      aria-label={t('common.remove')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      ref={pickerButtonRef}
                      type="button"
                      onClick={() => setPickerOpen((v) => !v)}
                      aria-expanded={pickerOpen}
                      className="flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm transition hover:border-brand-400 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:hover:border-brand-400"
                    >
                      <span className="text-slate-400">{t('comm.compose.recipient.fiche.select')}</span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${pickerOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {pickerOpen && (
                      <PortalDropdown
                        anchorRef={pickerButtonRef}
                        open={pickerOpen}
                        onClose={() => setPickerOpen(false)}
                        matchAnchor
                        dropdownProps={{ 'data-picker-dropdown': '' }}
                      >
                        <div className="p-1">
                          <div className="relative mb-1.5">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                              value={filter}
                              onChange={(e) => setFilter(e.target.value)}
                              placeholder={t('comm.compose.recipient.fiche.filter')}
                              className="rounded-xl pl-9"
                              autoFocus
                            />
                            {loadingContacts && (
                              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                            )}
                          </div>

                          <div className="max-h-80 overflow-y-auto">
                            {contacts.map((tp) => (
                              <button
                                key={tp.id}
                                type="button"
                                onClick={() => pickTarget(tp)}
                                className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-brand-50 dark:hover:bg-slate-700"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-medium text-slate-700 dark:text-slate-200">{tp.name}</span>
                                  <span className="block truncate text-xs text-slate-400">
                                    {tp.nif}{tp.email ? ` · ${tp.email}` : ''}{tp.phone ? ` · ${tp.phone}` : ''}
                                  </span>
                                </span>
                              </button>
                            ))}
                            {!loadingContacts && contactsError && (
                              <p className="px-3 py-6 text-center text-xs text-rose-600">
                                {apiErrorMessageI18n(contactsError, t)}
                              </p>
                            )}
                            {!loadingContacts && !contactsError && contacts.length === 0 && (
                              <p className="px-3 py-6 text-center text-xs text-slate-400">{t('common.noResult')}</p>
                            )}
                          </div>

                          <p className="mt-1 px-1 text-center text-[11px] text-slate-400">
                            {t('comm.compose.recipient.fiche.count', { count: contacts.length })}
                          </p>
                        </div>
                      </PortalDropdown>
                    )}
                  </div>
                )}
              </Field>
            </div>
            )}

            {/* Nom du destinataire sans fiche (email / SMS saisis) */}
            {!target && (
              <Field label={t('comm.compose.recipient.externalName')}>
                <Input
                  value={externalName}
                  onChange={(e) => setExternalName(e.target.value)}
                  placeholder={t('comm.compose.recipient.externalNamePlaceholder')}
                  className="rounded-2xl"
                />
              </Field>
            )}

            {/* Email destinataire — saisi éditable (sauf les trois canaux) */}
            {useEmail && (
              <Field
                label={t('comm.compose.email.label')}
                hint={
                  locked
                    ? t('comm.compose.email.auto')
                    : target
                      ? t('comm.compose.email.hint')
                      : t('comm.compose.email.hintManual')
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={locked ? ficheEmail : emailTo}
                    readOnly={locked}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder={t('comm.compose.email.placeholder')}
                    className="rounded-2xl"
                    inputMode="email"
                  />
                  {locked ? (
                    <Badge tone="green">
                      <Lock className="mr-1 h-3 w-3" /> {t('comm.compose.email.auto')}
                    </Badge>
                  ) : ficheEmail && emailValue.toLowerCase() === ficheEmail.toLowerCase() ? (
                    <Badge tone="slate">{t('comm.compose.email.fiche')}</Badge>
                  ) : null}
                </div>
                {!locked && emailValue !== '' && !emailValid && (
                  <p className="mt-1 text-xs text-rose-600">{t('comm.compose.email.invalid')}</p>
                )}
                {locked && !ficheEmail && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> {t('comm.compose.email.missingLocked')}
                  </p>
                )}
                {!locked && target && !ficheEmail && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> {t('comm.compose.email.missing')}
                  </p>
                )}
              </Field>
            )}

            {/* Numéro destinataire — saisi éditable (sauf les trois canaux) */}
            {useSms && (
              <Field
                label={t('comm.compose.phone.label')}
                hint={
                  locked
                    ? t('comm.compose.phone.auto')
                    : target
                      ? t('comm.compose.phone.hint')
                      : t('comm.compose.phone.hintManual')
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={locked ? fichePhone : phoneTo}
                    readOnly={locked}
                    onChange={(e) => setPhoneTo(e.target.value)}
                    placeholder={t('comm.compose.phone.placeholder')}
                    className="rounded-2xl"
                    inputMode="tel"
                  />
                  {locked ? (
                    <Badge tone="green">
                      <Lock className="mr-1 h-3 w-3" /> {t('comm.compose.phone.auto')}
                    </Badge>
                  ) : fichePhone && phoneNorm === fichePhoneNorm ? (
                    <Badge tone="slate">{t('comm.compose.phone.fiche')}</Badge>
                  ) : null}
                </div>
                {!locked && phoneValue !== '' && !phoneValid && (
                  <p className="mt-1 text-xs text-rose-600">{t('comm.compose.phone.invalid')}</p>
                )}
                {locked && !fichePhone && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> {t('comm.compose.phone.missingLocked')}
                  </p>
                )}
                {!locked && target && !fichePhone && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> {t('comm.compose.phone.missing')}
                  </p>
                )}
              </Field>
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
            {/* Destinataire retenu (récapitulatif) */}
            <div className="space-y-3 rounded-2xl border border-brand-200/70 bg-brand-50/50 p-4 dark:border-brand-800/40 dark:bg-brand-900/10">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <User className="h-4 w-4 text-brand-600" /> {t('comm.compose.recipient')}
              </p>
              <div className="grid gap-1.5 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                <span className="truncate">
                  {target ? (
                    <>
                      <strong>{target.name}</strong> · {target.nif}
                    </>
                  ) : (
                    <>
                      <strong>{recipientLabel}</strong>
                    </>
                  )}
                </span>
                <span>
                  {t('comm.compose.channels')} :{' '}
                  {channels.map((c) => t(`comm.channel.${c}`)).join(' + ')}
                </span>
                {useEmail && (
                  <span className="truncate">
                    {t('comm.compose.email.label')} : <strong>{emailValue || '—'}</strong>
                  </span>
                )}
                {useSms && (
                  <span className="truncate">
                    {t('comm.compose.phone.label')} : <strong>{phoneValue || '—'}</strong>
                  </span>
                )}
              </div>

              {/* État réel des fournisseurs : un email marqué « envoyé » sans
                  envoi réel (mode démo) ou sans fournisseur échoue. */}
              {(useEmail || useSms) && (
                <div className="space-y-1.5 border-t border-brand-200/60 pt-3 text-xs dark:border-brand-800/40">
                  {useEmail && emailProvider && (
                    <ProviderLine
                      label={t('comm.compose.email.label')}
                      provider={emailProvider}
                      readyText={t('comm.compose.provider.ready')}
                      koText={t('comm.compose.provider.ko')}
                    />
                  )}
                  {useSms && smsProvider && (
                    <ProviderLine
                      label={t('comm.compose.phone.label')}
                      provider={smsProvider}
                      readyText={t('comm.compose.provider.ready')}
                      koText={t('comm.compose.provider.ko')}
                    />
                  )}
                </div>
              )}

              {/* Mise à jour de la fiche (contact saisi manuellement) */}
              {target && contactChanged && (
                <label className="flex cursor-pointer items-center gap-2 border-t border-brand-200/60 pt-3 text-xs text-slate-600 dark:text-slate-300 dark:border-brand-800/40">
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
              {useEmail && (
                <div className="space-y-2 border-t border-brand-200/60 pt-3 dark:border-brand-800/40">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('comm.compose.email.from')}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('comm.compose.email.fromHint')}</p>
                  <Select value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} className="rounded-2xl">
                    {senderOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

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
                      {t('comm.compose.recipient')} : <strong>{recipientLabel} · {preview.recipientCount}</strong>
                    </span>
                    <span>
                      {t('comm.compose.channels')} : {preview.channels.map((c) => t(`comm.channel.${c}`)).join(' + ')}
                    </span>
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
