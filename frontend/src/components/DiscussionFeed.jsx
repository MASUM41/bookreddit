import { useFeed } from '../hooks/useFeed'
import PostCard from './PostCard'

export default function DiscussionFeed() {
  const { posts, loading, error, hasMore, loadMore } = useFeed()

  return (
    <section className="feed" id="discussions">
      <h2 className="feed__title">Recent Discussions</h2>

      {error && (
        <div className="feed__state feed__state--error">
          <span>⚠ {error}</span>
        </div>
      )}

      {!error && posts.length === 0 && !loading && (
        <div className="feed__state feed__state--empty">
          <p>No discussions yet. Create a post to get the conversation going.</p>
        </div>
      )}

      <div className="feed__list">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {loading && (
        <div className="feed__state">
          <div className="spinner" />
        </div>
      )}

      {!loading && hasMore && posts.length > 0 && (
        <div className="feed__more">
          <button className="btn btn--outline" onClick={loadMore}>
            Load more
          </button>
        </div>
      )}
    </section>
  )
}
