import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { searchBooks } from '../api'
import BookCoverThumb from '../components/BookCoverThumb'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    searchBooks(q.trim(), 50)
      .then(setResults)
      .finally(() => setLoading(false))
  }, [q])

  return (
    <div className="min-h-screen bg-reddit-muted">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-16">
        <h1 className="text-lg font-bold text-br-text mb-1">Search results</h1>
        <p className="text-sm text-br-text-muted mb-6">
          {q ? (
            <>Showing matches for <span className="font-semibold text-br-text-secondary">&ldquo;{q}&rdquo;</span></>
          ) : (
            'Enter a search term in the navbar.'
          )}
        </p>

        {loading && (
          <div className="flex items-center gap-3 bg-br-surface border border-reddit-border rounded px-4 py-6">
            <div className="spinner" />
            <span className="text-sm text-br-text-muted">Searching…</span>
          </div>
        )}

        {!loading && q && results.length === 0 && (
          <div className="bg-br-surface border border-reddit-border rounded px-4 py-8 text-center text-sm text-br-text-muted">
            No books found. Try a different title, author, or genre.
          </div>
        )}

        {!loading && results.length > 0 && (
          <ul className="flex flex-col gap-2">
            {results.map(book => (
              <li key={book.id}>
                <Link
                  to={`/books/${book.id}`}
                  className="flex gap-3 bg-br-surface border border-reddit-border rounded-lg p-3
                             hover:border-orange-300 hover:shadow-sm transition-all"
                >
                  <BookCoverThumb
                    bookId={book.id}
                    title={book.title}
                    author={book.author}
                    genre={book.genre}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-br-text line-clamp-2">{book.title}</p>
                    <p className="text-xs text-br-text-muted mt-0.5">{book.author}</p>
                    {book.genre && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold
                                       uppercase text-orange-500 bg-orange-500/10 rounded px-1.5 py-0.5">
                        <BookOpen size={10} />
                        {book.genre}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
