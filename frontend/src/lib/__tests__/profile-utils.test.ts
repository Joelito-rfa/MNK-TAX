import { describe, it, expect } from 'vitest'
import {
  passwordStrength,
  parseUserAgent,
  actionLabel,
  groupPermissions,
  PERMISSION_CATEGORIES,
  PERMISSION_LABELS,
} from '../profile-utils'

/* ── passwordStrength ───────────────────────────────── */

describe('passwordStrength', () => {
  it('returns weak for empty password', () => {
    const result = passwordStrength('')
    expect(result.level).toBe('weak')
    expect(result.label).toBe('Faible')
    expect(result.color).toContain('rose')
  })

  it('returns weak for short passwords', () => {
    expect(passwordStrength('abc').level).toBe('weak')
    expect(passwordStrength('1234567').level).toBe('weak')
  })

  it('returns medium for moderate passwords', () => {
    // 8+ chars, lowercase, uppercase → score 3 → medium
    expect(passwordStrength('Abcdef1').level).toBe('medium')
    // 8+ chars, lowercase, uppercase, digit → score 4 → medium
    expect(passwordStrength('Abcdef1').level).toBe('medium')
  })

  it('returns strong for complex passwords', () => {
    // 12+ chars, upper, lower, digit, special → score 6 → strong
    const result = passwordStrength('MyStr0ng!Pass')
    expect(result.level).toBe('strong')
    expect(result.label).toBe('Fort')
    expect(result.color).toContain('emerald')
  })

  it('scores length >= 12', () => {
    // lower + upper + length(12+) = 3 → medium
    expect(passwordStrength('Abcdefghijkl').level).toBe('medium')
  })

  it('scores special characters', () => {
    // lower + upper + digit + special = 4 → medium
    expect(passwordStrength('Abc1!').level).toBe('medium')
    // lower + upper + digit + special + length 8+ = 5 → strong
    expect(passwordStrength('Abcdef1!').level).toBe('strong')
  })

  it('scores lowercase', () => {
    // uppercase + digit + special = 3 → medium
    expect(passwordStrength('ABC1!').level).toBe('medium')
  })
})

/* ── parseUserAgent ─────────────────────────────────── */

describe('parseUserAgent', () => {
  it('returns defaults for null input', () => {
    const result = parseUserAgent(null)
    expect(result.device).toBe('Inconnu')
    expect(result.browser).toBe('Inconnu')
    expect(result.os).toBe('Inconnu')
  })

  it('detects Windows + Edge', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
    const result = parseUserAgent(ua)
    expect(result.os).toBe('Windows')
    expect(result.browser).toBe('Edge')
    expect(result.device).toBe('Ordinateur')
  })

  it('detects Android + Chrome', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    const result = parseUserAgent(ua)
    expect(result.os).toBe('Android')
    expect(result.browser).toBe('Chrome')
    expect(result.device).toBe('Mobile')
  })

  it('detects macOS + Safari', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    const result = parseUserAgent(ua)
    expect(result.os).toBe('macOS')
    expect(result.browser).toBe('Safari')
    expect(result.device).toBe('Ordinateur')
  })

  it('detects iOS + Safari (iPhone)', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    const result = parseUserAgent(ua)
    expect(result.os).toBe('iOS')
    expect(result.device).toBe('Mobile')
  })

  it('detects Linux + Firefox', () => {
    const ua =
      'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0'
    const result = parseUserAgent(ua)
    expect(result.os).toBe('Linux')
    expect(result.browser).toBe('Firefox')
  })

  it('detects iPad as tablet', () => {
    const ua =
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    const result = parseUserAgent(ua)
    expect(result.device).toBe('Tablette')
  })

  it('handles unknown user-agent gracefully', () => {
    const result = parseUserAgent('SomeUnknownBot/1.0')
    expect(result.device).toBe('Ordinateur')
    expect(result.browser).toBe('Autre')
    expect(result.os).toBe('Autre')
  })
})

/* ── actionLabel ────────────────────────────────────── */

