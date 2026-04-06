// Deterministic color based on book_id so each card has a consistent cover color
const COVER_COLORS = [
  '#e63946', '#457b9d', '#2a9d8f', '#e9c46a',
  '#f4a261', '#6a4c93', '#1982c4', '#8ac926',
]

function coverColor(bookId) {
  return COVER_COLORS[bookId % COVER_COLORS.length]
}

/**
 * @param {{ book_id, title, author, genre, predicted_score }} recommendation
 */
export default function RecommendationCard({ recommendation }) {
  const { book_id, title, author, genre, predicted_score } = recommendation

  return (
    <article className="rec-card">
      {/* Synthetic book cover */}
      <div
        className="rec-card__cover"
        style={{ backgroundColor: coverColor(book_id) }}
        aria-hidden="true"
      >
        <span className="rec-card__cover-initial">
          {title.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="rec-card__body">
        {genre && <span className="rec-card__genre">{genre}</span>}
        <h3 className="rec-card__title" title={title}>{title}</h3>
        <p className="rec-card__author">{author}</p>

        <div className="rec-card__score">
          <span className="rec-card__score-label">Match</span>
          <span className="rec-card__score-value">{predicted_score.toFixed(2)}</span>
        </div>
      </div>
    </article>
  )
}
