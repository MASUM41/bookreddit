import RecommendationsSection from '../components/RecommendationsSection'
import DiscussionFeed from '../components/DiscussionFeed'

/**
 * DEMO_USER_ID stands in for the authenticated user.
 * Replace with real auth context once login is implemented.
 */
const DEMO_USER_ID = 1

export default function HomePage() {
  return (
    <main className="home">
      <RecommendationsSection userId={DEMO_USER_ID} />
      <div className="home__divider" />
      <DiscussionFeed />
    </main>
  )
}
