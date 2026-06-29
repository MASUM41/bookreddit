import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { fetchPost } from '../api'
import PostDetail from '../components/PostDetail'
import PostOwnerActions from '../components/PostOwnerActions'
import CommentThread from '../components/CommentThread'
import Sidebar from '../components/Sidebar'
import JoinSidebar from '../components/JoinSidebar'
import RelatedPostsPanel from '../components/RelatedPostsPanel'
import PageLayout from '../components/layout/PageLayout'
import { useAuth } from '../context/AuthContext'

export default function PostPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchPost(postId)
      .then(setPost)
      .catch(err => {
        if (err.code === 'ECONNABORTED') {
          setError('Request timed out — the server may still be starting. Refresh in a moment.')
          return
        }
        setError(err.response?.data?.detail ?? err.message)
      })
      .finally(() => setLoading(false))
  }, [postId])

  const leftRail = user ? <Sidebar /> : <JoinSidebar />

  return (
    <PageLayout
      left={leftRail}
      right={
        post ? (
          <RelatedPostsPanel postId={post.id} bookId={post.book_id} />
        ) : null
      }
    >
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center justify-center w-9 h-9 rounded-full
                   bg-br-surface border border-reddit-border text-br-text-secondary
                   hover:bg-reddit-muted mb-4 transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft size={18} />
      </button>

      {loading && (
        <div className="flex items-center gap-3 bg-br-surface border border-reddit-border rounded-2xl px-4 py-8">
          <div className="spinner" />
          <span className="text-sm text-br-text-muted">Loading discussion…</span>
        </div>
      )}

      {error && !loading && (
        <div className="bg-br-surface border border-reddit-border rounded-2xl px-4 py-10 text-center">
          <p className="text-red-600 mb-3">{error}</p>
          <Link to="/" className="text-reddit-orange font-bold hover:underline">Go home</Link>
        </div>
      )}

      {!loading && !error && post && (
        <div className="flex flex-col gap-3">
          <PostOwnerActions post={post} onUpdated={setPost} />
          <PostDetail post={post} />
          <CommentThread postId={post.id} commentCount={post.comment_count ?? 0} />
        </div>
      )}
    </PageLayout>
  )
}
