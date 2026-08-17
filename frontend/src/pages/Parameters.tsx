import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Settings, SlidersHorizontal } from 'lucide-react'
import { apiErrorMessage, apiGet, apiPut } from '../lib/api'
import { fmtDateTime } from '../lib/format'
import type { SystemParameter } from '../types'
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Spinner,
  StatCard,
  Table,
  Td,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'

export default function Parameters() {
  const [selected, setSelected] = useState<SystemParameter | null>(null)
  const [value, setValue] = useState('')
  const [description, setDescription] = useState('')
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['parameters'],
    queryFn: () => apiGet<SystemParameter[]>('/parameters'),
  })

  const save = useMutation({
    mutationFn: () =>
      apiPut('/parameters', {
        key: selected!.key,
        value,
        description: description || undefined,
        category: selected!.category || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parameters'] })
      setSelected(null)
      toast.success('Paramètre enregistré')
    },
  })

  const open = (p: SystemParameter) => {
    setSelected(p)
    setValue(p.value)
    setDescription(p.description)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres système"
        subtitle="Configuration globale de l’application"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Paramètres définis" value={data?.length ?? '—'} icon={<SlidersHorizontal className="h-5 w-5" />} tone="brand" sub="clés de configuration" />
        <StatCard label="Catégories distinctes" value={new Set(data?.map((p) => p.category).filter(Boolean)).size ?? 0} icon={<Settings className="h-5 w-5" />} tone="violet" sub="regroupements" />
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Aucun paramètre défini" />
        ) : (
          <Table>
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr>
                <Th>Clé</Th>
                <Th>Valeur</Th>
                <Th>Catégorie</Th>
                <Th>Description</Th>
                <Th>Mis à jour le</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((p) => (
                <tr key={p.id} className="transition hover:bg-slate-50/60">
                  <Td className="font-mono font-medium text-brand-700">{p.key}</Td>
                  <Td className="font-mono text-sm">{p.value}</Td>
                  <Td>{p.category || '—'}</Td>
                  <Td className="max-w-64 truncate text-sm text-slate-500">{p.description || '—'}</Td>
                  <Td className="text-sm">{fmtDateTime(p.updatedAt)}</Td>
                  <Td>
                    <Button size="sm" variant="ghost" onClick={() => open(p)}>
                      <Pencil className="h-3.5 w-3.5" /> Éditer
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Paramètre : ${selected?.key ?? ''}`}>
        {selected && (
          <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="space-y-4">
            {save.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {apiErrorMessage(save.error)}
              </div>
            )}
            <Field label="Valeur">
              <Input value={value} onChange={(e) => setValue(e.target.value)} />
            </Field>
            <Field label="Description">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setSelected(null)}>Annuler</Button>
              <Button type="submit" disabled={save.isPending || !value}>Enregistrer</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
