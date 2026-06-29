import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { APP_NAME } from '../constants/brand'

function getErrorMessage(err) {
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map(d => d.msg).join(', ')
  return err.message || 'Something went wrong'
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const loggedIn = await login(username, password)
      navigate(loggedIn?.onboarding_completed ? '/' : '/onboarding')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-reddit-muted flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-br-surface border border-reddit-border rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center gap-2 mb-6">
          <BookOpen size={28} className="text-orange-500" />
          <h1 className="text-2xl font-bold">
            Log in to <span className="text-orange-500">{APP_NAME}</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-br-text-secondary mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-reddit-border rounded px-3 py-2 text-sm bg-br-surface text-br-text
                         focus:outline-none focus:border-orange-400"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-br-text-secondary mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-reddit-border rounded px-3 py-2 text-sm bg-br-surface text-br-text
                         focus:outline-none focus:border-orange-400"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-500 text-white rounded-full py-2 text-sm font-semibold
                       hover:bg-orange-600 disabled:opacity-60 transition-colors"
          >
            {submitting ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        <p className="text-sm text-br-text-muted text-center mt-6">
          New to {APP_NAME}?{' '}
          <Link to="/signup" className="text-orange-500 font-semibold hover:underline">
            Sign Up
          </Link>
        </p>

        <p className="text-xs text-br-text-muted text-center mt-3">
          Demo: alice / password123
        </p>
      </div>
    </div>
  )
}
