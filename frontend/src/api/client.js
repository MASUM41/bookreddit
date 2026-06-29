import axios from 'axios'

const TOKEN_KEY = 'bookreddit_token'

// Dev: Vite proxies /api → backend. Prod same-host: no prefix. Split deploy: set VITE_API_BASE_URL.
const configured = import.meta.env.VITE_API_BASE_URL?.trim()
const baseURL = configured
  ? configured.replace(/\/$/, '')
  : import.meta.env.DEV
    ? '/api'
    : ''

const client = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default client
