import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUp, ArrowDown, MessageSquare, Share2, BookOpen } from 'lucide-react'
import { voteOnPost } from '../api'
import { useAuth } from '../context/AuthContext'
import { genreSlug, genreSubredditLabel } from '../utils/genreSlug'
import { DEFAULT_SUBREDDIT } from '../constants/brand'
import { timeAgo } from '../utils/timeAgo'
import { formatCount } from '../utils/formatCount'
import BookCoverThumb from './BookCoverThumb'
import PostMedia from './PostMedia'

export default function PostCard({ post, fullContent = false }) {
  const {
    id,
    username,
    book_id,
    book_title,
    book_author,
    book_genre,
    title,
    content,
    created_at,
    score: initialScore = 0,
    user_vote: initialUserVote = null,
    comment_count: commentCount = 0,
    media_url,
    media_type,
  } = post

  const { user } = useAuth()
  const navigate = useNavigate()

  const [score, setScore] = useState(initialScore)
  const [userVote, setUserVote] = useState(initialUserVote)
  const [voting, setVoting] = useState(false)

  const genreLabel = book_genre ? genreSubredditLabel(book_genre) : DEFAULT_SUBREDDIT
  const genreLink = book_genre ? `/genre/${genreSlug(book_genre)}` : '/'

  function handleVote(direction) {
    if (!user) {
      navigate('/login')
      return
    }
    if (voting) return

    const isUp = direction === 'up'
    const newVote = userVote === (isUp ? 1 : -1) ? 0 : isUp ? 1 : -1
    const prevScore = score
    const prevUserVote = userVote

    let delta = 0
    if (newVote === 0) {
      delta = -(userVote ?? 0)
    } else if (userVote === 0 || userVote == null) {
      delta = newVote
    } else {
      delta = newVote - userVote
    }
    setScore(prevScore + delta)
    setUserVote(newVote === 0 ? null : newVote)
    setVoting(true)

    voteOnPost(id, newVote)
      .then(result => {
        setScore(result.score)
        setUserVote(result.user_vote)
      })
      .catch(() => {
        setScore(prevScore)
        setUserVote(prevUserVote)
      })
      .finally(() => setVoting(false))
  }

  const preview = content.length > 280 ? content.slice(0, 280).trimEnd() + '…' : content
  const body = fullContent ? content : preview
  const commentsLabel = commentCount === 1 ? '1 Comment' : `${formatCount(commentCount)} Comments`

  return (
    <article className="flex bg-br-surface border border-reddit-border rounded-xl sm:rounded-2xl overflow-hidden
                        hover:border-br-text-muted transition-colors">
      <div className="flex flex-col items-center bg-reddit-muted/60 px-1.5 sm:px-2 py-2.5 sm:py-3 gap-0.5 min-w-[40px] sm:min-w-[44px] select-none">
        <button
          onClick={e => { e.stopPropagation(); handleVote('up') }}
          disabled={voting}
          className={`p-1.5 sm:p-1 rounded-full transition-colors hover:bg-orange-500/10 disabled:opacity-50
            ${userVote === 1 ? 'text-reddit-orange' : 'text-br-text-muted hover:text-reddit-orange'}`}
          aria-label="Upvote"
        >
          <ArrowUp size={20} strokeWidth={2.5} />
        </button>

        <span
          className={`text-xs font-bold tabular-nums
            ${userVote === 1 ? 'text-reddit-orange' : userVote === -1 ? 'text-blue-500' : 'text-br-text'}`}
        >
          {formatCount(score)}
        </span>

        <button
          onClick={e => { e.stopPropagation(); handleVote('down') }}
          disabled={voting}
          className={`p-1.5 sm:p-1 rounded-full transition-colors hover:bg-blue-500/10 disabled:opacity-50
            ${userVote === -1 ? 'text-blue-500' : 'text-br-text-muted hover:text-blue-500'}`}
          aria-label="Downvote"
        >
          <ArrowDown size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 min-w-0 p-2.5 sm:p-3 sm:pr-4">
        <div className="flex items-center gap-1 text-xs text-br-text-muted mb-1.5 flex-wrap">
          <Link
            to={genreLink}
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1 font-bold text-br-text hover:underline"
          >
            <span className="w-5 h-5 rounded-full bg-orange-500/15 inline-flex items-center justify-center">
              <BookOpen size={11} className="text-reddit-orange" />
            </span>
            {genreLabel}
          </Link>
          <span>·</span>
          <span>
            u/
            <Link
              to={`/u/${username}`}
              className="font-semibold text-br-text-secondary hover:underline"
              onClick={e => e.stopPropagation()}
            >
              {username}
            </Link>
          </span>
          <span>·</span>
          <span>{timeAgo(created_at)} ago</span>
        </div>

        <Link to={`/posts/${id}`} className="block group">
          <h3 className="text-[15px] sm:text-base font-semibold text-br-text leading-snug mb-1.5 line-clamp-2
                          group-hover:text-reddit-orange">
            {title}
          </h3>
          {media_url ? (
            <div className="mb-2">
              <PostMedia mediaUrl={media_url} mediaType={media_type} compact className="rounded-xl" />
            </div>
          ) : (
            <p className="text-sm text-br-text-secondary leading-relaxed mb-2 line-clamp-3">
              {body}
            </p>
          )}
        </Link>

        {media_url && body.trim() && (
          <p className="text-sm text-br-text-secondary leading-relaxed mb-2 line-clamp-2">{body}</p>
        )}

        {!media_url && (
          <div className="flex gap-3 items-start mb-2">
            <BookCoverThumb
              bookId={book_id}
              title={book_title}
              author={book_author}
              genre={book_genre}
              size="sm"
              linkTo={`/books/${book_id}`}
            />
            <Link
              to={`/books/${book_id}`}
              onClick={e => e.stopPropagation()}
              className="inline-flex flex-col gap-0.5 text-xs text-br-text-secondary pt-0.5
                         hover:text-reddit-orange transition-colors min-w-0"
            >
              <span className="font-semibold text-br-text line-clamp-2">{book_title}</span>
              <span className="text-br-text-muted">by {book_author}</span>
            </Link>
          </div>
        )}

        {media_url && (
          <Link
            to={`/books/${book_id}`}
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-xs text-br-text-muted mb-2 hover:text-reddit-orange"
          >
            <BookOpen size={12} />
            <span className="font-semibold">{book_title}</span>
          </Link>
        )}

        <div className="flex items-center gap-0.5 sm:gap-1 -ml-1 flex-wrap">
          <Link
            to={`/posts/${id}`}
            className="flex items-center gap-1.5 text-xs font-bold text-br-text-muted
                       hover:bg-reddit-muted hover:text-reddit-orange rounded-full px-2.5 py-1.5 transition-colors"
          >
            <MessageSquare size={16} />
            {commentsLabel}
          </Link>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-bold text-br-text-muted
                       hover:bg-reddit-muted hover:text-br-text-secondary rounded-full px-2.5 py-1.5 transition-colors"
          >
            <Share2 size={16} />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>
    </article>
  )
}
