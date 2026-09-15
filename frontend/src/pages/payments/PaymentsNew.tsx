import { useNavigate } from 'react-router-dom'
import { CreatePaymentModal } from './shared/CreatePaymentModal'

export default function PaymentsNew() {
  const navigate = useNavigate()

  return <CreatePaymentModal onClose={() => navigate('/payments')} />
}