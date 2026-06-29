import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react'
import { fetchReadNext } from '../api'
import { useAuth } from '../context/AuthContext'
import RecommendationCard from '../components/RecommendationCard'
import PageLayout from '../components/layout/PageLayout'
import Sidebar from '../components/Sidebar'

export default function ReadNextPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    fetchReadNext(10)
      .then(setData)
      .catch(err => setError(err.response?.data?.detail ?? err.message))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen bg-reddit-bg flex items-center justify-center px-4">
        <div className="bg-br-surface border border-reddit-border rounded-2xl p-8 text-center max-w-md">
          <Sparkles size={32} className="text-reddit-orange mx-auto mb-3" />
          <p className="text-br-text-secondary mb-4">Log in to get your personalised reading queue.</p>
          <Link to="/login" className="text-reddit-orange font-bold hover:underline">Log In</Link>
        </div>
      </div>
    )
  }

  return (
    <PageLayout left={<Sidebar />}>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-br-text-muted hover:text-br-text mb-4"
      >
        <ArrowLeft size={16} />
        Home
      </Link>

      <div className="bg-br-surface border border-reddit-border rounded-2xl overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-reddit-border">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={20} className="text-reddit-orange" />
            <h1 className="text-lg font-bold text-br-text">Read Next</h1>
          </div>
          <p className="text-sm text-br-text-muted">
            Your queue — hybrid picks with genre diversity, serendipity, and a reason for each book.
            Not just “people also liked…”.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-3 px-5 py-10">
            <div className="spinner" />
            <span className="text-sm text-br-text-muted">Building your queue…</span>
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-red-600 px-5 py-6">{error}</p>
        )}

        {!loading && !error && data?.recommendations?.length > 0 && (
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {data.recommendations.map((rec, i) => (
                <div key={rec.book_id} className="relative">
                  <span className="absolute -top-2 -left-2 z-10 w-6 h-6 rounded-full bg-reddit-orange
                                   text-white text-xs font-bold flex items-center justify-center shadow">
                    {i + 1}
                  </span>
                  <RecommendationCard recommendation={rec} scoreLabel="Fit" />
                </div>
              ))}
            </div>
            <p className="text-xs text-br-text-muted mt-6 flex items-center gap-1.5">
              <BookOpen size={14} />
              Ranked with constrained MMR — varied genres, authors, and a dash of surprise.
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
