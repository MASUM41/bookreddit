import { useState, useEffect } from 'react'
import { fetchRecommendations } from '../api'

/**
 * Fetches top-5 MF recommendations for a given user.
 *
 * The backend scores all books with ŝᵤ = P[u] @ Q.T and returns them
 * sorted by predicted_score descending, excluding already-rated books.
 *
 * @param {number|null} userId  DB primary key of the logged-in user
 * @returns {{ recommendations, loading, error, refetch }}
 */
export function useRecommendations(userId) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    fetchRecommendations(userId)
      .then((data) => setRecommendations(data.recommendations))
      .catch((err) => {
        const detail = err.response?.data?.detail
        setError(detail ?? err.message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [userId]) // re-fetch if the active user changes

  return { recommendations, loading, error, refetch: load }
}
