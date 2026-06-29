import { useEffect, useState } from 'react'
import { searchBooks } from '../api'

/**
 * Debounced book search against GET /books/search.
 * Only fires when query length >= minLength.
 */
export function useBookSearch(query, { debounceMs = 300, minLength = 2, limit = 20 } = {}) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < minLength) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const timer = setTimeout(() => {
      searchBooks(trimmed, limit)
        .then(data => {
          if (!cancelled) setResults(data)
        })
        .catch(err => {
          if (!cancelled) {
            setError(err.response?.data?.detail ?? err.message)
            setResults([])
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, debounceMs)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, debounceMs, minLength, limit])

  return { results, loading, error }
}
