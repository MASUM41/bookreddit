import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Star, User, Heart } from 'lucide-react'
import { fetchUserPosts, fetchUserProfile, fetchUserRatings, fetchTasteMatch } from '../api'
import { useAuth } from '../context/AuthContext'
import PostCard from '../components/PostCard'
import Sidebar from '../components/Sidebar'
import PageLayout from '../components/layout/PageLayout'

export default function ProfilePage() {
  const { username } = useParams()
  const { user: me } = useAuth()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [ratings, setRatings] = useState([])
  const [tasteMatch, setTasteMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setTasteMatch(null)
    Promise.all([
      fetchUserProfile(username),
      fetchUserPosts(username, 0, 20),
    ])
      .then(async ([prof, userPosts]) => {
        setProfile(prof)
        setPosts(userPosts)
        const userRatings = await fetchUserRatings(prof.id, 20)
        setRatings(userRatings)
        if (me && me.id !== prof.id) {
          try {
            const match = await fetchTasteMatch(prof.id)
            setTasteMatch(match)
          } catch {
            setTasteMatch(null)
          }
        }
      })
      .catch(err => setError(err.response?.data?.detail ?? err.message))
      .finally(() => setLoading(false))
  }, [username, me])

  return (
    <PageLayout left={<Sidebar />} mobileLeft={<Sidebar compact />}>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-br-text-muted hover:text-br-text mb-4 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to home
      </Link>

          {loading && (
            <div className="flex items-center gap-3 bg-br-surface border border-reddit-border rounded px-4 py-6">
              <div className="spinner" />
              <span className="text-sm text-br-text-muted">Loading profile…</span>
            </div>
          )}

          {error && !loading && (
            <div className="bg-br-surface border border-reddit-border rounded px-4 py-8 text-center">
              <p className="text-red-600 mb-3">{error}</p>
              <Link to="/" className="text-orange-500 font-semibold hover:underline">Go home</Link>
            </div>
          )}

          {!loading && !error && profile && (
            <>
              <div className="bg-br-surface border border-reddit-border rounded-2xl px-4 py-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-orange-500/15 flex items-center justify-center">
                    <User size={24} className="text-orange-500" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-br-text">u/{profile.username}</h1>
                    <p className="text-xs text-br-text-muted">
                      Member since {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-br-text-secondary">
                  <span><strong>{profile.post_count}</strong> posts</span>
                  <span><strong>{profile.rating_count}</strong> ratings</span>
                </div>

                {tasteMatch && (
                  <div className="mt-3 flex items-center gap-2 bg-orange-500/10 border border-orange-500/25
                                  rounded-xl px-3 py-2">
                    <Heart size={16} className="text-reddit-orange shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-br-text">
                        {tasteMatch.pct}% taste match · {tasteMatch.label}
                      </p>
                      <p className="text-[10px] text-br-text-muted">
                        Compared via {tasteMatch.method === 'collaborative' ? 'community patterns' : 'reading style'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {ratings.length > 0 && (
                <section className="bg-br-surface border border-reddit-border rounded-lg px-4 py-4 mb-4">
                  <h2 className="text-sm font-bold text-br-text mb-3 flex items-center gap-2">
                    <Star size={16} className="text-orange-500" />
                    Recent ratings
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {ratings.map(r => (
                      <li key={r.book_id}>
                        <Link
                          to={`/books/${r.book_id}`}
                          className="flex items-center justify-between text-sm hover:bg-reddit-muted rounded px-2 py-1.5"
                        >
                          <span className="text-br-text truncate pr-2">{r.title}</span>
                          <span className="text-orange-500 font-bold shrink-0">{r.value}★</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h2 className="text-sm font-bold text-br-text mb-3">Posts</h2>
                {posts.length === 0 ? (
                  <div className="bg-br-surface border border-reddit-border rounded px-4 py-6 text-center text-sm text-br-text-muted">
                    No posts yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {posts.map(post => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
    </PageLayout>
  )
}
