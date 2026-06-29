import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PenLine } from 'lucide-react'
import { useFeed } from '../hooks/useFeed'
import { useAuth } from '../context/AuthContext'
import PostCard from './PostCard'

const SORT_TABS = [
  { id: 'hot', label: 'Hot' },
  { id: 'new', label: 'New' },
  { id: 'top', label: 'Top' },
]

export default function DiscussionFeed({
  defaultSort = 'hot',
  lockSort = false,
  title = null,
}) {
  const { feedVersion, user } = useAuth()
  const [sort, setSort] = useState(defaultSort)
  const activeSort = lockSort ? defaultSort : sort
  const { posts, loading, error, hasMore, loadMore } = useFeed(feedVersion, activeSort)

  return (
    <section>
      {title && (
        <h1 className="text-lg font-bold text-br-text mb-3">{title}</h1>
      )}

      <div className="bg-br-surface border border-reddit-border rounded-2xl px-3 sm:px-4 py-2.5 mb-3 flex items-center gap-2.5 sm:gap-3 flex-wrap">
        {SORT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => !lockSort && setSort(tab.id)}
            disabled={lockSort && tab.id !== defaultSort}
            className={`text-sm pb-1 transition-colors ${
              activeSort === tab.id
                ? 'font-bold text-reddit-orange border-b-2 border-reddit-orange'
                : 'font-medium text-br-text-muted hover:text-br-text'
            } ${lockSort && tab.id !== defaultSort ? 'opacity-40 cursor-default' : ''}`}
          >
            {tab.label}
          </button>
        ))}

        <div className="ml-auto w-full sm:w-auto flex justify-end">
          {user ? (
            <Link
              to="/create-post"
              className="inline-flex items-center gap-1.5 bg-reddit-orange text-white rounded-full
                         px-4 py-1.5 text-xs font-bold hover:bg-orange-600 transition-colors min-h-[36px]"
            >
              <PenLine size={14} />
              Create Post
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 border border-orange-500 text-orange-500
                         rounded-full px-4 py-1.5 text-xs font-semibold hover:bg-orange-500/10 transition-colors min-h-[36px]"
            >
              <PenLine size={14} />
              Log in to Post
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded px-4 py-3 text-sm text-red-600 dark:text-red-400">
          ⚠ {error}
        </div>
      )}

      {!error && posts.length === 0 && !loading && (
        <div className="bg-br-surface border border-reddit-border rounded px-4 py-8 text-center text-br-text-muted text-sm">
          No discussions yet. Create a post to get the conversation going.
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-3 bg-br-surface border border-reddit-border rounded px-4 py-4 mt-2.5">
          <div className="spinner" />
          <span className="text-sm text-br-text-muted">Loading posts…</span>
        </div>
      )}

      {!loading && hasMore && posts.length > 0 && (
        <div className="flex justify-center mt-4">
          <button
            onClick={loadMore}
            className="border border-reddit-border text-br-text-secondary rounded-full px-6 py-1.5 text-sm
                       font-semibold hover:bg-reddit-muted hover:border-br-text-muted transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </section>
  )
}
