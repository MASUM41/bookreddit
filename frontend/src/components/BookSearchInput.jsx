import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Search, X } from 'lucide-react'
import { useBookSearch } from '../hooks/useBookSearch'
import BookCoverThumb from './BookCoverThumb'

/**
 * Searchable book combobox.
 *
 * mode="select"  — pick a book for forms (create post)
 * mode="navigate" — click result goes to book page; Enter → /search?q=
 */
export default function BookSearchInput({
  mode = 'select',
  selectedBook = null,
  onSelect,
  placeholder = 'Search by title, author, or genre…',
  limit = 12,
  autoFocus = false,
  variant = 'default',
}) {
  const listId = useId()
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const { results, loading } = useBookSearch(query, { limit })

  useEffect(() => {
    if (selectedBook && !query) {
      setQuery('')
    }
  }, [selectedBook])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(book) {
    if (mode === 'select') {
      onSelect?.(book)
      setQuery('')
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  function handleClear() {
    onSelect?.(null)
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault()
        if (mode === 'select') {
          handleSelect(results[activeIndex])
        }
      } else if (mode === 'navigate' && query.trim().length >= 2) {
        e.preventDefault()
        navigate(`/search?q=${encodeURIComponent(query.trim())}`)
        setOpen(false)
        setQuery('')
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  const showDropdown = open && query.trim().length >= 2
  const inputClass = variant === 'navbar'
    ? `w-full bg-reddit-muted border border-transparent rounded-full py-2 pl-10 pr-4 text-sm
       text-br-text placeholder-br-text-muted focus:outline-none focus:bg-br-surface
       focus:border-reddit-border focus:ring-1 focus:ring-reddit-border`
    : `w-full border border-reddit-border rounded-lg py-2 pl-9 pr-4 text-sm
       focus:outline-none focus:border-orange-400 bg-br-surface`

  return (
    <div ref={wrapperRef} className="relative w-full">
      {mode === 'select' && selectedBook && !showDropdown ? (
        <div className="flex items-center gap-2 border border-orange-500/30 bg-orange-500/10 rounded px-3 py-2">
          <BookOpen size={16} className="text-orange-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-br-text truncate">{selectedBook.title}</p>
            <p className="text-xs text-br-text-muted truncate">{selectedBook.author}</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-br-text-muted hover:text-br-text-secondary rounded"
            aria-label="Clear selection"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-br-text-muted pointer-events-none"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setOpen(true)
              setActiveIndex(-1)
            }}
            onFocus={() => query.trim().length >= 2 && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listId}
            aria-autocomplete="list"
            className={inputClass}
          />
        </div>
      )}

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto bg-br-surface border border-reddit-border
                     rounded-lg shadow-lg py-1"
        >
          {loading && (
            <li className="px-3 py-2 text-sm text-br-text-muted flex items-center gap-2">
              <span className="spinner w-4 h-4 border-2" />
              Searching…
            </li>
          )}

          {!loading && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-br-text-muted">No books found.</li>
          )}

          {!loading && results.map((book, idx) => (
            <li key={book.id} role="option" aria-selected={idx === activeIndex}>
              {mode === 'navigate' ? (
                <Link
                  to={`/books/${book.id}`}
                  onClick={() => { setOpen(false); setQuery('') }}
                  className={`block px-3 py-2 hover:bg-orange-500/10 transition-colors
                    ${idx === activeIndex ? 'bg-orange-500/10' : ''}`}
                >
                  <BookResultRow book={book} />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelect(book)}
                  className={`w-full text-left px-3 py-2 hover:bg-orange-500/10 transition-colors
                    ${idx === activeIndex ? 'bg-orange-500/10' : ''}`}
                >
                  <BookResultRow book={book} />
                </button>
              )}
            </li>
          ))}

          {mode === 'navigate' && !loading && results.length > 0 && (
            <li className="border-t border-reddit-border">
              <Link
                to={`/search?q=${encodeURIComponent(query.trim())}`}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-xs font-semibold text-orange-500 hover:bg-orange-500/10"
              >
                See all results for &ldquo;{query.trim()}&rdquo;
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function BookResultRow({ book }) {
  return (
    <div className="flex gap-2.5 items-center min-w-0">
      <BookCoverThumb
        bookId={book.id}
        title={book.title}
        author={book.author}
        genre={book.genre}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-br-text truncate">{book.title}</p>
        <p className="text-xs text-br-text-muted truncate">
          {book.author}
          {book.genre && <span className="text-orange-500"> · {book.genre}</span>}
        </p>
      </div>
    </div>
  )
}
