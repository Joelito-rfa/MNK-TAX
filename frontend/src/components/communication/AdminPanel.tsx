import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleDot, Plug, Send, ShieldCheck } from 'lucide-react'
import { apiErrorMessageI18n, apiGet, apiPost } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import type {
  CommEventRule,
  CommPriority,
  CommProvidersStatus,
  CommSaveTemplateRequest,
  CommTemplate,
  CommTestSendRequest,
  CommTestSendResult,
  CommUpdateEventRuleRequest,
} from '../../types'
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from '../ui'
import { useToast } from '../Toast'

const PROVIDER_TONES: Record<string, string> = {
  CONNECTED: 'green',
  INCOMPLETE: 'amber',
  DISCONNECTED: 'red',
}

const RULE_CHANNELS = ['IN_APP', 'EMAIL', 'SMS']
const RULE_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT']

export default function AdminPanel({ canManage }: { canManage: boolean }) {
  const { t } = useI18n()

  if (!canManage) return null

  return (
    <div className="space-y-4">
      <ProvidersCard />
      <TestSendCard />
      <TemplatesCard />
      <EventRulesCard />
      <p className="flex items-center gap-2 px-1 text-xs text-slate-400 dark:text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5" /> {t('comm.admin.secretsNote')}
      </p>
    </div>
  )
}

// ─── Fournisseurs (statut réel, jamais de secret) ─────────────────

function ProvidersCard() {
  const { t } = useI18n()
  const { data, isLoading } = useQuery({
    queryKey: ['comm-providers'],
    queryFn: () => apiGet<CommProvidersStatus>('/communication/providers'),
    refetchInterval: 60_000,
  })

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">{t('comm.admin.providers')}</h3>
        <Badge tone="slate">{t('comm.admin.queue')} {data ? `· ${t('comm.admin.queue.pending', { count: data.queuePending })}` : ''}</Badge>
      </div>
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <div className="space-y-3 px-5 py-4">
          {data.providers.map((p) => (
            <div key={p.channel} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <CircleDot className={`h-4 w-4 ${p.status === 'CONNECTED' ? 'text-emerald-500' : p.status === 'INCOMPLETE' ? 'text-amber-500' : 'text-rose-500'}`} />
                <div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t(`comm.channel.${p.channel}`)} — {p.provider}
                  </div>
                  <div className="text-xs text-slate-400">{p.detail}</div>
                </div>
              </div>
              <Badge tone={(PROVIDER_TONES[p.status] ?? 'slate') as never}>
                {t(`comm.admin.provider.${p.status.toLowerCase()}`)}
              </Badge>
            </div>
          ))}
          <div className="text-xs text-slate-400">
            {t('comm.admin.queue.pending', { count: data.queuePending })} ·{' '}
            {t('comm.admin.queue.failed', { count: data.queueFailed })} ·{' '}
            {t('comm.admin.queue.retryInfo', { max: data.maxAttempts, backoff: data.retryBackoffMinutes })}
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Envoi test réel (destination configurée serveur uniquement) ──

function TestSendCard() {
  const { t } = useI18n()
  const toast = useToast()
  const [channel, setChannel] = useState<'EMAIL' | 'SMS'>('EMAIL')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')

  const test = useMutation({
    mutationFn: () => {
      const body: CommTestSendRequest = { channel, subject: subject || null, content: content || null }
      return apiPost<CommTestSendResult>('/communication/test', body)
    },
    onSuccess: (r) => {
      if (r.success) {
        toast.success(t('comm.admin.test.ok'))
      } else {
        toast.error(`${t('comm.admin.test.ko')} ${r.message}`)
      }
    },
    onError: (err) => toast.error(apiErrorMessageI18n(err, t)),
  })

  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
        <Plug className="h-4 w-4 text-slate-400" />
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">{t('comm.admin.test')}</h3>
      </div>
      <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
        <Field label={t('comm.admin.test.channel')}>
          <Select value={channel} onChange={(e) => setChannel(e.target.value as 'EMAIL' | 'SMS')}>
            <option value="EMAIL">{t('comm.channel.EMAIL')}</option>
            <option value="SMS">{t('comm.channel.SMS')}</option>
          </Select>
        </Field>
        <Field label={t('comm.admin.test.subject')}>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="MNK-TAX — Message test" />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t('comm.admin.test.content')}>
            <Input value={content} onChange={(e) => setContent(e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Button onClick={() => test.mutate()} loading={test.isPending}>
            <Send className="h-4 w-4" /> {t('comm.admin.test.send')}
          </Button>
          <p className="mt-2 text-xs text-slate-400">
            COMM_TEST_EMAIL / COMM_TEST_SMS
          </p>
        </div>
      </div>
    </Card>
  )
}

// ─── Modèles multilingues ──────────────────────────────────────────

