import { useState } from 'react'
import { ArrowUp, ArrowDown, MessageSquare, Share2, BookOpen } from 'lucide-react'

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

// Deterministic synthetic vote count so every post has a plausible score
function baseVotes(postId) {
  return ((postId * 47 + 13) % 380) + 20
}

export default function PostCard({ post }) {
  const { id, username, book_title, book_author, title, content, created_at } = post

  const [votes, setVotes] = useState(baseVotes(id))
  const [voteState, setVoteState] = useState(null) // 'up' | 'down' | null

  function handleVote(direction) {
    if (voteState === direction) {
      // undo
      setVoteState(null)
      setVotes(baseVotes(id))
    } else {
      const delta = direction === 'up' ? 1 : -1
      const undoDelta = voteState ? (voteState === 'up' ? -1 : 1) : 0
      setVotes(baseVotes(id) + delta + undoDelta)
      setVoteState(direction)
    }
  }

  const preview = content.length > 250 ? content.slice(0, 250).trimEnd() + '…' : content

  return (
    <article className="flex bg-white border border-gray-200 rounded hover:border-gray-400 transition-colors cursor-pointer">

      {/* ── Vote column ─────────────────────────────────────────── */}
      <div className="flex flex-col items-center bg-gray-50 rounded-l px-2 py-2 gap-0.5 min-w-[40px] select-none">
        <button
          onClick={e => { e.stopPropagation(); handleVote('up') }}
          className={`p-0.5 rounded transition-colors hover:bg-orange-50
            ${voteState === 'up' ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'}`}
          aria-label="Upvote"
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>

        <span
          className={`text-xs font-bold tabular-nums
            ${voteState === 'up' ? 'text-orange-500' : voteState === 'down' ? 'text-blue-500' : 'text-gray-700'}`}
        >
          {votes}
        </span>

        <button
          onClick={e => { e.stopPropagation(); handleVote('down') }}
          className={`p-0.5 rounded transition-colors hover:bg-blue-50
            ${voteState === 'down' ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}
          aria-label="Downvote"
        >
          <ArrowDown size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Post content ────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 p-3">

        {/* Meta line */}
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5 flex-wrap">
          <span className="font-semibold text-gray-700 hover:underline cursor-pointer">
            r/bookreddit
          </span>
          <span>·</span>
          <span>Posted by</span>
          <span className="hover:underline cursor-pointer">u/{username}</span>
          <span>·</span>
          <span>{timeAgo(created_at)}</span>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 leading-snug mb-1.5 line-clamp-2">
          {title}
        </h3>

        {/* Body preview */}
        <p className="text-sm text-gray-700 leading-relaxed line-clamp-3 mb-2">
          {preview}
        </p>

        {/* Book tag */}
        <div className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200
                        rounded-full px-3 py-0.5 text-xs text-gray-600 mb-3">
          <BookOpen size={11} className="text-orange-400" />
          <span className="font-semibold text-gray-800">{book_title}</span>
          <span className="text-gray-400">by {book_author}</span>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-1">
          <button className="flex items-center gap-1.5 text-xs font-bold text-gray-500
                             hover:bg-gray-100 hover:text-gray-700 rounded px-2 py-1.5 transition-colors">
            <MessageSquare size={14} />
            Comments
          </button>
          <button className="flex items-center gap-1.5 text-xs font-bold text-gray-500
                             hover:bg-gray-100 hover:text-gray-700 rounded px-2 py-1.5 transition-colors">
            <Share2 size={14} />
            Share
          </button>
        </div>

      </div>
    </article>
  )
}
