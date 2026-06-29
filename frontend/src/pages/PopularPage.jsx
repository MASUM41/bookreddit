import DiscussionFeed from '../components/DiscussionFeed'
import Sidebar from '../components/Sidebar'
import TrendingPanel from '../components/TrendingPanel'
import PageLayout from '../components/layout/PageLayout'

export default function PopularPage() {
  return (
    <PageLayout
      left={<Sidebar />}
      mobileLeft={<Sidebar compact />}
      right={<TrendingPanel sort="top" title="Top this week" />}
    >
      <DiscussionFeed defaultSort="top" lockSort title="Popular" />
    </PageLayout>
  )
}
