const COVER_COLORS = [
  '#e63946', '#457b9d', '#2a9d8f', '#e9c46a',
  '#f4a261', '#6a4c93', '#1982c4', '#8ac926',
]

function coverColor(bookId) {
  return COVER_COLORS[bookId % COVER_COLORS.length]
}

export default function RecommendationCard({ recommendation }) {
  const { book_id, title, author, genre, predicted_score } = recommendation

  return (
    <article
      className="flex-shrink-0 w-44 bg-white border border-gray-200 rounded overflow-hidden
                 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
      style={{ scrollSnapAlign: 'start' }}
    >
      {/* Synthetic book cover */}
      <div
        className="h-24 flex items-center justify-center"
        style={{ backgroundColor: coverColor(book_id) }}
        aria-hidden="true"
      >
        <span className="text-5xl font-black text-white/80 drop-shadow-sm leading-none">
          {title.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Card body */}
      <div className="p-2.5 flex flex-col gap-1">
        {genre && (
          <span className="self-start text-[10px] font-bold uppercase tracking-wide
                           text-orange-500 bg-orange-50 rounded px-1.5 py-0.5">
            {genre}
          </span>
        )}
        <h3 className="text-xs font-bold text-gray-900 leading-tight line-clamp-2" title={title}>
          {title}
        </h3>
        <p className="text-[11px] text-gray-500 truncate">{author}</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Match
          </span>
          <span className="text-sm font-extrabold text-green-500 tabular-nums">
            {predicted_score.toFixed(2)}
          </span>
        </div>
      </div>
    </article>
  )
}
