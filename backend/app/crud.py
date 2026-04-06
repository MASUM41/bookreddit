import hashlib

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from . import models, schemas


# ── helpers ───────────────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    # Replace with bcrypt in production; kept dependency-free for now
    return hashlib.sha256(password.encode()).hexdigest()


# ── User ──────────────────────────────────────────────────────────────────────

def get_user(db: Session, user_id: int) -> models.User | None:
    return db.get(models.User, user_id)


def get_user_by_username(db: Session, username: str) -> models.User | None:
    return db.scalar(select(models.User).where(models.User.username == username))


def create_user(db: Session, data: schemas.UserCreate) -> models.User:
    user = models.User(
        username=data.username,
        email=data.email,
        hashed_password=_hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── Book ──────────────────────────────────────────────────────────────────────

def get_book(db: Session, book_id: int) -> models.Book | None:
    return db.get(models.Book, book_id)


def list_books(db: Session, skip: int = 0, limit: int = 50) -> list[models.Book]:
    return list(db.scalars(select(models.Book).offset(skip).limit(limit)))


def create_book(db: Session, data: schemas.BookCreate) -> models.Book:
    book = models.Book(**data.model_dump())
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


# ── Post ──────────────────────────────────────────────────────────────────────

def create_post(db: Session, user_id: int, data: schemas.PostCreate) -> models.Post:
    post = models.Post(user_id=user_id, **data.model_dump())
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def list_posts_for_book(db: Session, book_id: int) -> list[models.Post]:
    return list(db.scalars(select(models.Post).where(models.Post.book_id == book_id)))


def list_feed_posts(db: Session, skip: int = 0, limit: int = 50) -> list[models.Post]:
    """All posts newest-first, with author and book eagerly loaded to avoid N+1."""
    return list(
        db.scalars(
            select(models.Post)
            .options(joinedload(models.Post.author), joinedload(models.Post.book))
            .order_by(models.Post.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
    )


# ── UserBookInteraction ───────────────────────────────────────────────────────

def upsert_interaction(
    db: Session, data: schemas.InteractionCreate
) -> models.UserBookInteraction:
    """
    Insert or update an interaction.  A user can only have one record per
    (user_id, book_id, interaction_type) triplet (enforced by the DB unique
    constraint).  On conflict we update the value in place so the matrix stays
    tidy.
    """
    existing = db.scalar(
        select(models.UserBookInteraction).where(
            models.UserBookInteraction.user_id == data.user_id,
            models.UserBookInteraction.book_id == data.book_id,
            models.UserBookInteraction.interaction_type == data.interaction_type,
        )
    )
    if existing:
        existing.value = data.value
        db.commit()
        db.refresh(existing)
        return existing

    interaction = models.UserBookInteraction(**data.model_dump())
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


def get_interaction_matrix_rows(
    db: Session,
    interaction_type: models.InteractionType,
) -> list[tuple[int, int, float]]:
    """
    Returns (user_id, book_id, value) triplets for a given interaction type.

    These map directly to the (data, row, col) arrays needed to build a
    scipy.sparse.csr_matrix without loading full ORM objects:

        rows = get_interaction_matrix_rows(db, InteractionType.rating)
        user_ids, book_ids, values = zip(*rows)
        matrix = csr_matrix((values, (user_ids, book_ids)))
    """
    results = db.execute(
        select(
            models.UserBookInteraction.user_id,
            models.UserBookInteraction.book_id,
            models.UserBookInteraction.value,
        ).where(
            models.UserBookInteraction.interaction_type == interaction_type
        ).order_by(
            models.UserBookInteraction.user_id,
            models.UserBookInteraction.book_id,
        )
    ).all()
    return [(r.user_id, r.book_id, r.value) for r in results]
