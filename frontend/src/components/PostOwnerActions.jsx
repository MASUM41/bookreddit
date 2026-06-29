import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { deletePost, updatePost } from '../api'
import { useAuth } from '../context/AuthContext'

import PostMediaUploader from './PostMediaUploader'

function getErrorMessage(err) {
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  return err.message || 'Something went wrong'
}

export default function PostOwnerActions({ post, onUpdated, onDeleted }) {
  const { user, refreshFeed } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(post.title)
  const [content, setContent] = useState(post.content)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [media, setMedia] = useState(
    post.media_url
      ? { media_url: post.media_url, media_type: post.media_type }
      : null,
  )

  const [error, setError] = useState(null)

  if (!user || user.id !== post.user_id) {
    return null
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!title.trim()) return
    if (!content.trim() && !media?.media_url) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updatePost(post.id, {
        title: title.trim(),
        content: content.trim(),
        media_url: media?.media_url ?? null,
        media_type: media?.media_type ?? null,
      })
      onUpdated?.(updated)
      setEditing(false)
      refreshFeed()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this post? Comments will be removed too.')) return
    setDeleting(true)
    setError(null)
    try {
      await deletePost(post.id)
      refreshFeed()
      onDeleted?.()
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err))
      setDeleting(false)
    }
  }

  function handleCancel() {
    setTitle(post.title)
    setContent(post.content)
    setMedia(
      post.media_url
        ? { media_url: post.media_url, media_type: post.media_type }
        : null,
    )
    setEditing(false)
    setError(null)
  }

  if (editing) {
    return (
      <div className="bg-br-surface border border-orange-200 rounded-lg px-4 py-4 mb-3">
        <p className="text-xs font-bold uppercase tracking-wide text-orange-500 mb-3">Edit post</p>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full text-sm border border-reddit-border rounded-lg px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Title"
            maxLength={255}
            required
          />
          <PostMediaUploader value={media} onChange={setMedia} disabled={saving} />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={6}
            className="w-full text-sm border border-reddit-border rounded-lg px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y"
            placeholder="Content (optional if media attached)"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-orange-500 text-white text-xs font-bold rounded-full px-4 py-1.5
                         hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="text-xs font-semibold text-br-text-muted hover:text-br-text px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 mb-3">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-br-text-secondary
                   border border-reddit-border rounded-full px-3 py-1 hover:bg-reddit-muted transition-colors"
      >
        <Pencil size={13} />
        Edit
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600
                   border border-red-500/30 rounded-full px-3 py-1 hover:bg-red-500/10
                   disabled:opacity-50 transition-colors"
      >
        <Trash2 size={13} />
        {deleting ? 'Deleting…' : 'Delete'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
