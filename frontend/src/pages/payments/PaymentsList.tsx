import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filter, Search } from 'lucide-react'
import { apiGet } from '../../lib/api'
import type { Payment, TaxType } from '../../types'
import { Button, Card, EmptyState, Input, Pagination, Select, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'
import { usePaymentFilters } from '../../features/payment/hooks/usePaymentFilters'
import { usePayments } from '../../features/payment/api/queries'
import { useConfirmPayment } from '../../features/payment/api/mutations'
import { METHOD_CODES, methodLabel } from '../../features/payment/lib/methods'
import { PaymentTable } from '../../features/payment/components/PaymentTable'
import { PaymentDetailModal } from '../../features/payment/components/modals/PaymentDetailModal'

export interface PaymentsListProps {
  initialStatus?: string
  /** Sous-module « En attente » : les paiements en attente peuvent être confirmés depuis la liste. */
  pendingMode?: boolean
}

export function PaymentsList({ initialStatus = '', pendingMode = false }: PaymentsListProps) {
  const { t } = useI18n()
  const { can } = useAuth()
  const [detail, setDetail] = useState<Payment | null>(null)
  const confirmPayment = useConfirmPayment()
  const canConfirm = pendingMode && can('PAYMENT_CONFIRM')

  const { setPage, size, setSize, status, setStatus, taxType, setTaxType, method, setMethod, q, setQ, dateFrom, setDateFrom, dateTo, setDateTo, showFilters, setShowFilters, buildParams, resetFilters } = usePaymentFilters(initialStatus)

  const { data, isLoading } = usePayments(buildParams)
  const { data: taxTypes } = useQuery({ queryKey: ['tax-types-ref'], queryFn: () => apiGet<TaxType[]>('/tax-types') })

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder={t('payments.searchPlaceholder')} className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4" /> {t('payments.filters.title')}</Button>
        </div>
        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 px-5 py-3 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-700/50">
            <div className="w-44"><label className="text-xs text-slate-500 mb-1 block">{t('payments.filters.tax')}</label>
              <Select value={taxType} onChange={(e) => { setTaxType(e.target.value); setPage(0) }}>
                <option value="">{t('payments.filters.all')}</option>
                {taxTypes?.map((tt) => { const k = `taxtype.${tt.code}`; const v = t(k); return <option key={tt.code} value={tt.code}>{tt.code} — {v !== k ? v : tt.name}</option> })}
              </Select>
            </div>
            <div className="w-44"><label className="text-xs text-slate-500 mb-1 block">{t('payments.filters.status')}</label>
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
                <option value="">{t('payments.filters.all')}</option>
                <option value="PENDING">PENDING</option><option value="CONFIRMED">CONFIRMED</option>
                <option value="ALLOCATED">ALLOCATED</option><option value="PARTIALLY_ALLOCATED">PARTIALLY_ALLOCATED</option>
                <option value="REJECTED">REJECTED</option><option value="CANCELLED">CANCELLED</option><option value="REFUNDED">REFUNDED</option>
              </Select>
            </div>
            <div className="w-44"><label className="text-xs text-slate-500 mb-1 block">{t('payments.filters.mode')}</label>
              <Select value={method} onChange={(e) => { setMethod(e.target.value); setPage(0) }}>
                <option value="">{t('payments.filters.all')}</option>
                {METHOD_CODES.map((k) => <option key={k} value={k}>{methodLabel(k, t)}</option>)}
              </Select>
            </div>
            <div className="w-36"><label className="text-xs text-slate-500 mb-1 block">{t('payments.filters.dateFrom')}</label>
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0) }} />
            </div>
            <div className="w-36"><label className="text-xs text-slate-500 mb-1 block">{t('payments.filters.dateTo')}</label>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0) }} />
            </div>
            <div className="w-24"><label className="text-xs text-slate-500 mb-1 block">{t('payments.filters.size')}</label>
              <Select value={String(size)} onChange={(e) => { setSize(Number(e.target.value)); setPage(0) }}>
                <option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option>
              </Select>
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters}>{t('payments.filters.reset')}</Button>
          </div>
        )}
        {isLoading ? <Spinner /> : !data || data.content.length === 0 ? (
          <EmptyState title={t('payments.empty.title')} subtitle={t('payments.empty.subtitle')} />
        ) : (
          <>
            <PaymentTable
              payments={data.content}
              onView={setDetail}
              onCancel={can('PAYMENT_CANCEL') ? setDetail : undefined}
              onAllocate={can('PAYMENT_ALLOCATE') ? setDetail : undefined}
              onConfirm={canConfirm ? (p) => confirmPayment.mutate(p.id) : undefined}
            />
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700/50">
              <span className="text-sm text-slate-500">
                {data.totalElements === 1 ? t('payments.result.one', { count: data.totalElements, page: data.number + 1, pages: data.totalPages }) : t('payments.results', { count: data.totalElements, page: data.number + 1, pages: data.totalPages })}
              </span>
              <Pagination page={data.number} totalPages={data.totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </Card>
      {detail && <PaymentDetailModal payment={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