function TemplatesCard() {
  const { t } = useI18n()
  const { data, isLoading } = useQuery({
    queryKey: ['comm-templates'],
    queryFn: () => apiGet<CommTemplate[]>('/communication/templates'),
  })
  const [editing, setEditing] = useState<CommTemplate | null>(null)

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">{t('comm.admin.templates')}</h3>
        {data && <Badge tone="slate">{data.length}</Badge>}
      </div>
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800/30">
              <tr>
                <Th>Code</Th>
                <Th>{t('common.type')}</Th>
                <Th>{t('comm.tracking.channels')}</Th>
                <Th>{t('comm.admin.templates.language')}</Th>
                <Th>{t('common.status')}</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {(data ?? []).map((tpl) => (
                <tr key={tpl.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <Td className="font-mono text-xs">{tpl.code}</Td>
                  <Td><Badge tone="blue">{tpl.category}</Badge></Td>
                  <Td className="text-xs text-slate-500">{tpl.channels}</Td>
                  <Td>
                    <div className="flex gap-1 text-xs">
                      {(['Fr', 'Mg', 'En'] as const).map((l) => (
                        <span
                          key={l}
                          className={`rounded px-1.5 py-0.5 ${
                            tpl[`body${l}` as 'bodyFr' | 'bodyMg' | 'bodyEn']
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-700'
                          }`}
                        >
                          {l.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={tpl.enabled ? 'green' : 'slate'}>
                      {tpl.enabled ? t('comm.admin.templates.enabled') : t('comm.admin.templates.disabled')}
                    </Badge>
                  </Td>
                  <Td>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(tpl)}>
                      {t('common.edit')}
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
      {editing && <TemplateEditor template={editing} onClose={() => setEditing(null)} />}
    </Card>
  )
}

function TemplateEditor({ template, onClose }: { template: CommTemplate; onClose: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    subjectFr: template.subjectFr ?? '',
    subjectMg: template.subjectMg ?? '',
    subjectEn: template.subjectEn ?? '',
    bodyFr: template.bodyFr,
    bodyMg: template.bodyMg,
    bodyEn: template.bodyEn,
    smsBodyFr: template.smsBodyFr ?? '',
    smsBodyMg: template.smsBodyMg ?? '',
    smsBodyEn: template.smsBodyEn ?? '',
    enabled: template.enabled,
  })

  const save = useMutation({
    mutationFn: () => {
      const body: CommSaveTemplateRequest = { code: template.code, ...form }
      return apiPost<CommTemplate>('/communication/templates', body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comm-templates'] })
      toast.success(t('toast.saveSuccess'))
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessageI18n(err, t)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-popover dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{template.code}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="space-y-4">
          {(['Fr', 'Mg', 'En'] as const).map((lang) => (
            <div key={lang} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">{t('comm.admin.templates.language')} : {lang.toUpperCase()}</p>
              <div className="space-y-2">
                <Input
                  value={form[`subject${lang}` as 'subjectFr' | 'subjectMg' | 'subjectEn']}
                  onChange={(e) => setForm((f) => ({ ...f, [`subject${lang}`]: e.target.value }))}
                  placeholder={t('comm.compose.subject.placeholder')}
                />
                <textarea
                  rows={4}
                  value={form[`body${lang}` as 'bodyFr' | 'bodyMg' | 'bodyEn']}
                  onChange={(e) => setForm((f) => ({ ...f, [`body${lang}`]: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
                <Input
                  value={form[`smsBody${lang}` as 'smsBodyFr' | 'smsBodyMg' | 'smsBodyEn']}
                  onChange={(e) => setForm((f) => ({ ...f, [`smsBody${lang}`]: e.target.value }))}
                  placeholder="SMS…"
                />
              </div>
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} className="accent-brand-600" />
            {t('comm.admin.templates.enabled')}
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending}>{t('common.save')}</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Règles automatiques (configuration métier) ────────────────────

function EventRulesCard() {
  const { t } = useI18n()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['comm-event-rules'],
    queryFn: () => apiGet<CommEventRule[]>('/communication/event-rules'),
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: CommUpdateEventRuleRequest }) =>
      apiPost<CommEventRule>(`/communication/event-rules/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comm-event-rules'] })
      toast.success(t('comm.admin.rules.saved'))
    },
    onError: (err) => toast.error(apiErrorMessageI18n(err, t)),
  })

  function toggleChannel(rule: CommEventRule, ch: string) {
    const current = rule.channels.split(',').filter(Boolean)
    const next = current.includes(ch) ? current.filter((c) => c !== ch) : [...current, ch]
    if (next.length === 0) return
    update.mutate({ id: rule.id, body: { channels: next.join(',') } })
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">{t('comm.admin.rules')}</h3>
        {data && <Badge tone="slate">{data.length}</Badge>}
      </div>
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800/30">
              <tr>
                <Th>{t('comm.admin.rules.event')}</Th>
                <Th>{t('comm.admin.rules.template')}</Th>
                <Th>{t('comm.admin.rules.dayOffset')}</Th>
                <Th>{t('comm.admin.rules.channels')}</Th>
                <Th>{t('comm.compose.priority')}</Th>
                <Th>{t('comm.admin.rules.enabled')}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {(data ?? []).map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <Td className="font-mono text-xs">{rule.eventType}</Td>
                  <Td className="font-mono text-xs text-slate-500">{rule.templateCode}</Td>
                  <Td className="text-sm">{rule.dayOffset ?? '—'}</Td>
                  <Td>
                    <div className="flex gap-1">
                      {RULE_CHANNELS.map((ch) => {
                        const active = rule.channels.split(',').includes(ch)
                        return (
                          <button
                            key={ch}
                            onClick={() => toggleChannel(rule, ch)}
                            className={`rounded px-1.5 py-0.5 text-xs transition ${
                              active
                                ? 'bg-brand-600 text-white'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600'
                            }`}
                            title={t(`comm.channel.${ch}`)}
                          >
                            {t(`comm.channel.${ch}`)}
                          </button>
                        )
                      })}
                    </div>
                  </Td>
                  <Td>
                    <Select
                      value={rule.priority}
                      onChange={(e) => update.mutate({ id: rule.id, body: { priority: e.target.value as CommPriority } })}
                      className="w-28 text-xs"
                    >
                      {RULE_PRIORITIES.map((p) => (
                        <option key={p} value={p}>{t(`comm.priority.${p}`)}</option>
                      ))}
                    </Select>
                  </Td>
                  <Td>
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) => update.mutate({ id: rule.id, body: { enabled: e.target.checked } })}
                      className="accent-brand-600"
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Card>
  )
}
