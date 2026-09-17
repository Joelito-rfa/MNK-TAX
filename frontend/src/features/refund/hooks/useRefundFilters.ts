import { useState, useMemo } from 'react'

export function useRefundFilters() {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [reason, setReason] = useState('')
  const [taxpayerId, setTaxpayerId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const buildParams = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), size: String(size) })
    if (status) p.set('status', status)
    if (reason) p.set('reason', reason)
    if (taxpayerId) p.set('taxpayerId', taxpayerId)
    if (dateFrom) p.set('fromDate', dateFrom)
    if (dateTo) p.set('toDate', dateTo)
    if (minAmount) p.set('minAmount', minAmount)
    if (maxAmount) p.set('maxAmount', maxAmount)
    if (q) p.set('q', q)
    return p.toString()
  }, [page, size, status, reason, taxpayerId, dateFrom, dateTo, minAmount, maxAmount, q])

  const advancedFilterCount = [reason, taxpayerId, dateFrom, dateTo, minAmount, maxAmount]
    .filter(Boolean).length
  const hasFilters = advancedFilterCount > 0 || !!q || !!status

  function resetFilters() {
    setQ('')
    setStatus('')
    setReason('')
    setTaxpayerId('')
    setDateFrom('')
    setDateTo('')
    setMinAmount('')
    setMaxAmount('')
    setPage(0)
  }

  return {
    page, setPage, size, setSize,
    q, setQ, status, setStatus,
    reason, setReason, taxpayerId, setTaxpayerId,
    dateFrom, setDateFrom, dateTo, setDateTo,
    minAmount, setMinAmount, maxAmount, setMaxAmount,
    showFilters, setShowFilters,
    buildParams, hasFilters, advancedFilterCount, resetFilters,
  }
}
