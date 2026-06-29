import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Share2,
  MoreHorizontal,
  BookOpen,
} from 'lucide-react'
import { voteOnPost } from '../api'
import { useAuth } from '../context/AuthContext'
import { genreSlug, genreSubredditLabel } from '../utils/genreSlug'
import { DEFAULT_SUBREDDIT } from '../constants/brand'
import { timeAgo } from '../utils/timeAgo'
import { formatCount } from '../utils/formatCount'
import BookCoverThumb from './BookCoverThumb'
import PostMedia from './PostMedia'

export default function PostDetail({ post }) {
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

  return (
    <article className="bg-br-surface border border-reddit-border rounded-2xl overflow-hidden">
      {/* Meta row — Reddit post header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2 flex-wrap">
        <Link
          to={genreLink}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-br-text
                     hover:underline"
        >
          <span className="w-6 h-6 rounded-full bg-orange-500/15 flex items-center justify-center">
            <BookOpen size={14} className="text-reddit-orange" />
          </span>
          {genreLabel}
        </Link>
        <span className="text-br-text-muted text-xs">·</span>
        <span className="text-xs text-br-text-muted">
          Posted by{' '}
          <Link to={`/u/${username}`} className="font-semibold text-br-text hover:underline">
            u/{username}
          </Link>
          {' '}{timeAgo(created_at)} ago
        </span>
        <button
          type="button"
          className="ml-auto p-1.5 rounded-full text-br-text-muted hover:bg-reddit-muted"
          aria-label="More options"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="px-4 pb-4">
        <h1 className="text-2xl font-bold text-br-text leading-tight mb-2">{title}</h1>

        <Link
          to={`/books/${book_id}`}
          className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 border border-teal-100
                     rounded-full px-2.5 py-0.5 text-xs font-semibold mb-4 hover:bg-teal-100"
        >
          {book_title}
        </Link>

        {media_url ? (
          <PostMedia
            mediaUrl={media_url}
            mediaType={media_type}
            className="mb-4"
          />
        ) : (
          <BookCoverThumb
            bookId={book_id}
            title={book_title}
            author={book_author}
            genre={book_genre}
            size="hero"
            linkTo={`/books/${book_id}`}
            className="rounded-2xl mb-4 shadow-lg"
          />
        )}

        {content?.trim() && (
          <p className="text-[15px] text-br-text leading-relaxed whitespace-pre-wrap mb-4">
            {content}
          </p>
        )}

        <div className="flex items-center gap-1 border border-reddit-border rounded-full w-fit px-1 py-0.5">
          <button
            type="button"
            onClick={() => handleVote('up')}
            disabled={voting}
            className={`p-1.5 rounded-full transition-colors hover:bg-orange-500/10 disabled:opacity-50
              ${userVote === 1 ? 'text-reddit-orange' : 'text-br-text-muted hover:text-reddit-orange'}`}
            aria-label="Upvote"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
          <span
            className={`text-xs font-bold tabular-nums min-w-[2rem] text-center
              ${userVote === 1 ? 'text-reddit-orange' : userVote === -1 ? 'text-blue-500' : 'text-br-text'}`}
          >
            {formatCount(score)}
          </span>
          <button
            type="button"
            onClick={() => handleVote('down')}
            disabled={voting}
            className={`p-1.5 rounded-full transition-colors hover:bg-blue-500/10 disabled:opacity-50
              ${userVote === -1 ? 'text-blue-500' : 'text-br-text-muted hover:text-blue-500'}`}
            aria-label="Downvote"
          >
            <ArrowDown size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex items-center gap-1 mt-3 -ml-1">
          <span className="flex items-center gap-1.5 text-xs font-bold text-br-text-muted px-2 py-1.5">
            <MessageSquare size={16} />
            {commentCount === 1 ? '1 Comment' : `${formatCount(commentCount)} Comments`}
          </span>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-bold text-br-text-muted
                       hover:bg-reddit-muted rounded-full px-2 py-1.5 transition-colors"
          >
            <Share2 size={16} />
            Share
          </button>
          <Link
            to={`/books/${book_id}`}
            className="flex items-center gap-1.5 text-xs font-bold text-br-text-muted
                       hover:bg-reddit-muted rounded-full px-2 py-1.5 transition-colors ml-1"
          >
            <BookOpen size={16} />
            {book_author}
          </Link>
        </div>
      </div>
    </article>
  )
}
