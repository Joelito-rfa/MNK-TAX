import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ThemeProvider } from './lib/theme'
import { I18nProvider } from './lib/i18n'
import { ToastProvider } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Taxpayers from './pages/Taxpayers'
import TaxpayerDetail from './pages/TaxpayerDetail'
import Declarations from './pages/Declarations'
import Assessments from './pages/Assessments'
import Debts from './pages/Debts'
import DebtDetail from './pages/DebtDetail'
import Complaints from './pages/Complaints'
import Refunds from './pages/Refunds'
import Controls from './pages/Controls'
import CollectionOverview from './pages/collection/Overview'
import CollectionOverdue from './pages/collection/Overdue'
import CollectionReminders from './pages/collection/Reminders'
import CollectionNotices from './pages/collection/Notices'
import CollectionHistory from './pages/CollectionHistory'
import CollectionPlans from './pages/CollectionPlans'
import { PaymentsList } from './pages/payments/PaymentsList'
import PaymentsPending from './pages/payments/PaymentsPending'
import PaymentsStats from './pages/payments/PaymentsStats'
import Receipts from './pages/Receipts'
import ReceiptVerify from './pages/ReceiptVerify'
import Reports from './pages/Reports'
import Deadlines from './pages/Deadlines'
import TaxRules from './pages/TaxRules'
import Users from './pages/Users'
import Roles from './pages/Roles'
import AuditLogs from './pages/AuditLogs'
import Parameters from './pages/Parameters'
import RegistrationRequests from './pages/RegistrationRequests'
import Profile from './pages/Profile'
import NotificationsPage from './pages/Notifications'
import MessagesPage from './pages/Messages'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify/receipt/:reference" element={<ReceiptVerify />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="dashboard" element={<Dashboard />} />
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
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="messages" element={<ProtectedRoute permission="MESSAGE_READ" />}>
                    <Route index element={<MessagesPage />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
