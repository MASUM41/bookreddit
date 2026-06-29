import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
import { fetchBookBookmark, setBookBookmark } from '../api'
import { useAuth } from '../context/AuthContext'

export default function BookmarkButton({ bookId, className = '' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bookmarked, setBookmarked] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      setBookmarked(false)
      return
    }
    fetchBookBookmark(bookId)
      .then(data => setBookmarked(data.bookmarked))
      .catch(() => setBookmarked(false))
  }, [bookId, user])

  async function toggle() {
    if (!user) {
      navigate('/login')
      return
    }
    if (loading) return
    const next = !bookmarked
    setBookmarked(next)
    setLoading(true)
    try {
      const data = await setBookBookmark(bookId, next)
      setBookmarked(data.bookmarked)
    } catch {
      setBookmarked(!next)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 text-sm font-semibold rounded-full px-4 py-1.5
        border transition-colors disabled:opacity-60
        ${bookmarked
          ? 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600'
          : 'border-reddit-border text-br-text-secondary hover:bg-reddit-muted hover:border-orange-300'
        } ${className}`}
    >
      <Bookmark size={16} className={bookmarked ? 'fill-current' : ''} />
      {bookmarked ? 'Saved' : 'Save'}
    </button>
  )
}
