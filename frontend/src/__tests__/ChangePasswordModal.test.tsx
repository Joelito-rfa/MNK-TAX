import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ChangePasswordModal from '../components/ChangePasswordModal'

/* ── Mocks ──────────────────────────────────────────── */

vi.mock('../lib/auth', () => ({
  useAuth: () => ({
    logout: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('../lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'header.changePassword': 'Changer le mot de passe',
        'header.pw.subtitle': 'Modifiez votre mot de passe',
        'header.pw.current': 'Mot de passe actuel',
        'header.pw.current.placeholder': 'Entrez votre mot de passe actuel',
        'header.pw.new': 'Nouveau mot de passe',
        'header.pw.new.placeholder': 'Entrez un nouveau mot de passe',
        'header.pw.confirm': 'Confirmer le mot de passe',
        'header.pw.confirm.placeholder': 'Confirmez le nouveau mot de passe',
        'header.pw.submit': 'Changer le mot de passe',
        'header.pw.securityNote':
          'Un nouveau mot de passe vous déconnecte de toutes les sessions actives.',
        'header.pw.strength.weak': 'Faible',
        'header.pw.strength.medium': 'Moyen',
        'header.pw.strength.strong': 'Fort',
        'header.pw.rule.length': '8 caractères minimum',
        'header.pw.rule.uppercase': 'Une majuscule',
        'header.pw.rule.number': 'Un chiffre',
        'header.pw.rule.special': 'Un caractère spécial',
        'header.pw.rule.different': "Différent de l'ancien",
        'header.pw.match': 'Les mots de passe correspondent',
        'header.pw.noMatch': 'Les mots de passe ne correspondent pas',
        'header.pw.error.length': 'Le mot de passe doit contenir au moins 8 caractères.',
        'header.pw.error.mismatch': 'Les mots de passe ne correspondent pas.',
        'header.pw.error.invalid': 'Le mot de passe actuel est incorrect.',
        'header.pw.error.weak': 'Le mot de passe est trop faible.',
        'header.pw.error.same': "Le nouveau mot de passe doit être différent de l'ancien.",
        'header.pw.error.default': 'Une erreur est survenue.',
        'header.pw.show': 'Afficher',
        'header.pw.hide': 'Masquer',
        'common.cancel': 'Annuler',
      }
      return map[key] || key
    },
    locale: 'fr',
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../lib/api', () => ({
  apiPost: vi.fn().mockResolvedValue({}),
}))

vi.mock('../components/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

/* ── Helper ─────────────────────────────────────────── */

function renderModal(open = true) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <ChangePasswordModal open={open} onClose={vi.fn()} />
      </QueryClientProvider>,
    ),
  }
}

/** Set input value via fireEvent to avoid focus race with setTimeout */
function setInput(label: RegExp, value: string) {
  const input = screen.getByLabelText(label)
  fireEvent.change(input, { target: { value } })
}

/* ── Tests ──────────────────────────────────────────── */

