from __future__ import annotations

import hashlib
import json
import re
from typing import Literal

import bcrypt
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from . import models, schemas

FeedSort = Literal["new", "hot", "top"]


# ── helpers ───────────────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    if hashed.startswith("$2"):
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    # Legacy SHA-256 hashes from earlier seeds
    return hashlib.sha256(plain.encode()).hexdigest() == hashed


# ── User ──────────────────────────────────────────────────────────────────────

def get_user(db: Session, user_id: int) -> models.User | None:
    return db.get(models.User, user_id)


def get_user_by_username(db: Session, username: str) -> models.User | None:
    return db.scalar(select(models.User).where(models.User.username == username))


def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.scalar(select(models.User).where(models.User.email == email))


def authenticate_user(db: Session, username: str, password: str) -> models.User | None:
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


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


def complete_user_onboarding(
    db: Session,
    user: models.User,
    data: schemas.OnboardingSubmit,
    *,
    archetype: str,
    payload: dict,
) -> models.User:
    """Persist quiz answers and seed weak ratings for origin-shelf books."""
    from .onboarding import derive_archetype

    if data.skip:
        title, _ = derive_archetype(None, None, [])
        user.onboarding_archetype = title
        user.onboarding_payload = json.dumps({"skipped": True})
    else:
        user.onboarding_archetype = archetype
        user.onboarding_payload = json.dumps(payload)

    user.onboarding_completed = True
    db.add(user)

    for book_id in data.book_ids[:3]:
        if not get_book(db, book_id):
            continue
        existing = get_interaction(db, user.id, book_id, models.InteractionType.rating)
        if existing is None:
            upsert_interaction(
                db,
                schemas.InteractionCreate(
                    user_id=user.id,
                    book_id=book_id,
                    interaction_type=models.InteractionType.rating,
                    value=4.0,
                ),
            )

    db.commit()
    db.refresh(user)
    return user


# ── Book ──────────────────────────────────────────────────────────────────────

def get_book(db: Session, book_id: int) -> models.Book | None:
    return db.get(models.Book, book_id)


def genre_slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def list_books(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    genre: str | None = None,
) -> list[models.Book]:
    stmt = select(models.Book)
    if genre:
        stmt = stmt.where(func.lower(models.Book.genre) == genre.lower())
    stmt = stmt.order_by(models.Book.title).offset(skip).limit(limit)
    return list(db.scalars(stmt))


def count_books(db: Session, genre: str | None = None) -> int:
    stmt = select(func.count()).select_from(models.Book)
    if genre:
        stmt = stmt.where(func.lower(models.Book.genre) == genre.lower())
    return int(db.scalar(stmt) or 0)


def list_genres_with_counts(db: Session, limit: int = 100) -> list[tuple[str, int]]:
    rows = db.execute(
        select(models.Book.genre, func.count(models.Book.id))
        .where(models.Book.genre.isnot(None), models.Book.genre != "")
        .group_by(models.Book.genre)
        .order_by(func.count(models.Book.id).desc(), models.Book.genre)
        .limit(limit)
    ).all()
    return [(str(genre), int(count)) for genre, count in rows]


def search_books(db: Session, q: str, limit: int = 20) -> list[models.Book]:
    """Case-insensitive search across title, author, and genre."""
    term = q.strip()
    if not term:
        return []
    pattern = f"%{term}%"
    return list(
        db.scalars(
            select(models.Book)
            .where(
                or_(
                    models.Book.title.ilike(pattern),
                    models.Book.author.ilike(pattern),
                    models.Book.genre.ilike(pattern),
                )
            )
            .order_by(models.Book.title)
            .limit(min(limit, 50))
        )
    )


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


def update_post(
    db: Session,
    post_id: int,
    user_id: int,
    data: schemas.PostUpdate,
) -> models.Post | None:
    post = db.get(models.Post, post_id)
    if not post or post.user_id != user_id:
        return None
    post.title = data.title.strip()
    post.content = data.content.strip()
    post.media_url = data.media_url
    post.media_type = data.media_type
    db.commit()
    return get_post_enriched(db, post_id)


