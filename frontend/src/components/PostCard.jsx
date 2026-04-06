function timeAgo(isoString) {
  const seconds = Math.floor((Date.now() - new Date(isoString)) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/**
 * Single card in the discussion feed.
 *
 * @param {{ post: PostFeedItem }} props
 */
export default function PostCard({ post }) {
  const { username, book_title, book_author, title, content, created_at } = post

  const preview = content.length > 200 ? content.slice(0, 200).trimEnd() + '…' : content

  return (
    <article className="post-card">
      <div className="post-card__main">
        <div className="post-card__meta">
          <span className="post-card__author">u/{username}</span>
          <span className="post-card__sep">·</span>
          <span className="post-card__time">{timeAgo(created_at)}</span>
        </div>

        <h3 className="post-card__title">{title}</h3>
        <p className="post-card__preview">{preview}</p>
      </div>

      <div className="post-card__book-tag">
        <span className="post-card__book-icon">📖</span>
        <span className="post-card__book-title">{book_title}</span>
        <span className="post-card__book-author">by {book_author}</span>
      </div>
    </article>
  )
}
