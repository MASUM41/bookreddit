"""
Matrix Factorization recommender using Stochastic Gradient Descent (SGD).

Objective — minimize the regularized reconstruction loss over observed entries:

    L(P, Q) = Σ_{(u,i) ∈ Ω} (r_ui - pᵤ · qᵢ)²  +  λ (‖P‖²_F + ‖Q‖²_F)

where:
    Ω        — set of observed (user, book) index pairs
    P ∈ ℝⁿˣᵏ — user latent factor matrix  (n users,  k factors)
    Q ∈ ℝᵐˣᵏ — book latent factor matrix  (m books,  k factors)
    pᵤ       — k-dimensional row vector for user u
    qᵢ       — k-dimensional row vector for book i
    λ        — L2 regularization coefficient

Gradient of L w.r.t. a single observed entry (u, i):

    ∂L/∂pᵤ = -2 eᵤᵢ qᵢ + 2λ pᵤ      eᵤᵢ = r_ui - pᵤ · qᵢ
    ∂L/∂qᵢ = -2 eᵤᵢ pᵤ + 2λ qᵢ

SGD update rules (absorbing the 2 into the learning rate α):

    pᵤ ← pᵤ + α (eᵤᵢ qᵢ - λ pᵤ)
    qᵢ ← qᵢ + α (eᵤᵢ pᵤ - λ qᵢ)        ← uses old pᵤ value

Prediction for unobserved entry (u, i):

    r̂ᵤᵢ = pᵤ · qᵢ

Scoring all books for user u at once:

    ŝᵤ = P[u] @ Q.T     shape: (n_books,)
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sqlalchemy import text

from .database import engine
from .models import InteractionType


class MatrixFactorizationRecommender:

    def __init__(
        self,
        n_factors: int = 20,
        lr: float = 0.005,
        reg: float = 0.02,
        n_epochs: int = 100,
        seed: int = 42,
    ) -> None:
        """
        Args:
            n_factors: Dimensionality k of the latent factor space.
            lr:        SGD learning rate α.
            reg:       L2 regularization coefficient λ.
            n_epochs:  Number of full passes over the observed entries.
            seed:      RNG seed for reproducible initialization.
        """
        self.n_factors = n_factors
        self.lr = lr
        self.reg = reg
        self.n_epochs = n_epochs
        self._rng = np.random.default_rng(seed)

        # Set after fit() ─────────────────────────────────────────────────────
        self.P: np.ndarray | None = None          # (n_users, k) user factors
        self.Q: np.ndarray | None = None          # (n_books,  k) book factors
        self.user_id_to_idx: dict[int, int] = {}  # DB id  → matrix row index
        self.book_id_to_idx: dict[int, int] = {}  # DB id  → matrix col index
        self.idx_to_book_id: dict[int, int] = {}  # matrix col index → DB id
        self.rated_books: dict[int, set[int]] = {}  # user_idx → {book_idx, …}
        self.is_fitted: bool = False

    # ── data loading ──────────────────────────────────────────────────────────

    def _load_dataframe(self) -> pd.DataFrame:
        """
        Pull all rating interactions from SQLite into a Pandas DataFrame.
        Returns columns: user_id, book_id, value.
        """
        query = text("""
            SELECT user_id, book_id, value
            FROM user_book_interactions
            WHERE interaction_type = :itype
            ORDER BY user_id, book_id
        """)
        with engine.connect() as conn:
            df = pd.read_sql(query, conn, params={"itype": InteractionType.rating.value})
        return df

    # ── training ──────────────────────────────────────────────────────────────

    def fit(self) -> dict:
        """
        1. Load rating interactions from SQLite via Pandas.
        2. Build the sparse interaction matrix R (only observed entries stored).
        3. Initialize P and Q with small Gaussian noise.
        4. Run SGD for n_epochs, updating latent vectors per observed entry.

        Returns training metadata (matrix shape, loss trajectory endpoints).
        """
        df = self._load_dataframe()

        if df.empty:
            raise ValueError(
                "No rating interactions in the database. "
                "Log some ratings via POST /interactions/ before training."
            )

        # ── index mappings ────────────────────────────────────────────────────
        # Map raw DB ids to contiguous 0-based row/col indices so P and Q
        # can be addressed with plain integer arrays.
        unique_users: list[int] = sorted(df["user_id"].unique())
        unique_books: list[int] = sorted(df["book_id"].unique())

        self.user_id_to_idx = {uid: i for i, uid in enumerate(unique_users)}
        self.book_id_to_idx = {bid: j for j, bid in enumerate(unique_books)}
        self.idx_to_book_id = {j: bid for bid, j in self.book_id_to_idx.items()}

        n_users = len(unique_users)
        n_books = len(unique_books)

        # ── build observed-entry arrays ───────────────────────────────────────
        # We never materialise the full dense matrix; we only keep the observed
        # triplets as parallel numpy arrays for fast vectorised loss computation.
        u_indices = df["user_id"].map(self.user_id_to_idx).to_numpy(dtype=np.int32)
        b_indices = df["book_id"].map(self.book_id_to_idx).to_numpy(dtype=np.int32)
        ratings   = df["value"].to_numpy(dtype=np.float64)

        # observed: shape (nnz, 2) — each row is [u_idx, b_idx]
        observed = np.column_stack([u_indices, b_indices])
        n_observed = len(observed)

        # Per-user set of already-rated book indices (used to mask predictions)
        self.rated_books = {}
        for u_idx, b_idx in observed:
            self.rated_books.setdefault(int(u_idx), set()).add(int(b_idx))

        # ── initialise latent factor matrices ─────────────────────────────────
        # Small values from N(0, σ) break symmetry; σ = 1/√k is a stable choice
        sigma = 1.0 / np.sqrt(self.n_factors)
        self.P = self._rng.normal(0.0, sigma, (n_users, self.n_factors))
        self.Q = self._rng.normal(0.0, sigma, (n_books,  self.n_factors))

        # ── SGD loop ──────────────────────────────────────────────────────────
        initial_loss: float = 0.0
        final_loss:   float = 0.0

        for epoch in range(self.n_epochs):
            # Shuffle observed entries each epoch (stochastic, not batch)
            perm = self._rng.permutation(n_observed)

            for idx in perm:
                u = int(observed[idx, 0])
                i = int(observed[idx, 1])
                r_ui = ratings[idx]

                p_u = self.P[u].copy()   # save old pᵤ — q update must use it
                q_i = self.Q[i].copy()   # save old qᵢ — p update must use it

                e_ui = r_ui - p_u @ q_i   # scalar prediction error

                # Simultaneous gradient descent update
                self.P[u] += self.lr * (e_ui * q_i - self.reg * p_u)
                self.Q[i] += self.lr * (e_ui * p_u - self.reg * q_i)

            # ── epoch loss (vectorised) ────────────────────────────────────────
            # Dot products for all observed entries at once:
            #   row_products[k] = P[u_k] * Q[i_k]   (element-wise, shape (nnz, n_factors))
            #   pred[k]         = sum of row_products[k]  = pᵤ · qᵢ
            row_products = self.P[observed[:, 0]] * self.Q[observed[:, 1]]
            pred   = row_products.sum(axis=1)                         # (nnz,)
            errors = ratings - pred                                    # (nnz,)

            mse_loss = float((errors ** 2).sum())
            reg_loss = float(self.reg * (np.sum(self.P ** 2) + np.sum(self.Q ** 2)))
            epoch_loss = mse_loss + reg_loss

            if epoch == 0:
                initial_loss = epoch_loss
            final_loss = epoch_loss

        self.is_fitted = True

        return {
            "status": "trained",
            "matrix_shape": [n_users, n_books],
            "n_factors": self.n_factors,
            "n_observed_ratings": n_observed,
            "sparsity": round(1.0 - n_observed / (n_users * n_books), 4),
            "initial_loss": round(initial_loss, 4),
            "final_loss": round(final_loss, 4),
            "epochs": self.n_epochs,
        }

    # ── inference ─────────────────────────────────────────────────────────────

    def recommend(self, user_id: int, n: int = 5) -> list[dict]:
        """
        Score all books for a user with a single matrix-vector product, filter
        out already-rated books, and return the top-n predictions.

        Scoring:
            ŝᵤ = P[u] @ Q.T     (one dot product per book, batched)

        Args:
            user_id: DB primary key for the user.
            n:       Number of recommendations to return.

        Returns:
            List of dicts sorted by predicted_score descending:
            [{"book_id": int, "predicted_score": float}, …]
        """
        if not self.is_fitted:
            raise RuntimeError(
                "Recommender not fitted. POST /recommendations/train first."
            )

        if user_id not in self.user_id_to_idx:
            raise KeyError(
                f"user_id {user_id} has no ratings in the training data. "
                "The model must be re-trained after new users log ratings."
            )

        u_idx = self.user_id_to_idx[user_id]

        # ŝᵤ = P[u] @ Q.T — predict all books in one vectorised operation
        # shape: (n_books,)
        scores: np.ndarray = self.P[u_idx] @ self.Q.T

        # Mask already-rated books — exclude them from recommendations
        already_rated = self.rated_books.get(u_idx, set())
        if already_rated:
            scores[list(already_rated)] = -np.inf

        n_available = int((scores > -np.inf).sum())
        n = min(n, n_available)
        if n == 0:
            return []

        # np.argpartition is O(m) vs argsort's O(m log m); fine for top-k
        top_idx = np.argpartition(scores, -n)[-n:]
        top_idx = top_idx[np.argsort(scores[top_idx])[::-1]]   # sort descending

        return [
            {
                "book_id": self.idx_to_book_id[int(idx)],
                "predicted_score": round(float(scores[idx]), 4),
            }
            for idx in top_idx
        ]


# ── module-level singleton ────────────────────────────────────────────────────
# Shared across all FastAPI requests; fit() updates it in-place.
recommender = MatrixFactorizationRecommender()
