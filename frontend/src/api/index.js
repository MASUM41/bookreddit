import client from './client'

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
export async function fetchFeed(skip = 0, limit = 50) {
  const { data } = await client.get('/posts/', { params: { skip, limit } })
  return data
}

// ── Books ─────────────────────────────────────────────────────────────────────

export async function fetchBooks(skip = 0, limit = 50) {
  const { data } = await client.get('/books/', { params: { skip, limit } })
  return data
}

export async function fetchBook(bookId) {
  const { data } = await client.get(`/books/${bookId}`)
  return data
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function fetchUser(userId) {
  const { data } = await client.get(`/users/${userId}`)
  return data
}
