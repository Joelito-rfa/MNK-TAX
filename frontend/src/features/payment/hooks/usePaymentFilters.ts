import { useState, useMemo } from 'react'

export function usePaymentFilters(initialStatus = '') {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(25)
  const [status, setStatus] = useState(initialStatus)
  const [taxType, setTaxType] = useState('')
  const [method, setMethod] = useState('')
  const [q, setQ] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const buildParams = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), size: String(size) })
    if (status) p.set('status', status)
    if (taxType) p.set('taxTypeCode', taxType)
    if (method) p.set('method', method)
    if (q) p.set('q', q)
    if (dateFrom) p.set('from', dateFrom)
    if (dateTo) p.set('to', dateTo)
    return p.toString()
  }, [page, size, status, taxType, method, q, dateFrom, dateTo])

  const resetFilters = () => {
    setStatus(initialStatus)
    setTaxType('')
    setMethod('')
    setQ('')
    setDateFrom('')
    setDateTo('')
    setPage(0)
  }

  return {
    page, setPage, size, setSize, status, setStatus,
    taxType, setTaxType, method, setMethod, q, setQ,
    dateFrom, setDateFrom, dateTo, setDateTo, showFilters, setShowFilters,
    buildParams, resetFilters,
  }
}
