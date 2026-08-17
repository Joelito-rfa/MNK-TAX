export type TaxpayerType = 'COMPANY' | 'INDIVIDUAL'
export type TaxpayerStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
export type DeclarationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VALIDATED' | 'REJECTED' | 'CANCELLED' | 'LIQUIDEE' | 'PAYEE' | 'A_CORRIGER'
export type DebtStatus = 'OPEN' | 'OVERDUE' | 'IN_COLLECTION' | 'PAID' | 'CANCELLED'
export type PaymentStatus = 'RECORDED' | 'ALLOCATED' | 'REJECTED' | 'CANCELLED'
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'MOBILE_MONEY'
export type ReceiptStatus = 'ISSUED' | 'VOID'
export type CollectionActionType = 'PHONE_CONTACT' | 'SMS' | 'NOTIFICATION' | 'NOTICE' | 'PAYMENT_RECORD' | 'NOTE' | 'FOLLOW_UP' | 'REMINDER' | 'VISIT' | 'SEIZURE'
export type CollectionDebtStatus = 'PAYE' | 'EN_ATTENTE' | 'RELANCE_EN_COURS' | 'EN_RETARD' | 'MISE_EN_DEMEURE' | 'CONTENTIEUX' | 'ANNULE'
export type CalculationMethod = 'FLAT_RATE' | 'PERCENTAGE_OF_BASE' | 'PROGRESSIVE' | 'PER_UNIT' | 'PERCENTAGE_OF_TURNOVER'
export type Periodicity = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'BIENNIAL'
export type ObligationStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
export type DebtItemKind = 'PRINCIPAL' | 'PENALTY' | 'INTEREST' | 'ADJUSTMENT' | 'CREDIT'

export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
}

export interface User {
  id: number
  username: string
  email: string
  firstName: string
  lastName: string
  phone: string
  enabled: boolean
  mfaEnabled: boolean
  lastLoginAt: string
  createdAt: string
  roles: string[]
  permissions: string[]
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: User
}

export interface LoginRequest {
  username: string
  password: string
}

export interface TaxpayerSummary {
  id: number
  nif: string
  type: TaxpayerType
  name: string
  businessName: string
  phone: string
  email: string
  status: TaxpayerStatus
  taxCenterCode: string | null
  taxRegimeCode: string | null
}

export interface TaxpayerAddress {
  id: number
  type: string
  addressLine1: string
  addressLine2: string
  city: string
  region: string
  country: string
  postalCode: string
}

export interface TaxpayerActivity {
  id: number
  code: string
  label: string
  description: string
  primary: boolean
}

export interface TaxpayerDetail extends TaxpayerSummary {
  firstName: string
  lastName: string
  address: string
  taxCenterId: number | null
  taxCenterName: string | null
  taxRegimeId: number | null
  taxRegimeName: string | null
  addresses: TaxpayerAddress[]
  activities: TaxpayerActivity[]
  obligationsCount: number
}

export interface DeclarationLine {
  id: number
  lineNumber: number
  label: string
  amount: number
}

export interface DeclarationAnnexe {
  id: number
  nom: string
  fichier: string
  typeMime: string
  taille: number
  categorie: string
  obligatoire: boolean
  uploadedBy: string
  createdAt: string
}

export interface DeclarationHistoryEntry {
  id: number
  username: string
  action: string
  ancienStatut: string | null
  nouveauStatut: string | null
  commentaire: string | null
  createdAt: string
}

export interface Declaration {
  id: number
  reference: string
  taxpayerId: number
  nif: string
  taxpayerName: string
  taxTypeId: number
  taxTypeCode: string
  taxTypeName: string
  period: string
  exercice: string | null
  regime: string | null
  submissionDate: string | null
  status: DeclarationStatus
  taxBase: number
  declaredAmount: number
  taux: number | null
  calculatedTax: number | null
  penalites: number | null
  totalAPayer: number | null
  montantPaye: number | null
  resteAPayer: number | null
  dateEcheance: string | null
  dueDate: string | null
  rectificative: boolean
  declarationOrigineId: number | null
  motifCorrection: string | null
  taxCenterId: number | null
  taxCenterName: string | null
  submittedBy: string | null
  submittedAt: string | null
  validatedBy: string | null
  validatedAt: string | null
  validationComment: string | null
  createdAt: string
  updatedAt: string | null
  lines: DeclarationLine[]
  annexes: DeclarationAnnexe[]
  historyCount: number
}

export interface DeclarationStatistics {
  total: number
  aDeclarer: number
  brouillons: number
  enAttente: number
  validees: number
  payees: number
  rejetees: number
  aCorriger: number
  enControle: number
  montantDeclare: number
  montantPaye: number
  resteAPayer: number
}

export interface CalendarEntry {
  id: number
  reference: string
  nif: string
  taxpayerName: string
  taxTypeCode: string
  period: string
  dateEcheance: string | null
  status: DeclarationStatus
}

export interface AssessmentLine {
  id: number
  lineNumber: number
  label: string
  baseAmount: number
  rate: number
  calculatedAmount: number
}

export interface Assessment {
  id: number
  reference: string
  declarationId: number
  declarationReference: string
  taxpayerId: number
  nif: string
  taxpayerName: string
  taxTypeId: number
  taxTypeCode: string
  period: string
  taxBase: number
  grossTax: number
  deduction: number
  credit: number
  adjustment: number
  netTax: number
  calculationDate: string
  ruleCode: string
  ruleVersion: number
  computedBy: string
  createdAt: string
  lines: AssessmentLine[]
}

export interface DebtItem {
  id: number
  kind: DebtItemKind
  label: string
  amount: number
}

