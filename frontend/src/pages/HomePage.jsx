import { Link } from 'react-router-dom'
import RecommendationsSection from '../components/RecommendationsSection'
import TasteDNASection from '../components/TasteDNASection'
import DiscussionFeed from '../components/DiscussionFeed'
import Sidebar from '../components/Sidebar'
import JoinSidebar from '../components/JoinSidebar'
import TrendingPanel from '../components/TrendingPanel'
import PageLayout from '../components/layout/PageLayout'
import { useAuth } from '../context/AuthContext'

export default function HomePage() {
  const { user, loading } = useAuth()

  const leftRail = user ? <Sidebar /> : <JoinSidebar />

  return (
    <PageLayout
      left={leftRail}
      right={<TrendingPanel sort="hot" title="Popular today" />}
    >
      {loading ? (
        <div className="bg-br-surface border border-reddit-border rounded-2xl mb-3 px-4 py-6 flex items-center gap-3">
          <div className="spinner" />
          <span className="text-sm text-br-text-muted">Loading session…</span>
        </div>
      ) : user ? (
        <>
          <TasteDNASection userId={user.id} />
          <RecommendationsSection userId={user.id} />
        </>
      ) : (
        <section className="bg-br-surface border border-reddit-border rounded-2xl mb-3 px-4 py-6 text-center">
          <h2 className="text-sm font-bold text-br-text mb-1">Recommended for You</h2>
          <p className="text-sm text-br-text-muted mb-4">
            Log in to get personalised picks from our recommendation engine.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/signup"
              className="bg-reddit-muted text-br-text rounded-full px-5 py-2
                         text-sm font-bold hover:bg-br-elevated transition-colors"
            >
              Sign Up
            </Link>
            <Link
              to="/login"
              className="bg-reddit-orange text-white rounded-full px-5 py-2
                         text-sm font-bold hover:bg-orange-600 transition-colors"
            >
              Log In
            </Link>
          </div>
        </section>
      )}
      <DiscussionFeed />
    </PageLayout>
  )
}
