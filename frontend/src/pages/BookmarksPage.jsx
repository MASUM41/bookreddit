import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bookmark } from 'lucide-react'
import { fetchMyBookmarks } from '../api'
import { useAuth } from '../context/AuthContext'
import BookListCard from '../components/BookListCard'
import Sidebar from '../components/Sidebar'

export default function BookmarksPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login')
      return
    }
    setLoading(true)
    fetchMyBookmarks()
      .then(setBooks)
      .catch(err => setError(err.response?.data?.detail ?? err.message))
      .finally(() => setLoading(false))
  }, [user, authLoading, navigate])

  return (
    <div className="min-h-screen bg-reddit-muted">
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-16 flex gap-5">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="flex-1 min-w-0 pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-br-text-muted hover:text-br-text mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>

          <div className="bg-br-surface border border-reddit-border rounded-lg px-4 py-4 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Bookmark size={20} className="text-orange-500 fill-orange-500" />
              <h1 className="text-lg font-bold text-br-text">Saved Books</h1>
            </div>
            <p className="text-sm text-br-text-muted">Your reading list — books you bookmarked</p>
          </div>

          {loading && (
            <div className="flex items-center gap-3 bg-br-surface border border-reddit-border rounded px-4 py-6">
              <div className="spinner" />
              <span className="text-sm text-br-text-muted">Loading saved books…</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && books.length === 0 && (
            <div className="bg-br-surface border border-reddit-border rounded px-4 py-10 text-center">
              <p className="text-sm text-br-text-secondary mb-2">No saved books yet.</p>
              <Link to="/search" className="text-orange-500 font-semibold hover:underline text-sm">
                Search the catalog
              </Link>
            </div>
          )}

          {!loading && books.length > 0 && (
            <ul className="flex flex-col gap-2">
              {books.map(book => (
                <li key={book.id}>
                  <BookListCard book={book} />
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  )
}
