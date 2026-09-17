import { useState, useMemo } from 'react'
import { EMPTY_ADV, type AdvancedFilters } from '../../../components/collection/CollectionFilters'
import type { CollectionStage } from '../api/keys'

export function useCollectionFilters(stage: CollectionStage) {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [searchQ, setSearchQ] = useState('')
  const [taxTypeFilter, setTaxTypeFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [advDraft, setAdvDraft] = useState<AdvancedFilters>(EMPTY_ADV)
  const [advApplied, setAdvApplied] = useState<AdvancedFilters>(EMPTY_ADV)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const buildParams = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), size: String(size) })
    // stage fiscale
    if (stage === 'overdue') p.set('overdue', 'true')
    else if (stage === 'reminders') p.set('hasReminder', 'true')
    else if (stage === 'notices') p.set('inCollection', 'true')
    if (searchQ) p.set('q', searchQ)
    if (taxTypeFilter) p.set('taxTypeCode', taxTypeFilter)
    if (periodFilter) p.set('period', periodFilter)
    // filtres avancés - selon stage certains ignorés côté API mais on les envoie
    if (advApplied.status) p.set('status', advApplied.status)
    if (advApplied.priority) p.set('priority', advApplied.priority)
    if (advApplied.balanceMin) p.set('balanceMin', advApplied.balanceMin)
    if (advApplied.balanceMax) p.set('balanceMax', advApplied.balanceMax)
    if (advApplied.dueFrom) p.set('dueFrom', advApplied.dueFrom)
    if (advApplied.dueTo) p.set('dueTo', advApplied.dueTo)
    return p.toString()
  }, [page,size,stage,searchQ,taxTypeFilter,periodFilter,advApplied])

  const hasFilters = !!(searchQ || taxTypeFilter || periodFilter || Object.values(advApplied).some(Boolean))
  const activeFilterCount = [searchQ, taxTypeFilter, periodFilter, advApplied.status, advApplied.priority, advApplied.balanceMin, advApplied.balanceMax, advApplied.dueFrom, advApplied.dueTo].filter(Boolean).length

  function resetFilters() { setSearchQ(''); setTaxTypeFilter(''); setPeriodFilter(''); setAdvApplied(EMPTY_ADV); setAdvDraft(EMPTY_ADV); setPage(0) }
  function applyAdvanced() { setAdvApplied(advDraft); setPage(0) }
  function removeChip(kind: keyof AdvancedFilters | 'q' | 'taxType' | 'period' | 'tab') {
    if (kind === 'q') setSearchQ('')
    else if (kind === 'taxType') setTaxTypeFilter('')
    else if (kind === 'period') setPeriodFilter('')
    else if (kind !== 'tab') setAdvApplied((a)=> ({...a,[kind]:''}))
    setPage(0)
  }

  return {
    page, setPage, size, setSize,
    searchQ, setSearchQ,
    taxTypeFilter, setTaxTypeFilter,
    periodFilter, setPeriodFilter,
    advDraft, setAdvDraft, advApplied, setAdvApplied,
    showAdvanced, setShowAdvanced,
    buildParams, hasFilters, activeFilterCount,
    resetFilters, applyAdvanced, removeChip,
  }
}
