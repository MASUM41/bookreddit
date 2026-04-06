import axios from 'axios'

// In dev the Vite proxy rewrites /api → http://localhost:8000
// In production set VITE_API_BASE_URL to the deployed backend origin
const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}`
  : '/api'

const client = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

export default client
