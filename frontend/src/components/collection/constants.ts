import type { DebtStatus } from '../../types'

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  DRAFT: { label: 'Brouillon', color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/25' },
  ISSUED: { label: 'Émise', color: 'text-sky-400', bg: 'bg-sky-500/15', border: 'border-sky-500/25' },
  DUE: { label: 'À échoir', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/25' },
  PARTIALLY_PAID: { label: 'Paiement partiel', color: 'text-indigo-400', bg: 'bg-indigo-500/15', border: 'border-indigo-500/25' },
  OVERDUE: { label: 'En retard', color: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/25' },
  IN_COLLECTION: { label: 'Mise en demeure', color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/25' },
  DISPUTED: { label: 'Litige', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/25' },
  SUSPENDED: { label: 'Suspendue', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/25' },
  CLOSED: { label: 'Clôturée', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
  PAID: { label: 'Payée', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25' },
  CANCELLED: { label: 'Annulée', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
}

export const TERMINAL_STATUSES: DebtStatus[] = ['PAID', 'CANCELLED', 'CLOSED']

export const PRIORITY_CONFIG: Record<string, { label: string; dot: string; color: string }> = {
  URGENT: { label: 'Critique', dot: 'bg-red-500', color: 'text-red-400' },
  HIGH: { label: 'Haute', dot: 'bg-orange-500', color: 'text-orange-400' },
  NORMAL: { label: 'Normale', dot: 'bg-amber-500', color: 'text-amber-400' },
  LOW: { label: 'Faible', dot: 'bg-emerald-500', color: 'text-emerald-400' },
}

export const ACTION_LABELS: Record<string, string> = {
  PHONE_CONTACT: 'Appel téléphonique',
  SMS: 'Relance SMS',
  NOTIFICATION: 'Notification',
  NOTICE: 'Mise en demeure',
  COMMANDMENT: 'Commandement de payer',
  ATD: 'Avis à tiers détenteur',
  SEIZURE: 'Saisie',
  PAYMENT_PLAN: 'Plan de paiement',
  DISPUTE: 'Litige déclaré',
  DISPUTE_DECISION: 'Décision sur litige',
  SUSPENSION_REQUEST: 'Demande de suspension',
  PAYMENT_RECORD: 'Enregistrement paiement',
  NOTE: 'Note',
  FOLLOW_UP: 'Prochaine action',
  REMINDER: 'Relance',
  VISIT: 'Visite',
  ADMINISTRATIVE_ACTION: 'Action administrative',
  OTHER: 'Autre',
}

export const ACTION_ICONS: Record<string, string> = {
  PHONE_CONTACT: '📞',
  SMS: '✉️',
  NOTIFICATION: '🔔',
  NOTICE: '📨',
  COMMANDMENT: '📋',
  ATD: '🏛️',
  SEIZURE: '⚠️',
  PAYMENT_PLAN: '📅',
  DISPUTE: '⚖️',
  DISPUTE_DECISION: '⚖️',
  SUSPENSION_REQUEST: '⏸️',
  PAYMENT_RECORD: '💳',
  NOTE: '📝',
  FOLLOW_UP: '📅',
  REMINDER: '📧',
  VISIT: '🏢',
  ADMINISTRATIVE_ACTION: '⚙️',
  OTHER: '📌',
}

export const STATUS_OPTIONS = [
  { value: 'ISSUED', label: 'Émise' },
  { value: 'DUE', label: 'À échoir' },
  { value: 'PARTIALLY_PAID', label: 'Paiement partiel' },
  { value: 'OVERDUE', label: 'En retard' },
  { value: 'IN_COLLECTION', label: 'Mise en demeure' },
  { value: 'DISPUTED', label: 'Litige' },
  { value: 'SUSPENDED', label: 'Suspendue' },
  { value: 'CLOSED', label: 'Clôturée' },
  { value: 'PAID', label: 'Payée' },
  { value: 'CANCELLED', label: 'Annulée' },
]

export const PRIORITY_OPTIONS = [
  { value: 'URGENT', label: 'Critique' },
  { value: 'HIGH', label: 'Haute' },
  { value: 'NORMAL', label: 'Normale' },
  { value: 'LOW', label: 'Faible' },
]

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000)
}
