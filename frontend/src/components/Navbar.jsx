import { useState } from 'react'
import { BookOpen, Search, User, ChevronDown } from 'lucide-react'

export default function Navbar() {
  const [query, setQuery] = useState('')

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="h-12 max-w-6xl mx-auto px-4 flex items-center gap-4">

        {/* Logo */}
        <a href="/" className="flex items-center gap-2 shrink-0 mr-2">
          <BookOpen size={24} className="text-orange-500" />
          <span className="font-bold text-lg tracking-tight hidden sm:block">
            book<span className="text-orange-500">reddit</span>
          </span>
        </a>

        {/* Search bar */}
        <div className="flex-1 max-w-xl relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search BookReddit"
            className="w-full bg-gray-100 border border-gray-200 rounded-full py-1.5 pl-9 pr-4 text-sm
                       text-gray-800 placeholder-gray-400
                       focus:outline-none focus:bg-white focus:border-orange-400 transition-colors"
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button className="hidden md:flex items-center gap-1.5 border border-orange-500 text-orange-500
                             rounded-full px-4 py-1 text-sm font-semibold hover:bg-orange-50 transition-colors">
            Log In
          </button>
          <button className="hidden md:flex items-center gap-1.5 bg-orange-500 text-white
                             rounded-full px-4 py-1 text-sm font-semibold hover:bg-orange-600 transition-colors">
            Sign Up
          </button>
          <button className="flex items-center gap-1 text-gray-500 hover:bg-gray-100
                             rounded px-2 py-1 transition-colors ml-1">
            <User size={20} />
            <ChevronDown size={14} />
          </button>
        </div>

      </div>
    </nav>
  )
}
