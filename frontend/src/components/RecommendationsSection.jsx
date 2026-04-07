import { useRecommendations } from '../hooks/useRecommendations'
import RecommendationCard from './RecommendationCard'

/**
 * "Recommended for You" section.
 *
 * Calls GET /recommendations/{userId}, which scores all books with
 * ŝᵤ = P[u] @ Q.T from the trained Matrix Factorization model and
 * returns the top-5 unseen books.
 */
export default function RecommendationsSection({ userId }) {
  const { recommendations, loading, error } = useRecommendations(userId)

  return (
    <section className="bg-white border border-gray-200 rounded mb-3 overflow-hidden">
      {/* Section header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900">Recommended for You</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Personalised picks · Matrix Factorization (ŝᵤ = P[u] @ Q.T)
        </p>
      </div>

      <div className="px-4 py-3">
        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 py-2">
            <div className="spinner" />
            <span className="text-sm text-gray-500">Loading recommendations…</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && recommendations.length === 0 && (
          <div className="text-sm text-gray-500 py-1">
            <p>No recommendations yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Rate some books, then call{' '}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">
                POST /recommendations/train
              </code>{' '}
              to fit the model.
            </p>
          </div>
        )}

        {/* Recommendation rail */}
        {!loading && !error && recommendations.length > 0 && (
          <div className="rec-rail">
            {recommendations.map(rec => (
              <RecommendationCard key={rec.book_id} recommendation={rec} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
