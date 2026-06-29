import { useState, useEffect, useCallback } from 'react'
import { fetchFeed } from '../api'

const PAGE_SIZE = 20

/**
 * Fetches the global discussion feed with sort mode and pagination.
 *
 * @param {string} sort  'new' | 'hot' | 'top'
 * @returns {{ posts, loading, error, hasMore, loadMore }}
 */
export function useFeed(feedVersion = 0, sort = 'hot') {
  const [posts, setPosts] = useState([])
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback((currentSkip, sortMode) => {
    setLoading(true)
    setError(null)
    fetchFeed(currentSkip, PAGE_SIZE, sortMode)
      .then((newPosts) => {
        setPosts((prev) => (currentSkip === 0 ? newPosts : [...prev, ...newPosts]))
        setHasMore(newPosts.length === PAGE_SIZE)
      })
      .catch((err) => setError(err.response?.data?.detail ?? err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setSkip(0)
    load(0, sort)
  }, [load, feedVersion, sort])

  const loadMore = () => {
    const next = skip + PAGE_SIZE
    setSkip(next)
    load(next, sort)
  }

  return { posts, loading, error, hasMore, loadMore }
}
