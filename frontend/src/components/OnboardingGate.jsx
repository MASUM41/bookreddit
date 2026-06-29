import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PUBLIC_PATHS = ['/login', '/signup', '/onboarding', '/cover-demo']

export default function OnboardingGate({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return children

  if (user && !user.onboarding_completed && !PUBLIC_PATHS.includes(location.pathname)) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
