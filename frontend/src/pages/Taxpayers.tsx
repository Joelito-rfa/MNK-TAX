import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, Plus, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiErrorMessage, apiGet, apiPost } from '../lib/api'
import type { DashboardSummary, Page, TaxpayerSummary } from '../types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  StatCard,
  StatusBadge,
  Table,
  Td,
  Th,
} from '../components/ui'

const createSchema = z.object({
  nif: z.string().regex(/^\d{10}$/, 'Le NIF doit contenir exactement 10 chiffres.'),
  type: z.enum(['COMPANY', 'INDIVIDUAL'], { message: 'Type invalide.' }),
  name: z.string().min(2, 'Le nom est requis.'),
  businessName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email invalide.').optional().or(z.literal('')),
  address: z.string().optional(),
})

type CreateForm = z.infer<typeof createSchema>

export default function Taxpayers() {
  const [page, setPage] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const queryClient = useQueryClient()

  const q = searchParams.get('q') ?? ''

  const params = new URLSearchParams({ page: String(page), size: '20' })
  if (q) params.set('q', q)
  if (status) params.set('status', status)

  const { data, isLoading } = useQuery({
    queryKey: ['taxpayers', page, q, status],
    queryFn: () => apiGet<Page<TaxpayerSummary>>(`/taxpayers?${params.toString()}`),
  })

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary-lite'],
    queryFn: () => apiGet<DashboardSummary>('/dashboard/summary'),
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateForm) => apiPost('/taxpayers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxpayers'] })
      setCreateOpen(false)
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) })

  function onSearch(value: string) {
    setPage(0)
    if (value) setSearchParams({ q: value })
    else setSearchParams({})
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contribuables"
        subtitle="Registre des contribuables et entreprises assujettis"
        actions={
          <Button onClick={() => { reset(); setCreateOpen(true) }}>
            <Plus className="h-4 w-4" /> Ajouter un contribuable
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Contribuables enregistrés" value={summary?.taxpayerCount ?? '—'} icon={<Users className="h-5 w-5" />} tone="brand" sub="au registre" />
        <StatCard label="Résultats affichés" value={data?.totalElements ?? '—'} icon={<Users className="h-5 w-5" />} tone="sky" sub="selon les filtres" />
        <StatCard label="Créances en retard" value={summary ? `${summary.overdueCount}` : '—'} icon={<Users className="h-5 w-5" />} tone="rose" sub="à recouvrer" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <SearchInput
            value={q}
            onChange={onSearch}
            placeholder="Rechercher par nom, NIF, email, centre, régime…"
            className="min-w-56 flex-1"
          />
          <div className="w-44">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
              <option value="">Tous les statuts</option>
              <option value="ACTIVE">Actif</option>
              <option value="SUSPENDED">Suspendu</option>
              <option value="CLOSED">Clôturé</option>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : !data || data.content.length === 0 ? (
          <EmptyState icon={<Users className="h-8 w-8" />} title="Aucun contribuable trouvé" subtitle="Modifiez vos critères de recherche." />
        ) : (
          <>
            <Table>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <Th>NIF</Th>
                  <Th>Raison sociale / Nom</Th>
                  <Th>Type</Th>
                  <Th>Contact</Th>
                  <Th>Centre</Th>
                  <Th>Régime</Th>
                  <Th>Statut</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.content.map((t) => (
                  <tr key={t.id} className="transition hover:bg-slate-50/60">
                    <Td>
                      <Link to={`/taxpayers/${t.id}`} className="font-mono font-medium text-brand-700 hover:underline">
                        {t.nif}
                      </Link>
                    </Td>
                    <Td className="font-medium text-slate-900">{t.name}</Td>
                    <Td>
                      <Badge tone={t.type === 'COMPANY' ? 'indigo' : 'slate'}>
                        {t.type === 'COMPANY' ? 'Entreprise' : 'Particulier'}
                      </Badge>
                    </Td>
                    <Td className="max-w-56 truncate text-slate-500">{t.email || t.phone || '—'}</Td>
                    <Td>{t.taxCenterCode ?? '—'}</Td>
                    <Td>{t.taxRegimeCode ?? '—'}</Td>
                    <Td>
                      <StatusBadge value={t.status} />
                    </Td>
                    <Td>
                      <Link
                        to={`/taxpayers/${t.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-600 transition hover:bg-brand-50"
                      >
                        Voir <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data.number} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Ajouter un contribuable" subtitle="Le NIF est vérifié par l’algorithme métier (10 chiffres).">
        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-4" noValidate>
          {createMutation.isError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {apiErrorMessage(createMutation.error)}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="NIF (10 chiffres)">
              <Input placeholder="0000409001" {...register('nif')} />
              {errors.nif && <p className="mt-1 text-xs text-rose-600">{errors.nif.message}</p>}
            </Field>
            <Field label="Type">
              <Select {...register('type')}>
                <option value="COMPANY">Entreprise</option>
                <option value="INDIVIDUAL">Particulier</option>
              </Select>
            </Field>
          </div>
          <Field label="Raison sociale / Nom">
            <Input placeholder="ex : SARL MAD'AKT" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
          </Field>
          <Field label="Nom commercial (facultatif)">
            <Input {...register('businessName')} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Téléphone">
              <Input placeholder="034 00 000 00" {...register('phone')} />
            </Field>
            <Field label="Email">
              <Input type="email" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
            </Field>
          </div>
          <Field label="Adresse">
            <Input {...register('address')} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={createMutation.isPending}>Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
