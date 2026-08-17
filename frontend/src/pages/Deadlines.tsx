import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, CalendarDays, CheckCircle2 } from 'lucide-react'
import { apiGet } from '../lib/api'
import { fmtDate } from '../lib/format'
import type { Deadline } from '../types'
import { Badge, Card, EmptyState, PageHeader, Spinner, StatCard, Table, Td, Th } from '../components/ui'

export default function Deadlines() {
  const [mode, setMode] = useState<'upcoming' | 'all'>('upcoming')

  const { data, isLoading } = useQuery({
    queryKey: ['deadlines', mode],
    queryFn: () => apiGet<Deadline[]>(`/deadlines${mode === 'upcoming' ? '/upcoming' : ''}`),
  })

  const sorted = data ? [...data].sort((a, b) => a.declarationDeadline.localeCompare(b.declarationDeadline)) : []
  const today = new Date().toISOString().slice(0, 10)
  const overdueCount = sorted.filter((d) => d.declarationDeadline < today).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendrier fiscal"
        subtitle="Échéances de déclaration et de paiement des impôts"
        actions={
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {(['upcoming', 'all'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                  mode === m ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {m === 'upcoming' ? 'À venir' : 'Toutes'}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Échéances affichées" value={sorted.length} icon={<CalendarDays className="h-5 w-5" />} tone="brand" sub={mode === 'upcoming' ? '90 prochains jours' : 'toutes périodes'} />
        <StatCard label="En retard" value={overdueCount} icon={<CalendarClock className="h-5 w-5" />} tone="rose" sub="déclaration passée" />
        <StatCard label="Dans les temps" value={sorted.length - overdueCount} icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" sub="échéance à venir" />
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : !sorted || sorted.length === 0 ? (
          <EmptyState title="Aucune échéance" subtitle="Les échéances du calendrier fiscal apparaîtront ici." />
        ) : (
          <Table>
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr>
                <Th>Impôt</Th>
                <Th>Période</Th>
                <Th>Limite de déclaration</Th>
                <Th>Limite de paiement</Th>
                <Th>Statut</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((d) => {
                const overdue = d.declarationDeadline < today
                return (
                  <tr key={d.id} className="transition hover:bg-slate-50/60">
                    <Td className="font-medium text-slate-900">{d.taxTypeName}</Td>
                    <Td>{d.period}</Td>
                    <Td className={overdue ? 'font-medium text-rose-600' : ''}>{fmtDate(d.declarationDeadline)}</Td>
                    <Td>{fmtDate(d.paymentDeadline)}</Td>
                    <Td>{overdue ? <Badge tone="red">En retard</Badge> : <Badge tone="green">En cours</Badge>}</Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
