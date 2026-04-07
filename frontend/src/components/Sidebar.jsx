import { Home, TrendingUp, BookOpen, ChevronRight } from 'lucide-react'

const BOOK_GENRES = [
  'Literary Fiction',
  'Science Fiction',
  'Fantasy',
  'Mystery',
  'Thriller',
  'Historical Fiction',
  'Magical Realism',
  'Non-fiction',
]

function NavItem({ icon: Icon, label, active = false }) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors
        ${active
          ? 'bg-orange-50 text-orange-600 font-semibold'
          : 'text-gray-700 hover:bg-gray-100'
        }`}
    >
      <Icon size={18} className={active ? 'text-orange-500' : 'text-gray-500'} />
      {label}
    </button>
  )
}

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0">
      {/* Main navigation */}
      <div className="bg-white border border-gray-200 rounded mb-3 overflow-hidden">
        <div className="flex flex-col py-2">
          <NavItem icon={Home} label="Home" active />
          <NavItem icon={TrendingUp} label="Popular" />
        </div>
      </div>

      {/* Book Genres */}
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
          <BookOpen size={15} className="text-orange-500" />
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Book Genres
          </span>
        </div>
        <div className="flex flex-col py-1">
          {BOOK_GENRES.map(genre => (
            <button
              key={genre}
              className="flex items-center justify-between px-3 py-1.5 text-sm text-gray-700
                         hover:bg-gray-50 transition-colors group"
            >
              <span>r/{genre.toLowerCase().replace(/\s+/g, '')}</span>
              <ChevronRight
                size={14}
                className="text-gray-300 group-hover:text-gray-500 transition-colors"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-400 mt-3 px-1 leading-relaxed">
        BookReddit · Discover books through community discussion.
      </p>
    </aside>
  )
}
