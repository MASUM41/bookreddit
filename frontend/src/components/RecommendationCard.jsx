import { Link } from 'react-router-dom'
import BookCoverThumb from './BookCoverThumb'

export default function RecommendationCard({ recommendation, scoreLabel = 'Match' }) {
  const { book_id, title, author, genre, predicted_score, reason } = recommendation

  return (
    <Link
      to={`/books/${book_id}`}
      className="flex-shrink-0 w-44 bg-br-surface border border-reddit-border rounded-lg overflow-hidden
                 hover:shadow-md hover:-translate-y-0.5 transition-all"
      style={{ scrollSnapAlign: 'start' }}
      title={reason || undefined}
    >
      <BookCoverThumb
        bookId={book_id}
        title={title}
        author={author}
        genre={genre}
        size="rec"
        className="rounded-none w-full border-0 shadow-none"
      />

      <div className="p-2.5 flex flex-col gap-1">
        {genre && (
          <span className="self-start text-[10px] font-bold uppercase tracking-wide
                           text-orange-500 bg-orange-500/10 rounded px-1.5 py-0.5">
            {genre}
          </span>
        )}
        <h3 className="text-xs font-bold text-br-text leading-tight line-clamp-2" title={title}>
          {title}
        </h3>
        <p className="text-[11px] text-br-text-muted truncate">{author}</p>
        {reason && (
          <p className="text-[10px] text-orange-600 font-medium leading-tight line-clamp-2 mt-0.5">
            {reason}
          </p>
        )}
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-br-text-muted">
            {scoreLabel}
          </span>
          <span className="text-sm font-extrabold text-green-500 tabular-nums">
            {predicted_score.toFixed(2)}
          </span>
        </div>
      </div>
    </Link>
  )
}
