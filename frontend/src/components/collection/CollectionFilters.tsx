import { useI18n } from '../../lib/i18n'
import { useLocaleFormatters } from '../../lib/format'
import { Filter, Search, X } from 'lucide-react'
import type { TaxType } from '../../types'
import { Button, Field, Input, Select } from '../ui'
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from './constants'

export interface AdvancedFilters {
  status: string
  priority: string
  balanceMin: string
  balanceMax: string
  dueFrom: string
  dueTo: string
}

export const EMPTY_ADV: AdvancedFilters = { status: '', priority: '', balanceMin: '', balanceMax: '', dueFrom: '', dueTo: '' }

export function CollectionFilters({
  searchQ,
  onSearchChange,
  taxTypeFilter,
  onTaxTypeChange,
  periodFilter,
  onPeriodChange,
  taxTypes,
  periods,
  advDraft,
  onAdvDraftChange,
  advApplied,
  onApplyAdvanced,
  onResetFilters,
  showAdvanced,
  onToggleAdvanced,
  activeFilterCount,
  hasFilters,
  activeTabLabel,
  onRemoveChip,
}: {
  searchQ: string
  onSearchChange: (v: string) => void
  taxTypeFilter: string
  onTaxTypeChange: (v: string) => void
  periodFilter: string
  onPeriodChange: (v: string) => void
  taxTypes: TaxType[] | undefined
  periods: string[] | undefined
  advDraft: AdvancedFilters
  onAdvDraftChange: (v: AdvancedFilters) => void
  advApplied: AdvancedFilters
  onApplyAdvanced: () => void
  onResetFilters: () => void
  showAdvanced: boolean
  onToggleAdvanced: () => void
  activeFilterCount: number
  hasFilters: boolean
  activeTabLabel?: string
  onRemoveChip: (kind: keyof AdvancedFilters | 'q' | 'taxType' | 'period' | 'tab') => void
}) {
  const { t } = useI18n()
  const { fmtMGA } = useLocaleFormatters()
  return (
    <>
      {/* ── Filtres principaux ── */}
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={searchQ}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('collection.filters.search')}
            aria-label={t('collection.filters.search')}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:bg-slate-700"
          />
        </div>
        <div className="w-48">
          <Select
            value={taxTypeFilter}
            onChange={(e) => onTaxTypeChange(e.target.value)}
            aria-label={t('collection.filters.tax')}
          >
            <option value="">{t('collection.filters.allTaxes')}</option>
            {taxTypes?.map((tt) => {
              const k = `taxtype.${tt.code}`
              const v = t(k)
              return (
                <option key={tt.code} value={tt.code}>
                  {tt.code} — {v !== k ? v : tt.name}
                </option>
              )
            })}
          </Select>
        </div>
        <div className="w-40">
          <Select
            value={periodFilter}
            onChange={(e) => onPeriodChange(e.target.value)}
            aria-label={t('collection.filters.period')}
          >
            <option value="">{t('collection.filters.allPeriods')}</option>
            {(periods ?? []).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </div>
        <button
          onClick={onToggleAdvanced}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition ${
            showAdvanced
              ? 'border-violet-500/30 bg-violet-500/10 text-violet-400'
              : 'border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'
          }`}
        >
          <Filter className="h-4 w-4" /> {t('collection.filters.more')}
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Panneau de filtres avancés ── */}
      {showAdvanced && (
        <div className="animate-fade-in border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {!advApplied.status && (
              <Field label={t('common.status')}>
                <Select
                  value={advDraft.status}
                  onChange={(e) => onAdvDraftChange({ ...advDraft, status: e.target.value })}
                >
                  <option value="">{t('common.all')}</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{t(s.key)}</option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label={t('collection.filters.priority')}>
              <Select
                value={advDraft.priority}
                onChange={(e) => onAdvDraftChange({ ...advDraft, priority: e.target.value })}
              >
                <option value="">{t('common.all')}</option>
                {PRIORITY_OPTIONS.map((pr) => (
                  <option key={pr.value} value={pr.value}>{t(pr.key)}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('collection.filters.balanceMin')}>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={advDraft.balanceMin}
                onChange={(e) => onAdvDraftChange({ ...advDraft, balanceMin: e.target.value })}
              />
            </Field>
            <Field label={t('collection.filters.balanceMax')}>
              <Input
                type="number"
                min="0"
                placeholder={t('common.all')}
                value={advDraft.balanceMax}
                onChange={(e) => onAdvDraftChange({ ...advDraft, balanceMax: e.target.value })}
              />
            </Field>
            <Field label={t('common.date')}>
              <Input
                type="date"
                value={advDraft.dueFrom}
                onChange={(e) => onAdvDraftChange({ ...advDraft, dueFrom: e.target.value })}
              />
            </Field>
            <Field label={t('common.date')}>
              <Input
                type="date"
                value={advDraft.dueTo}
                onChange={(e) => onAdvDraftChange({ ...advDraft, dueTo: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onResetFilters}>
              <X className="h-3.5 w-3.5" /> {t('common.reset')}
            </Button>
            <Button size="sm" onClick={onApplyAdvanced}>
              {t('common.apply')}
            </Button>
          </div>
        </div>
      )}

      {/* ── Puces des filtres actifs ── */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-700/50 px-5 py-2.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('common.filter')} :</span>
          {searchQ && (
            <button
              onClick={() => onRemoveChip('q')}
              className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400"
            >
              {searchQ} <X className="h-3 w-3" />
            </button>
          )}
          {taxTypeFilter && (
            <button
              onClick={() => onRemoveChip('taxType')}
              className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400"
            >
              {taxTypeFilter} <X className="h-3 w-3" />
            </button>
          )}
          {periodFilter && (
            <button
              onClick={() => onRemoveChip('period')}
              className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400"
            >
              {periodFilter} <X className="h-3 w-3" />
            </button>
          )}
          {activeTabLabel && (
            <button
              onClick={() => onRemoveChip('tab')}
              className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400"
            >
              {activeTabLabel} <X className="h-3 w-3" />
            </button>
          )}
          {advApplied.status && (
            <button
              onClick={() => onRemoveChip('status')}
              className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
            >
              {STATUS_OPTIONS.find((s) => s.value === advApplied.status) ? t(STATUS_OPTIONS.find((s) => s.value === advApplied.status)!.key) : advApplied.status} <X className="h-3 w-3" />
            </button>
          )}
          {advApplied.priority && (
            <button
              onClick={() => onRemoveChip('priority')}
              className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
            >
              {PRIORITY_OPTIONS.find((s) => s.value === advApplied.priority) ? t(PRIORITY_OPTIONS.find((s) => s.value === advApplied.priority)!.key) : advApplied.priority} <X className="h-3 w-3" />
            </button>
          )}
          {advApplied.balanceMin && (
            <button onClick={() => onRemoveChip('balanceMin')} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
              ≥ {fmtMGA(Number(advApplied.balanceMin))} <X className="h-3 w-3" />
            </button>
          )}
          {advApplied.balanceMax && (
            <button onClick={() => onRemoveChip('balanceMax')} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
              ≤ {fmtMGA(Number(advApplied.balanceMax))} <X className="h-3 w-3" />
            </button>
          )}
          <button onClick={onResetFilters} className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            {t('common.clear')}
          </button>
        </div>
      )}
    </>
  )
}
