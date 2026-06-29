import { Link } from 'react-router-dom'
import BookCoverThumb from '../components/BookCoverThumb'
import { APP_NAME } from '../constants/brand'

const SAMPLES = [
  { id: 1, title: 'Dune', author: 'Frank Herbert', genre: 'Science Fiction' },
  { id: 2, title: 'Pride and Prejudice', author: 'Jane Austen', genre: 'Literature' },
  { id: 3, title: 'The Name of the Wind', author: 'Patrick Rothfuss', genre: 'Fantasy' },
  { id: 4, title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', genre: 'History & Geography' },
  { id: 5, title: 'It', author: 'Stephen King', genre: 'Literature' },
  { id: 6, title: 'Linear Algebra and Its Applications', author: 'Gilbert Strang', genre: 'Science & Math' },
  { id: 7, title: 'NW', author: 'Zadie Smith', genre: 'Literature' },
  { id: 8, title: 'The Protestant Ethic and the Spirit of Capitalism', author: 'Max Weber', genre: 'Social Sciences' },
  { id: 9, title: 'Clean Code', author: 'Robert C. Martin', genre: 'General & Computing' },
  { id: 10, title: 'Meditations', author: 'Marcus Aurelius', genre: 'Philosophy & Psychology' },
  { id: 11, title: 'The Hobbit', author: 'J. R. R. Tolkien', genre: 'Fantasy' },
  { id: 12, title: 'Network Design: Management and Technical Perspectives', author: 'Teresa C. Mann-Rubinson', genre: 'Technology & Medicine' },
]

export default function CoverDemoPage() {
  return (
    <div className="min-h-screen bg-[#0f1114] text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link
          to="/"
          className="text-sm text-br-text-muted hover:text-orange-400 transition-colors"
        >
          ← Back to {APP_NAME}
        </Link>

        <header className="mt-6 mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-500 mb-2">
            Live in app
          </p>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            Generated book covers
          </h1>
          <p className="text-br-text-muted max-w-2xl text-sm leading-relaxed">
            Each cover is built from title, author, and genre — curated palettes, serif typography,
            spine shadow, and paper grain. Same book always gets the same design. No external images.
          </p>
        </header>

        <section className="mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-br-text-muted mb-4">
            Hero size
          </h2>
          <div className="flex flex-wrap gap-8 justify-center p-8 rounded-2xl bg-br-surface/[0.03] border border-white/10">
            {SAMPLES.slice(0, 4).map(book => (
              <div key={book.id} className="text-center">
                <BookCoverThumb {...book} size="hero" className="shadow-2xl" />
                <p className="mt-3 text-xs text-br-text-muted max-w-[12rem]">{book.title}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-br-text-muted mb-4">
            Feed & search sizes
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {SAMPLES.map(book => (
              <div
                key={book.id}
                className="flex gap-3 items-start p-3 rounded-xl bg-br-surface/[0.03] border border-white/10"
              >
                <BookCoverThumb {...book} size="md" />
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-200 line-clamp-2 leading-snug">{book.title}</p>
                  <p className="text-xs text-br-text-muted mt-0.5">{book.author}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-br-text-muted mb-4">
            Recommendation rail
          </h2>
          <div className="rec-rail px-1">
            {SAMPLES.slice(0, 6).map(book => (
              <div
                key={book.id}
                className="flex-shrink-0 w-44 bg-br-surface/[0.04] border border-white/10 rounded-lg overflow-hidden"
              >
                <BookCoverThumb {...book} size="rec" className="rounded-none w-full border-0" />
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-gray-200 line-clamp-2">{book.title}</p>
                  <p className="text-[11px] text-br-text-muted truncate">{book.author}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 rounded-2xl border border-orange-500/30 bg-orange-500/5">
          <h2 className="text-sm font-bold text-orange-400 mb-2">Shipped</h2>
          <p className="text-sm text-br-text-muted leading-relaxed">
            These generated covers are now used across the feed, book pages, search,
            recommendations, and onboarding. Same book always gets the same design.
          </p>
        </section>
      </div>
    </div>
  )
}
