export type TaxpayerType = 'PERSON' | 'COMPANY'
export type TaxpayerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CLOSED'
export type DeclarationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VALIDATED' | 'REJECTED' | 'CANCELLED' | 'LIQUIDEE' | 'PAYEE' | 'A_CORRIGER'
export type DebtStatus = 'DRAFT' | 'ISSUED' | 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'IN_COLLECTION' | 'DISPUTED' | 'SUSPENDED' | 'CLOSED' | 'CANCELLED'
export type DebtOrigin = 'ASSESSMENT' | 'DECLARATION' | 'AUDIT' | 'CONTROL' | 'RECOVERY' | 'OTHER'
export type DebtCollectionPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'ALLOCATED' | 'PARTIALLY_ALLOCATED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED'

export interface PaymentStats {
  todayCount: number
  monthCount: number
  monthAmount: number
  unallocatedAmount: number
  pendingCount: number
  rejectedCount: number
  allocatedCount: number
  cancelledCount: number
  partiallyAllocatedCount: number
}
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CARD' | 'CHEQUE' | 'OTHER'
export type ReceiptStatus = 'GENERATED' | 'ISSUED' | 'VALID' | 'CANCELLED' | 'REFUNDED' | 'REPLACED' | 'VOID'
export type CollectionActionType = 'PHONE_CONTACT' | 'SMS' | 'NOTIFICATION' | 'NOTICE' | 'COMMANDMENT' | 'ATD' | 'SEIZURE' | 'PAYMENT_PLAN' | 'SUSPENSION_REQUEST' | 'PAYMENT_RECORD' | 'NOTE' | 'FOLLOW_UP' | 'REMINDER' | 'VISIT' | 'ADMINISTRATIVE_ACTION' | 'OTHER'
export type CollectionDebtStatus = 'PAYE' | 'EN_ATTENTE' | 'RELANCE_EN_COURS' | 'EN_RETARD' | 'MISE_EN_DEMEURE' | 'CONTENTIEUX' | 'ANNULE' | 'SUSPENDUE' | 'CLOTUREE' | 'PAIEMENT_PARTIEL'
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
  jobTitle: string | null
  taxCenter: string | null
  hasAvatar: boolean
  enabled: boolean
  mfaEnabled: boolean
  lastLoginAt: string
  lastLoginIp: string | null
  lastLoginUserAgent: string | null
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
  createdAt: string
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
  birthDate: string | null
  legalRepresentative: string | null
  registrationDate: string | null
  taxCenterId: number | null
  taxCenterName: string | null
  taxRegimeId: number | null
  taxRegimeName: string | null
  addresses: TaxpayerAddress[]
  activities: TaxpayerActivity[]
  obligationsCount: number
}

export interface TaxpayerStats {
  total: number
  active: number
  inactive: number
  suspended: number
  closed: number
  withDebt: number
  overdueDebts: number
  pendingDeclarations: number
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
  closedAt: string | null
  origin: DebtOrigin
  collectionPriority: DebtCollectionPriority
  observations: string | null
  createdBy: string | null
  taxpayerCenter: string | null
  suspendedAt: string | null
  daysOverdue: number
  items: DebtItem[]
}

export interface DebtHistoryEntry {
  id: number
  eventType: string
  description: string
  oldValue: string | null
  newValue: string | null
  performedBy: string | null
  eventDate: string
  createdAt: string
}

export interface DebtStats {
  totalDebts: number
  activeDebts: number
  overdueDebts: number
  paidDebts: number
  inCollectionDebts: number
  disputedDebts: number
  suspendedDebts: number
  totalAmount: number
  totalOutstanding: number
  totalPaid: number
  overdueBalance: number
  collectionRate: number
  byOrigin: { origin: string; count: number }[]
  byPriority: { priority: string; count: number }[]
  byTaxType: { taxType: string; count: number }[]
}

export interface MarkOverdueResult {
  updated: number
  details: string[]
}

export interface PaymentAllocationDto {
  id: number
  debtId: number
  debtReference: string
  amount: number
  component: 'PRINCIPAL' | 'PENALTY' | 'INTEREST'
  allocatedAt: string
  createdBy: string | null
  comment: string | null
}

