import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBookPosts, fetchFeed } from '../api'
import { genreSubredditLabel } from '../utils/genreSlug'
import { DEFAULT_SUBREDDIT } from '../constants/brand'
import { formatCount } from '../utils/formatCount'
import { timeAgo } from '../utils/timeAgo'
import BookCoverThumb from './BookCoverThumb'

function RelatedPostRow({ post, currentPostId }) {
  if (post.id === currentPostId) return null

  const sub = post.book_genre
    ? genreSubredditLabel(post.book_genre)
    : DEFAULT_SUBREDDIT

  return (
    <Link
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
        <p className="text-sm font-medium text-br-text leading-snug line-clamp-3
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
        className="rounded-md"
      />
    </Link>
  )
}

export default function RelatedPostsPanel({ postId, bookId }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      fetchBookPosts(bookId).catch(() => []),
      fetchFeed(0, 12, 'hot').catch(() => []),
    ])
      .then(([bookPosts, hotPosts]) => {
        if (cancelled) return
        const seen = new Set()
        const merged = []
        for (const p of [...bookPosts, ...hotPosts]) {
          if (p.id === postId || seen.has(p.id)) continue
          seen.add(p.id)
          merged.push(p)
          if (merged.length >= 6) break
        }
        setPosts(merged)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [postId, bookId])

  return (
    <div className="bg-br-surface border border-reddit-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-reddit-border">
        <h2 className="text-sm font-bold text-br-text">Related posts</h2>
      </div>

      <div className="px-4 py-1">
        {loading && (
          <p className="text-xs text-br-text-muted py-4">Loading…</p>
        )}

        {!loading && posts.length === 0 && (
          <p className="text-xs text-br-text-muted py-4">No related discussions yet.</p>
        )}

        {posts.map(post => (
          <RelatedPostRow key={post.id} post={post} currentPostId={postId} />
        ))}
      </div>
    </div>
  )
}
