import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import BookCoverThumb from '../components/BookCoverThumb'

export default function BookListCard({ book }) {
  return (
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
  )
}
