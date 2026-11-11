/**
 * Normalisation des numéros de téléphone (miroir de PhoneUtil côté backend).
 *
 * Madagascar : indicatif +261. Formats acceptés :
 *   034 12 345 67   → +261341234567
 *   +261 34 12 345 67 → +261341234567
 *   261341234567    → +261341234567
 *
 * Le numéro normalisé est renvoyé sans espaces, avec indicatif pays.
 */

const DEFAULT_COUNTRY_CODE = '+261'
const MG_LOCAL_LENGTH = 9

/** Normalise un numéro vers la forme E.164 (+261XXXXXXXXX). Null si invalide. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/[^0-9]/g, '')
  if (digits.length === 0) return null

  let local: string
  if (digits.startsWith('261')) {
    local = digits.slice(3)
  } else if (digits.startsWith('0') && digits.length === 10) {
    local = digits.slice(1)
  } else if (digits.length === MG_LOCAL_LENGTH) {
    local = digits
  } else if (digits.length > MG_LOCAL_LENGTH) {
    // Numéro international d'un autre pays : on le garde tel quel.
    return `+${digits}`
  } else {
    return null
  }
  if (local.length !== MG_LOCAL_LENGTH) return null
  return DEFAULT_COUNTRY_CODE + local
}

/** true si le numéro peut être normalisé vers un format valide. */
export function isValidPhone(raw: string | null | undefined): boolean {
  return normalizePhone(raw) !== null
}

/** Numéro lisible : +261 34 12 345 67 (null si invalide). */
export function formatPhone(raw: string | null | undefined): string | null {
  const normalized = normalizePhone(raw)
  if (!normalized) return null
  if (!normalized.startsWith(DEFAULT_COUNTRY_CODE) || normalized.length !== DEFAULT_COUNTRY_CODE.length + MG_LOCAL_LENGTH) {
    return normalized
  }
  const local = normalized.slice(DEFAULT_COUNTRY_CODE.length)
  return `${DEFAULT_COUNTRY_CODE} ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 7)} ${local.slice(7)}`
}
