# BookReddit

A Reddit-style community for book lovers, with a **matrix factorization recommendation engine** at its core.

> **Project vision & AI build rules:** see [`claude.md`](./claude.md) — tech stack, math-first recommendation philosophy, and constraints for future work.

---

## Quick start

### Backend (FastAPI + SQLite)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### Seed data & train the model

```bash
cd backend
python seed.py
```

This creates 8 users, 20 books, ~136 ratings, 10 discussion posts, supplementary upvotes/bookmarks, and trains the MF model in-process.

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Vite dev proxy forwards `/api/*` → `http://localhost:8001`.

---

## Architecture

```
bookreddit/
├── claude.md              # Vision, stack, AI/math constraints (referenced by this file)
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI routes
│   │   ├── models.py      # SQLAlchemy ORM (User, Book, Post, UserBookInteraction)
│   │   ├── crud.py        # DB operations
│   │   ├── schemas.py     # Pydantic request/response models
│   │   ├── database.py    # SQLite engine + session
│   │   └── recommender.py # SGD Matrix Factorization engine
│   ├── seed.py            # Dummy data + model training
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/HomePage.jsx
        ├── components/    # Navbar, Sidebar, Feed, Recommendations
        ├── hooks/         # useFeed, useRecommendations
        └── api/           # Axios client + endpoint wrappers
```

### Data model

| Table | Purpose |
|---|---|
| `users` | Accounts (username, email, hashed password) |
| `books` | Catalog (title, author, genre, ISBN, description) |
| `posts` | Book-linked discussion threads |
| `user_book_interactions` | Sparse interaction matrix — ratings, upvotes, downvotes, bookmarks |

The interaction table is designed so any `(user_id, book_id, value)` triplet maps directly to a sparse matrix row for linear-algebra-based recommenders.

### Recommendation engine

Implemented in `backend/app/recommender.py` as **SGD Matrix Factorization**:

```
L(P, Q) = Σ (r_ui − pᵤ · qᵢ)² + λ (‖P‖²_F + ‖Q‖²_F)

Prediction:  r̂ᵤᵢ = pᵤ · qᵢ
Scoring:     ŝᵤ = P[u] @ Q.T
```

| Parameter | Default |
|---|---|
| Latent factors *k* | 20 |
| Learning rate α | 0.005 |
| L2 regularization λ | 0.02 |
| Epochs | 100 |

**API endpoints:**

| Method | Path | Description |
|---|---|---|
| `POST` | `/recommendations/train` | Fit P, Q from all rating interactions |
| `GET` | `/recommendations/{user_id}` | Top-5 unseen books for a user |
| `GET` | `/interactions/matrix/` | Export sparse matrix triplets (for debugging / extensions) |

---

## What's done

### Backend

- [x] FastAPI app with full CRUD for users, books, posts
- [x] Interaction logging with upsert semantics (`POST /interactions/`)
- [x] Sparse matrix export endpoint
- [x] SGD Matrix Factorization recommender (NumPy + Pandas)
- [x] Train + recommend API endpoints
- [x] SQLite persistence via SQLAlchemy 2.0
- [x] Seed script with persona-biased ratings and discussion posts

### Frontend

- [x] Reddit-inspired UI (Navbar, Sidebar, post cards with vote column)
- [x] Homepage with recommendations rail + discussion feed
- [x] `useRecommendations` hook → `GET /recommendations/{userId}`
- [x] `useFeed` hook with pagination → `GET /posts/`
- [x] Tailwind CSS v4 styling
- [x] Vite dev proxy to backend

### Recommendation math (aligned with [`claude.md`](./claude.md))

- [x] Latent factor model with gradient-based optimization (SGD)
- [x] L2-regularized reconstruction loss
- [x] Vectorized batch scoring via `P[u] @ Q.T`
- [x] Already-rated books masked from results

---

## What's pending

### High priority

| Area | Gap |
|---|---|
| **Authentication** | Login/Sign Up buttons are UI-only. `DEMO_USER_ID = 1` is hardcoded in `HomePage.jsx`. No JWT/session, no protected routes. |
| **Rating UI** | Users cannot rate books from the frontend. Ratings only exist via API or `seed.py`. Without new ratings + retrain, recommendations stay static. |
| **Auto-retrain** | Model must be manually re-trained (`POST /recommendations/train` or `seed.py`). New interactions don't update recommendations until retrain. |
| **Post creation** | No UI to create posts; feed is read-only from the API. |

### Medium priority

