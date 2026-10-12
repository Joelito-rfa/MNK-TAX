import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ThemeProvider } from './lib/theme'
import { I18nProvider } from './lib/i18n'
import { ToastProvider } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import { Spinner } from './components/ui'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ReceiptVerify from './pages/ReceiptVerify'
import NotFound from './pages/NotFound'
import Forbidden from './pages/Forbidden'

// Pages protégées chargées à la demande : évite d'embarquer toute
// l'application (~2,3 Mo) dans le chunk du premier affichage.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Taxpayers = lazy(() => import('./pages/Taxpayers'))
const TaxpayerDetail = lazy(() => import('./pages/TaxpayerDetail'))
const Declarations = lazy(() => import('./pages/Declarations'))
const Assessments = lazy(() => import('./pages/Assessments'))
const Debts = lazy(() => import('./pages/Debts'))
const DebtDetail = lazy(() => import('./pages/DebtDetail'))
const Complaints = lazy(() => import('./pages/Complaints'))
const Refunds = lazy(() => import('./pages/Refunds'))
const Controls = lazy(() => import('./pages/Controls'))
const CollectionOverview = lazy(() => import('./pages/collection/Overview'))
const CollectionOverdue = lazy(() => import('./pages/collection/Overdue'))
const CollectionReminders = lazy(() => import('./pages/collection/Reminders'))
const CollectionNotices = lazy(() => import('./pages/collection/Notices'))
const CollectionHistory = lazy(() => import('./pages/CollectionHistory'))
const CollectionPlans = lazy(() => import('./pages/CollectionPlans'))
const PaymentsList = lazy(() =>
  import('./pages/payments/PaymentsList').then((m) => ({ default: m.PaymentsList })),
)
const PaymentsPending = lazy(() => import('./pages/payments/PaymentsPending'))
const PaymentsStats = lazy(() => import('./pages/payments/PaymentsStats'))
const Receipts = lazy(() => import('./pages/Receipts'))
const Reports = lazy(() => import('./pages/Reports'))
const Deadlines = lazy(() => import('./pages/Deadlines'))
const TaxRules = lazy(() => import('./pages/TaxRules'))
const Users = lazy(() => import('./pages/Users'))
const Roles = lazy(() => import('./pages/Roles'))
const AuditLogs = lazy(() => import('./pages/AuditLogs'))
const Parameters = lazy(() => import('./pages/Parameters'))
const RegistrationRequests = lazy(() => import('./pages/RegistrationRequests'))
const Profile = lazy(() => import('./pages/Profile'))
const NotificationsPage = lazy(() => import('./pages/Notifications'))
const MessagesPage = lazy(() => import('./pages/Messages'))

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Suspense
                fallback={
                  <div className="flex min-h-screen items-center justify-center">
                    <Spinner label="Chargement…" />
                  </div>
                }
              >
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify/receipt/:reference" element={<ReceiptVerify />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="dashboard" element={<ProtectedRoute permission="REPORT_READ" />}>
                    <Route index element={<Dashboard />} />
                  </Route>
                  <Route path="taxpayers" element={<ProtectedRoute permission="TAXPAYER_READ" />}>
                    <Route index element={<Taxpayers />} />
                    <Route path=":id" element={<TaxpayerDetail />} />
                  </Route>
                  <Route path="declarations" element={<ProtectedRoute permission="DECLARATION_READ" />}>
                    <Route index element={<Declarations />} />
                    <Route path=":id" element={<Declarations />} />
                  </Route>
                  <Route path="assessments" element={<ProtectedRoute permission="ASSESSMENT_READ" />}>
                    <Route index element={<Assessments />} />
                  </Route>
                  <Route path="debts" element={<ProtectedRoute permission="DEBT_READ" />}>
                    <Route index element={<Debts />} />
                    <Route path=":id" element={<DebtDetail />} />
                  </Route>
                  <Route path="collection" element={<ProtectedRoute permission="COLLECTION_READ" />}>
                    <Route index element={<CollectionOverview />} />
                    <Route path="overdue" element={<CollectionOverdue />} />
                    <Route path="reminders" element={<CollectionReminders />} />
                    <Route path="notices" element={<CollectionNotices />} />
                    <Route path="plans" element={<CollectionPlans />} />
                    <Route path="history" element={<CollectionHistory />} />
                  </Route>
                  <Route path="payments" element={<ProtectedRoute permission="PAYMENT_READ" />}>
                    <Route index element={<PaymentsList />} />
                    <Route path="pending" element={<PaymentsPending />} />
                    <Route path="stats" element={<PaymentsStats />} />
                  </Route>
                  <Route path="controls" element={<ProtectedRoute permission="CONTROL_READ" />}>
                    <Route index element={<Controls />} />
                  </Route>
                  <Route path="complaints" element={<ProtectedRoute permission="COMPLAINT_READ" />}>
                    <Route index element={<Complaints />} />
                  </Route>
                  <Route path="refunds" element={<ProtectedRoute permission="REFUND_READ" />}>
                    <Route index element={<Refunds />} />
                  </Route>
                  <Route path="receipts" element={<ProtectedRoute permission="RECEIPT_READ" />}>
                    <Route index element={<Receipts />} />
                  </Route>
                  <Route path="reports" element={<ProtectedRoute permission="REPORT_READ" />}>
                    <Route index element={<Reports />} />
                  </Route>
                  <Route path="deadlines" element={<ProtectedRoute permission="TAXONOMY_READ" />}>
                    <Route index element={<Deadlines />} />
                  </Route>
                  <Route path="tax-rules" element={<ProtectedRoute permission="RULE_READ" />}>
                    <Route index element={<TaxRules />} />
                  </Route>
                  <Route path="users" element={<ProtectedRoute permission="USER_READ" />}>
                    <Route index element={<Users />} />
                  </Route>
                  <Route path="roles" element={<ProtectedRoute permission="ROLE_READ" />}>
                    <Route index element={<Roles />} />
                  </Route>
                  <Route path="audit" element={<ProtectedRoute permission="AUDIT_READ" />}>
                    <Route index element={<AuditLogs />} />
                  </Route>
                  <Route path="parameters" element={<ProtectedRoute permission="PARAMETER_READ" />}>
                    <Route index element={<Parameters />} />
                  </Route>
                  <Route path="registrations" element={<ProtectedRoute permission="USER_READ" />}>
                    <Route index element={<RegistrationRequests />} />
                  </Route>
                  <Route path="profile" element={<Profile />} />
                  <Route path="notifications" element={<ProtectedRoute permission="NOTIFICATION_READ" />}>
                    <Route index element={<NotificationsPage />} />
                  </Route>
                  <Route path="messages" element={<ProtectedRoute permission="MESSAGE_READ" />}>
                    <Route index element={<MessagesPage />} />
                  </Route>
                </Route>
              </Route>
              <Route path="forbidden" element={<Forbidden />} />
                  <Route path="*" element={<NotFound />} />
            </Routes>
              </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
