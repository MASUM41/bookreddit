import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchMe, login as apiLogin, register as apiRegister } from '../api'
import { clearToken, getToken, setToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const restoreSession = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const me = await fetchMe()
      setUser(me)
    } catch {
      clearToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  const refreshUser = useCallback(async () => {
    const token = getToken()
    if (!token) return null
    const me = await fetchMe()
    setUser(me)
    return me
  }, [])

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password)
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (username, email, password) => {
    const data = await apiRegister(username, email, password)
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const [recsVersion, setRecsVersion] = useState(0)
  const refreshRecommendations = useCallback(() => {
    setRecsVersion(v => v + 1)
  }, [])

  const [feedVersion, setFeedVersion] = useState(0)
  const refreshFeed = useCallback(() => {
    setFeedVersion(v => v + 1)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!user,
      recsVersion,
      refreshRecommendations,
      feedVersion,
      refreshFeed,
      refreshUser,
    }),
    [user, loading, login, register, logout, recsVersion, refreshRecommendations, feedVersion, refreshFeed, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
