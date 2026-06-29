export function genreSlug(genre) {
  return genre.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function genreSubredditLabel(genre) {
  return `r/${genreSlug(genre)}`
}
