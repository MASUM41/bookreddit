import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { fetchBook, fetchBookPosts, fetchBookRating, submitBookRating } from '../api'
import { useAuth } from '../context/AuthContext'
import BookmarkButton from '../components/BookmarkButton'
import StarRating from '../components/StarRating'
import SimilarBooksSection from '../components/SimilarBooksSection'
import BookCoverThumb from '../components/BookCoverThumb'

function getErrorMessage(err) {
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  return err.message || 'Something went wrong'
}

export default function BookPage() {
  const { bookId } = useParams()
  const id = Number(bookId)
  const { user, refreshRecommendations } = useAuth()

  const [book, setBook] = useState(null)
  const [posts, setPosts] = useState([])
  const [rating, setRating] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError('Invalid book ID')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const requests = [
      fetchBook(id),
      fetchBookPosts(id),
      user ? fetchBookRating(id).catch(() => ({ value: null })) : Promise.resolve({ value: null }),
    ]

    Promise.all(requests)
      .then(([bookData, postsData, ratingData]) => {
        if (cancelled) return
        setBook(bookData)
        setPosts(postsData)
        setRating(ratingData.value ?? null)
      })
      .catch(err => {
        if (!cancelled) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [id, user])

  async function handleRate(stars) {
    if (!user) return
    setSaving(true)
    setSaveMessage(null)
    try {
      await submitBookRating(id, stars)
      setRating(stars)
      refreshRecommendations()
      setSaveMessage('Rating saved — recommendations update in a few seconds.')
    } catch (err) {
      setSaveMessage(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-reddit-muted flex items-center justify-center">
        <div className="flex items-center gap-3 bg-br-surface border border-reddit-border rounded px-6 py-4">
          <div className="spinner" />
          <span className="text-sm text-br-text-muted">Loading book…</span>
        </div>
      </div>
    )
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-reddit-muted flex items-center justify-center px-4">
        <div className="bg-br-surface border border-reddit-border rounded-lg p-8 text-center max-w-md">
          <p className="text-red-600 mb-4">{error || 'Book not found'}</p>
          <Link to="/" className="text-orange-500 font-semibold hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-reddit-muted">
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-16">

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-br-text-muted hover:text-br-text mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to feed
        </Link>

        <article className="bg-br-surface border border-reddit-border rounded-lg overflow-hidden mb-4">
          <div className="p-4 pb-0 flex justify-center bg-reddit-muted">
            <BookCoverThumb
              bookId={book.id}
              title={book.title}
              author={book.author}
              genre={book.genre}
              size="hero"
              className="shadow-lg"
            />
          </div>

          <div className="p-6">
            {book.genre && (
              <span className="inline-block text-xs font-bold uppercase tracking-wide
                               text-orange-500 bg-orange-500/10 rounded px-2 py-0.5 mb-2">
                {book.genre}
              </span>
            )}
            <h1 className="text-2xl font-bold text-br-text mb-1">{book.title}</h1>
            <p className="text-br-text-secondary mb-4">by {book.author}</p>

            <div className="mb-6">
              <BookmarkButton bookId={book.id} />
            </div>

            {book.description && (
              <p className="text-sm text-br-text-secondary leading-relaxed mb-6">{book.description}</p>
            )}

            <div className="border-t border-reddit-border pt-5">
              <h2 className="text-sm font-bold text-br-text mb-2">Your Rating</h2>
              {user ? (
                <>
                  <StarRating value={rating} onChange={handleRate} disabled={saving} />
                  {saving && (
                    <p className="text-xs text-br-text-muted mt-2 flex items-center gap-2">
                      <span className="spinner w-4 h-4 border-2" />
                      Saving…
                    </p>
                  )}
                  {saveMessage && !saving && (
                    <p className={`text-xs mt-2 ${saveMessage.includes('saved') ? 'text-green-600' : 'text-red-600'}`}>
                      {saveMessage}
                    </p>
                  )}
                  {!rating && !saving && !saveMessage && (
                    <p className="text-xs text-br-text-muted mt-2">
                      Rate this book to improve your recommendations.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-br-text-muted">
                  <Link to="/login" className="text-orange-500 font-semibold hover:underline">
                    Log in
                  </Link>
                  {' '}to rate this book and get personalised picks.
                </p>
              )}
            </div>
          </div>
        </article>

        <SimilarBooksSection bookId={book.id} />

        <section className="bg-br-surface border border-reddit-border rounded-lg overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-reddit-border flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-br-text">Discussions</h2>
              <p className="text-xs text-br-text-muted mt-0.5">
                {posts.length} post{posts.length !== 1 ? 's' : ''} about this book
              </p>
            </div>
            {user && (
              <Link
                to={`/create-post?bookId=${book.id}`}
                className="shrink-0 text-xs font-semibold text-orange-500 border border-orange-500
                           rounded-full px-3 py-1 hover:bg-orange-500/10 transition-colors"
              >
                Start discussion
              </Link>
            )}
          </div>

          {posts.length === 0 ? (
            <div className="px-4 py-6 text-sm text-br-text-muted text-center">
              <p>No discussions yet for this book.</p>
              {user && (
                <Link
                  to={`/create-post?bookId=${book.id}`}
                  className="inline-block mt-2 text-orange-500 font-semibold hover:underline"
                >
                  Be the first to post
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {posts.map(post => (
                <li key={post.id} className="px-4 py-3 hover:bg-reddit-muted">
                  <Link to={`/posts/${post.id}`} className="block">
                    <p className="text-xs text-br-text-muted mb-1">
                      u/{post.username} · {new Date(post.created_at).toLocaleDateString()}
                    </p>
                    <h3 className="text-sm font-semibold text-br-text mb-1 hover:text-orange-600">
                      {post.title}
                    </h3>
                    <p className="text-sm text-br-text-secondary line-clamp-2">{post.content}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </div>
  )
}