export interface Payment {
  id: number
  reference: string
  taxpayerId: number
  nif: string
  taxpayerName: string
  debtId: number | null
  debtReference: string | null
  declarationId: number | null
  declarationReference: string | null
  paymentDate: string
  amount: number
  currency: string
  method: PaymentMethod
  transactionReference: string | null
  status: PaymentStatus
  allocatedAmount: number
  unpaidAmount: number
  rejectionReason: string | null
  observations: string | null
  createdBy: string
  recordedAt: string
  receiptReference: string | null
  allocationDetails: PaymentAllocationDto[]
}

export interface Receipt {
  id: number
  reference: string
  receiptNumber: string
  verificationToken: string
  paymentId: number | null
  paymentReference: string | null
  taxpayerId: number
  nif: string
  taxpayerName: string
  declarationId: number | null
  declarationReference: string | null
  debtId: number | null
  debtReference: string | null
  taxTypeCode: string
  period: string
  amount: number
  currency: string
  method: PaymentMethod
  transactionReference: string | null
  status: ReceiptStatus
  qrCodePath: string | null
  pdfPath: string | null
  downloadCount: number
  paymentDate: string | null
  centerCode: string | null
  createdBy: string | null
  issuedAt: string
  verifiedAt: string | null
  cancelledReason: string | null
  cancelledBy: string | null
  cancelledAt: string | null
  replacedByReference: string | null
  replacedAt: string | null
  refundReference: string | null
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
  paymentReference: string | null
  centerCode: string | null
  valid: boolean
}

export interface ReceiptStats {
  totalReceipts: number
  todayReceipts: number
  validReceipts: number
  cancelledReceipts: number
  refundedReceipts: number
  replacedReceipts: number
  totalAmount: number
  todayAmount: number
  monthAmount: number
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
  debtStatus: DebtStatus
  collectionStatus: CollectionDebtStatus
  collectionPriority: DebtCollectionPriority
  origin: DebtOrigin
  daysOverdue: number
  lastActionType: string | null
  lastAction: string | null
  lastActionDate: string | null
  lastResponsible: string | null
  nextAction: string | null
  nextActionDate: string | null
}

export interface CollectionStats {
  collectionRate: number
  totalExigible: number
  totalCollected: number
  totalOutstanding: number
  totalDebts: number
  overdueDebts: number
  overdueBalance: number
  overdue30: number
  overdue60: number
  overdue90: number
  partialDebts: number
  disputedDebts: number
  suspendedDebts: number
  reminderActions: number
  noticeCount: number
  actionCount: number
}

export interface OverdueSummary {
  count: number
  totalBalance: number
  averageDays: number
  oldestDueDate: string | null
}

export interface CollectionHistoryEvent {
  id: number
  debtId: number
  debtReference: string
  nif: string
  taxpayerName: string
  eventType: string
  description: string
  oldValue: string | null
  newValue: string | null
  performedBy: string | null
  eventDate: string
}

export type PaymentPlanStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
export type InstallmentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export interface PlanInstallment {
  id: number
  number: number
  dueDate: string
  amount: number
  paidAmount: number
  remainingAmount: number
  status: InstallmentStatus
  paidAt: string | null
  daysOverdue: number
}

export interface PaymentPlan {
  id: number
  reference: string
  label: string
  debtId: number
  debtReference: string
  nif: string
  taxpayerName: string
  status: PaymentPlanStatus
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  installmentCount: number
  paidInstallments: number
  overdueInstallments: number
  nextDueDate: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string
  installments: PlanInstallment[]
}

export type DisputeStatus = 'OPEN' | 'RESOLVED'
export type DisputeDecision = 'SUSTAINED' | 'REJECTED' | 'WITHDRAWN'

export interface DebtDispute {
  id: number
  reference: string
  debtId: number
  debtReference: string
  reason: string
  contestedAmount: number | null
  contestationDate: string
  status: DisputeStatus
  decision: DisputeDecision | null
  decisionNotes: string | null
  decidedBy: string | null
  decidedAt: string | null
  createdBy: string | null
  createdAt: string
}

export interface CreatePlanRequest {
  debtId: number
  label: string
  notes?: string | null
  installments: { dueDate: string; amount: number }[]
}

export interface PlanStats {
  activePlans: number
  completedPlans: number
  cancelledPlans: number
  overdueInstallments: number
  plansWithOverdue: number
}

