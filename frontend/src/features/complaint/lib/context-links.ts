import type { ComplaintContextType } from '../../../types'

/**
 * Route vers l'entité référencée par le contexte d'une réclamation.
 * Retourne `null` quand le contexte ne pointe vers aucun dossier consultable.
 */
export function complaintContextLink(
  contextType: ComplaintContextType | string,
  contextRef?: string | null,
): string | null {
  const ref = contextRef?.trim()
  switch (contextType) {
    case 'DECLARATION':
      return ref ? `/declarations?q=${encodeURIComponent(ref)}` : '/declarations'
    case 'DEBT':
      return ref ? `/debts?q=${encodeURIComponent(ref)}` : '/debts'
    case 'PAYMENT':
      return ref ? `/payments?q=${encodeURIComponent(ref)}` : '/payments'
    case 'CONTROL':
      return '/controls'
    case 'REFUND':
      return '/refunds'
    default:
      return null
  }
}
