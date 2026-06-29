import { useRecommendations } from '../hooks/useRecommendations'
import { useAuth } from '../context/AuthContext'
import RecommendationCard from './RecommendationCard'

const STRATEGY_LABELS = {
  content: 'Description similarity · TF-IDF + SVD',
  hybrid: 'Hybrid · your taste + descriptions',
  mf: 'Collaborative · Matrix Factorization',
}

function BlendBar({ mfWeight, contentWeight }) {
  const mfPct = Math.round(mfWeight * 100)
  const contentPct = Math.round(contentWeight * 100)
  if (mfPct === 0) return null

  return (
    <div className="mb-3">
      <div className="flex justify-between text-[10px] text-br-text-muted mb-1">
        <span>{contentPct}% descriptions</span>
        <span>{mfPct}% community taste</span>
      </div>
      <div className="h-1.5 rounded-full bg-orange-500/15 overflow-hidden flex">
        <div className="bg-orange-300 h-full" style={{ width: `${contentPct}%` }} />
        <div className="bg-orange-600 h-full" style={{ width: `${mfPct}%` }} />
      </div>
    </div>
  )
}

export default function RecommendationsSection({ userId }) {
  const { recsVersion } = useAuth()
  const {
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
  } = useRecommendations(userId, recsVersion)

  const subtitle = STRATEGY_LABELS[strategy] ?? STRATEGY_LABELS.content
  const blendNote =
    blendMethod === 'learned' && nRatings >= 2
      ? ' · blend tuned to your ratings'
      : ''

  return (
    <section className="bg-br-surface border border-reddit-border rounded-2xl overflow-hidden mb-3">
      <div className="px-4 py-3 border-b border-reddit-border">
        <h2 className="text-sm font-bold text-br-text">Recommended for You</h2>
        <p className="text-xs text-br-text-muted mt-0.5">
          Personalised picks · {subtitle}{blendNote}
        </p>
      </div>

      <div className="px-4 py-3">
        {loading && (
          <div className="flex gap-3 py-2 overflow-hidden">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-44 shrink-0 rounded border border-reddit-border overflow-hidden animate-pulse">
                <div className="h-24 bg-reddit-border" />
                <div className="p-2.5 space-y-2">
                  <div className="h-2 bg-reddit-border rounded w-16" />
                  <div className="h-3 bg-reddit-border rounded w-full" />
                  <div className="h-2 bg-reddit-border rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded px-3 py-2 text-sm text-red-600 dark:text-red-400">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && recommendations.length > 0 && (
          <>
            <BlendBar mfWeight={mfWeight} contentWeight={contentWeight} />

            {coldStart && (
              <p className="text-xs text-amber-600 dark:text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded px-3 py-2 mb-3">
                Rate books with stars to add community taste ({nRatings}/3 so far).
                {nBookmarks > 0 && ' Your saved books are already shaping picks.'}
              </p>
            )}

            {!coldStart && nBookmarks > 0 && (
              <p className="text-xs text-br-text-muted mb-3">
                Using {nRatings} rating{nRatings !== 1 ? 's' : ''} and {nBookmarks} saved book{nBookmarks !== 1 ? 's' : ''}.
              </p>
            )}

            <div className="rec-rail">
              {recommendations.map(rec => (
                <RecommendationCard key={rec.book_id} recommendation={rec} />
              ))}
            </div>
          </>
        )}

        {!loading && !error && recommendations.length === 0 && (
          <div className="text-sm text-br-text-muted py-1">
            <p>No recommendations yet.</p>
            <p className="text-xs text-br-text-muted mt-1">Rate or save books to get personalised picks.</p>
          </div>
        )}
      </div>
    </section>
  )
}
