import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dna, Sparkles } from 'lucide-react'
import { fetchReaderTaste } from '../api'
import { genreSlug } from '../utils/genreSlug'
import { APP_NAME } from '../constants/brand'

function GenreBar({ genre, pct }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 truncate text-br-text-secondary shrink-0" title={genre}>
        {genre}
      </span>
      <div className="flex-1 h-2 bg-reddit-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="w-8 text-right text-br-text-muted tabular-nums shrink-0">{pct}%</span>
    </div>
  )
}

export default function TasteDNASection({ userId }) {
  const [taste, setTaste] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    fetchReaderTaste()
      .then(setTaste)
      .catch(err => setError(err.response?.data?.detail ?? err.message))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return (
      <section className="bg-br-surface border border-reddit-border rounded-2xl mb-3 px-4 py-5 animate-pulse">
        <div className="h-4 bg-reddit-border rounded w-40 mb-3" />
        <div className="h-3 bg-reddit-muted rounded w-full mb-2" />
        <div className="h-3 bg-reddit-muted rounded w-3/4" />
      </section>
    )
  }

  if (error || !taste) return null

  const hasSignal = taste.n_ratings > 0 || taste.n_bookmarks > 0
  const explorePct = Math.round((taste.exploration_score ?? 0) * 100)

  return (
    <section className="bg-br-surface border border-orange-500/25 rounded-2xl mb-3 overflow-hidden
                          bg-gradient-to-br from-orange-500/15 via-br-surface to-amber-500/10">
      <div className="px-4 py-3 border-b border-reddit-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dna size={18} className="text-reddit-orange" />
          <h2 className="text-sm font-bold text-br-text">Your Reading DNA</h2>
        </div>
        <Link
          to="/read-next"
          className="text-xs font-bold text-reddit-orange hover:underline flex items-center gap-1"
        >
          <Sparkles size={14} />
          Read Next →
        </Link>
      </div>

      <div className="px-4 py-4">
        <p className="text-base font-bold text-br-text">{taste.archetype}</p>
        <p className="text-xs text-br-text-muted mt-1 leading-relaxed">{taste.tagline}</p>

        {hasSignal && taste.genres?.length > 0 && (
          <div className="mt-4 space-y-2">
            {taste.genres.slice(0, 5).map(g => (
              <Link
                key={g.genre}
                to={`/genre/${genreSlug(g.genre)}`}
                className="block hover:opacity-80 transition-opacity"
              >
                <GenreBar genre={g.genre} pct={g.pct} />
              </Link>
            ))}
          </div>
        )}

        {!hasSignal && (
          <p className="text-xs text-amber-600 dark:text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2 mt-3">
            Rate or bookmark books to map your taste — {APP_NAME} learns from every star and save.
          </p>
        )}

        <div className="flex flex-wrap gap-3 mt-4 text-[11px] text-br-text-muted">
          {explorePct > 0 && (
            <span className="bg-br-surface border border-reddit-border rounded-full px-2.5 py-1">
              Exploration {explorePct}%
            </span>
          )}
          {taste.top_authors?.slice(0, 2).map(a => (
            <span key={a} className="bg-br-surface border border-reddit-border rounded-full px-2.5 py-1 truncate max-w-[140px]">
              {a}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
