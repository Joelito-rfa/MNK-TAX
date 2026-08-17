import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Taxpayers from './pages/Taxpayers'
import TaxpayerDetail from './pages/TaxpayerDetail'
import Declarations from './pages/Declarations'
import Debts from './pages/Debts'
import Collection from './pages/Collection'
import Payments from './pages/Payments'
import Receipts from './pages/Receipts'
import ReceiptVerify from './pages/ReceiptVerify'
import Reports from './pages/Reports'
import Deadlines from './pages/Deadlines'
import TaxRules from './pages/TaxRules'
import Users from './pages/Users'
import Roles from './pages/Roles'
import AuditLogs from './pages/AuditLogs'
import Parameters from './pages/Parameters'
import NotificationsPage from './pages/Notifications'
import MessagesPage from './pages/Messages'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/verify/receipt/:reference" element={<ReceiptVerify />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="taxpayers" element={<ProtectedRoute permission="TAXPAYER_READ" />}>
                  <Route index element={<Taxpayers />} />
                  <Route path=":id" element={<TaxpayerDetail />} />
                </Route>
                <Route path="declarations" element={<ProtectedRoute permission="DECLARATION_READ" />}>
                  <Route index element={<Declarations />} />
                  <Route path=":id" element={<Declarations />} />
                </Route>
                <Route path="debts" element={<ProtectedRoute permission="DEBT_READ" />}>
                  <Route index element={<Debts />} />
                </Route>
                <Route path="collection" element={<ProtectedRoute permission="COLLECTION_READ" />}>
                  <Route index element={<Collection />} />
                </Route>
                <Route path="payments" element={<ProtectedRoute permission="PAYMENT_READ" />}>
                  <Route index element={<Payments />} />
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
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="messages" element={<MessagesPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
