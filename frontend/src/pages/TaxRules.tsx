import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calculator, Plus, Scale } from 'lucide-react'
import { apiErrorMessage, apiGet, apiPatch, apiPost, apiPut } from '../lib/api'
import { fmtDate } from '../lib/format'
import type { TaxRule, TaxRuleVersion } from '../types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatCard,
  Table,
  Td,
  Th,
} from '../components/ui'
import { useToast } from '../components/Toast'

const methodLabels: Record<string, string> = {
  FLAT_RATE: 'Taux fixe',
  PERCENTAGE_OF_BASE: 'Pourcentage de base',
  PROGRESSIVE: 'Progressif',
  PER_UNIT: 'Par unité',
  PERCENTAGE_OF_TURNOVER: 'Pourcentage du chiffre d\'affaires',
}

const emptyForm = {
  code: '',
  name: '',
  taxTypeCode: '',
  taxpayerType: '',
  regimeCode: '',
  calculationMethod: 'PERCENTAGE',
  rate: '',
  minimum: '0',
  maximum: '0',
  deduction: '0',
  exemption: '0',
  legalReference: '',
  brackets: '',
  demo: true,
  effectiveFrom: new Date().toISOString().slice(0, 10),
}

export default function TaxRules() {
  const [selected, setSelected] = useState<TaxRule | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<TaxRule | null>(null)
  const [versionsRule, setVersionsRule] = useState<TaxRule | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['tax-rules'],
    queryFn: () => apiGet<TaxRule[]>('/tax-rules'),
  })

  const [form, setForm] = useState(emptyForm)

  const { data: versions } = useQuery({
    queryKey: ['tax-rules', 'versions', versionsRule?.id],
    queryFn: () => apiGet<TaxRuleVersion[]>(`/tax-rules/${versionsRule!.id}/versions`),
    enabled: !!versionsRule,
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setCreateOpen(true)
  }

  function openEdit(r: TaxRule) {
    setEditing(r)
    setForm({
      code: r.code,
      name: r.name,
      taxTypeCode: r.taxTypeCode,
      taxpayerType: r.taxpayerType ?? '',
      regimeCode: r.regimeCode ?? '',
      calculationMethod: r.calculationMethod,
      rate: String(r.rate),
      minimum: String(r.minimum),
      maximum: String(r.maximum),
      deduction: String(r.deduction),
      exemption: String(r.exemption),
      legalReference: r.legalReference ?? '',
      brackets: r.brackets ?? '',
      demo: r.demo,
      effectiveFrom: r.effectiveFrom ? r.effectiveFrom.slice(0, 10) : new Date().toISOString().slice(0, 10),
    })
    setCreateOpen(true)
  }

  const toast = useToast()

  const save = useMutation({
    mutationFn: () => {
      const body = {
        code: form.code,
        name: form.name,
        taxTypeCode: form.taxTypeCode,
        taxpayerType: form.taxpayerType || undefined,
        regimeCode: form.regimeCode || undefined,
        calculationMethod: form.calculationMethod,
        rate: Number(form.rate),
        minimum: Number(form.minimum),
        maximum: Number(form.maximum),
        deduction: Number(form.deduction),
        exemption: Number(form.exemption),
        legalReference: form.legalReference || undefined,
        brackets: form.brackets || undefined,
        demo: form.demo,
        effectiveFrom: form.effectiveFrom,
      }
      if (editing) {
        return apiPut(`/tax-rules/${editing.id}`, body, { params: { reason: "Mise à jour depuis l'interface" } })
      }
      return apiPost('/tax-rules', body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] })
      setCreateOpen(false)
      setEditing(null)
      toast.success(editing ? 'Règle mise à jour' : 'Règle créée')
    },
  })

  const toggleActive = useMutation({
    mutationFn: (r: TaxRule) =>
      apiPatch(`/tax-rules/${r.id}/active`, undefined, {
        params: { active: !r.active, reason: "Changement de statut depuis l'interface" },
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] })
      toast.success(vars.active ? 'Règle désactivée' : 'Règle activée')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Règles de calcul"
        subtitle="Baremes et modalités de calcul des impôts"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nouvelle règle
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Règles en vigueur" value={data?.filter((r) => r.active).length ?? '—'} icon={<Scale className="h-5 w-5" />} tone="brand" sub="actives" />
        <StatCard label="Règles totales" value={data?.length ?? '—'} icon={<Calculator className="h-5 w-5" />} tone="sky" sub="enregistrées" />
        <StatCard label="Versions gérées" value={data?.reduce((s, r) => s + r.currentVersion, 0) ?? '—'} icon={<Calculator className="h-5 w-5" />} tone="violet" sub="vérifiables" />
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Aucune règle" />
        ) : (
          <Table>
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr>
                <Th>Code</Th>
                <Th>Nom</Th>
                <Th>Impôt</Th>
                <Th>Méthode</Th>
                <Th>Taux</Th>
                <Th>Min / Max</Th>
                <Th>Déduction</Th>
                <Th>Réf. légale</Th>
                <Th>Version</Th>
                <Th>Statut</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((r) => (
                <tr key={r.id} className="transition hover:bg-slate-50/60">
                  <Td className="font-mono font-medium text-brand-700">{r.code}</Td>
                  <Td className="max-w-48 truncate">{r.name}</Td>
                  <Td>{r.taxTypeCode}</Td>
                  <Td>{methodLabels[r.calculationMethod] ?? r.calculationMethod}</Td>
                  <Td>{r.rate}%</Td>
                  <Td>{r.minimum} / {r.maximum}</Td>
                  <Td>{r.deduction}</Td>
                  <Td className="max-w-40 truncate text-xs">{r.legalReference || '—'}</Td>
                  <Td>v{r.currentVersion}</Td>
                  <Td>
                    {r.active ? <Badge tone="green">Actif</Badge> : <Badge>Inactif</Badge>}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>Détail</Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Modifier</Button>
                      <Button size="sm" variant="ghost" onClick={() => setVersionsRule(r)}>Versions</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActive.mutate(r)}
                        disabled={toggleActive.isPending}
                      >
                        {r.active ? 'Désactiver' : 'Activer'}
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Règle : ${selected?.code ?? ''}`}>
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Row k="Nom" v={selected.name} />
              <Row k="Impôt" v={`${selected.taxTypeCode} (${selected.taxTypeId})`} />
              <Row k="Méthode" v={methodLabels[selected.calculationMethod] ?? selected.calculationMethod} />
              <Row k="Taux" v={`${selected.rate}%`} />
              <Row k="Seuil min / max" v={`${selected.minimum} / ${selected.maximum}`} />
              <Row k="Déduction / exonération" v={`${selected.deduction} / ${selected.exemption}`} />
              <Row k="Type de contribuable" v={selected.taxpayerType || 'Tous'} />
              <Row k="Régime" v={selected.regimeCode || 'Tous'} />
              <Row k="Réf. légale" v={selected.legalReference || '—'} />
              <Row k="Version" v={`v${selected.currentVersion}`} />
              <Row k="Applicable du" v={fmtDate(selected.effectiveFrom)} />
              <Row k="Jusqu’au" v={selected.effectiveTo ? fmtDate(selected.effectiveTo) : '—'} />
            </dl>
          </div>
        )}
      </Modal>

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setEditing(null) }} title={editing ? `Modifier la règle : ${editing.code}` : 'Nouvelle règle de calcul'}>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="space-y-4">
          {save.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {apiErrorMessage(save.error)}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code">
              <Input placeholder="ex : IRN-RNE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <Field label="Code impôt">
              <Input placeholder="ex : IRN" value={form.taxTypeCode} onChange={(e) => setForm({ ...form, taxTypeCode: e.target.value })} />
            </Field>
          </div>
          <Field label="Nom">
            <Input placeholder="ex : IRN - Régime du net" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Méthode de calcul">
              <Select value={form.calculationMethod} onChange={(e) => setForm({ ...form, calculationMethod: e.target.value })}>
                {Object.entries(methodLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label="Taux (%)">
              <Input type="number" step="0.0001" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Seuil minimum (MGA)">
              <Input type="number" value={form.minimum} onChange={(e) => setForm({ ...form, minimum: e.target.value })} />
            </Field>
            <Field label="Seuil maximum (MGA)">
              <Input type="number" value={form.maximum} onChange={(e) => setForm({ ...form, maximum: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Déduction (MGA)">
              <Input type="number" value={form.deduction} onChange={(e) => setForm({ ...form, deduction: e.target.value })} />
            </Field>
            <Field label="Exonération (MGA)">
              <Input type="number" value={form.exemption} onChange={(e) => setForm({ ...form, exemption: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type de contribuable (facultatif)">
              <Select value={form.taxpayerType} onChange={(e) => setForm({ ...form, taxpayerType: e.target.value })}>
                <option value="">Tous</option>
                <option value="COMPANY">Société</option>
                <option value="INDIVIDUAL">Particulier</option>
              </Select>
            </Field>
            <Field label="Code régime (facultatif)">
              <Input value={form.regimeCode} onChange={(e) => setForm({ ...form, regimeCode: e.target.value })} placeholder="ex : RNE" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Référence légale">
              <Input value={form.legalReference} onChange={(e) => setForm({ ...form, legalReference: e.target.value })} placeholder="ex : CGI Art. 01" />
            </Field>
            <Field label="Applicable à partir du">
              <Input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="demo-toggle"
              checked={form.demo}
              onChange={(e) => setForm({ ...form, demo: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="demo-toggle" className="text-sm text-slate-700">Règle de démonstration</label>
          </div>
          {form.calculationMethod === 'PROGRESSIVE' && (
            <Field label="Tranches progressives (JSON)">
              <textarea
                value={form.brackets}
                onChange={(e) => setForm({ ...form, brackets: e.target.value })}
                placeholder='[{"upTo":50000000,"rate":0},{"upTo":100000000,"rate":10},{"upTo":null,"rate":20}]'
                rows={4}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="mt-1 text-xs text-slate-500">JSON : chaque tranche a "upTo" (null = pas de plafond) et "rate" (taux en %)</p>
            </Field>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); setEditing(null) }}>Annuler</Button>
            <Button type="submit" disabled={save.isPending || !form.code || !form.name || !form.taxTypeCode || !form.rate}>
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!versionsRule} onClose={() => setVersionsRule(null)} title={`Versions : ${versionsRule?.code ?? ''}`} wide>
        {versions ? (
          <div className="space-y-3">
            {versions.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune version enregistrée.</p>
            ) : (
              versions.map((v) => (
                <div key={v.id} className="rounded-xl border border-slate-100 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-brand-700">Version v{v.versionNumber}</span>
                    <span className="text-xs text-slate-500">{fmtDate(v.effectiveFrom)}</span>
                  </div>
                  {v.reason && <p className="mt-0.5 text-slate-700">{v.reason}</p>}
                  <p className="text-xs text-slate-500">Modifiée par {v.changedBy || '—'}</p>
                  {v.snapshot && v.snapshot !== '{}' && (
                    <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                      {v.snapshot}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <Spinner />
        )}
      </Modal>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium text-slate-900">{v}</dd>
    </>
  )
}
