import { coverDesign } from '../utils/generatedBookCover'

const SIZES = {
  sm: { className: 'w-10 h-14', title: 'text-[5px]', author: 'text-[4px]', genre: 'text-[3.5px]', pad: 'p-1' },
  md: { className: 'w-12 h-16', title: 'text-[6px]', author: 'text-[4.5px]', genre: 'text-[4px]', pad: 'p-1.5' },
  lg: { className: 'w-36 h-52', title: 'text-[11px]', author: 'text-[7px]', genre: 'text-[6px]', pad: 'p-3' },
  hero: { className: 'w-full max-w-[12rem] aspect-[2/3]', title: 'text-base', author: 'text-[10px]', genre: 'text-[9px]', pad: 'p-4' },
  rec: { className: 'w-full h-36', title: 'text-[10px]', author: 'text-[7px]', genre: 'text-[6px]', pad: 'p-3' },
}

function PatternLayer({ pattern, accent, uid }) {
  const opacity = 0.12
  if (pattern === 0) {
    return (
      <svg className="absolute inset-0 w-full h-full" aria-hidden>
        <defs>
          <pattern id={`diag-${uid}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={accent} strokeWidth="0.6" opacity={opacity * 2} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#diag-${uid})`} />
      </svg>
    )
  }
  if (pattern === 1) {
    return (
      <div
        className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-30"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
    )
  }
  if (pattern === 2) {
    return (
      <svg className="absolute inset-0 w-full h-full opacity-[0.08]" aria-hidden>
        <circle cx="85%" cy="15%" r="35%" fill="currentColor" style={{ color: accent }} />
        <circle cx="10%" cy="90%" r="25%" fill="currentColor" style={{ color: accent }} />
      </svg>
    )
  }
  if (pattern === 3) {
    return (
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3 opacity-25"
        style={{ background: `linear-gradient(to top, ${accent}, transparent)` }}
        aria-hidden
      />
    )
  }
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.07]" aria-hidden>
      {[...Array(6)].map((_, i) => (
        <line
          key={i}
          x1="0"
          y1={`${i * 20}%`}
          x2="100%"
          y2={`${i * 20 + 15}%`}
          stroke={accent}
          strokeWidth="0.5"
        />
      ))}
    </svg>
  )
}

function Ornament({ type, accent }) {
  if (type === 0) {
    return (
      <div className="flex gap-0.5 mb-1 opacity-70" aria-hidden>
        <span className="w-3 h-px" style={{ backgroundColor: accent }} />
        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: accent }} />
        <span className="w-3 h-px" style={{ backgroundColor: accent }} />
      </div>
    )
  }
  if (type === 1) {
    return (
      <div
        className="w-full h-px mb-1.5 opacity-40"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        aria-hidden
      />
    )
  }
  return (
    <div
      className="text-[6px] tracking-[0.2em] uppercase mb-1 opacity-50 font-medium"
      style={{ color: accent }}
      aria-hidden
    >
      ◆
    </div>
  )
}

export default function GeneratedBookCover({
  title,
  author,
  genre,
  bookId,
  size = 'md',
  className = '',
}) {
  const design = coverDesign({ title, author, genre, bookId })
  const { palette, pattern, ornament, titleLines, author: authorText, genre: genreLabel, titleSize } = design
  const sz = SIZES[size] ?? SIZES.md

  const titleClass =
    titleSize === 'large'
      ? `${sz.title} leading-[1.15]`
      : titleSize === 'compact'
        ? `${sz.title} leading-[1.1]`
        : `${sz.title} leading-[1.2]`

  return (
    <div
      className={`relative overflow-hidden rounded-md shadow-md border border-white/10
        select-none ${sz.className} ${className}`}
      style={{ backgroundColor: palette.bg, color: palette.text }}
      title={title}
    >
      {/* spine */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] z-10"
        style={{
          background: `linear-gradient(90deg, rgba(0,0,0,0.35), rgba(255,255,255,0.06))`,
        }}
        aria-hidden
      />

      {/* paper grain */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      <PatternLayer pattern={pattern} accent={palette.accent} uid={design.seed} />

      <div className={`relative z-[1] flex flex-col h-full justify-between ${sz.pad}`}>
        <div className="min-h-0">
          {size !== 'sm' && <Ornament type={ornament} accent={palette.accent} />}
          <h3
            className={`font-serif font-semibold tracking-tight ${titleClass}`}
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            {titleLines.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </h3>
        </div>

        <div className="mt-auto pt-1 shrink-0">
          {genreLabel && size !== 'sm' && (
            <p
              className={`uppercase tracking-widest font-medium mb-0.5 opacity-60 ${sz.genre}`}
              style={{ color: palette.accent }}
            >
              {genreLabel}
            </p>
          )}
          {authorText && (
            <p
              className={`uppercase tracking-wide opacity-75 ${sz.author}`}
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              {authorText}
            </p>
          )}
        </div>
      </div>

      {/* top light */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, transparent 45%, rgba(0,0,0,0.15) 100%)',
        }}
        aria-hidden
      />
    </div>
  )
}
