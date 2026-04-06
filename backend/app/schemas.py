from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from .models import InteractionType


# ── User ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Book ─────────────────────────────────────────────────────────────────────

class BookCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    author: str = Field(..., min_length=1, max_length=255)
    isbn: str | None = Field(default=None, max_length=13)
    genre: str | None = Field(default=None, max_length=100)
    description: str | None = None


class BookOut(BaseModel):
    id: int
    title: str
    author: str
    isbn: str | None
    genre: str | None
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Post ─────────────────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    book_id: int
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)


class PostOut(BaseModel):
    id: int
    user_id: int
    book_id: int
    title: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PostFeedItem(BaseModel):
    """Enriched post for the homepage feed — includes denormalized author/book fields."""
    id: int
    user_id: int
    username: str
    book_id: int
    book_title: str
    book_author: str
    title: str
    content: str
    created_at: datetime


# ── UserBookInteraction ───────────────────────────────────────────────────────

class InteractionCreate(BaseModel):
    user_id: int
    book_id: int
    interaction_type: InteractionType
    value: float = Field(..., description="1-5 for ratings; ±1 for votes; 1 for bookmarks")


class InteractionOut(BaseModel):
    id: int
    user_id: int
    book_id: int
    interaction_type: InteractionType
    value: float
    created_at: datetime

    model_config = {"from_attributes": True}


# Returned by the sparse-matrix helper endpoint
class SparseMatrixRow(BaseModel):
    user_id: int
    book_id: int
    value: float


# ── Recommendations ───────────────────────────────────────────────────────────

class RecommendedBook(BaseModel):
    book_id: int
    title: str
    author: str
    genre: str | None
    predicted_score: float


class RecommendationResponse(BaseModel):
    user_id: int
    recommendations: list[RecommendedBook]


class TrainResponse(BaseModel):
    status: str
    matrix_shape: list[int]
    n_factors: int
    n_observed_ratings: int
    sparsity: float
    initial_loss: float
    final_loss: float
    epochs: int
