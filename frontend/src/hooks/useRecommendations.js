import { useState, useEffect } from 'react'
import { fetchRecommendations } from '../api'

/**
 * Fetches top-5 hybrid recommendations for a given user.
 */
export function useRecommendations(userId, recsVersion = 0) {
  const [recommendations, setRecommendations] = useState([])
  const [coldStart, setColdStart] = useState(false)
  const [strategy, setStrategy] = useState('content')
  const [mfWeight, setMfWeight] = useState(0)
  const [contentWeight, setContentWeight] = useState(1)
  const [nRatings, setNRatings] = useState(0)
  const [nBookmarks, setNBookmarks] = useState(0)
  const [blendMethod, setBlendMethod] = useState('heuristic')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    fetchRecommendations(userId)
      .then((data) => {
        setRecommendations(data.recommendations)
        setColdStart(data.cold_start ?? false)
        setStrategy(data.strategy ?? 'content')
        setMfWeight(data.mf_weight ?? 0)
        setContentWeight(data.content_weight ?? 1)
        setNRatings(data.n_ratings ?? 0)
        setNBookmarks(data.n_bookmarks ?? 0)
        setBlendMethod(data.blend_method ?? 'heuristic')
      })
      .catch((err) => {
        const detail = err.response?.data?.detail
        setError(detail ?? err.message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [userId, recsVersion])

  return {
    recommendations,
    coldStart,
    strategy,
    mfWeight,
    contentWeight,
    nRatings,
    nBookmarks,
    blendMethod,
    loading,
    error,
    refetch: load,
  }
}
