import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, TrendingUp, BookOpen, ChevronRight } from 'lucide-react'
import { fetchGenres } from '../api'
import { APP_NAME } from '../constants/brand'
import { genreSubredditLabel } from '../utils/genreSlug'

function NavItem({ icon: Icon, label, to, active = false }) {
  return (
    <Link
      to={to}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors
        ${active
          ? 'bg-orange-500/10 text-orange-600 font-semibold'
          : 'text-br-text-secondary hover:bg-reddit-muted'
        }`}
    >
      <Icon size={18} className={active ? 'text-orange-500' : 'text-br-text-muted'} />
      {label}
    </Link>
  )
}

export default function Sidebar() {
  const location = useLocation()
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGenres(30)
      .then(setGenres)
      .catch(() => setGenres([]))
      .finally(() => setLoading(false))
  }, [])

  const isHome = location.pathname === '/'
  const isPopular = location.pathname === '/popular'
  const isGenre = location.pathname.startsWith('/genre/')

  return (
    <aside className="w-full shrink-0 space-y-3">
      <div className="bg-br-surface border border-reddit-border rounded-2xl overflow-hidden">
        <div className="flex flex-col py-2">
          <NavItem icon={Home} label="Home" to="/" active={isHome} />
          <NavItem icon={TrendingUp} label="Popular" to="/popular" active={isPopular} />
        </div>
      </div>

      <div className="bg-br-surface border border-reddit-border rounded-2xl overflow-hidden">
        <div className="px-3 py-2.5 border-b border-reddit-border flex items-center gap-2">
          <BookOpen size={15} className="text-orange-500" />
          <span className="text-xs font-bold uppercase tracking-wide text-br-text-muted">
            Book Genres
          </span>
        </div>

        <div className="flex flex-col py-1 max-h-80 overflow-y-auto">
          {loading && (
            <p className="px-3 py-2 text-xs text-br-text-muted">Loading genres…</p>
          )}

          {!loading && genres.length === 0 && (
            <p className="px-3 py-2 text-xs text-br-text-muted">No genres found.</p>
          )}

          {genres.map(({ genre, slug, count }) => {
            const active = isGenre && location.pathname === `/genre/${slug}`
            return (
              <Link
                key={slug}
                to={`/genre/${slug}`}
                className={`flex items-center justify-between px-3 py-1.5 text-sm transition-colors group
                  ${active ? 'bg-orange-500/10 text-orange-600 font-semibold' : 'text-br-text-secondary hover:bg-reddit-muted'}`}
              >
                <span className="truncate pr-2">{genreSubredditLabel(genre)}</span>
                <span className="flex items-center gap-1 shrink-0 text-xs text-br-text-muted">
                  {count > 999 ? `${Math.floor(count / 1000)}k` : count}
                  <ChevronRight
                    size={14}
                    className={`${active ? 'text-orange-400' : 'text-br-text-muted/60 group-hover:text-br-text-muted'}`}
                  />
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-br-text-muted mt-3 px-1 leading-relaxed">
        {APP_NAME} · Discover books through community discussion.
      </p>
    </aside>
  )
}
