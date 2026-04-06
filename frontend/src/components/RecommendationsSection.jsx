import { useRecommendations } from '../hooks/useRecommendations'
import RecommendationCard from './RecommendationCard'

/**
 * "Recommended for You" section.
 *
 * Calls GET /recommendations/{userId}, which scores all books with
 * ŝᵤ = P[u] @ Q.T from the trained Matrix Factorization model and
 * returns the top-5 unseen books.
 *
 * @param {{ userId: number }} props
 */
export default function RecommendationsSection({ userId }) {
  const { recommendations, loading, error } = useRecommendations(userId)

  return (
    <section className="rec-section" id="recommendations">
      <div className="rec-section__header">
        <h2 className="rec-section__title">Recommended for You</h2>
        <p className="rec-section__subtitle">
          Personalised picks from your rating history · Matrix Factorization
        </p>
      </div>

      {loading && (
        <div className="rec-section__state">
          <div className="spinner" />
          <span>Loading recommendations…</span>
        </div>
      )}

      {error && !loading && (
        <div className="rec-section__state rec-section__state--error">
          <span className="rec-section__error-icon">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <div className="rec-section__state rec-section__state--empty">
          <p>No recommendations yet.</p>
          <p className="rec-section__hint">
            Rate some books, then call <code>POST /recommendations/train</code> to
            fit the model.
          </p>
        </div>
      )}

      {!loading && !error && recommendations.length > 0 && (
        <div className="rec-section__rail">
          {recommendations.map((rec) => (
            <RecommendationCard key={rec.book_id} recommendation={rec} />
          ))}
        </div>
      )}
    </section>
  )
}
