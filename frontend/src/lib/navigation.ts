/**
 * Destination par défaut après connexion, en fonction des permissions effectives.
 * Un contribuable (sans REPORT_READ) atterrit ainsi sur son dossier plutôt que sur
 * un tableau de bord qui afficherait des agrégats globaux.
 */
const HOME_CANDIDATES: { route: string; permission: string }[] = [
  { route: '/dashboard', permission: 'REPORT_READ' },
  { route: '/taxpayers', permission: 'TAXPAYER_READ' },
  { route: '/declarations', permission: 'DECLARATION_READ' },
  { route: '/debts', permission: 'DEBT_READ' },
  { route: '/collection', permission: 'COLLECTION_READ' },
  { route: '/payments', permission: 'PAYMENT_READ' },
  { route: '/receipts', permission: 'RECEIPT_READ' },
  { route: '/messages', permission: 'MESSAGE_READ' },
]

export function homeRouteFor(permissions: string[]): string {
  const hit = HOME_CANDIDATES.find(c => permissions.includes(c.permission))
  return hit ? hit.route : '/profile'
}