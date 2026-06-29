from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class InteractionType(str, PyEnum):
    rating = "rating"      # explicit 1–5 star rating  → primary signal for matrix
    upvote = "upvote"      # binary +1                 → treated as implicit signal
    downvote = "downvote"  # binary -1
    bookmark = "bookmark"  # implicit interest signal


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    onboarding_completed: Mapped[bool] = mapped_column(default=False, nullable=False)
    onboarding_archetype: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    onboarding_payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    posts: Mapped[list["Post"]] = relationship("Post", back_populates="author")
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="author")
    interactions: Mapped[list["UserBookInteraction"]] = relationship(
        "UserBookInteraction", back_populates="user"
    )


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    author: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    isbn: Mapped[Optional[str]] = mapped_column(String(13), unique=True, nullable=True)
    genre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cover_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    posts: Mapped[list["Post"]] = relationship("Post", back_populates="book")
    interactions: Mapped[list["UserBookInteraction"]] = relationship(
        "UserBookInteraction", back_populates="book"
    )


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    book_id: Mapped[int] = mapped_column(Integer, ForeignKey("books.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    media_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    media_type: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    author: Mapped["User"] = relationship("User", back_populates="posts")
    book: Mapped["Book"] = relationship("Book", back_populates="posts")
    votes: Mapped[list["PostVote"]] = relationship(
        "PostVote", back_populates="post", cascade="all, delete-orphan"
    )
    comments: Mapped[list["Comment"]] = relationship(
        "Comment", back_populates="post", cascade="all, delete-orphan"
    )


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("posts.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("comments.id"), nullable=True, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    post: Mapped["Post"] = relationship("Post", back_populates="comments")
    author: Mapped["User"] = relationship("User", back_populates="comments")
    parent: Mapped[Optional["Comment"]] = relationship(
        "Comment", remote_side="Comment.id", back_populates="replies"
    )
    replies: Mapped[list["Comment"]] = relationship("Comment", back_populates="parent")
    votes: Mapped[list["CommentVote"]] = relationship(
        "CommentVote", back_populates="comment", cascade="all, delete-orphan"
    )


class CommentVote(Base):
    __tablename__ = "comment_votes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    comment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("comments.id"), nullable=False, index=True
    )
    value: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    comment: Mapped["Comment"] = relationship("Comment", back_populates="votes")

    __table_args__ = (
        UniqueConstraint("user_id", "comment_id", name="uq_user_comment_vote"),
    )


class PostVote(Base):
    """Per-post upvote/downvote. Voting also syncs implicit book signals."""

    __tablename__ = "post_votes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("posts.id"), nullable=False, index=True)
    value: Mapped[int] = mapped_column(Integer, nullable=False)  # +1 up, -1 down

    post: Mapped["Post"] = relationship("Post", back_populates="votes")

    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_user_post_vote"),
    )


class UserBookInteraction(Base):
    """
    Interaction matrix table.

    Each row maps directly to a (user_id, book_id, value) triplet, making it
    trivial to build a sparse matrix for recommendation algorithms:

        SELECT user_id, book_id, value
        FROM user_book_interactions
        WHERE interaction_type = 'rating'

    → scipy.sparse.csr_matrix((values, (user_ids, book_ids)))

    Columns:
        user_id          — row index in the interaction matrix
        book_id          — column index in the interaction matrix
        interaction_type — filter dimension; keeps different signal types separate
        value            — the scalar stored at matrix[user_id, book_id]
                           ratings: 1.0–5.0 / upvotes: +1.0 / downvotes: -1.0
                           bookmarks: 1.0 (presence)
    """

    __tablename__ = "user_book_interactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Matrix coordinates ──────────────────────────────────────────────────────
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    book_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("books.id"), nullable=False, index=True
    )

    # Signal ──────────────────────────────────────────────────────────────────
    interaction_type: Mapped[InteractionType] = mapped_column(
        Enum(InteractionType), nullable=False, index=True
    )
    value: Mapped[float] = mapped_column(Float, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship("User", back_populates="interactions")
    book: Mapped["Book"] = relationship("Book", back_populates="interactions")

    # One row per (user, book, interaction_type) — prevents duplicate signals
    __table_args__ = (
        UniqueConstraint("user_id", "book_id", "interaction_type", name="uq_user_book_type"),
        # Composite index optimised for building a sparse matrix slice:
        # WHERE interaction_type = ? ORDER BY user_id, book_id
        Index("ix_interactions_type_user_book", "interaction_type", "user_id", "book_id"),
    )
