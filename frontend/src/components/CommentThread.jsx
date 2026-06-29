import { useCallback, useEffect, useState } from 'react'
import { fetchComments } from '../api'
import CommentItem, { CommentComposerTop } from './CommentItem'

const SORT_TABS = [
  { id: 'top', label: 'Top' },
  { id: 'new', label: 'New' },
]

export default function CommentThread({ postId, commentCount = 0 }) {
  const [comments, setComments] = useState([])
  const [sort, setSort] = useState('top')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(commentCount)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchComments(postId, sort)
      .then((tree) => {
        setComments(tree)
        const count = countComments(tree)
        setTotal(count)
      })
      .catch(err => setError(err.response?.data?.detail ?? err.message))
      .finally(() => setLoading(false))
  }, [postId, sort])

  useEffect(() => {
    load()
  }, [load])

  function countComments(tree) {
    return tree.reduce((n, c) => n + 1 + countComments(c.replies || []), 0)
  }

  return (
    <section className="bg-br-surface border border-reddit-border rounded-2xl overflow-hidden">
      {/* Reddit-style comment header bar */}
      <div className="px-4 py-3 border-b border-reddit-border flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-bold text-br-text">
          {total.toLocaleString()} Comment{total !== 1 ? 's' : ''}
        </h2>
        <div className="flex items-center gap-1 bg-reddit-muted rounded-full p-0.5">
          {SORT_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSort(tab.id)}
              className={`text-xs font-bold rounded-full px-3 py-1 transition-colors
                ${sort === tab.id
                  ? 'bg-br-surface text-orange-600 shadow-sm'
                  : 'text-br-text-muted hover:text-br-text'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 pb-4">
        <CommentComposerTop postId={postId} onPosted={load} />

        {loading && (
          <div className="flex items-center gap-2 py-4">
            <div className="spinner" />
            <span className="text-sm text-br-text-muted">Loading comments…</span>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 py-2">⚠ {error}</p>
        )}

        {!loading && !error && comments.length === 0 && (
          <p className="text-sm text-br-text-muted py-4 text-center">
            No comments yet. Be the first to share your thoughts.
          </p>
        )}

        {!loading && comments.map(comment => (
          <CommentItem
            key={comment.id}
            comment={comment}
            postId={postId}
            onRefresh={load}
          />
        ))}
      </div>
    </section>
  )
}