describe('ChangePasswordModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Modal rendering', () => {
    it('renders when open', () => {
      renderModal(true)
      expect(screen.getByRole('heading', { name: 'Changer le mot de passe' })).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      renderModal(false)
      expect(screen.queryByText('Changer le mot de passe')).not.toBeInTheDocument()
    })

    it('renders all three password fields', () => {
      renderModal()
      expect(screen.getByLabelText(/Mot de passe actuel/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Nouveau mot de passe/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Confirmer le mot de passe/)).toBeInTheDocument()
    })

    it('renders security note', () => {
      renderModal()
      expect(screen.getByText(/toutes les sessions actives/)).toBeInTheDocument()
    })

    it('renders cancel and submit buttons', () => {
      renderModal()
      expect(screen.getByText('Annuler')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Changer le mot de passe' })).toBeInTheDocument()
    })
  })

  describe('Password visibility toggle', () => {
    it('passwords are hidden by default', () => {
      renderModal()
      const currentInput = screen.getByLabelText(/Mot de passe actuel/)
      expect(currentInput).toHaveAttribute('type', 'password')
    })

    it('can toggle password visibility', async () => {
      const user = userEvent.setup()
      renderModal()
      const toggleButtons = screen.getAllByRole('button', { name: /Afficher|Masquer/ })
      await user.click(toggleButtons[0])
      const currentInput = screen.getByLabelText(/Mot de passe actuel/)
      expect(currentInput).toHaveAttribute('type', 'text')
    })
  })

  describe('Password strength indicator', () => {
    it('shows weak when typing short password', () => {
      renderModal()
      setInput(/Nouveau mot de passe/, 'abc')
      expect(screen.getByText('Faible')).toBeInTheDocument()
    })

    it('shows medium for moderate password', () => {
      renderModal()
      // 'Abcdef1' → 7 chars (< 8), upper + digit = 2 ≤ 3 → medium
      setInput(/Nouveau mot de passe/, 'Abcdef1')
      expect(screen.getByText('Moyen')).toBeInTheDocument()
    })

    it('shows strong for complex password', () => {
      renderModal()
      // 'ABCDEFGHIJ123' → 13 chars (≥8 + ≥12), upper, digit = 4 > 3 → strong
      setInput(/Nouveau mot de passe/, 'ABCDEFGHIJ123')
      expect(screen.getByText('Fort')).toBeInTheDocument()
    })

    it('shows validation rules when typing', () => {
      renderModal()
      setInput(/Nouveau mot de passe/, 'test')

      expect(screen.getByText('8 caractères minimum')).toBeInTheDocument()
      expect(screen.getByText('Une majuscule')).toBeInTheDocument()
      expect(screen.getByText('Un chiffre')).toBeInTheDocument()
      expect(screen.getByText('Un caractère spécial')).toBeInTheDocument()
      expect(screen.getByText(/Différent de l'ancien/)).toBeInTheDocument()
    })
  })

  describe('Confirmation match indicator', () => {
    it('shows mismatch when passwords do not match', () => {
      renderModal()
      setInput(/Nouveau mot de passe/, 'Abcdef1')
      setInput(/Confirmer le mot de passe/, 'different')

      expect(screen.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument()
    })

    it('shows match when passwords match', () => {
      renderModal()
      setInput(/Nouveau mot de passe/, 'Abcdef1')
      setInput(/Confirmer le mot de passe/, 'Abcdef1')

      expect(screen.getAllByText('Les mots de passe correspondent').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Submit button state', () => {
    it('submit is disabled when fields are empty', () => {
      renderModal()
      const submitBtn = screen.getByRole('button', { name: 'Changer le mot de passe' })
      expect(submitBtn).toBeDisabled()
    })

    it('submit is disabled when password is too short', () => {
      renderModal()
      setInput(/Mot de passe actuel/, 'current')
      setInput(/Nouveau mot de passe/, 'short')
      setInput(/Confirmer le mot de passe/, 'short')

      const submitBtn = screen.getByRole('button', { name: 'Changer le mot de passe' })
      expect(submitBtn).toBeDisabled()
    })

    it('submit is disabled when passwords do not match', () => {
      renderModal()
      setInput(/Mot de passe actuel/, 'current')
      setInput(/Nouveau mot de passe/, 'Abcdefgh1')
      setInput(/Confirmer le mot de passe/, 'different1')

      const submitBtn = screen.getByRole('button', { name: 'Changer le mot de passe' })
      expect(submitBtn).toBeDisabled()
    })

    it('submit is enabled with valid inputs', () => {
      renderModal()
      setInput(/Mot de passe actuel/, 'current')
      setInput(/Nouveau mot de passe/, 'Abcdefgh1')
      setInput(/Confirmer le mot de passe/, 'Abcdefgh1')

      const submitBtn = screen.getByRole('button', { name: 'Changer le mot de passe' })
      expect(submitBtn).toBeEnabled()
    })
  })
})
