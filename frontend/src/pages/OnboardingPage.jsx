import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, ChevronRight, Sparkles } from 'lucide-react'
import { fetchGenres, submitOnboarding } from '../api'
import { useAuth } from '../context/AuthContext'
import BookSearchInput from '../components/BookSearchInput'
import RecommendationCard from '../components/RecommendationCard'
import { MOOD_CARDS, STEPS, THIS_OR_THAT } from '../onboarding/constants'
import { APP_NAME } from '../constants/brand'

function Progress({ step }) {
  return (
    <div className="flex gap-1.5 justify-center mb-6">
      {STEPS.map((label, i) => (
        <div
          key={label}
          className={`h-1.5 rounded-full transition-all ${
            i <= step ? 'bg-reddit-orange w-8' : 'bg-reddit-border w-4'
          }`}
          title={label}
        />
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, refreshUser, refreshRecommendations } = useAuth()

  const [step, setStep] = useState(0)
  const [mood, setMood] = useState(null)
  const [books, setBooks] = useState([null, null, null])
  const [genres, setGenres] = useState([])
  const [genreOptions, setGenreOptions] = useState([])
  const [choice, setChoice] = useState(null)
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchGenres(20)
      .then(list => setGenreOptions(list.map(g => g.genre)))
      .catch(() => setGenreOptions([]))
  }, [])

  useEffect(() => {
    if (user?.onboarding_completed) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  if (!user) {
    return (
      <div className="min-h-screen bg-reddit-bg flex items-center justify-center px-4">
        <p className="text-br-text-secondary">
          <Link to="/login" className="text-reddit-orange font-bold">Log in</Link> to tune your feed.
        </p>
      </div>
    )
  }

  function toggleGenre(g) {
    setGenres(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : prev.length < 5 ? [...prev, g] : prev
    )
  }

  function setBookAt(index, book) {
    setBooks(prev => {
      const next = [...prev]
      next[index] = book
      return next
    })
  }

  async function finish(skip = false) {
    setSubmitting(true)
    setError(null)
    try {
      const bookIds = books.filter(Boolean).map(b => b.id)
      const data = await submitOnboarding(
        skip
          ? { skip: true }
          : {
              mood,
              this_or_that: choice,
              genres,
              book_ids: bookIds,
            },
      )
      setResult(data)
      setStep(4)
      await refreshUser()
      refreshRecommendations()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg).join(', '))
      } else {
        setError(detail ?? err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function canAdvance() {
    if (step === 0) return !!mood
    if (step === 1) return true
    if (step === 2) return genres.length > 0 || books.some(Boolean)
    if (step === 3) return !!choice
    return false
  }

  return (
    <div className="min-h-screen bg-reddit-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-6">
          <BookOpen size={26} className="text-reddit-orange" />
          <span className="font-bold text-lg">Tune your feed</span>
        </div>

        <Progress step={step} />

        <div className="bg-br-surface border border-reddit-border rounded-2xl p-6 shadow-sm">
          {step === 0 && (
            <>
              <h1 className="text-xl font-bold text-br-text mb-1">Friday night — which door?</h1>
              <p className="text-sm text-br-text-muted mb-5">Pick the vibe you&apos;re usually chasing.</p>
              <div className="grid grid-cols-2 gap-3">
                {MOOD_CARDS.map(card => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setMood(card.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all
                      ${mood === card.id
                        ? 'border-reddit-orange bg-orange-500/10'
                        : 'border-reddit-border hover:border-orange-200'}`}
                  >
                    <span className="text-2xl">{card.emoji}</span>
                    <p className="font-bold text-sm text-br-text mt-2">{card.title}</p>
                    <p className="text-xs text-br-text-muted">{card.subtitle}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="text-xl font-bold text-br-text mb-1">Your origin shelf</h1>
              <p className="text-sm text-br-text-muted mb-5">
                Up to 3 books that hooked you on reading. (Optional but powerful.)
              </p>
              <div className="space-y-3">
                {books.map((book, i) => (
                  <BookSearchInput
                    key={i}
                    mode="select"
                    selectedBook={book}
                    onSelect={b => setBookAt(i, b)}
                    placeholder={`Book ${i + 1} — search title or author`}
                    limit={8}
                  />
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-xl font-bold text-br-text mb-1">Your usual aisles</h1>
              <p className="text-sm text-br-text-muted mb-4">Pick 1–5 genres you browse most.</p>
              <div className="flex flex-wrap gap-2">
                {genreOptions.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className={`text-xs font-bold rounded-full px-3 py-1.5 border transition-colors
                      ${genres.includes(g)
                        ? 'bg-reddit-orange text-white border-reddit-orange'
                        : 'bg-br-surface text-br-text-secondary border-reddit-border hover:border-orange-300'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {genreOptions.length === 0 && (
                <p className="text-xs text-br-text-muted mt-2">Loading genres…</p>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-xl font-bold text-br-text mb-1">{THIS_OR_THAT.prompt}</h1>
              <p className="text-sm text-br-text-muted mb-5">One tap — we use this for surprise vs comfort.</p>
              <div className="grid grid-cols-2 gap-3">
                {THIS_OR_THAT.options.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setChoice(opt.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all
                      ${choice === opt.id
                        ? 'border-reddit-orange bg-orange-500/10'
                        : 'border-reddit-border hover:border-orange-200'}`}
                  >
                    <p className="font-bold text-sm text-br-text">{opt.label}</p>
                    <p className="text-xs text-br-text-muted mt-1">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 4 && result && (
            <div className="text-center">
              <Sparkles size={32} className="text-reddit-orange mx-auto mb-3" />
              <p className="text-xs font-bold uppercase tracking-wide text-reddit-orange mb-1">
                Your Reading DNA
              </p>
              <h1 className="text-2xl font-bold text-br-text mb-2">{result.archetype}</h1>
              <p className="text-sm text-br-text-muted mb-6">{result.tagline}</p>

              {result.recommendations?.length > 0 && (
                <div className="text-left mb-6">
                  <p className="text-xs font-bold text-br-text-secondary mb-3">Your starter picks</p>
                  <div className="rec-rail">
                    {result.recommendations.map(rec => (
                      <RecommendationCard key={rec.book_id} recommendation={rec} scoreLabel="Fit" />
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full bg-reddit-orange text-white rounded-full py-3 text-sm font-bold
                           hover:bg-orange-600 transition-colors"
              >
                Enter {APP_NAME}
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 mt-4">{error}</p>
          )}

          {step < 4 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-reddit-border">
              <button
                type="button"
                onClick={() => finish(true)}
                disabled={submitting}
                className="text-xs font-semibold text-br-text-muted hover:text-br-text-secondary"
              >
                Skip for now
              </button>
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep(s => s - 1)}
                    className="text-sm font-semibold text-br-text-muted px-4 py-2"
                  >
                    Back
                  </button>
                )}
                {step < 3 ? (
                  <button
                    type="button"
                    disabled={!canAdvance()}
                    onClick={() => setStep(s => s + 1)}
                    className="inline-flex items-center gap-1 bg-reddit-orange text-white rounded-full
                               px-5 py-2 text-sm font-bold disabled:opacity-40"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canAdvance() || submitting}
                    onClick={() => finish(false)}
                    className="inline-flex items-center gap-1 bg-reddit-orange text-white rounded-full
                               px-5 py-2 text-sm font-bold disabled:opacity-40"
                  >
                    {submitting ? 'Building…' : 'Reveal my DNA'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