| Area | Gap |
|---|---|
| **Book detail pages** | No `/books/:id` route. Recommendation cards and post book tags don't navigate anywhere. |
| **Search** | Navbar search input is non-functional (no backend search endpoint). |
| **Feed sorting** | Hot / New / Top tabs are visual only; feed always returns newest-first. |
| **Votes → interactions** | Post upvote/downvote is client-side fake state (`PostCard.jsx`). Not persisted to `user_book_interactions`. |
| **Implicit signals** | Upvotes, downvotes, bookmarks are stored in DB but **not used** by the recommender (ratings only). |
| **Genre subreddits** | Sidebar genre links (`r/sciencefiction`, etc.) are non-functional. |

### Lower priority / production hardening

| Area | Gap |
|---|---|
| **Password hashing** | SHA-256 placeholder; needs bcrypt/argon2 |
| **CORS / deployment** | Dev proxy only; production needs `VITE_API_BASE_URL` + backend CORS |
| **Tests** | No unit or integration tests |
| **README run scripts** | No root-level `docker-compose` or single-command dev launcher |
| **Cold-start users** | Users with no ratings in training data get a 422 error; no fallback (popular books, content-based, etc.) |

### Future recommendation engine (per [`claude.md`](./claude.md))

The current MF-SGD baseline is solid. Natural next steps that stay within the linear-algebra / optimization mandate:

1. **Alternating Least Squares (ALS)** — closed-form block coordinate descent on the same loss
2. **Weighted implicit feedback** — fold upvotes/bookmarks into a confidence-weighted matrix
3. **Non-negative Matrix Factorization (NMF)** — interpretable latent genres
4. **Regularized SVD / truncated SVD** — spectral initialization before fine-tuning with SGD
5. **Constrained optimization** — genre diversity or serendipity as a linear/quadratic penalty term

Avoid: pure popularity ranking, naive collaborative filtering without factorization, or game-theoretic approaches.

---

## Analysis

### Strengths

1. **Clean separation** — interaction matrix lives in SQLite; recommender reads it as a DataFrame and trains in-memory. Easy to swap algorithms without touching the schema.
2. **Math-first recommender** — well-documented loss function, gradient updates, and vectorized inference. Matches the vision in [`claude.md`](./claude.md).
3. **End-to-end demo path** — `seed.py` → train → homepage shows live MF recommendations for user 1 (alice).
4. **Reddit UX scaffold** — vote column, subreddit-style meta, genre sidebar, horizontal rec rail. Good foundation for community features.

### Gaps between UI and backend

The backend is ahead of the frontend. Most API surface (users, books, interactions, train) has no UI counterpart. The frontend currently consumes only:

- `GET /recommendations/{userId}`
- `GET /posts/`

Everything else is API-only or seed-only.

### Recommendation loop is incomplete

```
Rate books → Train model → Get recommendations
     ↑              ↑              ↑
  ❌ no UI      ❌ manual      ✅ works
```

Until users can log ratings and the model retrains (manually or on a schedule), BookReddit is a **read-only demo** of the engine, not a live learning system.

### Suggested build order

1. **Auth** (login/signup, user context) — unblocks everything user-specific
2. **Book detail page + star rating widget** — wires `POST /interactions/` from the UI
3. **Retrain trigger** — call `POST /recommendations/train` after rating changes (or background job)
4. **Create post flow** — completes the community loop
5. **Persist post votes** — map upvote/downvote to `InteractionType.upvote/downvote`
6. **Implicit signal fusion** — extend `recommender.py` to combine rating + implicit matrices

---

## API reference (summary)

| Method | Path | Status |
|---|---|---|
| `POST` | `/users/` | ✅ |
| `GET` | `/users/{id}` | ✅ |
| `POST` | `/books/` | ✅ |
| `GET` | `/books/` | ✅ |
| `GET` | `/books/{id}` | ✅ |
| `POST` | `/users/{id}/posts/` | ✅ |
| `GET` | `/books/{id}/posts/` | ✅ |
| `GET` | `/posts/` | ✅ (used by frontend) |
| `POST` | `/interactions/` | ✅ |
| `GET` | `/interactions/matrix/` | ✅ |
| `POST` | `/recommendations/train` | ✅ |
| `GET` | `/recommendations/{user_id}` | ✅ (used by frontend) |

Interactive docs: [http://localhost:8001/docs](http://localhost:8001/docs) when the backend is running.

---

## Git history

| Commit | Summary |
|---|---|
| `51429d2` | Initial BookReddit commit — backend, MF recommender, seed data |
| `7809e53` | Reddit-style frontend interface |

---

*For AI assistants and contributors: always read [`claude.md`](./claude.md) before changing the recommendation engine or choosing algorithms.*
