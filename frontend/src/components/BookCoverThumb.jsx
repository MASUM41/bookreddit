import { Link } from 'react-router-dom'
import GeneratedBookCover from './GeneratedBookCover'

/**
 * Standard book cover for the whole app — generated from title, author, genre.
 */
export default function BookCoverThumb({
  bookId,
  title,
  author = '',
  genre = null,
  size = 'md',
  linkTo = null,
  className = '',
}) {
  const cover = (
    <GeneratedBookCover
      bookId={bookId}
      title={title}
      author={author}
      genre={genre}
      size={size}
      className={className}
    />
  )

  if (linkTo) {
    return (
      <Link to={linkTo} className="block shrink-0 hover:opacity-90 transition-opacity">
        {cover}
      </Link>
    )
  }

  return cover
}
