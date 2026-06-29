import { useEffect, useState } from 'react'
import { fetchCollaborativeSimilarBooks, fetchSimilarBooks } from '../api'
import RecommendationCard from './RecommendationCard'

function SimilarRail({ title, subtitle, books, scoreLabel }) {
  if (!books.length) return null
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="text-xs font-bold text-br-text mb-0.5">{title}</h3>
      <p className="text-[11px] text-br-text-muted mb-2">{subtitle}</p>
      <div className="rec-rail">
        {books.map(book => (
          <RecommendationCard
            key={`${scoreLabel}-${book.book_id}`}
            recommendation={book}
            scoreLabel={scoreLabel}
          />
        ))}
      </div>
    </div>
  )
}

export default function SimilarBooksSection({ bookId }) {
  const [contentBooks, setContentBooks] = useState([])
  const [cfBooks, setCfBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchSimilarBooks(bookId, 6).catch(() => []),
      fetchCollaborativeSimilarBooks(bookId, 6).catch(() => []),
    ])
      .then(([content, cf]) => {
        setContentBooks(content)
        setCfBooks(cf)
      })
      .finally(() => setLoading(false))
  }, [bookId])

  if (loading) {
    return (
      <section className="bg-br-surface border border-reddit-border rounded-lg overflow-hidden mb-4 px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="spinner" />
          <span className="text-sm text-br-text-muted">Finding similar books…</span>
        </div>
      </section>
    )
  }

  if (contentBooks.length === 0 && cfBooks.length === 0) {
    return null
  }

  return (
    <section className="bg-br-surface border border-reddit-border rounded-lg overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-reddit-border">
        <h2 className="text-sm font-bold text-br-text">Readers also liked</h2>
        <p className="text-xs text-br-text-muted mt-0.5">Description match + community patterns</p>
      </div>
      <div className="px-4 py-3">
        <SimilarRail
          title="Similar descriptions"
          subtitle="TF-IDF + SVD on title, author, genre & summary"
          books={contentBooks}
          scoreLabel="Similar"
        />
        <SimilarRail
          title="Similar readers"
          subtitle="Matrix factorization · Q[i] · Q[j] latent similarity"
          books={cfBooks}
          scoreLabel="CF"
        />
      </div>
    </section>
  )
}
