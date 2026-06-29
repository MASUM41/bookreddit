import { useRef, useState } from 'react'
import { ImagePlus, Link2, Trash2, Video } from 'lucide-react'
import { parseMediaEmbed, uploadPostMedia } from '../api'
import PostMedia from './PostMedia'

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime'

export default function PostMediaUploader({ value, onChange, disabled = false }) {
  const inputRef = useRef(null)
  const [mode, setMode] = useState('file') // file | link
  const [videoLink, setVideoLink] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  async function handleFile(file) {
    if (!file || disabled) return
    setError(null)
    setUploading(true)
    try {
      const result = await uploadPostMedia(file)
      onChange({ media_url: result.media_url, media_type: result.media_type })
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleEmbedLink() {
    const url = videoLink.trim()
    if (!url || disabled) return
    setError(null)
    setUploading(true)
    try {
      const result = await parseMediaEmbed(url)
      onChange({ media_url: result.media_url, media_type: result.media_type })
      setVideoLink('')
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Invalid video link')
    } finally {
      setUploading(false)
    }
  }

  function clearMedia() {
    onChange(null)
    setVideoLink('')
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (value?.media_url) {
    return (
      <div className="space-y-2">
        <PostMedia mediaUrl={value.media_url} mediaType={value.media_type} />
        <button
          type="button"
          onClick={clearMedia}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600
                     hover:bg-red-500/10 rounded-full px-3 py-1.5 transition-colors"
        >
          <Trash2 size={14} />
          Remove media
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`text-xs font-bold rounded-full px-3 py-1.5 transition-colors
            ${mode === 'file'
              ? 'bg-reddit-orange text-white'
              : 'bg-reddit-muted text-br-text-secondary hover:bg-br-elevated'}`}
        >
          Upload file
        </button>
        <button
          type="button"
          onClick={() => setMode('link')}
          className={`text-xs font-bold rounded-full px-3 py-1.5 transition-colors
            ${mode === 'link'
              ? 'bg-reddit-orange text-white'
              : 'bg-reddit-muted text-br-text-secondary hover:bg-br-elevated'}`}
        >
          Video link
        </button>
      </div>

      {mode === 'file' ? (
        <div
          className="border-2 border-dashed border-reddit-border rounded-2xl p-6 text-center
                     hover:border-reddit-orange hover:hover:bg-orange-500/10 transition-colors cursor-pointer"
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            if (!disabled && e.dataTransfer.files?.[0]) {
              handleFile(e.dataTransfer.files[0])
            }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            disabled={disabled || uploading}
            onChange={e => handleFile(e.target.files?.[0])}
          />
          <div className="flex justify-center gap-3 text-br-text-muted mb-2">
            <ImagePlus size={28} />
            <Video size={28} />
          </div>
          <p className="text-sm font-semibold text-br-text-secondary">
            {uploading ? 'Uploading…' : 'Drag & drop or click to add a photo or video'}
          </p>
          <p className="text-xs text-br-text-muted mt-1">
            Images up to 10 MB · Videos up to 50 MB (MP4, WebM, MOV)
          </p>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-br-text-muted" />
            <input
              type="url"
              value={videoLink}
              onChange={e => setVideoLink(e.target.value)}
              placeholder="Paste YouTube or Vimeo URL"
              disabled={disabled || uploading}
              className="w-full border border-reddit-border rounded-full pl-9 pr-4 py-2 text-sm
                         focus:outline-none focus:border-reddit-orange"
            />
          </div>
          <button
            type="button"
            onClick={handleEmbedLink}
            disabled={disabled || uploading || !videoLink.trim()}
            className="shrink-0 bg-reddit-muted text-br-text rounded-full px-4 py-2 text-sm
                       font-bold hover:bg-br-elevated disabled:opacity-50 transition-colors"
          >
            Add
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