def delete_post(db: Session, post_id: int, user_id: int) -> bool:
    post = db.get(models.Post, post_id)
    if not post or post.user_id != user_id:
        return False
    db.delete(post)
    db.commit()
    return True


def get_post_enriched(db: Session, post_id: int) -> models.Post | None:
    return db.scalar(
        select(models.Post)
        .options(joinedload(models.Post.author), joinedload(models.Post.book))
        .where(models.Post.id == post_id)
    )


def list_posts_for_book(db: Session, book_id: int) -> list[models.Post]:
    return list(
        db.scalars(
            select(models.Post)
            .options(joinedload(models.Post.author), joinedload(models.Post.book))
            .where(models.Post.book_id == book_id)
            .order_by(models.Post.created_at.desc())
        )
    )


def list_feed_posts(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    sort: FeedSort = "new",
) -> list[models.Post]:
    """Global feed with New / Hot / Top sorting."""
    vote_totals = (
        select(
            models.PostVote.post_id.label("post_id"),
            func.coalesce(func.sum(models.PostVote.value), 0).label("score"),
        )
        .group_by(models.PostVote.post_id)
        .subquery()
    )

    score_col = func.coalesce(vote_totals.c.score, 0)
    age_hours = (
        func.julianday(func.datetime("now")) - func.julianday(models.Post.created_at)
    ) * 24.0
    hot_score = (score_col + 1) / func.power(age_hours + 2.0, 1.5)

    stmt = (
        select(models.Post)
        .options(joinedload(models.Post.author), joinedload(models.Post.book))
        .outerjoin(vote_totals, models.Post.id == vote_totals.c.post_id)
    )

    if sort == "top":
        stmt = stmt.order_by(score_col.desc(), models.Post.created_at.desc())
    elif sort == "hot":
        stmt = stmt.order_by(hot_score.desc(), models.Post.created_at.desc())
    else:
        stmt = stmt.order_by(models.Post.created_at.desc())

    stmt = stmt.offset(skip).limit(limit)
    return list(db.scalars(stmt))


