/** Libellés des modes de paiement, partagés par les listes, détails et formulaires. */
export const methodLabels: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement bancaire',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Carte bancaire',
  CHEQUE: 'Chèque',
  OTHER: 'Autre',
}

export const METHOD_CODES = Object.keys(methodLabels)

export function methodLabel(method: string, t: (key: string) => string): string {
  const key = `payments.method.${method}`
  const v = t(key)
  return v !== key ? v : (methodLabels[method] ?? method)
}
