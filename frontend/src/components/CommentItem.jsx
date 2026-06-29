import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUp, ChevronDown, ChevronRight, MessageSquare, Trash2 } from 'lucide-react'
import { createComment, deleteComment, voteOnComment } from '../api'
import { useAuth } from '../context/AuthContext'
import { timeAgo } from '../utils/timeAgo'

const MAX_DEPTH = 2

function CommentComposer({ postId, parentId, replyTo, onPosted, onCancel }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!user) {
    return (
      <p className="text-xs text-br-text-muted py-2">
        <button type="button" onClick={() => navigate('/login')} className="text-orange-500 font-semibold hover:underline">
          Log in
        </button>
        {' '}to {parentId ? 'reply' : 'comment'}
      </p>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await createComment(postId, trimmed, parentId)
      setText('')
      onPosted?.()
      onCancel?.()
    } catch (err) {
      setError(err.response?.data?.detail ?? err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      {replyTo && (
        <p className="text-xs text-br-text-muted mb-1.5">
          Replying to <span className="text-orange-600 font-semibold">u/{replyTo}</span>
        </p>
      )}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={parentId ? 'Write a reply…' : 'What are your thoughts?'}
        rows={3}
        className="w-full text-sm border border-reddit-border rounded-lg px-3 py-2
                   focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-y"
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <div className="flex items-center gap-2 mt-2">
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="bg-orange-500 text-white text-xs font-bold rounded-full px-4 py-1.5
                     hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Posting…' : parentId ? 'Reply' : 'Comment'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs text-br-text-muted hover:text-br-text">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default function CommentItem({
  comment,
  postId,
  onRefresh,
  defaultCollapsed = false,
}) {
  const { user } = useAuth()
  const [score, setScore] = useState(comment.score)
  const [upvoted, setUpvoted] = useState(comment.user_upvoted)
  const [voting, setVoting] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const hasReplies = comment.replies?.length > 0

  async function handleUpvote() {
    if (!user || voting) return
    const next = upvoted ? 0 : 1
    const prevScore = score
    const prevUp = upvoted
    setScore(prevScore + (next === 1 ? 1 : -1))
    setUpvoted(next === 1)
    setVoting(true)
    try {
      const result = await voteOnComment(comment.id, next)
      setScore(result.score)
      setUpvoted(result.user_upvoted)
    } catch {
      setScore(prevScore)
      setUpvoted(prevUp)
    } finally {
      setVoting(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this comment?')) return
    await deleteComment(comment.id)
    onRefresh?.()
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="flex items-center gap-1 text-xs text-orange-600 font-semibold py-1 hover:underline"
      >
        <ChevronRight size={14} />
        Show {hasReplies ? `${comment.replies.length} repl` : 'comment'}
        {hasReplies && comment.replies.length !== 1 ? 'ies' : hasReplies ? 'y' : ''}
        {' · '}u/{comment.username}
      </button>
    )
  }

  return (
    <div className={`${comment.depth > 0 ? 'mt-3' : 'mt-4'}`}>
      <div className="flex gap-2">
        {/* Upvote column — X/Reddit hybrid */}
        <div className="flex flex-col items-center shrink-0 pt-0.5 min-w-[28px]">
          <button
            type="button"
            onClick={handleUpvote}
            disabled={voting}
            className={`p-0.5 rounded hover:bg-orange-500/10 disabled:opacity-50
              ${upvoted ? 'text-orange-500' : 'text-br-text-muted hover:text-orange-500'}`}
            aria-label="Upvote comment"
          >
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>
          <span className={`text-[11px] font-bold tabular-nums ${upvoted ? 'text-orange-500' : 'text-br-text-secondary'}`}>
            {score}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {comment.reply_to_username && comment.depth > 0 && (
            <p className="text-[11px] text-br-text-muted mb-0.5">
              Replying to{' '}
              <Link to={`/u/${comment.reply_to_username}`} className="text-orange-600 font-semibold hover:underline">
                u/{comment.reply_to_username}
              </Link>
            </p>
          )}

          <div className="flex items-center gap-1 text-[11px] text-br-text-muted mb-1 flex-wrap">
            <Link to={`/u/${comment.username}`} className="font-bold text-br-text hover:text-orange-600">
              u/{comment.username}
            </Link>
            <span>·</span>
            <span>{timeAgo(comment.created_at)}</span>
          </div>

          <p className="text-sm text-br-text leading-relaxed whitespace-pre-wrap break-words">
            {comment.content}
          </p>

          <div className="flex items-center gap-1 mt-1.5">
            {comment.depth < MAX_DEPTH && (
              <button
                type="button"
                onClick={() => setReplyOpen(v => !v)}
                className="flex items-center gap-1 text-[11px] font-bold text-br-text-muted
                           hover:bg-reddit-muted rounded px-2 py-1 transition-colors"
              >
                <MessageSquare size={12} />
                Reply
              </button>
            )}
            {hasReplies && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-br-text-muted
                           hover:bg-reddit-muted rounded px-2 py-1 transition-colors"
              >
                <ChevronDown size={12} />
                Collapse
              </button>
            )}
            {user?.id === comment.user_id && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1 text-[11px] font-bold text-br-text-muted
                           hover:text-red-600 hover:bg-red-500/10 rounded px-2 py-1 transition-colors"
              >
                <Trash2 size={12} />
                Delete
              </button>
            )}
          </div>

          {replyOpen && (
            <CommentComposer
              postId={postId}
              parentId={comment.id}
              replyTo={comment.username}
              onPosted={onRefresh}
              onCancel={() => setReplyOpen(false)}
            />
          )}
        </div>
      </div>

      {hasReplies && (
        <div className="ml-7 pl-3 border-l-2 border-reddit-border mt-1">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CommentComposerTop({ postId, onPosted }) {
  return (
    <div className="border-b border-reddit-border pb-4 mb-2">
      <CommentComposer postId={postId} onPosted={onPosted} />
    </div>
  )
}
