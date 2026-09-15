import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plus, X } from 'lucide-react'
import { apiErrorMessageI18n, apiGet, apiPost } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { fmtDateTime } from '../../lib/format'
import type {
  CommAudience,
  CommCampaign,
  CommCampaignAudiencePreview,
  CommCampaignRequest,
  CommChannel,
  CommPriority,
  Page,
} from '../../types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Pagination,
  Select,
  Spinner,
  Table,
  Td,
  Textarea,
  Th,
} from '../ui'
import { useToast } from '../Toast'

const AUDIENCES: CommAudience[] = ['ALL', 'WITH_DEBT', 'OVERDUE', 'TAX_TYPE', 'DUE_SOON']
const CHANNELS: CommChannel[] = ['IN_APP', 'EMAIL', 'SMS']
const PRIORITIES: CommPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT']

const CAMPAIGN_TONES: Record<string, string> = {
  QUEUED: 'amber',
  SENDING: 'blue',
  COMPLETED: 'green',
  FAILED: 'red',
}

export default function Campaigns({ canManage }: { canManage: boolean }) {
  const { t } = useI18n()
  const [page, setPage] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['comm-campaigns', page],
    queryFn: () => apiGet<Page<CommCampaign>>(`/communication/campaigns?page=${page}&size=20`),
    enabled: canManage,
  })

  if (!canManage) return null

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200">{t('comm.campaign.title')}</h3>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> {t('comm.campaign.new')}
          </Button>
        </div>
        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState icon={<Megaphone className="h-5 w-5" />} title={t('comm.campaign.empty')} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800/30">
                  <tr>
                    <Th>{t('comm.campaign.name')}</Th>
                    <Th>{t('comm.campaign.reference')}</Th>
                    <Th>{t('comm.campaign.audience')}</Th>
                    <Th>{t('comm.tracking.channels')}</Th>
                    <Th>{t('comm.campaign.stats')}</Th>
                    <Th>{t('common.status')}</Th>
                    <Th>{t('common.date')}</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {data.content.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <Td className="font-medium">{c.name}</Td>
                      <Td className="text-xs text-slate-400">{c.reference}</Td>
                      <Td>
                        <Badge tone="slate">{t(`comm.campaign.audience.${c.audience}`)}</Badge>
                      </Td>
                      <Td>
                        <div className="flex gap-1">
                          {c.channels.split(',').filter(Boolean).map((ch) => (
                            <Badge key={ch} tone="blue">{t(`comm.channel.${ch}`)}</Badge>
                          ))}
                        </div>
                      </Td>
                      <Td>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {c.recipientCount} · <span className="text-emerald-600">{t('comm.campaign.sentCount')} {c.sentCount}</span> ·{' '}
                          <span className="text-rose-500">{t('comm.campaign.failedCount')} {c.failedCount}</span> ·{' '}
                          <span className="text-brand-600">{t('comm.campaign.readCount')} {c.readCount}</span>
                        </div>
                      </Td>
                      <Td>
                        <Badge tone={(CAMPAIGN_TONES[c.status] ?? 'slate') as never}>{c.status}</Badge>
                      </Td>
                      <Td className="whitespace-nowrap text-sm">{fmtDateTime(c.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <Pagination page={page} totalPages={data.totalPages} onChange={setPage} totalElements={data.totalElements} />
          </>
        )}
      </Card>

      <CreateCampaignDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}

function CreateCampaignDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [audience, setAudience] = useState<CommAudience>('ALL')
  const [taxTypeCode, setTaxTypeCode] = useState('')
  const [channels, setChannels] = useState<CommChannel[]>(['IN_APP', 'EMAIL'])
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<CommPriority>('NORMAL')
  const [preview, setPreview] = useState<CommCampaignAudiencePreview | null>(null)

  // Aperçu de l'audience avant confirmation
  const previewMutation = useMutation({
    mutationFn: () =>
      apiGet<CommCampaignAudiencePreview>(
        `/communication/campaigns/preview?audience=${audience}${taxTypeCode ? `&taxTypeCode=${encodeURIComponent(taxTypeCode)}` : ''}`,
      ),
    onSuccess: setPreview,
    onError: (err) => toast.error(apiErrorMessageI18n(err, t)),
  })

  const createMutation = useMutation({
    mutationFn: (confirmed: boolean) => {
      const body: CommCampaignRequest = {
        name,
        audience,
        taxTypeCode: taxTypeCode || null,
        channels,
        subject: subject || null,
        content,
        priority,
        requireConfirmation: confirmed,
      }
      return apiPost<CommCampaign>('/communication/campaigns', body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comm-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['comm-sent'] })
      queryClient.invalidateQueries({ queryKey: ['comm-stats'] })
      toast.success(t('comm.campaign.created'))
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessageI18n(err, t)),
  })

  function toggleChannel(c: CommChannel) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  const needsConfirm = (preview?.recipientCount ?? 0) > 100

  return (
    <Modal open={open} onClose={onClose} title={t('comm.campaign.new')} wide>
      <div className="space-y-4 px-5 py-4">
        <Field label={t('comm.campaign.name')}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rappel déclaration mensuelle" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('comm.campaign.audience')}>
            <Select value={audience} onChange={(e) => { setAudience(e.target.value as CommAudience); setPreview(null) }}>
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>{t(`comm.campaign.audience.${a}`)}</option>
              ))}
            </Select>
          </Field>
          {audience === 'TAX_TYPE' && (
            <Field label={t('comm.campaign.taxType')}>
              <Input value={taxTypeCode} onChange={(e) => { setTaxTypeCode(e.target.value.toUpperCase()); setPreview(null) }} placeholder="TVA" />
            </Field>
          )}
        </div>

        <Field label={t('comm.compose.channels')}>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => {
              const active = channels.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleChannel(c)}
                  className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                    active
                      ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {t(`comm.channel.${c}`)}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label={t('comm.compose.subject')}>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label={t('comm.compose.message')}>
          <Textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder={t('comm.compose.message.placeholder')} />
        </Field>
        <Field label={t('comm.compose.priority')}>
          <Select value={priority} onChange={(e) => setPriority(e.target.value as CommPriority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{t(`comm.priority.${p}`)}</option>
            ))}
          </Select>
        </Field>

        {preview && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-600 dark:bg-slate-700/40">
            <p className="font-semibold text-slate-700 dark:text-slate-200">{t('comm.campaign.preview')}</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              {t('comm.campaign.recipients', { count: preview.recipientCount })} —{' '}
              <span className="text-amber-600 dark:text-amber-400">
                {t('comm.compose.missingEmail', { count: preview.missingEmail })}
              </span>
            </p>
            {needsConfirm && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {t('comm.campaign.confirm', { count: preview.recipientCount })}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 px-5 py-4 dark:border-slate-700/50">
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        {!preview ? (
          <Button onClick={() => previewMutation.mutate()} loading={previewMutation.isPending}>
            {t('comm.campaign.preview')}
          </Button>
        ) : (
          <Button onClick={() => createMutation.mutate(true)} loading={createMutation.isPending}>
            {needsConfirm ? t('comm.campaign.confirm', { count: preview.recipientCount }) : t('comm.campaign.new')}
          </Button>
        )}
      </div>
    </Modal>
  )
}
