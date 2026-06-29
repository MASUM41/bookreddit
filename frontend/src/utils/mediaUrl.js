/** Resolve a backend media path to a browser-loadable URL. */
export function resolveMediaUrl(url) {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url

  const apiBase = import.meta.env.VITE_API_BASE_URL
  if (apiBase) {
    return `${apiBase.replace(/\/$/, '')}${url}`
  }
  return url
}
