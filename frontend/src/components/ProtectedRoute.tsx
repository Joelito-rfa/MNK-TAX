import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Spinner } from './ui'

export default function ProtectedRoute({ permission }: { permission?: string }) {
  const { user, loading, can } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Vérification de la session…" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (permission && !can(permission)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