def list_posts_by_user(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 50,
) -> list[models.Post]:
    return list(
        db.scalars(
            select(models.Post)
            .options(joinedload(models.Post.author), joinedload(models.Post.book))
            .where(models.Post.user_id == user_id)
            .order_by(models.Post.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
    )


def count_posts_by_user(db: Session, user_id: int) -> int:
    return int(
        db.scalar(
            select(func.count()).select_from(models.Post).where(
                models.Post.user_id == user_id
            )
        )
        or 0
    )


def list_user_ratings(db: Session, user_id: int, limit: int = 50) -> list[models.UserBookInteraction]:
    return list(
        db.scalars(
            select(models.UserBookInteraction)
            .options(joinedload(models.UserBookInteraction.book))
            .where(
                models.UserBookInteraction.user_id == user_id,
                models.UserBookInteraction.interaction_type == models.InteractionType.rating,
            )
            .order_by(models.UserBookInteraction.created_at.desc())
            .limit(limit)
        )
    )


def count_user_ratings(db: Session, user_id: int) -> int:
    return int(
        db.scalar(
            select(func.count())
            .select_from(models.UserBookInteraction)
            .where(
                models.UserBookInteraction.user_id == user_id,
                models.UserBookInteraction.interaction_type == models.InteractionType.rating,
            )
        )
        or 0
    )


def get_book_genres_map(db: Session, book_ids: list[int]) -> dict[int, str | None]:
    if not book_ids:
        return {}
    rows = db.execute(
        select(models.Book.id, models.Book.genre).where(models.Book.id.in_(book_ids))
    ).all()
    return {int(bid): genre for bid, genre in rows}


def get_book_authors_map(db: Session, book_ids: list[int]) -> dict[int, str | None]:
    if not book_ids:
        return {}
    rows = db.execute(
        select(models.Book.id, models.Book.author).where(models.Book.id.in_(book_ids))
    ).all()
    return {int(bid): author for bid, author in rows}


def get_user_rating_values(db: Session, user_id: int) -> dict[int, float]:
    rows = db.execute(
        select(
            models.UserBookInteraction.book_id,
            models.UserBookInteraction.value,
        ).where(
            models.UserBookInteraction.user_id == user_id,
            models.UserBookInteraction.interaction_type == models.InteractionType.rating,
        )
    ).all()
    return {int(bid): float(val) for bid, val in rows}


# ── UserBookInteraction ───────────────────────────────────────────────────────

def get_user_rated_book_ids(db: Session, user_id: int) -> set[int]:
    rows = db.scalars(
        select(models.UserBookInteraction.book_id).where(
            models.UserBookInteraction.user_id == user_id,
            models.UserBookInteraction.interaction_type == models.InteractionType.rating,
        )
    ).all()
    return {int(bid) for bid in rows}


def get_user_bookmarked_book_ids(db: Session, user_id: int) -> set[int]:
    rows = db.scalars(
        select(models.UserBookInteraction.book_id).where(
            models.UserBookInteraction.user_id == user_id,
            models.UserBookInteraction.interaction_type == models.InteractionType.bookmark,
        )
    ).all()
    return {int(bid) for bid in rows}


def count_user_bookmarks(db: Session, user_id: int) -> int:
    return int(
        db.scalar(
            select(func.count())
            .select_from(models.UserBookInteraction)
            .where(
                models.UserBookInteraction.user_id == user_id,
                models.UserBookInteraction.interaction_type == models.InteractionType.bookmark,
            )
        )
        or 0
    )


def get_interaction(
    db: Session,
    user_id: int,
    book_id: int,
    interaction_type: models.InteractionType,
) -> models.UserBookInteraction | None:
    return db.scalar(
        select(models.UserBookInteraction).where(
            models.UserBookInteraction.user_id == user_id,
            models.UserBookInteraction.book_id == book_id,
            models.UserBookInteraction.interaction_type == interaction_type,
        )
    )


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


# ── Bookmarks ─────────────────────────────────────────────────────────────────

def is_book_bookmarked(db: Session, user_id: int, book_id: int) -> bool:
    return get_interaction(db, user_id, book_id, models.InteractionType.bookmark) is not None


def set_book_bookmark(db: Session, user_id: int, book_id: int, bookmarked: bool) -> bool:
    if bookmarked:
        upsert_interaction(
            db,
            schemas.InteractionCreate(
                user_id=user_id,
                book_id=book_id,
                interaction_type=models.InteractionType.bookmark,
                value=1.0,
            ),
        )
        return True
    delete_interaction(db, user_id, book_id, models.InteractionType.bookmark)
    return False


def list_user_bookmarks(db: Session, user_id: int, limit: int = 100) -> list[models.Book]:
    return list(
        db.scalars(
            select(models.Book)
            .join(
                models.UserBookInteraction,
                models.UserBookInteraction.book_id == models.Book.id,
            )
            .where(
                models.UserBookInteraction.user_id == user_id,
                models.UserBookInteraction.interaction_type == models.InteractionType.bookmark,
            )
            .order_by(models.UserBookInteraction.created_at.desc())
            .limit(limit)
        )
    )


# ── PostVote ──────────────────────────────────────────────────────────────────

def delete_interaction(
    db: Session,
    user_id: int,
    book_id: int,
    interaction_type: models.InteractionType,
) -> None:
    existing = get_interaction(db, user_id, book_id, interaction_type)
    if existing:
        db.delete(existing)
        db.commit()


def _sync_book_vote_signal(
    db: Session,
    user_id: int,
    book_id: int,
    vote_value: int | None,
) -> None:
    """Map a post vote to implicit book upvote/downvote interactions."""
    if vote_value == 1:
        delete_interaction(db, user_id, book_id, models.InteractionType.downvote)
        upsert_interaction(
            db,
            schemas.InteractionCreate(
                user_id=user_id,
                book_id=book_id,
                interaction_type=models.InteractionType.upvote,
                value=1.0,
            ),
        )
    elif vote_value == -1:
        delete_interaction(db, user_id, book_id, models.InteractionType.upvote)
        upsert_interaction(
            db,
            schemas.InteractionCreate(
                user_id=user_id,
                book_id=book_id,
                interaction_type=models.InteractionType.downvote,
                value=-1.0,
            ),
        )
    else:
        delete_interaction(db, user_id, book_id, models.InteractionType.upvote)
        delete_interaction(db, user_id, book_id, models.InteractionType.downvote)


def get_post_vote_scores(db: Session, post_ids: list[int]) -> dict[int, int]:
    if not post_ids:
        return {}
    rows = db.execute(
        select(models.PostVote.post_id, func.sum(models.PostVote.value))
        .where(models.PostVote.post_id.in_(post_ids))
        .group_by(models.PostVote.post_id)
    ).all()
    return {int(row.post_id): int(row[1]) for row in rows}


def get_user_votes_on_posts(
    db: Session, user_id: int, post_ids: list[int]
) -> dict[int, int]:
    if not post_ids:
        return {}
    rows = db.scalars(
        select(models.PostVote).where(
            models.PostVote.user_id == user_id,
            models.PostVote.post_id.in_(post_ids),
        )
    ).all()
    return {int(row.post_id): int(row.value) for row in rows}


def set_post_vote(
    db: Session, user_id: int, post_id: int, value: int
) -> models.Post | None:
    post = db.get(models.Post, post_id)
    if not post:
        return None

    existing = db.scalar(
        select(models.PostVote).where(
            models.PostVote.user_id == user_id,
            models.PostVote.post_id == post_id,
        )
    )

    if value == 0:
        if existing:
            db.delete(existing)
    elif existing:
        existing.value = value
    else:
        db.add(models.PostVote(user_id=user_id, post_id=post_id, value=value))

    db.commit()
    _sync_book_vote_signal(
        db, user_id, post.book_id, value if value != 0 else None
    )
    return post


def get_post_score(db: Session, post_id: int) -> int:
    total = db.scalar(
        select(func.coalesce(func.sum(models.PostVote.value), 0)).where(
            models.PostVote.post_id == post_id
        )
    )
    return int(total or 0)


# ── Comments ──────────────────────────────────────────────────────────────────

MAX_COMMENT_DEPTH = 2  # 0, 1, 2 → three visible levels


def get_comment(db: Session, comment_id: int) -> models.Comment | None:
    return db.scalar(
        select(models.Comment)
        .options(joinedload(models.Comment.author))
        .where(models.Comment.id == comment_id)
    )


def get_comment_depth(db: Session, comment: models.Comment) -> int:
    depth = 0
    current = comment
    while current.parent_id is not None:
        depth += 1
        parent = db.get(models.Comment, current.parent_id)
        if parent is None:
            break
        current = parent
    return depth


def get_post_comment_counts(db: Session, post_ids: list[int]) -> dict[int, int]:
    if not post_ids:
        return {}
    rows = db.execute(
        select(models.Comment.post_id, func.count(models.Comment.id))
        .where(models.Comment.post_id.in_(post_ids))
        .group_by(models.Comment.post_id)
    ).all()
    return {int(row.post_id): int(row[1]) for row in rows}


def get_comment_vote_scores(db: Session, comment_ids: list[int]) -> dict[int, int]:
    if not comment_ids:
        return {}
    rows = db.execute(
        select(models.CommentVote.comment_id, func.sum(models.CommentVote.value))
        .where(models.CommentVote.comment_id.in_(comment_ids))
        .group_by(models.CommentVote.comment_id)
    ).all()
    return {int(row.comment_id): int(row[1]) for row in rows}


def get_user_upvotes_on_comments(
    db: Session, user_id: int, comment_ids: list[int]
) -> set[int]:
    if not comment_ids:
        return set()
    rows = db.scalars(
        select(models.CommentVote.comment_id).where(
            models.CommentVote.user_id == user_id,
            models.CommentVote.comment_id.in_(comment_ids),
            models.CommentVote.value == 1,
        )
    ).all()
    return {int(cid) for cid in rows}


def list_comments_for_post(db: Session, post_id: int) -> list[models.Comment]:
    return list(
        db.scalars(
            select(models.Comment)
            .options(joinedload(models.Comment.author))
            .where(models.Comment.post_id == post_id)
            .order_by(models.Comment.created_at.asc())
        )
    )


def create_comment(
    db: Session,
    post_id: int,
    user_id: int,
    content: str,
    parent_id: int | None = None,
) -> models.Comment:
    if parent_id is not None:
        parent = get_comment(db, parent_id)
        if not parent or parent.post_id != post_id:
            raise ValueError("Parent comment not found on this post")
        if get_comment_depth(db, parent) >= MAX_COMMENT_DEPTH:
            raise ValueError("Maximum reply depth reached")

    comment = models.Comment(
        post_id=post_id,
        user_id=user_id,
        parent_id=parent_id,
        content=content.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return get_comment(db, comment.id)  # type: ignore[return-value]


def set_comment_vote(db: Session, user_id: int, comment_id: int, value: int) -> models.Comment | None:
    comment = get_comment(db, comment_id)
    if not comment:
        return None

    existing = db.scalar(
        select(models.CommentVote).where(
            models.CommentVote.user_id == user_id,
            models.CommentVote.comment_id == comment_id,
        )
    )

    if value == 0:
        if existing:
            db.delete(existing)
    elif existing:
        existing.value = 1
    else:
        db.add(models.CommentVote(user_id=user_id, comment_id=comment_id, value=1))

    db.commit()
    return comment


def get_comment_score(db: Session, comment_id: int) -> int:
    total = db.scalar(
        select(func.coalesce(func.sum(models.CommentVote.value), 0)).where(
            models.CommentVote.comment_id == comment_id
        )
    )
    return int(total or 0)


def delete_comment(db: Session, comment_id: int, user_id: int) -> bool:
    comment = get_comment(db, comment_id)
    if not comment or comment.user_id != user_id:
        return False
    db.delete(comment)
    db.commit()
    return True


def build_comment_tree(
    comments: list[models.Comment],
    scores: dict[int, int],
    user_upvotes: set[int],
    sort: str,
) -> list[schemas.CommentOut]:
    """Assemble flat comments into a nested tree for the API response."""
    by_id: dict[int, models.Comment] = {c.id: c for c in comments}
    children: dict[int | None, list[models.Comment]] = {}

    for c in comments:
        children.setdefault(c.parent_id, []).append(c)

    def sort_key(comment: models.Comment) -> tuple:
        if sort == "new":
            return (-comment.created_at.timestamp(),)
        return (-scores.get(comment.id, 0), -comment.created_at.timestamp())

    def depth_of(comment: models.Comment) -> int:
        d = 0
        cur = comment
        while cur.parent_id is not None and cur.parent_id in by_id:
            d += 1
            cur = by_id[cur.parent_id]
        return d

    def to_out(comment: models.Comment) -> schemas.CommentOut:
        parent = by_id.get(comment.parent_id) if comment.parent_id else None
        reply_to = parent.author.username if parent else None
        kids = children.get(comment.id, [])
        kids_sorted = sorted(kids, key=sort_key)
        if sort == "new" and kids_sorted:
            kids_sorted = sorted(kids, key=lambda c: c.created_at)
        return schemas.CommentOut(
            id=comment.id,
            post_id=comment.post_id,
            user_id=comment.user_id,
            username=comment.author.username,
            parent_id=comment.parent_id,
            reply_to_username=reply_to,
            content=comment.content,
            created_at=comment.created_at,
            score=scores.get(comment.id, 0),
            user_upvoted=comment.id in user_upvotes,
            depth=depth_of(comment),
            replies=[to_out(child) for child in kids_sorted],
        )

    roots = sorted(children.get(None, []), key=sort_key)
    if sort == "new":
        roots = sorted(children.get(None, []), key=lambda c: -c.created_at.timestamp())
    return [to_out(r) for r in roots]