export interface TaxDebt {
  id: number
  reference: string
  taxpayerId: number
  nif: string
  taxpayerName: string
  assessmentId: number
  assessmentReference: string
  taxTypeId: number
  taxTypeCode: string
  period: string
  principalAmount: number
  penaltyAmount: number
  interestAmount: number
  adjustmentsAmount: number
  creditsAmount: number
  totalAmount: number
  paidAmount: number
  balance: number
  issueDate: string
  dueDate: string
  status: DebtStatus
  closedAt: string
  createdAt: string
  items: DebtItem[]
}

export interface Payment {
  id: number
  reference: string
  taxpayerId: number
  nif: string
  taxpayerName: string
  paymentDate: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  allocatedAmount: number
  rejectionReason: string
  createdBy: string
  recordedAt: string
  receiptReference: string | null
}

export interface Receipt {
  id: number
  reference: string
  receiptNumber: string
  paymentId: number
  taxpayerId: number
  nif: string
  taxpayerName: string
  taxTypeCode: string
  period: string
  amount: number
  method: PaymentMethod
  status: ReceiptStatus
  qrCodePath: string
  issuedAt: string
  verifiedAt: string
  verifyUrl: string
}

export interface ReceiptVerification {
  reference: string
  receiptNumber: string
  nif: string
  taxpayerName: string
  taxTypeCode: string
  period: string
  amount: number
  method: PaymentMethod
  status: ReceiptStatus
  issuedAt: string
  valid: boolean
}

export interface CollectionAction {
  id: number
  debtId: number
  debtReference: string
  nif: string
  taxpayerName: string
  type: CollectionActionType
  description: string
  actionDate: string
  outcome: string
  responsibleUserId: number | null
  responsibleName: string | null
  status: string
  nextAction: string | null
  nextActionDate: string | null
  createdAt: string
}

export interface CollectionNotice {
  id: number
  debtId: number
  debtReference: string
  noticeNumber: string
  noticeDate: string
  noticeType: string
  content: string
  sentAt: string
  status: string
  createdAt: string
}

export interface CollectionHistory {
  actions: CollectionAction[]
  notices: CollectionNotice[]
}

export interface CollectionDebtRow {
  id: number
  reference: string
  nif: string
  taxpayerName: string
  taxTypeCode: string
  period: string
  totalAmount: number
  paidAmount: number
  balance: number
  dueDate: string
  debtStatus: string
  collectionStatus: CollectionDebtStatus
  lastAction: string | null
  lastActionDate: string | null
  nextAction: string | null
  nextActionDate: string | null
}

export interface CollectionStats {
  collectionRate: number
  totalCollected: number
  totalOutstanding: number
  actionCount: number
}

export interface TaxType {
  id: number
  code: string
  name: string
  category: string
  description: string
  active: boolean
}

export interface TaxRegime {
  id: number
  code: string
  name: string
  description: string
  category: string
}

export interface TaxCenter {
  id: number
  code: string
  name: string
  address: string
}

export interface TaxRule {
  id: number
  code: string
  name: string
  taxTypeId: number
  taxTypeCode: string
  taxpayerType: string
  regimeId: number | null
  regimeCode: string | null
  activityCode: string
  calculationMethod: CalculationMethod
  rate: number
  minimum: number
  maximum: number
  deduction: number
  exemption: number
  legalReference: string
  brackets: string | null
  demo: boolean
  effectiveFrom: string
  effectiveTo: string
  active: boolean
  currentVersion: number
}

export interface TaxRuleVersion {
  id: number
  ruleId: number
  versionNumber: number
  snapshot: string
  reason: string
  changedBy: string
  effectiveFrom: string
}

export interface Obligation {
  id: number
  taxpayerId: number
  taxTypeCode: string
  taxTypeName: string
  periodicity: Periodicity
  startDate: string
  endDate: string
  status: ObligationStatus
}

export interface Deadline {
  id: number
  taxTypeCode: string
  taxTypeName: string
  period: string
  declarationDeadline: string
  paymentDeadline: string
}

export interface Role {
  id: number
  code: string
  name: string
  description: string
  system: boolean
  permissions: string[]
}

export interface DocumentItem {
  id: number
  taxpayerId: number
  taxpayerNif: string
  taxpayerName: string
  title: string
  documentType: string
  mimeType: string
  size: number
  uploadedBy: string
  createdAt: string
}

export interface Notification {
  id: number
  userId: number
  type: string
  title: string
  message: string
  entityType: string
  entityId: string
  read: boolean
  readAt: string
  createdAt: string
}

export interface Message {
  id: number
  senderId: number | null
  senderName: string
  recipientId: number
  subject: string
  content: string
  read: boolean
  readAt: string
  createdAt: string
}

export interface SendMessageRequest {
  recipientUsername: string
  subject: string
  content: string
}

export interface SystemParameter {
  id: number
  key: string
  value: string
  description: string
  category: string
  updatedAt: string
}

export interface AuditLog {
  id: number
  userId: number
  username: string
  action: string
  entityType: string
  entityId: string
  oldValue: string
  newValue: string
  ipAddress: string
  userAgent: string
  createdAt: string
}

export interface DashboardSummary {
  taxpayerCount: number
  declarationCount: number
  assessmentCount: number
  debtCount: number
  overdueCount: number
  paymentCount: number
  totalDebts: number
  totalCollected: number
  totalOutstanding: number
  overdueBalance: number
  currentMonthPayments: number
  collectionRate: number
  paymentsByMonth: { month: string; amount: number }[]
  debtsByStatus: { status: string; count: number }[]
  collectionByTaxType: { taxType: string; amount: number }[]
  paymentsByTaxType: { taxType: string; amount: number }[]
  overdueByTaxType: { taxType: string; amount: number }[]
}
