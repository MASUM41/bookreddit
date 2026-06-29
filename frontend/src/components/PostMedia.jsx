import { Play } from 'lucide-react'
import { resolveMediaUrl } from '../utils/mediaUrl'

export default function PostMedia({
  mediaUrl,
  mediaType,
  compact = false,
  className = '',
}) {
  const src = resolveMediaUrl(mediaUrl)
  if (!src) return null

  if (mediaType === 'embed') {
    return (
      <div
        className={`relative w-full overflow-hidden rounded-2xl bg-black
          ${compact ? 'aspect-video max-h-48' : 'aspect-video'} ${className}`}
      >
        <iframe
          src={src}
          title="Embedded video"
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  if (mediaType === 'video') {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-black ${className}`}>
        <video
          src={src}
          controls
          playsInline
          className={`w-full bg-black ${compact ? 'max-h-48' : 'max-h-[480px]'}`}
        />
        {compact && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
              <Play size={18} className="text-white ml-0.5" fill="white" />
            </div>
          </div>
        )}
      </div>
    )
  }

  if (mediaType === 'image') {
    return (
      <div className={`overflow-hidden rounded-2xl bg-reddit-muted ${className}`}>
        <img
          src={src}
          alt="Post media"
          className={`w-full object-contain bg-reddit-muted
            ${compact ? 'max-h-48 object-cover' : 'max-h-[560px]'}`}
          loading="lazy"
        />
      </div>
    )
  }

  return null
}
