/**
 * Contrat partagé de la demande d'accès (POST /api/auth/register) :
 *   - le formulaire public (pages/Register) construit le payload ;
 *   - la page admin (pages/RegistrationRequests) affiche et approuve.
 *
 * Le backend attend des **codes** de rôle (TAXPAYER, TAX_AGENT…), jamais les
 * libellés affichés : une demande saisie avec un libellé (« Agent fiscal »)
 * ou un type (« INDIVIDUAL ») est normalisée avant approbation.
 */

export const REGISTER_ROLES = [
  'TAXPAYER',
  'TAX_AGENT',
  'COLLECTION_AGENT',
  'ACCOUNTANT',
  'OTHER',
] as const

export type RegisterRole = (typeof REGISTER_ROLES)[number]

/** Profil du demandeur : le contribuable agit pour son propre compte. */
export type RegisterProfile = 'TAXPAYER' | 'AGENT'

/** Libellés français (la page admin des demandes n'est pas traduite). */
export const ROLE_LABELS: Record<string, string> = {
  TAXPAYER: 'Contribuable',
  TAX_AGENT: 'Agent fiscal',
  COLLECTION_AGENT: 'Agent de recouvrement',
  ACCOUNTANT: 'Comptable',
  ADMIN: 'Administrateur',
  SUPER_ADMIN: 'Super administrateur',
  OTHER: 'Autre',
}

/** Libellés historiques / valeurs de type → code de rôle. */
const ROLE_ALIASES: Record<string, RegisterRole> = {
  AGENT_FISCAL: 'TAX_AGENT',
  AGENT_DE_RECOUVREMENT: 'COLLECTION_AGENT',
  AGENT_RECOUVREMENT: 'COLLECTION_AGENT',
  COMPTABLE: 'ACCOUNTANT',
  CONTRIBUABLE: 'TAXPAYER',
  CONTRIBUTUABLE: 'TAXPAYER',
  PARTICULIER: 'TAXPAYER',
  INDIVIDUAL: 'TAXPAYER',
  COMPANY: 'TAXPAYER',
  ENTREPRISE: 'TAXPAYER',
  AUTRE: 'TAXPAYER',
  OTHER: 'TAXPAYER',
}

/** Codes de rôle attribuables via une demande (les rôles admin sont exclus). */
export function isAssignableRole(role: string | null | undefined): boolean {
  if (!role) return false
  const code = normalizeRole(role)
  return code === 'TAXPAYER' || code === 'TAX_AGENT' || code === 'COLLECTION_AGENT' || code === 'ACCOUNTANT'
}

/**
 * Normalise une valeur saisie (code, libellé ou type de demande) vers un code
 * de rôle valide. Retourne `null` quand la valeur est vide, un rôle
 * administratif ou totalement inconnue (l'appelant choisit alors un repli).
 */
export function normalizeRole(raw: string | null | undefined): RegisterRole | null {
  if (!raw || !raw.trim()) return null
  const key = raw.trim().toUpperCase().replace(/\s+/g, '_')
  if ((REGISTER_ROLES as readonly string[]).includes(key)) return key as RegisterRole
  // Les rôles administratifs ne sont jamais accordés par une demande.
  if (key === 'ADMIN' || key === 'SUPER_ADMIN') return null
  return ROLE_ALIASES[key] ?? null
}

/** Libellé affichable pour une valeur brute (code ou libellé historique). */
export function roleLabel(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return '—'
  const code = normalizeRole(raw)
  if (code) return ROLE_LABELS[code] ?? raw
  return ROLE_LABELS[raw.trim().toUpperCase()] ?? raw
}

/** Valeur pré-sélectionnée dans le sélecteur d'approbation. */
export function defaultApproveRole(raw: string | null | undefined): RegisterRole {
  const code = normalizeRole(raw)
  if (code && code !== 'OTHER') return code
  return 'TAXPAYER'
}

/** `requestType` cohérent avec le rôle demandé (filtre « type » côté admin). */
export function requestTypeForRole(role: RegisterRole): string {
  switch (role) {
    case 'TAXPAYER':
      return 'INDIVIDUAL'
    case 'TAX_AGENT':
      return 'TAX_AGENT'
    case 'COLLECTION_AGENT':
      return 'COLLECTION_AGENT'
    case 'ACCOUNTANT':
      return 'ACCOUNTANT'
    default:
      return 'OTHER'
  }
}

export interface RegisterFormValues {
  profile: string
  name: string
  email: string
  organization?: string
  role?: string
  phone?: string
  nif?: string
  address?: string
  message?: string
}

export interface RegisterPayload {
  name: string
  email: string
  role: string
  requestType: string
  organization?: string
  phone?: string
  nif?: string
  address?: string
  message?: string
}

/** Construit le corps envoyé à POST /api/auth/register. */
export function buildRegistrationPayload(values: RegisterFormValues): RegisterPayload {
  const isTaxpayer = values.profile === 'TAXPAYER'
  const role: RegisterRole = isTaxpayer
    ? 'TAXPAYER'
    : normalizeRole(values.role) ?? 'OTHER'

  const organization = isTaxpayer
    ? undefined
    : values.organization?.trim() || undefined

  return {
    name: values.name.trim(),
    email: values.email.trim(),
    role,
    requestType: requestTypeForRole(role),
    organization,
    phone: values.phone?.trim() || undefined,
    nif: values.nif?.trim() || undefined,
    address: values.address?.trim() || undefined,
    message: values.message?.trim() || undefined,
  }
}
