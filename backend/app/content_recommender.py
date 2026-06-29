"""
Content-based recommender via TF-IDF + Truncated SVD.

Pipeline:
  1. Corpus from title + author + genre + description per book
  2. TF-IDF  → sparse term-document matrix X  (n_books × vocab)
  3. Truncated SVD on X  → latent content vectors C  (n_books × k)
  4. L2-normalise rows of C so dot products equal cosine similarity

User profile (from rated books):
  pᵤ = normalise( mean( C[i] for i in rated books ) )

Scoring:
  ŝᵤ = C @ pᵤ     (cosine similarity to every book)
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize
from sqlalchemy import text

from .database import engine


class ContentRecommender:

    def __init__(
        self,
        n_components: int = 64,
        max_features: int = 20000,
        seed: int = 42,
    ) -> None:
        self.n_components = n_components
        self.max_features = max_features
        self._seed = seed

        self.C: np.ndarray | None = None
        self.book_id_to_idx: dict[int, int] = {}
        self.idx_to_book_id: dict[int, int] = {}
        self.is_fitted: bool = False
        self._explained_variance: float = 0.0

    def _load_books(self) -> pd.DataFrame:
        query = text("""
            SELECT id, title, author, genre, description
            FROM books
            ORDER BY id
        """)
        with engine.connect() as conn:
            return pd.read_sql(query, conn)

    @staticmethod
    def _build_corpus(row: pd.Series) -> str:
        parts = [
            str(row.get("title") or ""),
            str(row.get("author") or ""),
            str(row.get("genre") or ""),
            str(row.get("description") or ""),
        ]
        return " ".join(p.strip() for p in parts if p.strip())

    def fit(self) -> dict:
        df = self._load_books()
        if df.empty:
            raise ValueError("No books in the database. Import a catalog first.")

        df["corpus"] = df.apply(self._build_corpus, axis=1)
        # Drop books with no usable text
        df = df[df["corpus"].str.len() > 0].reset_index(drop=True)
        if df.empty:
            raise ValueError("No books with title/description text to vectorise.")

        book_ids = [int(bid) for bid in df["id"].tolist()]
        self.book_id_to_idx = {bid: i for i, bid in enumerate(book_ids)}
        self.idx_to_book_id = {i: bid for bid, i in self.book_id_to_idx.items()}

        vectorizer = TfidfVectorizer(
            max_features=self.max_features,
            stop_words="english",
            ngram_range=(1, 2),
            min_df=2,
            sublinear_tf=True,
        )
        X = vectorizer.fit_transform(df["corpus"])

        n_comp = min(self.n_components, X.shape[0] - 1, X.shape[1] - 1)
        if n_comp < 2:
            raise ValueError("Not enough books/terms for SVD.")

        svd = TruncatedSVD(n_components=n_comp, random_state=self._seed)
        C = svd.fit_transform(X)
        self.C = normalize(C, norm="l2", axis=1)
        self._explained_variance = float(svd.explained_variance_ratio_.sum())
        self.is_fitted = True

        return {
            "status": "trained",
            "n_books": len(book_ids),
            "n_components": n_comp,
            "vocab_size": len(vectorizer.vocabulary_),
            "explained_variance": round(self._explained_variance, 4),
        }

    def _user_profile(self, rated_book_ids: set[int]) -> np.ndarray:
        assert self.C is not None

        indices = [
            self.book_id_to_idx[bid]
            for bid in rated_book_ids
            if bid in self.book_id_to_idx
        ]

        if indices:
            profile = self.C[indices].mean(axis=0)
        else:
            profile = self.C.mean(axis=0)

        norm = np.linalg.norm(profile)
        if norm > 1e-9:
            profile = profile / norm
        return profile

    def score_all(self, rated_book_ids: set[int] | None = None) -> dict[int, float]:
        """Cosine similarity scores for every book in the catalog."""
        if not self.is_fitted or self.C is None:
            raise RuntimeError("Content recommender not fitted.")

        profile = self._user_profile(rated_book_ids or set())
        scores: np.ndarray = self.C @ profile

        return {
            self.idx_to_book_id[idx]: float(scores[idx])
            for idx in range(len(scores))
        }

    def recommend(
        self,
        rated_book_ids: set[int],
        n: int = 5,
    ) -> list[dict]:
        scores = self.score_all(rated_book_ids)

        for bid in rated_book_ids:
            scores.pop(bid, None)

        if not scores:
            return []

        items = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:n]
        return [
            {"book_id": book_id, "predicted_score": round(score, 4)}
            for book_id, score in items
        ]

    def similar_books(self, book_id: int, n: int = 6) -> list[dict]:
        """
        Item-to-item similarity via cosine distance in the SVD latent space:
            sim(i, j) = C[i] · C[j]     (rows of C are L2-normalised)
        """
        if not self.is_fitted or self.C is None:
            raise RuntimeError("Content recommender not fitted.")

        if book_id not in self.book_id_to_idx:
            return []

        idx = self.book_id_to_idx[book_id]
        scores: np.ndarray = self.C @ self.C[idx]
        scores[idx] = -np.inf

        n = min(n, int((scores > -np.inf).sum()))
        if n == 0:
            return []

        top_idx = np.argpartition(scores, -n)[-n:]
        top_idx = top_idx[np.argsort(scores[top_idx])[::-1]]

        return [
            {
                "book_id": self.idx_to_book_id[int(i)],
                "predicted_score": round(float(scores[i]), 4),
            }
            for i in top_idx
        ]


content_recommender = ContentRecommender()
