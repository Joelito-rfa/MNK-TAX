import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Mail, MessageSquare, Search, Smartphone, X } from 'lucide-react'
import { apiErrorMessageI18n, apiGet, apiPost } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import type {
  CommChannel,
  CommComposePreview,
  CommComposeRequest,
  CommComposeResult,
  CommPriority,
  CommTemplate,
} from '../../types'
import { Button, Field, Input, Modal, Select, Textarea } from '../ui'
import { useToast } from '../Toast'

const CHANNELS: { value: CommChannel; icon: React.ReactNode; labelKey: string }[] = [
  { value: 'IN_APP', icon: <MessageSquare className="h-4 w-4" />, labelKey: 'comm.compose.channel.site' },
  { value: 'EMAIL', icon: <Mail className="h-4 w-4" />, labelKey: 'comm.compose.channel.email' },
  { value: 'SMS', icon: <Smartphone className="h-4 w-4" />, labelKey: 'comm.compose.channel.sms' },
]

const PRIORITIES: CommPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT']

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
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setTarget(preselected ?? null)
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

  // Rendu du modèle sélectionné (variables de base)
  useEffect(() => {
    if (!templateCode) {
      return
    }
    apiPost<import('../../types').CommTemplateRenderResult>('/communication/templates/render', {
      templateCode,
      language: 'FR',
      variables: { taxpayer_name: target?.name ?? '', nif: target?.nif ?? '' },
    })
      .then((r) => {
        if (r.subject) setSubject(r.subject)
        if (r.body) setContent(r.body)
      })
      .catch(() => undefined)
  }, [templateCode, target])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

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
  })

  // Aperçu avant envoi (résumé UX)
  const previewMutation = useMutation({
    mutationFn: () => apiPost<CommComposePreview>('/communication/preview', buildRequest(false)),
    onError: (err) => toast.error(apiErrorMessageI18n(err, t)),
  })

  const sendMutation = useMutation({
    mutationFn: (confirmed: boolean) =>
      apiPost<CommComposeResult>('/communication/send', buildRequest(confirmed)),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['comm-sent'] })
      queryClient.invalidateQueries({ queryKey: ['comm-stats'] })
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

  function validate(): string | null {
    if (!target) return t('comm.compose.error.noRecipient')
    if (channels.length === 0) return t('comm.compose.error.channel')
    if (!content.trim()) return t('comm.compose.error.content')
    return null
  }

  function handlePreview() {
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }
    previewMutation.mutate()
  }

  function toggleChannel(c: CommChannel) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  const scheduledInvalid = scheduleMode === 'later' && !scheduleAt

  const minSchedule = useMemo(() => {
    const d = new Date(Date.now() + 60 * 1000)
    return d.toISOString().slice(0, 16)
  }, [])

  return (
    <Modal open={open} onClose={() => onClose(false)} title={t('comm.tab.compose')} wide>
      <div className="space-y-4 px-5 py-4">
        {/* Destinataire */}
        <div className="relative" ref={searchRef}>
          <Field label={t('comm.compose.recipient')}>
            {target ? (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-600 dark:bg-slate-700/50">
                <div className="text-sm">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{target.name}</span>
                  <span className="ml-2 text-slate-400">{target.nif}</span>
                  {target.email && <span className="ml-2 text-xs text-slate-400">{target.email}</span>}
                </div>
                <button
                  onClick={() => {
                    setTarget(null)
                    setSearch('')
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
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
                    className="pl-9"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                  )}
                </div>
                {searchOpen && searchResults && searchResults.content.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
                    {searchResults.content.map((tp) => (
                      <button
                        key={tp.id}
                        onClick={() => {
                          setTarget({
                            taxpayerId: tp.id,
                            name: tp.name,
                            nif: tp.nif,
                            email: tp.email,
                            phone: tp.phoneNormalized ?? tp.phone,
                          })
                          setSearchOpen(false)
                        }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-200">{tp.name}</span>
                        <span className="text-slate-400">{tp.nif}</span>
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
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                    active
                      ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {c.icon}
                  {t(c.labelKey)}
                </button>
              )
            })}
          </div>
        </Field>

        {/* Modèle */}
        <Field label={t('comm.compose.template')}>
          <Select value={templateCode} onChange={(e) => setTemplateCode(e.target.value)}>
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
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('comm.compose.subject.placeholder')} />
        </Field>
        <Field label={t('comm.compose.message')}>
          <Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder={t('comm.compose.message.placeholder')} />
        </Field>

        {/* Priorité + programmation */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('comm.compose.priority')}>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as CommPriority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t(`comm.priority.${p}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('comm.compose.schedule')}>
            <div className="space-y-2">
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

        {/* Résumé avant envoi */}
        {preview && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-600 dark:bg-slate-700/40">
            <p className="mb-2 font-semibold text-slate-700 dark:text-slate-200">{t('comm.compose.preview.title')}</p>
            <div className="grid gap-1.5 text-slate-600 dark:text-slate-300 sm:grid-cols-2">
              <span>
                {t('comm.compose.recipient')} : <strong>{preview.recipientCount}</strong>
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
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {t('comm.compose.confirm.bulk', { count: preview.recipientCount })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
        <Button variant="secondary" onClick={() => onClose(false)}>
          {t('comm.compose.preview.cancel')}
        </Button>
        {!preview ? (
          <Button onClick={handlePreview} loading={previewMutation.isPending}>
            {t('comm.compose.preview.title')}
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              {t('common.edit')}
            </Button>
            {needsConfirm ? (
              <Button
                onClick={() => sendMutation.mutate(true)}
                loading={sendMutation.isPending}
                disabled={scheduledInvalid}
              >
                {t('comm.compose.confirm.bulkAction')}
              </Button>
            ) : scheduleMode === 'later' ? (
              <Button
                onClick={() => sendMutation.mutate(false)}
                loading={sendMutation.isPending}
                disabled={scheduledInvalid}
              >
                {t('comm.compose.preview.schedule')}
              </Button>
            ) : (
              <Button onClick={() => sendMutation.mutate(false)} loading={sendMutation.isPending}>
                {t('comm.compose.preview.send')}
              </Button>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
