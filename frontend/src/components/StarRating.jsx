import { useState } from 'react'
import { Star } from 'lucide-react'

/**
 * Interactive 1–5 star rating widget.
 */
export default function StarRating({ value, onChange, disabled = false }) {
  const [hover, setHover] = useState(null)
  const display = hover ?? value

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHover(null)}
      role="group"
      aria-label="Book rating"
    >
      {[1, 2, 3, 4, 5].map(star => {
        const filled = display != null && star <= display
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onMouseEnter={() => !disabled && setHover(star)}
            onClick={() => onChange(star)}
            className={`p-0.5 rounded transition-colors disabled:cursor-not-allowed
              ${filled ? 'text-amber-400' : 'text-br-text-muted/60 hover:text-amber-300'}`}
            aria-label={`Rate ${star} out of 5`}
          >
            <Star
              size={28}
              fill={filled ? 'currentColor' : 'none'}
              strokeWidth={filled ? 0 : 1.5}
            />
          </button>
        )
      })}
      {value != null && (
        <span className="ml-2 text-sm font-semibold text-br-text-secondary tabular-nums">
          {value}/5
        </span>
      )}
    </div>
  )
}
