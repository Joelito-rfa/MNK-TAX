import { describe, it, expect } from 'vitest'
import {
  buildRegistrationPayload,
  defaultApproveRole,
  isAssignableRole,
  normalizeRole,
  requestTypeForRole,
  roleLabel,
} from '../registration'

describe('normalizeRole', () => {
  it('retient les codes de rôle valides', () => {
    expect(normalizeRole('TAXPAYER')).toBe('TAXPAYER')
    expect(normalizeRole('tax_agent')).toBe('TAX_AGENT')
    expect(normalizeRole('COLLECTION_AGENT')).toBe('COLLECTION_AGENT')
    expect(normalizeRole('ACCOUNTANT')).toBe('ACCOUNTANT')
    expect(normalizeRole('OTHER')).toBe('OTHER')
  })

  it('convertit les libellés historiques du formulaire', () => {
    expect(normalizeRole('Agent fiscal')).toBe('TAX_AGENT')
    expect(normalizeRole('Agent de recouvrement')).toBe('COLLECTION_AGENT')
    expect(normalizeRole('Comptable')).toBe('ACCOUNTANT')
    expect(normalizeRole('Contribuable')).toBe('TAXPAYER')
    expect(normalizeRole('Administrateur')).toBeNull()
  })

  it('convertit les valeurs de type employées comme rôle', () => {
    expect(normalizeRole('INDIVIDUAL')).toBe('TAXPAYER')
    expect(normalizeRole('COMPANY')).toBe('TAXPAYER')
    // « Autre » reste un libellé distinct côté affichage : le backend, lui,
    // résout OTHER vers TAXPAYER (rôle au moindre privilège) à l'approbation.
    expect(normalizeRole('OTHER')).toBe('OTHER')
  })

  it('refuse les rôles administratifs et les valeurs vides', () => {
    expect(normalizeRole('ADMIN')).toBeNull()
    expect(normalizeRole('SUPER_ADMIN')).toBeNull()
    expect(normalizeRole('')).toBeNull()
    expect(normalizeRole(undefined)).toBeNull()
    expect(normalizeRole('   ')).toBeNull()
  })
})

describe('roleLabel / isAssignableRole', () => {
  it('affiche le libellé français pour un code', () => {
    expect(roleLabel('TAXPAYER')).toBe('Contribuable')
    expect(roleLabel('TAX_AGENT')).toBe('Agent fiscal')
    expect(roleLabel('ADMIN')).toBe('Administrateur')
  })

  it('affiche le libellé brut quand il est déjà en français', () => {
    expect(roleLabel('Agent fiscal')).toBe('Agent fiscal')
    expect(roleLabel(null)).toBe('—')
  })

  it("n'autorise que les quatre rôles attribuables", () => {
    expect(isAssignableRole('TAXPAYER')).toBe(true)
    expect(isAssignableRole('TAX_AGENT')).toBe(true)
    expect(isAssignableRole('ADMIN')).toBe(false)
    expect(isAssignableRole('')).toBe(false)
  })
})

describe('defaultApproveRole', () => {
  it('pré-sélectionne le rôle demandé', () => {
    expect(defaultApproveRole('ACCOUNTANT')).toBe('ACCOUNTANT')
    expect(defaultApproveRole('Agent de recouvrement')).toBe('COLLECTION_AGENT')
    expect(defaultApproveRole('INDIVIDUAL')).toBe('TAXPAYER')
  })

  it("retombe sur le contribuable pour un rôle inconnu ou autre", () => {
    expect(defaultApproveRole('OTHER')).toBe('TAXPAYER')
    expect(defaultApproveRole('ADMIN')).toBe('TAXPAYER')
    expect(defaultApproveRole(null)).toBe('TAXPAYER')
  })
})

describe('requestTypeForRole', () => {
  it('couvre les filtres de type de la page admin', () => {
    expect(requestTypeForRole('TAXPAYER')).toBe('INDIVIDUAL')
    expect(requestTypeForRole('TAX_AGENT')).toBe('TAX_AGENT')
    expect(requestTypeForRole('COLLECTION_AGENT')).toBe('COLLECTION_AGENT')
    expect(requestTypeForRole('ACCOUNTANT')).toBe('ACCOUNTANT')
    expect(requestTypeForRole('OTHER')).toBe('OTHER')
  })
})

describe('buildRegistrationPayload', () => {
  it('construit une demande de contribuable pour son propre compte', () => {
    const payload = buildRegistrationPayload({
      profile: 'TAXPAYER',
      name: 'RAKOTO Jean',
      email: 'jean@example.mg',
      nif: '0000409001',
      phone: '034 00 000 00',
      address: 'Antananarivo',
      message: 'Je veux suivre mes déclarations.',
    })

    expect(payload.role).toBe('TAXPAYER')
    expect(payload.requestType).toBe('INDIVIDUAL')
    // Pas d'organisation pour un particulier : le backend met « Particulier ».
    expect(payload.organization).toBeUndefined()
    expect(payload.nif).toBe('0000409001')
    expect(payload).toEqual({
      name: 'RAKOTO Jean',
      email: 'jean@example.mg',
      role: 'TAXPAYER',
      requestType: 'INDIVIDUAL',
      phone: '034 00 000 00',
      nif: '0000409001',
      address: 'Antananarivo',
      message: 'Je veux suivre mes déclarations.',
    })
  })

  it("construit une demande d'agent avec organisation et rôle en code", () => {
    const payload = buildRegistrationPayload({
      profile: 'AGENT',
      name: 'RAKOTO Jean',
      email: 'agent@example.mg',
      organization: ' DGI Antananarivo ',
      role: 'TAX_AGENT',
    })

    expect(payload.role).toBe('TAX_AGENT')
    expect(payload.requestType).toBe('TAX_AGENT')
    expect(payload.organization).toBe('DGI Antananarivo')
    expect(payload.phone).toBeUndefined()
  })

  it("sérialise un rôle libellé saisie en code de rôle", () => {
    const payload = buildRegistrationPayload({
      profile: 'AGENT',
      name: 'RAKOTO Jean',
      email: 'agent@example.mg',
      organization: 'DGI',
      role: 'Agent fiscal',
    })

    expect(payload.role).toBe('TAX_AGENT')
    expect(payload.requestType).toBe('TAX_AGENT')
  })

  it('omet les champs optionnels vides', () => {
    const payload = buildRegistrationPayload({
      profile: 'TAXPAYER',
      name: 'RAKOTO Jean',
      email: 'jean@example.mg',
      nif: '  ',
      phone: '',
      message: '',
    })

    expect(payload.nif).toBeUndefined()
    expect(payload.phone).toBeUndefined()
    expect(payload.message).toBeUndefined()
  })
})
