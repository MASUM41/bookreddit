import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, User, ChevronDown, LogOut, Bookmark, Sparkles, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import BookSearchInput from './BookSearchInput'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-50 bg-br-surface border-b border-reddit-border">
      <div className="h-[52px] max-w-[1280px] mx-auto px-3 sm:px-4 flex items-center gap-2 sm:gap-3">

        <Link to="/" className="flex items-center gap-2 shrink-0">
          <BookOpen size={24} className="text-reddit-orange" />
          <span className="font-bold text-xl tracking-tight hidden sm:block text-br-text">
            Read<span className="text-reddit-orange">it</span>
          </span>
        </Link>

        <div className="hidden sm:block flex-1 max-w-[600px] mx-auto">
          <BookSearchInput
            mode="navigate"
            variant="navbar"
            placeholder="Find anything"
            limit={8}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/search"
            className="sm:hidden flex items-center justify-center rounded-full p-2 text-br-text-secondary
                       hover:bg-reddit-muted hover:text-br-text transition-colors border border-transparent
                       hover:border-reddit-border"
            aria-label="Search books"
          >
            <Search size={18} />
          </Link>
          <ThemeToggle />
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(open => !open)}
                className="flex items-center gap-1.5 text-br-text hover:bg-reddit-muted
                           rounded-full px-2.5 sm:px-3 py-1.5 transition-colors border border-transparent
                           hover:border-reddit-border"
              >
                <User size={18} />
                <span className="text-sm font-bold hidden sm:inline">u/{user.username}</span>
                <ChevronDown size={14} />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-br-surface border border-reddit-border
                                  rounded-xl shadow-lg py-1 overflow-hidden">
                    <div className="px-3 py-2 border-b border-reddit-border">
                      <p className="text-xs text-br-text-muted">Signed in as</p>
                      <p className="text-sm font-bold text-br-text truncate">u/{user.username}</p>
                    </div>
                    <Link
                      to={`/u/${user.username}`}
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-br-text-secondary
                                 hover:bg-reddit-muted transition-colors"
                    >
                      <User size={16} />
                      Profile
                    </Link>
                    <Link
                      to="/read-next"
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-br-text-secondary
                                 hover:bg-reddit-muted transition-colors"
                    >
                      <Sparkles size={16} />
                      Read Next
                    </Link>
                    <Link
                      to="/bookmarks"
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-br-text-secondary
                                 hover:bg-reddit-muted transition-colors"
                    >
                      <Bookmark size={16} />
                      Saved Books
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-br-text-secondary
                                 hover:bg-reddit-muted transition-colors"
                    >
                      <LogOut size={16} />
                      Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/signup"
                className="hidden sm:flex items-center bg-reddit-muted text-br-text
                           rounded-full px-4 py-1.5 text-sm font-bold hover:bg-br-elevated transition-colors"
              >
                Sign Up
              </Link>
              <Link
                to="/login"
                className="hidden sm:flex items-center bg-reddit-orange text-white
                           rounded-full px-4 py-1.5 text-sm font-bold hover:bg-orange-600 transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/login"
                className="flex sm:hidden items-center text-br-text-secondary hover:bg-reddit-muted
                           rounded-full p-2 transition-colors border border-transparent hover:border-reddit-border"
              >
                <User size={20} />
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  )
}
