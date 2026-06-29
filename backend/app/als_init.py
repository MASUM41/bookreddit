"""
One-round weighted ALS initialization for matrix factorization.

Fix Q → solve each user row of P via regularized least squares,
then fix P → solve each book row of Q.  Gives a better starting point
than random Gaussian init before SGD fine-tuning.
"""

from __future__ import annotations

import numpy as np


def als_initialize(
    P: np.ndarray,
    Q: np.ndarray,
    u_indices: np.ndarray,
    b_indices: np.ndarray,
    ratings: np.ndarray,
    confidences: np.ndarray,
    reg: float,
) -> None:
    """Update P and Q in-place with one ALS coordinate-descent round."""
    n_factors = P.shape[1]
    reg_I = reg * np.eye(n_factors)

    for u in range(P.shape[0]):
        mask = u_indices == u
        if not mask.any():
            continue
        Qi = Q[b_indices[mask]]
        ri = ratings[mask]
        ci = confidences[mask]
        A = Qi.T @ (Qi * ci[:, None]) + reg_I
        b = Qi.T @ (ri * ci)
        P[u] = np.linalg.solve(A, b)

    for i in range(Q.shape[0]):
        mask = b_indices == i
        if not mask.any():
            continue
        Pu = P[u_indices[mask]]
        ri = ratings[mask]
        ci = confidences[mask]
        A = Pu.T @ (Pu * ci[:, None]) + reg_I
        b = Pu.T @ (ri * ci)
        Q[i] = np.linalg.solve(A, b)
