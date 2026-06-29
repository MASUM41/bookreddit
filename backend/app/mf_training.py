"""
Advanced MF training utilities:
  - Spectral (truncated SVD) initialization
  - Multi-iteration weighted ALS (Hu-style confidence)
  - BPR fine-tuning on implicit pairs
"""

from __future__ import annotations

import numpy as np
from sklearn.decomposition import TruncatedSVD


def _epoch_loss(
    P: np.ndarray,
    Q: np.ndarray,
    observed: np.ndarray,
    ratings: np.ndarray,
    confidences: np.ndarray,
    reg: float,
) -> float:
    row_products = P[observed[:, 0]] * Q[observed[:, 1]]
    pred = row_products.sum(axis=1)
    errors = ratings - pred
    mse = float((confidences * (errors ** 2)).sum())
    reg_loss = float(reg * (np.sum(P ** 2) + np.sum(Q ** 2)))
    return mse + reg_loss


def spectral_initialize(
    P: np.ndarray,
    Q: np.ndarray,
    u_indices: np.ndarray,
    b_indices: np.ndarray,
    ratings: np.ndarray,
    confidences: np.ndarray,
) -> None:
    """Initialize P, Q from truncated SVD of the weighted interaction matrix."""
    n_users, n_books, k = P.shape[0], Q.shape[0], P.shape[1]
    R = np.zeros((n_users, n_books), dtype=np.float64)
    for u, i, r, c in zip(u_indices, b_indices, ratings, confidences):
        R[int(u), int(i)] = float(r) * float(c)

    n_comp = min(k, max(1, min(n_users, n_books) - 1))
    if n_comp < 1 or R.sum() == 0:
        return

    svd = TruncatedSVD(n_components=n_comp, random_state=42)
    U = svd.fit_transform(R)
    Vt = svd.components_
    scales = np.sqrt(np.maximum(svd.singular_values_, 1e-9))

    P[:, :n_comp] = U * scales
    Q[:, :n_comp] = (Vt.T * scales)
    if n_comp < k:
        P[:, n_comp:] = 0.0
        Q[:, n_comp:] = 0.0


def als_fit(
    P: np.ndarray,
    Q: np.ndarray,
    u_indices: np.ndarray,
    b_indices: np.ndarray,
    ratings: np.ndarray,
    confidences: np.ndarray,
    reg: float,
    n_iterations: int = 5,
) -> list[float]:
    """Weighted ALS coordinate descent for n_iterations rounds."""
    n_factors = P.shape[1]
    reg_I = reg * np.eye(n_factors)
    losses: list[float] = []
    observed = np.column_stack([u_indices, b_indices])

    for _ in range(n_iterations):
        for u in range(P.shape[0]):
            mask = u_indices == u
            if not mask.any():
                continue
            Qi = Q[b_indices[mask]]
            ri = ratings[mask]
            ci = confidences[mask]
            A = Qi.T @ (Qi * ci[:, None]) + reg_I
            b = Qi.T @ (ri * ci)
            try:
                P[u] = np.linalg.solve(A, b)
            except np.linalg.LinAlgError:
                pass

        for i in range(Q.shape[0]):
            mask = b_indices == i
            if not mask.any():
                continue
            Pu = P[u_indices[mask]]
            ri = ratings[mask]
            ci = confidences[mask]
            A = Pu.T @ (Pu * ci[:, None]) + reg_I
            b = Pu.T @ (ri * ci)
            try:
                Q[i] = np.linalg.solve(A, b)
            except np.linalg.LinAlgError:
                pass

        losses.append(
            _epoch_loss(P, Q, observed, ratings, confidences, reg)
        )

    return losses


def bpr_finetune(
    P: np.ndarray,
    Q: np.ndarray,
    u_indices: np.ndarray,
    b_indices: np.ndarray,
    confidences: np.ndarray,
    reg: float,
    *,
    n_steps: int = 40,
    lr: float = 0.02,
    rng: np.random.Generator | None = None,
) -> None:
    """
    Bayesian Personalized Ranking: for each (u, i+) sample negative j,
    maximise σ(pᵤ·qᵢ - pᵤ·qⱼ) weighted by confidence.
    """
    if rng is None:
        rng = np.random.default_rng(42)

    n_books = Q.shape[0]
    user_pos: dict[int, list[int]] = {}
    for u, i, c in zip(u_indices, b_indices, confidences):
        user_pos.setdefault(int(u), []).append((int(i), float(c)))

    if not user_pos:
        return

    users = list(user_pos.keys())

    for _ in range(n_steps):
        u = int(rng.choice(users))
        items = user_pos[u]
        i_pos, conf = items[int(rng.integers(len(items)))]
        j_neg = int(rng.integers(n_books))
        attempts = 0
        while j_neg in {x[0] for x in items} and attempts < 8:
            j_neg = int(rng.integers(n_books))
            attempts += 1

        p_u = P[u].copy()
        q_i = Q[i_pos].copy()
        q_j = Q[j_neg].copy()
        x = float(p_u @ q_i - p_u @ q_j)
        sigmoid_grad = 1.0 / (1.0 + np.exp(min(x, 20.0)))  # σ(-x) stable

        step = lr * conf * sigmoid_grad
        P[u] += step * (q_i - q_j) - lr * reg * p_u
        Q[i_pos] += step * p_u - lr * reg * q_i
        Q[j_neg] -= step * p_u - lr * reg * q_j
