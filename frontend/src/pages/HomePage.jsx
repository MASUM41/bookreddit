import RecommendationsSection from '../components/RecommendationsSection'
import DiscussionFeed from '../components/DiscussionFeed'
import Sidebar from '../components/Sidebar'

/**
 * DEMO_USER_ID stands in for the authenticated user.
 * Replace with real auth context once login is implemented.
 */
const DEMO_USER_ID = 1

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-16 flex gap-5">

        {/* Left sidebar — hidden on small screens */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <RecommendationsSection userId={DEMO_USER_ID} />
          <DiscussionFeed />
        </main>

      </div>
    </div>
  )
}
