/* ── Password strength ──────────────────────────────── */

export function passwordStrength(pw: string): { level: 'weak' | 'medium' | 'strong'; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  if (score <= 2) return { level: 'weak', label: 'Faible', color: 'bg-rose-500' }
  if (score <= 4) return { level: 'medium', label: 'Moyen', color: 'bg-amber-500' }
  return { level: 'strong', label: 'Fort', color: 'bg-emerald-500' }
}

/* ── Parse user-agent ───────────────────────────────── */

export function parseUserAgent(ua: string | null): { device: string; browser: string; os: string } {
  if (!ua) return { device: 'Inconnu', browser: 'Inconnu', os: 'Inconnu' }
  let device = 'Ordinateur'
  if (/tablet|ipad/i.test(ua)) device = 'Tablette'
  else if (/mobile|android|iphone/i.test(ua)) device = 'Mobile'

  let browser = 'Autre'
  if (/edge|edg/i.test(ua)) browser = 'Edge'
  else if (/chrome/i.test(ua)) browser = 'Chrome'
  else if (/firefox/i.test(ua)) browser = 'Firefox'
  else if (/safari/i.test(ua)) browser = 'Safari'

  let os = 'Autre'
  if (/windows/i.test(ua)) os = 'Windows'
  else if (/iphone|ipad/i.test(ua)) os = 'iOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/linux/i.test(ua)) os = 'Linux'
  else if (/mac os/i.test(ua)) os = 'macOS'

  return { device, browser, os }
}

/* ── Security action labels ─────────────────────────── */

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Connexion réussie',
  LOGOUT: 'Déconnexion',
  PASSWORD_CHANGE: 'Mot de passe modifié',
  TOKEN_REFRESH: 'Session rafraîchie',
  UPDATE: 'Profil modifié',
  CREATE: 'Compte créé',
  DELETE: 'Supprimé',
  ENABLE: 'Compte activé',
  DISABLE: 'Compte désactivé',
}

export function actionLabel(action: string, entityType: string): string {
  if (entityType === 'AVATAR' && action === 'UPDATE') return 'Avatar modifié'
  if (entityType === 'AVATAR' && action === 'DELETE') return 'Avatar supprimé'
  if (entityType === 'PROFILE' && action === 'UPDATE') return 'Profil modifié'
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]
  return `${action} ${entityType}`
}

/* ── Permission categories ──────────────────────────── */

export const PERMISSION_CATEGORIES: { title: string; prefix: string }[] = [
  { title: 'Administration', prefix: 'PERMISSION_USER_' },
  { title: 'Contribuables', prefix: 'PERMISSION_TAXPAYER_' },
  { title: 'Déclarations', prefix: 'PERMISSION_DECLARATION_' },
  { title: 'Créances', prefix: 'PERMISSION_DEBT_' },
  { title: 'Paiements', prefix: 'PERMISSION_PAYMENT_' },
  { title: 'Quittances', prefix: 'PERMISSION_RECEIPT_' },
  { title: 'Recouvrement', prefix: 'PERMISSION_COLLECTION_' },
  { title: 'Messages', prefix: 'PERMISSION_MESSAGE_' },
  { title: 'Contrôles fiscaux', prefix: 'PERMISSION_CONTROL_' },
  { title: 'Réclamations', prefix: 'PERMISSION_COMPLAINT_' },
  { title: 'Remboursements', prefix: 'PERMISSION_REFUND_' },
  { title: 'Calendrier', prefix: 'PERMISSION_DEADLINE_' },
  { title: 'Règles fiscales', prefix: 'PERMISSION_RULE_' },
  { title: 'Rapports', prefix: 'PERMISSION_REPORT_' },
]

export const PERMISSION_LABELS: Record<string, string> = {
  READ: 'Lire',
  WRITE: 'Créer / Modifier',
  DELETE: 'Supprimer',
  EXPORT: 'Exporter',
  VALIDATE: 'Valider',
  CREATE: 'Créer',
  UPDATE: 'Modifier',
  SUBMIT: 'Soumettre',
  REVIEW: 'Réviser',
  REJECT: 'Rejeter',
  CONFIRM: 'Confirmer',
  ALLOCATE: 'Allouer',
  VIEW_HISTORY: 'Historique',
  GENERATE: 'Générer',
  DOWNLOAD: 'Télécharger',
  VERIFY: 'Vérifier',
  MANAGE: 'Gérer',
  SUSPEND: 'Suspendre',
  CLOSE: 'Clôturer',
  DISABLE: 'Désactiver',
  RESET_PASSWORD: 'Réinitialiser MDP',
  ASSIGN: 'Attribuer',
  FINANCIAL: 'Financier',
  TAX: 'Fiscal',
  RECOVERY: 'Recouvrement',
  HISTORY: 'Historique',
}

/**
 * Group permissions by category.
 * Returns only categories that have at least one matching permission.
 */
export function groupPermissions(permissions: string[]): { title: string; prefix: string; permissions: string[] }[] {
  return PERMISSION_CATEGORIES
    .map(cat => ({
      ...cat,
      permissions: permissions.filter(p => p.startsWith(cat.prefix)),
    }))
    .filter(cat => cat.permissions.length > 0)
}
