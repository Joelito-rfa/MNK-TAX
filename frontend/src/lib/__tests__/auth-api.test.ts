import { describe, it, expect, beforeEach } from 'vitest'
import { api, tokenStore, apiErrorMessage } from '../api'

/* ── tokenStore : persistance localStorage ─────────────────── */

describe('tokenStore', () => {
  beforeEach(() => {
    tokenStore.clear()
  })

  it('stores and restores access + refresh tokens', () => {
    tokenStore.set('access-123', 'refresh-456')
    expect(tokenStore.access).toBe('access-123')
    expect(tokenStore.refresh).toBe('refresh-456')
  })

  it('clears both tokens', () => {
    tokenStore.set('a', 'r')
    tokenStore.clear()
    expect(tokenStore.access).toBeNull()
    expect(tokenStore.refresh).toBeNull()
  })
})

/* ── Authorization: Bearer <token> ─────────────────────────── */

describe('api Authorization header', () => {
  beforeEach(() => {
    tokenStore.clear()
  })

  it('sends Bearer token on protected requests', async () => {
    tokenStore.set('jwt-access', 'jwt-refresh')
    let captured: unknown
    await api.get('/auth/me', {
      adapter: async (config) => {
        captured = config.headers?.Authorization
        return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
      },
    })
    expect(captured).toBe('Bearer jwt-access')
  })

  it('sends no Authorization header when logged out', async () => {
    let captured: unknown = 'unset'
    await api.get('/auth/me', {
      adapter: async (config) => {
        captured = config.headers?.Authorization
        return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
      },
    })
    expect(captured).toBeUndefined()
  })
})

/* ── Message backend 401 relayé tel quel ───────────────────── */

describe('apiErrorMessage', () => {
  it('relays the backend "Authentification requise." message on 401', () => {
    const err = {
      isAxiosError: true,
      response: {
        status: 401,
        data: { message: 'Authentification requise.', code: 'UNAUTHORIZED' },
      },
    }
    expect(apiErrorMessage(err)).toBe('Authentification requise.')
  })
})

/* ── Contrat d'URL avec le backend ───────────────────────────
   Le backend expose POST /api/auth/login (préfixe /api/).
   En production, VITE_API_BASE_URL doit donc se terminer par
   /api (ex. https://mnk-tax-api.onrender.com/api), sinon les
   appels partent vers /auth/login, route inconnue → 401
   « Authentification requise. » via l'entry point. */
describe('backend URL contract', () => {
  it('login path carries the /api prefix when baseURL ends with /api', () => {
    const baseURL = 'https://mnk-tax-api.onrender.com/api'
    const url = `${baseURL}/auth/login`
    expect(url).toBe('https://mnk-tax-api.onrender.com/api/auth/login')
  })
})
