import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchFeed } from '../api'
import { genreSubredditLabel } from '../utils/genreSlug'
import { DEFAULT_SUBREDDIT } from '../constants/brand'
import { formatCount } from '../utils/formatCount'
import { timeAgo } from '../utils/timeAgo'
import BookCoverThumb from './BookCoverThumb'

export default function TrendingPanel({ sort = 'hot', title = 'Popular today' }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeed(0, 8, sort)
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [sort])

  return (
    <div className="bg-br-surface border border-reddit-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-reddit-border flex items-center justify-between">
        <h2 className="text-sm font-bold text-br-text">{title}</h2>
        <Link to="/popular" className="text-xs font-bold text-reddit-orange hover:underline">
          See all
        </Link>
      </div>

      <div className="px-4 py-1">
        {loading && <p className="text-xs text-br-text-muted py-4">Loading…</p>}

        {posts.map(post => {
          const sub = post.book_genre
            ? genreSubredditLabel(post.book_genre)
            : DEFAULT_SUBREDDIT

          return (
            <Link
              key={post.id}
              to={`/posts/${post.id}`}
              className="flex gap-3 py-3 border-b border-reddit-border last:border-0
                         hover:bg-reddit-muted -mx-3 px-3 rounded-lg transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-br-text-muted mb-0.5 truncate">
                  <span className="font-semibold text-br-text-secondary">{sub}</span>
                  <span> · </span>
                  <span>{timeAgo(post.created_at)} ago</span>
                </p>
                <p className="text-sm font-medium text-br-text leading-snug line-clamp-2
                                group-hover:text-reddit-orange">
                  {post.title}
                </p>
                <p className="text-[11px] text-br-text-muted mt-1">
                  {formatCount(post.score)} upvotes · {formatCount(post.comment_count)} comments
                </p>
              </div>
              <BookCoverThumb
                bookId={post.book_id}
                title={post.book_title}
                author={post.book_author}
                genre={post.book_genre}
                size="sm"
              />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