export interface CollectionTaxpayerInfo {
  id: number
  nif: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  taxCenterCode: string | null
  taxCenterName: string | null
  taxRegimeCode: string | null
}

export interface CollectionDetail {
  id: number
  reference: string
  taxTypeCode: string
  taxTypeName: string
  period: string
  principalAmount: number
  penaltyAmount: number
  interestAmount: number
  totalAmount: number
  paidAmount: number
  balance: number
  issueDate: string
  dueDate: string
  debtStatus: string
  collectionStatus: string
  collectionPriority: string
  origin: string
  observations: string | null
  daysOverdue: number
  taxpayer: CollectionTaxpayerInfo
  actions: CollectionAction[]
  notices: CollectionNotice[]
  disputes: DebtDispute[]
}

export interface RefundStats {
  total: number
  pending: number
  underReview: number
  approved: number
  rejected: number
  paid: number
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
  readAt: string | null
  createdAt: string
}

export interface Session {
  id: number
  userAgent: string | null
  ipAddress: string | null
  current: boolean
  createdAt: string
  expiresAt: string
}

export interface SecurityEvent {
  id: number
  action: string
  entityType: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export type MessageContextType = 'DECLARATION' | 'DEBT' | 'PAYMENT' | 'RECOVERY' | 'AUDIT' | 'COMPLAINT' | 'REFUND' | 'DEADLINE' | 'GENERAL'
export type MessagePriority = 'NORMAL' | 'IMPORTANT' | 'URGENT'
export type MessageProcessingStatus = 'WAITING_RESPONSE' | 'RESPONDED' | 'CLOSED' | 'ARCHIVED'
export type MessageReadStatus = 'UNREAD' | 'READ'

export interface MessageAttachment {
  id: number
  fileName: string
  originalName: string
  mimeType: string
  size: number
  uploadedBy: string
  createdAt: string
}

export interface Message {
  id: number
  senderId: number | null
  senderName: string
  recipientId: number
  recipientName: string | null
  subject: string
  content: string
  read: boolean
  readAt: string | null
  createdAt: string
  threadId: number
  contextType: MessageContextType
  contextRef: string | null
  taxpayerId: number | null
  taxpayerName: string | null
  taxpayerNif: string | null
  declarationId: number | null
  declarationReference: string | null
  debtId: number | null
  debtReference: string | null
  paymentId: number | null
  paymentReference: string | null
  priority: MessagePriority
  processingStatus: MessageProcessingStatus
  closedAt: string | null
  archivedAt: string | null
  attachments: MessageAttachment[]
  replyCount: number
}

export interface SendMessageRequest {
  recipientUsername: string
  subject: string
  content: string
  replyToId?: number | null
  contextType?: MessageContextType
  contextRef?: string
  taxpayerId?: number | null
  declarationId?: number | null
  debtId?: number | null
  paymentId?: number | null
  priority?: MessagePriority
}

export interface MessageStats {
  totalReceived: number
  unreadCount: number
  waitingResponseCount: number
  urgentCount: number
}

/* ── Centre de communication multicanal (/api/communication) ── */
export type CommChannel = 'IN_APP' | 'EMAIL' | 'SMS'
export type CommMessageStatus =
  | 'DRAFT' | 'SCHEDULED' | 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'CANCELLED'
export type CommDeliveryStatus =
  | 'PENDING' | 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'READ' | 'CANCELLED'
export type CommPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type CommAudience = 'SINGLE' | 'IDS' | 'ALL' | 'WITH_DEBT' | 'OVERDUE' | 'TAX_TYPE' | 'DUE_SOON'

export interface CommComposeRequest {
  taxpayerId?: number | null
  userId?: number | null
  username?: string | null
  audience?: CommAudience | null
  taxTypeCode?: string | null
  taxpayerIds?: number[] | null
  channels: CommChannel[]
  subject?: string | null
  content?: string | null
  templateCode?: string | null
  language?: string | null
  priority?: CommPriority | null
  messageType?: string | null
  scheduledAt?: string | null
  requireConfirmation?: boolean | null
}

export interface CommComposePreview {
  audience: string
  recipientCount: number
  channels: CommChannel[]
  missingEmail: number
  missingPhone: number
  warnings: string[]
}

export interface CommComposeResult {
  messageId: number
  status: string
  recipients: number
  channels: CommChannel[]
  warning: string | null
}

export interface CommDelivery {
  id: number
  messageId: number
  channel: CommChannel
  recipientAddress: string | null
  status: CommDeliveryStatus
  attemptCount: number
  maxAttempts: number
  lastError: string | null
  nextRetryAt: string | null
  providerMessageId: string | null
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  createdAt: string
}

export interface CommSentMessage {
  id: number
  recipientName: string
  taxpayerId: number | null
  taxpayerName: string | null
  taxpayerNif: string | null
  subject: string | null
  channels: string | null
  messageType: string | null
  priority: CommPriority
  status: CommMessageStatus
  lastError: string | null
  scheduledAt: string | null
  createdAt: string
  deliveries: CommDelivery[]
}

export interface CommStats {
  messagesSent: number
  messagesFailed: number
  messagesScheduled: number
  messagesQueued: number
  messagesRead: number
  emailsSent: number
  smsSent: number
  notificationsSent: number
  deliveryRate: number
  readRate: number
  failureRate: number
}

export interface CommProviderStatus {
  channel: CommChannel
  provider: string
  status: 'CONNECTED' | 'INCOMPLETE' | 'DISCONNECTED'
  detail: string
}

export interface CommProvidersStatus {
  providers: CommProviderStatus[]
  queuePending: number
  queueFailed: number
  maxAttempts: number
  retryBackoffMinutes: number
}

export interface CommTemplate {
  id: number
  code: string
  category: string
  channels: string
  subjectFr: string | null
  subjectMg: string | null
  subjectEn: string | null
  bodyFr: string
  bodyMg: string
  bodyEn: string
  smsBodyFr: string | null
  smsBodyMg: string | null
  smsBodyEn: string | null
  enabled: boolean
}

export interface CommTemplateRenderRequest {
  templateCode: string
  language: string
  variables: Record<string, string>
}

export interface CommTemplateRenderResult {
  subject: string | null
  body: string | null
  smsBody: string | null
}

export interface CommCampaign {
  id: number
  reference: string
  name: string
  audience: string
  channels: string
  createdByName: string | null
  recipientCount: number
  sentCount: number
  failedCount: number
  readCount: number
  status: 'QUEUED' | 'SENDING' | 'COMPLETED' | 'FAILED'
  createdAt: string
}

export interface CommCampaignRequest {
  name: string
  audience: CommAudience
  taxTypeCode?: string | null
  taxpayerIds?: number[] | null
  channels: CommChannel[]
  subject?: string | null
  content?: string | null
  templateCode?: string | null
  priority?: CommPriority | null
  scheduledAt?: string | null
  requireConfirmation?: boolean | null
}

export interface CommCampaignAudiencePreview {
  recipientCount: number
  missingEmail: number
  missingPhone: number
}

export interface CommEventRule {
  id: number
  eventType: string
  templateCode: string
  channels: string
  priority: CommPriority
  dayOffset: number | null
  enabled: boolean
}

export interface CommUpdateEventRuleRequest {
  channels?: string | null
  priority?: CommPriority | null
  dayOffset?: number | null
  enabled?: boolean | null
}

export interface CommTestSendRequest {
  channel: 'EMAIL' | 'SMS'
  subject?: string | null
  content?: string | null
}

export interface CommTestSendResult {
  success: boolean
  message: string
}

export interface CommSaveTemplateRequest {
  code: string
  category?: string | null
  channels?: string | null
  subjectFr?: string | null
  subjectMg?: string | null
  subjectEn?: string | null
  bodyFr?: string | null
  bodyMg?: string | null
  bodyEn?: string | null
  smsBodyFr?: string | null
  smsBodyMg?: string | null
  smsBodyEn?: string | null
  enabled?: boolean | null
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

export interface DashboardActivity {
  id: number
  type: 'TAXPAYER' | 'DECLARATION' | 'PAYMENT' | 'DEBT' | 'COLLECTION' | 'RECEIPT'
  label: string
  taxpayerId: number
  taxpayerName: string
  nif: string
  date: string
  amount: number | null
}

export interface NextCollectionAction {
  id: number
  type: string
  taxpayerId: number
  taxpayerName: string
  nif: string
  debtReference: string
  nextActionDate: string | null
  nextAction: string | null
}

export type ControlStatus = 'OPEN' | 'IN_PROGRESS' | 'ANOMALY_DETECTED' | 'REDRESSEMENT' | 'CLOSED'
export type ControlType = 'DOCUMENTARY' | 'ON_SITE' | 'MIXED'

export interface ControlDocument {
  id: number
  title: string
  documentType: string | null
  requested: boolean
  received: boolean
  notes: string | null
}

export interface TaxControl {
  id: number
  reference: string
  taxpayerId: number
  nif: string
  taxpayerName: string
  agentId: number | null
  agentName: string | null
  controlType: ControlType
  periodStart: string
  periodEnd: string
  reason: string
  status: ControlStatus
  startedAt: string | null
  completedAt: string | null
  observations: string | null
  anomalies: string | null
  redressement: number | null
  penaltyAmount: number | null
  debtId: number | null
  createdAt: string
  updatedAt: string
}

export interface TaxControlDetail {
  control: TaxControl
  documents: ControlDocument[]
}

export type ComplaintStatus = 'OPEN' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'CLOSED'
export type ComplaintContextType = 'DECLARATION' | 'DEBT' | 'PAYMENT' | 'CONTROL' | 'REFUND' | 'GENERAL'

export interface Complaint {
  id: number
  reference: string
  taxpayerId: number
  nif: string
  taxpayerName: string
  subject: string
  description: string
  contextType: ComplaintContextType
  contextRef: string | null
  declarationId: number | null
  debtId: number | null
  paymentId: number | null
  controlId: number | null
  refundId: number | null
  status: ComplaintStatus
  assignedTo: number | null
  resolution: string | null
  resolvedAt: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ComplaintResponse {
  id: number
  authorId: number | null
  authorName: string
  content: string
  createdAt: string
}

export interface ComplaintDetail {
  complaint: Complaint
  responses: ComplaintResponse[]
}

export interface ComplaintStats {
  total: number
  open: number
  underReview: number
  accepted: number
  rejected: number
  closed: number
}

export type RefundReason = 'VAT_CREDIT' | 'OVERPAYMENT' | 'OTHER'
export type RefundStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID'

export interface Refund {
  id: number
  reference: string
  taxpayerId: number
  nif: string
  taxpayerName: string
  reason: RefundReason
  description: string | null
  debtId: number | null
  declarationId: number | null
  amount: number
  status: RefundStatus
  requestedBy: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  approvedAmount: number | null
  paymentMethod: string | null
  paymentReference: string | null
  paidAt: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
}

export interface RefundStats {
  total: number
  pending: number
  underReview: number
  approved: number
  rejected: number
  paid: number
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
  newTaxpayers: number
  newDeclarations: number
  declarationsToProcess: number
  recentActivity: DashboardActivity[]
  nextCollectionActions: NextCollectionAction[]
  periodCollected: number
  periodPaymentCount: number
  periodDeclarationCount: number
  periodTaxpayerCount: number
  topTaxpayersByCollected: {
    taxpayerId: number
    taxpayerName: string
    nif: string
    collected: number
    due: number
  }[]
  debtsByStatusDetail: {
    status: string
    count: number
    totalAmount: number
    paidAmount: number
    balance: number
  }[]
  receiptCount: number
  receiptTotalAmount: number
  todayReceiptCount: number
  taxpayersByMonth?: { month: string; count: number }[]
  declarationsByMonth?: { month: string; count: number }[]
  receiptsByMonth?: { month: string; count: number }[]
}

/* ── Report types ── */

export interface ReportStats {
  totalTaxpayers: number
  activeTaxpayers: number
  totalDeclarations: number
  validatedDeclarations: number
  paidDeclarations: number
  totalDebts: number
  overdueDebts: number
  paidDebts: number
  totalPayments: number
  totalCollected: number
  totalOutstanding: number
  totalReceipts: number
  receiptTotalAmount: number
  validReceipts: number
}

export interface DeclarationReportStats {
  total: number
  draft: number
  submitted: number
  underReview: number
  validated: number
  rejected: number
  paid: number
  aCorriger: number
  declaredAmount: number
  paidAmount: number
  remaining: number
}

export interface DebtReportStats {
  total: number
  overdue: number
  inCollection: number
  paid: number
  totalAmount: number
  collected: number
  outstanding: number
  collectionRate: number
}
