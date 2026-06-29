import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { fetchBooks, fetchGenres } from '../api'
import BookListCard from '../components/BookListCard'
import Sidebar from '../components/Sidebar'
import PageLayout from '../components/layout/PageLayout'
import { genreSubredditLabel } from '../utils/genreSlug'

const PAGE_SIZE = 24

export default function GenrePage() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [genreName, setGenreName] = useState(null)
  const [books, setBooks] = useState([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const resolveGenre = useCallback(async () => {
    const genres = await fetchGenres(200)
    const match = genres.find(g => g.slug === slug)
    if (!match) {
      throw new Error('Genre not found')
    }
    return match
  }, [slug])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setBooks([])
    setSkip(0)

    resolveGenre()
      .then(async (match) => {
        if (cancelled) return
        setGenreName(match.genre)
        setTotal(match.count)
        const page = await fetchBooks({ genre: match.genre, skip: 0, limit: PAGE_SIZE })
        if (cancelled) return
        setBooks(page)
        setHasMore(page.length === PAGE_SIZE && page.length < match.count)
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Failed to load genre')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [resolveGenre])

  async function loadMore() {
    if (!genreName || loadingMore) return
    const nextSkip = skip + PAGE_SIZE
    setLoadingMore(true)
    try {
      const page = await fetchBooks({ genre: genreName, skip: nextSkip, limit: PAGE_SIZE })
      setBooks(prev => [...prev, ...page])
      setSkip(nextSkip)
      setHasMore(page.length === PAGE_SIZE && nextSkip + page.length < total)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <PageLayout left={<Sidebar />}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center justify-center w-9 h-9 rounded-full
                   bg-br-surface border border-reddit-border text-br-text-secondary
                   hover:bg-reddit-muted mb-4 transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft size={18} />
      </button>

        {loading && (
          <div className="flex items-center gap-3 bg-br-surface border border-reddit-border rounded-2xl px-4 py-6">
            <div className="spinner" />
            <span className="text-sm text-br-text-muted">Loading genre…</span>
          </div>
        )}

        {error && !loading && (
          <div className="bg-br-surface border border-reddit-border rounded-2xl px-4 py-8 text-center">
            <p className="text-red-600 mb-3">{error}</p>
            <Link to="/" className="text-reddit-orange font-bold hover:underline">
              Go home
            </Link>
          </div>
        )}

        {!loading && !error && genreName && (
          <>
            <div className="bg-br-surface border border-reddit-border rounded-2xl px-4 py-4 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={20} className="text-reddit-orange" />
                <h1 className="text-lg font-bold text-br-text">
                  {genreSubredditLabel(genreName)}
                </h1>
              </div>
              <p className="text-sm text-br-text-secondary">{genreName}</p>
              <p className="text-xs text-br-text-muted mt-1">
                {total.toLocaleString()} book{total !== 1 ? 's' : ''} in this genre
              </p>
            </div>

            {books.length === 0 ? (
              <div className="bg-br-surface border border-reddit-border rounded-2xl px-4 py-8 text-center text-sm text-br-text-muted">
                No books in this genre yet.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {books.map(book => (
                  <li key={book.id}>
                    <BookListCard book={book} />
                  </li>
                ))}
              </ul>
            )}

            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="border border-reddit-border text-br-text-secondary rounded-full px-6 py-1.5 text-sm
                             font-semibold hover:bg-reddit-muted disabled:opacity-60 transition-colors"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}

    </PageLayout>
  )
}
