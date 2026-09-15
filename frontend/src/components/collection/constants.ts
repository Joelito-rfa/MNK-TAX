import type { DebtStatus } from '../../types'

export const STATUS_CONFIG: Record<string, { key: string; color: string; bg: string; border: string }> = {
  DRAFT: { key: 'common.draft', color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/25' },
  ISSUED: { key: 'status.FILED', color: 'text-sky-400', bg: 'bg-sky-500/15', border: 'border-sky-500/25' },
  DUE: { key: 'status.DUE', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/25' },
  PARTIALLY_PAID: { key: 'status.PARTIALLY_PAID', color: 'text-indigo-400', bg: 'bg-indigo-500/15', border: 'border-indigo-500/25' },
  OVERDUE: { key: 'status.OVERDUE', color: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/25' },
  IN_COLLECTION: { key: 'status.IN_COLLECTION', color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/25' },
  DISPUTED: { key: 'status.DISPUTED', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/25' },
  SUSPENDED: { key: 'status.SUSPENDED', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/25' },
  CLOSED: { key: 'status.CLOSED', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
  PAID: { key: 'status.PAID', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25' },
  CANCELLED: { key: 'status.CANCELLED', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
}

export const TERMINAL_STATUSES: DebtStatus[] = ['PAID', 'CANCELLED', 'CLOSED']

export const PRIORITY_CONFIG: Record<string, { key: string; dot: string; color: string }> = {
  URGENT: { key: 'priority.CRITICAL', dot: 'bg-red-500', color: 'text-red-400' },
  HIGH: { key: 'priority.HIGH', dot: 'bg-orange-500', color: 'text-orange-400' },
  NORMAL: { key: 'priority.MEDIUM', dot: 'bg-amber-500', color: 'text-amber-400' },
  LOW: { key: 'priority.LOW', dot: 'bg-emerald-500', color: 'text-emerald-400' },
}

/** Libellés français des actions de recouvrement */
export const ACTION_LABELS: Record<string, string> = {
  PHONE_CONTACT: 'Appel téléphonique',
  SMS: 'SMS',
  NOTIFICATION: 'Notification',
  NOTICE: 'Mise en demeure',
  COMMANDMENT: 'Commandement',
  ATD: 'ATD',
  SEIZURE: 'Saisie',
  PAYMENT_PLAN: 'Plan de paiement',
  DISPUTE: 'Contestation',
  DISPUTE_DECISION: 'Décision de contestation',
  SUSPENSION_REQUEST: 'Demande de suspension',
  PAYMENT_RECORD: 'Paiement',
  NOTE: 'Note interne',
  FOLLOW_UP: 'Relance',
  REMINDER: 'Rappel',
  VISIT: 'Visite sur place',
  ADMINISTRATIVE_ACTION: 'Action administrative',
  OTHER: 'Autre',
}

export const ACTION_KEYS: Record<string, string> = {
  PHONE_CONTACT: 'collection.action.PHONE_CONTACT',
  SMS: 'collection.action.SMS',
  NOTIFICATION: 'collection.action.NOTIFICATION',
  NOTICE: 'collection.action.NOTICE',
  COMMANDMENT: 'collection.action.COMMANDMENT',
  ATD: 'collection.action.ATD',
  SEIZURE: 'collection.action.SEIZURE',
  PAYMENT_PLAN: 'collection.action.PAYMENT_PLAN',
  DISPUTE: 'collection.action.DISPUTE',
  DISPUTE_DECISION: 'collection.action.DISPUTE_DECISION',
  SUSPENSION_REQUEST: 'collection.action.SUSPENSION_REQUEST',
  PAYMENT_RECORD: 'collection.action.PAYMENT_RECORD',
  NOTE: 'collection.action.NOTE',
  FOLLOW_UP: 'collection.action.FOLLOW_UP',
  REMINDER: 'collection.action.REMINDER',
  VISIT: 'collection.action.VISIT',
  ADMINISTRATIVE_ACTION: 'collection.action.ADMINISTRATIVE_ACTION',
  OTHER: 'collection.action.OTHER',
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
  { value: 'ISSUED', key: 'status.FILED' },
  { value: 'DUE', key: 'status.DUE' },
  { value: 'PARTIALLY_PAID', key: 'status.PARTIALLY_PAID' },
  { value: 'OVERDUE', key: 'status.OVERDUE' },
  { value: 'IN_COLLECTION', key: 'status.IN_COLLECTION' },
  { value: 'DISPUTED', key: 'status.DISPUTED' },
  { value: 'SUSPENDED', key: 'status.SUSPENDED' },
  { value: 'CLOSED', key: 'status.CLOSED' },
  { value: 'PAID', key: 'status.PAID' },
  { value: 'CANCELLED', key: 'status.CANCELLED' },
]

export const PRIORITY_OPTIONS = [
  { value: 'URGENT', key: 'priority.CRITICAL' },
  { value: 'HIGH', key: 'priority.HIGH' },
  { value: 'NORMAL', key: 'priority.MEDIUM' },
  { value: 'LOW', key: 'priority.LOW' },
]

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000)
}
