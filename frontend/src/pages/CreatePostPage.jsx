import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { createPost, fetchBook } from '../api'
import { useAuth } from '../context/AuthContext'
import BookSearchInput from '../components/BookSearchInput'
import PostMediaUploader from '../components/PostMediaUploader'
import PageLayout from '../components/layout/PageLayout'

function getErrorMessage(err) {
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map(d => d.msg).join(', ')
  return err.message || 'Something went wrong'
}

export default function CreatePostPage() {
  const { user, refreshFeed } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedBookId = searchParams.get('bookId')

  const [selectedBook, setSelectedBook] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [media, setMedia] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingBook, setLoadingBook] = useState(!!preselectedBookId)

  useEffect(() => {
    if (!preselectedBookId) return
    setLoadingBook(true)
    fetchBook(preselectedBookId)
      .then(setSelectedBook)
      .catch(() => setError('Could not load the selected book'))
      .finally(() => setLoadingBook(false))
  }, [preselectedBookId])

  if (!user) {
    return (
      <div className="min-h-screen bg-reddit-bg flex items-center justify-center px-4">
        <div className="bg-br-surface border border-reddit-border rounded-2xl p-8 text-center max-w-md">
          <p className="text-br-text-secondary mb-4">Log in to start a discussion.</p>
          <Link to="/login" className="text-reddit-orange font-bold hover:underline">
            Go to Log In
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedBook) {
      setError('Please search and select a book')
      return
    }
    if (!content.trim() && !media?.media_url) {
      setError('Add some text or attach a photo/video')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await createPost({
        book_id: selectedBook.id,
        title: title.trim(),
        content: content.trim(),
        media_url: media?.media_url ?? null,
        media_type: media?.media_type ?? null,
      })
      refreshFeed()
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-br-text-muted hover:text-br-text mb-4 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to feed
      </Link>

      <div className="bg-br-surface border border-reddit-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-reddit-border">
          <h1 className="text-lg font-bold text-br-text">Create a post</h1>
          <p className="text-xs text-br-text-muted mt-0.5">
            Posting as u/{user.username} · text, photos, or video
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-br-text-secondary mb-1.5">
              Book
            </label>
            {loadingBook ? (
              <div className="flex items-center gap-2 text-sm text-br-text-muted">
                <div className="spinner w-4 h-4 border-2" />
                Loading book…
              </div>
            ) : (
              <BookSearchInput
                mode="select"
                selectedBook={selectedBook}
                onSelect={setSelectedBook}
                placeholder="Search books by title, author, or genre…"
                limit={12}
                autoFocus={!preselectedBookId}
              />
            )}
            {selectedBook?.genre && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-br-text-muted">
                <BookOpen size={12} className="text-reddit-orange" />
                <span className="text-reddit-orange font-semibold">{selectedBook.genre}</span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-br-text-secondary mb-1.5">
              Title
            </label>
            <input
              id="title"
              type="text"
              required
              maxLength={255}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="An interesting title for your post"
              className="w-full border border-reddit-border rounded-xl px-3 py-2 text-sm bg-br-surface text-br-text
                         focus:outline-none focus:border-reddit-orange"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-br-text-secondary mb-1.5">
              Photo or video
            </label>
            <PostMediaUploader value={media} onChange={setMedia} disabled={submitting} />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-semibold text-br-text-secondary mb-1.5">
              Body <span className="font-normal text-br-text-muted">(optional if you added media)</span>
            </label>
            <textarea
              id="content"
              rows={6}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Share your thoughts about this book…"
              className="w-full border border-reddit-border rounded-xl px-3 py-2 text-sm resize-y bg-br-surface text-br-text
                         focus:outline-none focus:border-reddit-orange"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting || loadingBook || !selectedBook}
              className="bg-reddit-orange text-white rounded-full px-6 py-2 text-sm font-bold
                         hover:bg-orange-600 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Posting…' : 'Post'}
            </button>
            <Link
              to="/"
              className="text-sm text-br-text-muted hover:text-br-text transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </PageLayout>
  )
}
