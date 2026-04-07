import { useFeed } from '../hooks/useFeed'
import PostCard from './PostCard'

export default function DiscussionFeed() {
  const { posts, loading, error, hasMore, loadMore } = useFeed()

  return (
    <section>
      {/* Feed header */}
      <div className="bg-white border border-gray-200 rounded px-4 py-2.5 mb-3 flex items-center gap-3">
        <button className="text-sm font-bold text-orange-500 border-b-2 border-orange-500 pb-1">
          Hot
        </button>
        <button className="text-sm font-medium text-gray-500 hover:text-gray-800 pb-1 transition-colors">
          New
        </button>
        <button className="text-sm font-medium text-gray-500 hover:text-gray-800 pb-1 transition-colors">
          Top
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded px-4 py-3 text-sm text-red-700">
          ⚠ {error}
        </div>
      )}

      {/* Empty state */}
      {!error && posts.length === 0 && !loading && (
        <div className="bg-white border border-gray-200 rounded px-4 py-8 text-center text-gray-500 text-sm">
          No discussions yet. Create a post to get the conversation going.
        </div>
      )}

      {/* Post list */}
      <div className="flex flex-col gap-2.5">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* Loading spinner */}
      {loading && (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded px-4 py-4 mt-2.5">
          <div className="spinner" />
          <span className="text-sm text-gray-500">Loading posts…</span>
        </div>
      )}

      {/* Load more */}
      {!loading && hasMore && posts.length > 0 && (
        <div className="flex justify-center mt-4">
          <button
            onClick={loadMore}
            className="border border-gray-300 text-gray-600 rounded-full px-6 py-1.5 text-sm
                       font-semibold hover:bg-gray-100 hover:border-gray-400 transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </section>
  )
}
