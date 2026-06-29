import client from './client'

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(username, password) {
  const { data } = await client.post('/auth/login', { username, password })
  return data
}

export async function register(username, email, password) {
  const { data } = await client.post('/auth/register', { username, email, password })
  return data
}

export async function fetchMe() {
  const { data } = await client.get('/auth/me')
  return data
}

// ── Recommendations ───────────────────────────────────────────────────────────

/**
 * GET /recommendations/{userId}
 * Returns { user_id, recommendations: [{ book_id, title, author, genre, predicted_score }] }
 */
export async function fetchRecommendations(userId) {
  const { data } = await client.get(`/recommendations/${userId}`)
  return data
}

// ── Feed ─────────────────────────────────────────────────────────────────────

/**
 * GET /posts/?skip=0&limit=50
 * Returns PostFeedItem[] sorted newest-first
 */
export async function fetchFeed(skip = 0, limit = 50, sort = 'new') {
  const { data } = await client.get('/posts/', { params: { skip, limit, sort } })
  return data
}

export async function fetchPost(postId) {
  const { data } = await client.get(`/posts/${postId}`)
  return data
}

export async function updatePost(postId, { title, content, media_url, media_type }) {
  const { data } = await client.put(`/posts/${postId}`, {
    title,
    content: content ?? '',
    media_url: media_url ?? null,
    media_type: media_type ?? null,
  })
  return data
}

export async function deletePost(postId) {
  await client.delete(`/posts/${postId}`)
}

export async function createPost({ book_id, title, content, media_url, media_type }) {
  const { data } = await client.post('/posts/', {
    book_id,
    title,
    content: content ?? '',
    media_url: media_url ?? null,
    media_type: media_type ?? null,
  })
  return data
}

export async function uploadPostMedia(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post('/media/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function parseMediaEmbed(url) {
  const { data } = await client.post('/media/embed', { url })
  return data
}

export async function voteOnPost(postId, value) {
  const { data } = await client.put(`/posts/${postId}/vote`, { value })
  return data
}

export async function fetchComments(postId, sort = 'top') {
  const { data } = await client.get(`/posts/${postId}/comments`, { params: { sort } })
  return data
}

export async function createComment(postId, content, parentId = null) {
  const { data } = await client.post(`/posts/${postId}/comments`, {
    content,
    parent_id: parentId,
  })
  return data
}

export async function voteOnComment(commentId, value) {
  const { data } = await client.put(`/comments/${commentId}/vote`, { value })
  return data
}

export async function deleteComment(commentId) {
  await client.delete(`/comments/${commentId}`)
}

// ── Books ─────────────────────────────────────────────────────────────────────

export async function fetchBooks({ skip = 0, limit = 50, genre = null } = {}) {
  const params = { skip, limit }
  if (genre) params.genre = genre
  const { data } = await client.get('/books/', { params })
  return data
}

export async function fetchGenres(limit = 100) {
  const { data } = await client.get('/books/genres', { params: { limit } })
  return data
}

export async function searchBooks(q, limit = 20) {
  const { data } = await client.get('/books/search', { params: { q, limit } })
  return data
}

export async function fetchBook(bookId) {
  const { data } = await client.get(`/books/${bookId}`)
  return data
}

export async function fetchSimilarBooks(bookId, n = 6) {
  const { data } = await client.get(`/books/${bookId}/similar`, { params: { n } })
  return data
}

export async function fetchCollaborativeSimilarBooks(bookId, n = 6) {
  const { data } = await client.get(`/books/${bookId}/similar/collaborative`, { params: { n } })
  return data
}

export async function fetchBookPosts(bookId) {
  const { data } = await client.get(`/books/${bookId}/posts/`)
  return data
}

export async function fetchBookRating(bookId) {
  const { data } = await client.get(`/books/${bookId}/rating`)
  return data
}

export async function submitBookRating(bookId, value) {
  const { data } = await client.put(`/books/${bookId}/rating`, { value })
  return data
}

export async function fetchBookBookmark(bookId) {
  const { data } = await client.get(`/books/${bookId}/bookmark`)
  return data
}

export async function setBookBookmark(bookId, bookmarked) {
  const { data } = await client.put(`/books/${bookId}/bookmark`, { bookmarked })
  return data
}

export async function fetchMyBookmarks(limit = 100) {
  const { data } = await client.get('/users/me/bookmarks', { params: { limit } })
  return data
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function fetchUser(userId) {
  const { data } = await client.get(`/users/${userId}`)
  return data
}

export async function fetchUserProfile(username) {
  const { data } = await client.get(`/users/by-name/${username}`)
  return data
}

export async function fetchUserPosts(username, skip = 0, limit = 50) {
  const { data } = await client.get(`/users/by-name/${username}/posts`, {
    params: { skip, limit },
  })
  return data
}

export async function fetchUserRatings(userId, limit = 50) {
  const { data } = await client.get(`/users/${userId}/ratings`, { params: { limit } })
  return data
}

export async function submitOnboarding(payload) {
  const { data } = await client.post('/users/me/onboarding', payload)
  return data
}

export async function fetchReaderTaste() {
  const { data } = await client.get('/users/me/reader-taste')
  return data
}

export async function fetchReadNext(n = 10) {
  const { data } = await client.get('/users/me/read-next', { params: { n } })
  return data
}

export async function fetchTasteMatch(userId) {
  const { data } = await client.get(`/users/${userId}/taste-match`)
  return data
}
