from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator

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
    onboarding_completed: bool = False
    onboarding_archetype: str | None = None

    model_config = {"from_attributes": True}


class UserProfileOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime
    post_count: int = 0
    rating_count: int = 0

    model_config = {"from_attributes": True}


class UserRatingOut(BaseModel):
    book_id: int
    title: str
    author: str
    genre: str | None
    value: float
    rated_at: datetime


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Book ─────────────────────────────────────────────────────────────────────

class BookCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    author: str = Field(..., min_length=1, max_length=255)
    isbn: str | None = Field(default=None, max_length=13)
    genre: str | None = Field(default=None, max_length=100)
    description: str | None = None
    cover_url: str | None = Field(default=None, max_length=512)


class BookOut(BaseModel):
    id: int
    title: str
    author: str
    isbn: str | None
    genre: str | None
    description: str | None
    cover_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class GenreOut(BaseModel):
    genre: str
    slug: str
    count: int


class RatingCreate(BaseModel):
    value: float = Field(..., ge=1, le=5, description="Star rating from 1 to 5")


class BookRatingOut(BaseModel):
    book_id: int
    user_id: int
    value: float | None = None


class BookmarkOut(BaseModel):
    book_id: int
    user_id: int
    bookmarked: bool


class BookmarkSet(BaseModel):
    bookmarked: bool


# ── Post ─────────────────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    book_id: int
    title: str = Field(..., min_length=1, max_length=255)
    content: str = ""
    media_url: str | None = None
    media_type: str | None = None  # image | video | embed

    @model_validator(mode="after")
    def require_body_or_media(self) -> "PostCreate":
        if not self.content.strip() and not self.media_url:
            raise ValueError("Post must include text or a photo/video")
        if self.media_url and self.media_type not in ("image", "video", "embed"):
            raise ValueError("media_type must be image, video, or embed when media_url is set")
        if not self.media_url and self.media_type:
            raise ValueError("media_type requires media_url")
        return self


class PostUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = ""
    media_url: str | None = None
    media_type: str | None = None

    @model_validator(mode="after")
    def require_body_or_media(self) -> "PostUpdate":
        if not self.content.strip() and not self.media_url:
            raise ValueError("Post must include text or a photo/video")
        if self.media_url and self.media_type not in ("image", "video", "embed"):
            raise ValueError("media_type must be image, video, or embed when media_url is set")
        return self


class PostOut(BaseModel):
    id: int
    user_id: int
    book_id: int
    title: str
    content: str
    media_url: str | None = None
    media_type: str | None = None
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
    book_genre: str | None = None
    book_cover_url: str | None = None
    title: str
    content: str
    media_url: str | None = None
    media_type: str | None = None
    created_at: datetime
    score: int = 0
    user_vote: int | None = None  # 1, -1, or null
    comment_count: int = 0


class MediaUploadOut(BaseModel):
    media_url: str
    media_type: str


class MediaEmbedIn(BaseModel):
    url: str = Field(..., min_length=8, max_length=500)


class MediaEmbedOut(BaseModel):
    media_url: str
    media_type: str = "embed"


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    parent_id: int | None = None


class CommentOut(BaseModel):
    id: int
    post_id: int
    user_id: int
    username: str
    parent_id: int | None
    reply_to_username: str | None = None
    content: str
    created_at: datetime
    score: int = 0
    user_upvoted: bool = False
    depth: int = 0
    replies: list["CommentOut"] = []


class CommentVoteSet(BaseModel):
    value: int = Field(..., ge=0, le=1, description="1=upvote, 0=remove")


class CommentVoteOut(BaseModel):
    comment_id: int
    score: int
    user_upvoted: bool = False


class PostVoteSet(BaseModel):
    value: int = Field(..., ge=-1, le=1, description="1=upvote, -1=downvote, 0=remove vote")


class PostVoteOut(BaseModel):
    post_id: int
    score: int
    user_vote: int | None = None


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
    cover_url: str | None = None
    predicted_score: float
    reason: str | None = None


class SimilarBookOut(RecommendedBook):
    """Content-similar or collaborative-similar book."""
    source: str = "content"


class RecommendationResponse(BaseModel):
    user_id: int
    recommendations: list[RecommendedBook]
    cold_start: bool = False
    strategy: str = "content"
    mf_weight: float = 0.0
    content_weight: float = 1.0
    n_ratings: int = 0
    n_bookmarks: int = 0
    blend_method: str = "heuristic"
    ranking: str = "constrained_mmr"


class GenreTaste(BaseModel):
    genre: str
    weight: float
    pct: float


class ReaderTasteOut(BaseModel):
    archetype: str
    tagline: str
    genres: list[GenreTaste]
    top_authors: list[str]
    n_ratings: int
    n_bookmarks: int
    exploration_score: float


class TasteCompatibilityOut(BaseModel):
    score: float
    pct: int
    label: str
    method: str


class OnboardingSubmit(BaseModel):
    mood: str | None = Field(None, description="cozy_mystery | space_opera | messy_romance | big_ideas")
    this_or_that: str | None = Field(None, description="plot_twist | emotional_ending | series | standalone")
    genres: list[str] = Field(default_factory=list, max_length=8)
    book_ids: list[int] = Field(default_factory=list, max_length=3)
    skip: bool = False

    @model_validator(mode="after")
    def validate_onboarding(self) -> "OnboardingSubmit":
        if self.skip:
            return self
        if not self.mood:
            raise ValueError("Pick a Friday-night mood to continue")
        if not self.genres and not self.book_ids:
            raise ValueError("Pick at least one genre or one book for your origin shelf")
        if not self.this_or_that:
            raise ValueError("Pick one this-or-that preference")
        return self


class OnboardingResultOut(BaseModel):
    archetype: str
    tagline: str
    onboarding_completed: bool = True
    recommendations: list[RecommendedBook] = []


class TrainResponse(BaseModel):
    status: str
    matrix_shape: list[int]
    n_factors: int
    n_observed_ratings: int
    sparsity: float
    initial_loss: float
    final_loss: float
    epochs: int
    init_method: str = "spectral_als"
    als_iterations: int = 5
    als_final_loss: float | None = None
    bpr_steps: int = 40
    n_signals: int = 0


CommentOut.model_rebuild()
