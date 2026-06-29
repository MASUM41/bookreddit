/** Deterministic “designed” book covers from title + author + genre. */

const PALETTES = [
  { bg: '#1c2a3a', accent: '#c9a962', text: '#f4f0e8', mood: 'night' },
  { bg: '#2d1f2f', accent: '#e8b4b8', text: '#faf6f0', mood: 'wine' },
  { bg: '#1a2f2a', accent: '#8fbc8f', text: '#f0f5f0', mood: 'forest' },
  { bg: '#2a2420', accent: '#d4a574', text: '#f8f4ec', mood: 'leather' },
  { bg: '#1e2438', accent: '#9eb3d7', text: '#eef1f8', mood: 'ink' },
  { bg: '#3d2318', accent: '#f0c987', text: '#fff8ef', mood: 'amber' },
  { bg: '#1f2830', accent: '#7eb8c9', text: '#edf4f7', mood: 'slate' },
  { bg: '#2c1a22', accent: '#c77d8e', text: '#faf0f2', mood: 'rose' },
  { bg: '#1a2a2e', accent: '#6ec6b8', text: '#eefaf7', mood: 'teal' },
  { bg: '#28231c', accent: '#b8a088', text: '#f5f0e8', mood: 'parchment' },
  { bg: '#231a30', accent: '#a78bfa', text: '#f3efff', mood: 'violet' },
  { bg: '#1a2820', accent: '#84a98c', text: '#f0f6f1', mood: 'moss' },
]

const GENRE_PALETTE_BIAS = {
  literature: 0,
  fantasy: 10,
  'science fiction': 10,
  'science & math': 4,
  'history & geography': 3,
  religion: 1,
  'philosophy & psychology': 0,
  'social sciences': 6,
  'technology & medicine': 4,
  'arts & entertainment': 7,
  'general & computing': 4,
}

export function hashString(str) {
  let h = 2166136261
  const s = String(str || '')
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function paletteIndex(title, author, genre) {
  const base = hashString(`${title}\0${author}`)
  const genreKey = (genre || '').toLowerCase()
  let bias = 0
  for (const [key, idx] of Object.entries(GENRE_PALETTE_BIAS)) {
    if (genreKey.includes(key)) {
      bias = idx
      break
    }
  }
  return (base + bias) % PALETTES.length
}

export function wrapTitle(title, maxLines = 4, maxCharsPerLine = 14) {
  const words = String(title || 'Untitled').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ['Untitled']

  const lines = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxCharsPerLine) {
      current = next
    } else {
      if (current) lines.push(current)
      current = word.length > maxCharsPerLine ? `${word.slice(0, maxCharsPerLine - 1)}…` : word
    }
    if (lines.length >= maxLines) break
  }
  if (current && lines.length < maxLines) lines.push(current)
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    const last = lines[maxLines - 1]
    if (!last.endsWith('…')) lines[maxLines - 1] = `${last.replace(/…$/, '')}…`
  }
  return lines.length ? lines : ['Untitled']
}

export function authorLine(author) {
  const a = String(author || '').trim()
  if (!a) return ''
  if (a.length <= 28) return a
  return `${a.slice(0, 27)}…`
}

export function coverDesign({ title, author, genre, bookId }) {
  const seed = hashString(`${bookId ?? ''}|${title}|${author}|${genre}`)
  const palette = PALETTES[paletteIndex(title, author, genre)]
  const pattern = seed % 5
  const ornament = seed % 3
  const titleSize =
    wrapTitle(title).join(' ').length > 28 ? 'compact' : wrapTitle(title).length > 3 ? 'small' : 'large'

  return {
    palette,
    pattern,
    ornament,
    titleLines: wrapTitle(title),
    author: authorLine(author),
    genre: genre ? String(genre).split('&')[0].trim() : null,
    titleSize,
    seed,
  }
}

/**
 * One-call API: pass a book’s title (and optional author, genre, id) → cover design.
 * Used by BookCoverThumb everywhere in the app.
 */
export function makeBookCover({ title, author = '', genre = null, bookId = null }) {
  return coverDesign({ title, author, genre, bookId })
}
