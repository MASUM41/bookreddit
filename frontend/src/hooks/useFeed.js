import { useState, useEffect, useCallback } from 'react'
import { fetchFeed } from '../api'

const PAGE_SIZE = 20

/**
 * Fetches the global discussion feed with simple pagination.
 *
 * @returns {{ posts, loading, error, hasMore, loadMore }}
 */
export function useFeed() {
  const [posts, setPosts] = useState([])
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback((currentSkip) => {
    setLoading(true)
    fetchFeed(currentSkip, PAGE_SIZE)
      .then((newPosts) => {
        setPosts((prev) => (currentSkip === 0 ? newPosts : [...prev, ...newPosts]))
        setHasMore(newPosts.length === PAGE_SIZE)
      })
      .catch((err) => setError(err.response?.data?.detail ?? err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(0)
  }, [load])

  const loadMore = () => {
    const next = skip + PAGE_SIZE
    setSkip(next)
    load(next)
  }

  return { posts, loading, error, hasMore, loadMore }
}