describe('actionLabel', () => {
  it('returns French label for LOGIN', () => {
    expect(actionLabel('LOGIN', 'USER')).toBe('Connexion réussie')
  })

  it('returns French label for LOGOUT', () => {
    expect(actionLabel('LOGOUT', 'USER')).toBe('Déconnexion')
  })

  it('returns French label for PASSWORD_CHANGE', () => {
    expect(actionLabel('PASSWORD_CHANGE', 'USER')).toBe('Mot de passe modifié')
  })

  it('returns French label for TOKEN_REFRESH', () => {
    expect(actionLabel('TOKEN_REFRESH', 'USER')).toBe('Session rafraîchie')
  })

  it('returns "Profil modifié" for UPDATE + PROFILE', () => {
    expect(actionLabel('UPDATE', 'PROFILE')).toBe('Profil modifié')
  })

  it('returns "Avatar modifié" for UPDATE + AVATAR', () => {
    expect(actionLabel('UPDATE', 'AVATAR')).toBe('Avatar modifié')
  })

  it('returns "Avatar supprimé" for DELETE + AVATAR', () => {
    expect(actionLabel('DELETE', 'AVATAR')).toBe('Avatar supprimé')
  })

  it('returns generic label for unknown actions', () => {
    expect(actionLabel('EXPORT', 'REPORT')).toBe('EXPORT REPORT')
  })
})

/* ── groupPermissions ───────────────────────────────── */

describe('groupPermissions', () => {
  const samplePermissions = [
    'PERMISSION_DECLARATION_READ',
    'PERMISSION_DECLARATION_WRITE',
    'PERMISSION_DECLARATION_SUBMIT',
    'PERMISSION_DEBT_READ',
    'PERMISSION_DEBT_WRITE',
    'PERMISSION_PAYMENT_READ',
    'PERMISSION_USER_MANAGE',
    'PERMISSION_MESSAGE_READ',
  ]

  it('returns only categories with matching permissions', () => {
    const groups = groupPermissions(samplePermissions)
    const titles = groups.map(g => g.title)
    expect(titles).toContain('Déclarations')
    expect(titles).toContain('Créances')
    expect(titles).toContain('Paiements')
    expect(titles).toContain('Administration')
    expect(titles).toContain('Messages')
    // Should NOT contain categories with no matching permissions
    expect(titles).not.toContain('Quittances')
    expect(titles).not.toContain('Réclamations')
  })

  it('filters permissions by prefix correctly', () => {
    const groups = groupPermissions(samplePermissions)
    const declarations = groups.find(g => g.title === 'Déclarations')
    expect(declarations).toBeDefined()
    expect(declarations!.permissions).toHaveLength(3)
    expect(declarations!.permissions).toContain('PERMISSION_DECLARATION_READ')
  })

  it('returns empty array for empty permissions', () => {
    expect(groupPermissions([])).toEqual([])
  })

  it('handles single permission', () => {
    const groups = groupPermissions(['PERMISSION_REPORT_GENERATE'])
    expect(groups).toHaveLength(1)
    expect(groups[0].title).toBe('Rapports')
    expect(groups[0].permissions).toEqual(['PERMISSION_REPORT_GENERATE'])
  })
})

/* ── PERMISSION_CATEGORIES ──────────────────────────── */

describe('PERMISSION_CATEGORIES', () => {
  it('has 14 categories', () => {
    expect(PERMISSION_CATEGORIES.length).toBe(14)
  })

  it('each category has title and prefix', () => {
    for (const cat of PERMISSION_CATEGORIES) {
      expect(cat.title).toBeTruthy()
      expect(cat.prefix).toBeTruthy()
      expect(cat.prefix.endsWith('_')).toBe(true)
    }
  })
})

/* ── PERMISSION_LABELS ──────────────────────────────── */

describe('PERMISSION_LABELS', () => {
  it('has labels for common actions', () => {
    expect(PERMISSION_LABELS.READ).toBe('Lire')
    expect(PERMISSION_LABELS.WRITE).toBe('Créer / Modifier')
    expect(PERMISSION_LABELS.DELETE).toBe('Supprimer')
    expect(PERMISSION_LABELS.VALIDATE).toBe('Valider')
    expect(PERMISSION_LABELS.CREATE).toBe('Créer')
    expect(PERMISSION_LABELS.UPDATE).toBe('Modifier')
  })
})
