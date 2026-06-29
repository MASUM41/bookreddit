from __future__ import annotations

import threading
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import auth, crud, models, schemas
from .crud import FeedSort
from .database import Base, engine, get_db
from .media_storage import UPLOAD_DIR, parse_video_embed, save_upload
from .migrate import run_migrations
from .models import InteractionType
from .book_covers import resolve_cover_url
from .content_recommender import content_recommender
from .hybrid_recommender import hybrid_recommend
from .recommender import recommender
from .onboarding import derive_archetype, effective_genre_boosts, parse_onboarding
from .reader_taste import build_reader_taste, taste_compatibility
from .retrain_scheduler import schedule_mf_retrain

# Create all tables on startup
Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(title="Readit API")
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _train_recommenders_background() -> None:
    """Train content + MF models without blocking HTTP requests."""
    def run() -> None:
        try:
            content_result = content_recommender.fit()
            print(
                f"Content recommender trained: {content_result['n_books']:,} books, "
                f"{content_result['n_components']} SVD factors, "
                f"variance explained {content_result['explained_variance']:.1%}"
            )
        except ValueError as exc:
            print(f"Content recommender skipped: {exc}")

        try:
            result = recommender.fit()
            print(
                f"MF recommender trained: {result['matrix_shape'][0]} users × "
                f"{result['matrix_shape'][1]} books, init={result.get('init_method')}, "
                f"ALS loss {result.get('als_final_loss')}, SGD loss {result['final_loss']}"
            )
        except ValueError:
            print("MF recommender skipped: no rating data in database yet.")

    thread = threading.Thread(target=run, daemon=True, name="recommender-startup")
    thread.start()


@app.on_event("startup")
def train_recommenders_on_startup() -> None:
    """Kick off model training in the background so the API is responsive immediately."""
    _train_recommenders_background()


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/auth/register", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def register(data: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_username(db, data.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    if crud.get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = crud.create_user(db, data)
    token = auth.create_access_token(user.id, user.username)
    return schemas.AuthResponse(access_token=token, user=user)


@app.post("/auth/login", response_model=schemas.AuthResponse)
def login(data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, data.username, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = auth.create_access_token(user.id, user.username)
    return schemas.AuthResponse(access_token=token, user=user)


@app.get("/auth/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# ── Users ─────────────────────────────────────────────────────────────────────

@app.post("/users/", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def create_user(data: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_username(db, data.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.create_user(db, data)


@app.get("/users/by-name/{username}", response_model=schemas.UserProfileOut)
def get_user_profile(username: str, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return schemas.UserProfileOut(
        id=user.id,
        username=user.username,
        email=user.email,
        created_at=user.created_at,
        post_count=crud.count_posts_by_user(db, user.id),
        rating_count=crud.count_user_ratings(db, user.id),
    )


@app.get("/users/by-name/{username}/posts", response_model=list[schemas.PostFeedItem])
def list_user_posts(
    username: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(auth.get_optional_user),
):
    user = crud.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    posts = crud.list_posts_by_user(db, user.id, skip=skip, limit=limit)
    return _feed_items_for_posts(db, posts, current_user)


@app.get("/users/{user_id}/ratings", response_model=list[schemas.UserRatingOut])
def list_user_ratings(user_id: int, limit: int = 50, db: Session = Depends(get_db)):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    interactions = crud.list_user_ratings(db, user_id, limit=limit)
    return [
        schemas.UserRatingOut(
            book_id=i.book_id,
            title=i.book.title,
            author=i.book.author,
            genre=i.book.genre,
            value=i.value,
            rated_at=i.created_at,
        )
        for i in interactions
    ]


@app.get("/users/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ── Books ─────────────────────────────────────────────────────────────────────

@app.post("/books/", response_model=schemas.BookOut, status_code=status.HTTP_201_CREATED)
def create_book(data: schemas.BookCreate, db: Session = Depends(get_db)):
    return crud.create_book(db, data)


@app.get("/books/", response_model=list[schemas.BookOut])
def list_books(
    skip: int = 0,
    limit: int = 50,
    genre: str | None = None,
    db: Session = Depends(get_db),
):
    return crud.list_books(db, skip=skip, limit=limit, genre=genre)


@app.get("/books/genres", response_model=list[schemas.GenreOut])
def list_genres(limit: int = 100, db: Session = Depends(get_db)):
    return [
        schemas.GenreOut(genre=name, slug=crud.genre_slug(name), count=count)
        for name, count in crud.list_genres_with_counts(db, limit=limit)
    ]


@app.get("/books/search", response_model=list[schemas.BookOut])
def search_books(q: str = "", limit: int = 20, db: Session = Depends(get_db)):
    return crud.search_books(db, q, limit=limit)


@app.get("/books/{book_id}", response_model=schemas.BookOut)
def get_book(book_id: int, db: Session = Depends(get_db)):
    book = crud.get_book(db, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@app.get("/books/{book_id}/similar", response_model=list[schemas.SimilarBookOut])
def similar_books(
    book_id: int,
    n: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db),
):
    if not crud.get_book(db, book_id):
        raise HTTPException(status_code=404, detail="Book not found")
    try:
        entries = content_recommender.similar_books(book_id, n=n)
    except RuntimeError as exc:
        raise HTTPException(status_code=425, detail=str(exc))

    results: list[schemas.SimilarBookOut] = []
    for entry in entries:
        book = crud.get_book(db, int(entry["book_id"]))
        if book:
            results.append(
                schemas.SimilarBookOut(
                    book_id=book.id,
                    title=book.title,
                    author=book.author,
                    genre=book.genre,
                    cover_url=_book_cover(book),
                    predicted_score=entry["predicted_score"],
                    source="content",
                )
            )
    return results


@app.get("/books/{book_id}/similar/collaborative", response_model=list[schemas.SimilarBookOut])
def similar_books_collaborative(
    book_id: int,
    n: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db),
):
    if not crud.get_book(db, book_id):
        raise HTTPException(status_code=404, detail="Book not found")
    try:
        entries = recommender.similar_books_collaborative(book_id, n=n)
    except RuntimeError as exc:
        raise HTTPException(status_code=425, detail=str(exc))

    results: list[schemas.SimilarBookOut] = []
    for entry in entries:
        book = crud.get_book(db, int(entry["book_id"]))
        if book:
            results.append(
                schemas.SimilarBookOut(
                    book_id=book.id,
                    title=book.title,
                    author=book.author,
                    genre=book.genre,
                    cover_url=_book_cover(book),
                    predicted_score=entry["predicted_score"],
                    reason="Readers who liked this also enjoyed",
                    source="collaborative",
                )
            )
    return results


@app.get("/books/{book_id}/rating", response_model=schemas.BookRatingOut)
def get_my_book_rating(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not crud.get_book(db, book_id):
        raise HTTPException(status_code=404, detail="Book not found")
    interaction = crud.get_interaction(
        db, current_user.id, book_id, InteractionType.rating
    )
    return schemas.BookRatingOut(
        book_id=book_id,
        user_id=current_user.id,
        value=interaction.value if interaction else None,
    )


@app.put("/books/{book_id}/rating", response_model=schemas.InteractionOut)
def set_book_rating(
    book_id: int,
    data: schemas.RatingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not crud.get_book(db, book_id):
        raise HTTPException(status_code=404, detail="Book not found")

    interaction = crud.upsert_interaction(
        db,
        schemas.InteractionCreate(
            user_id=current_user.id,
            book_id=book_id,
            interaction_type=InteractionType.rating,
            value=data.value,
        ),
    )

    try:
        schedule_mf_retrain()
    except Exception:
        pass

    return interaction


@app.get("/books/{book_id}/bookmark", response_model=schemas.BookmarkOut)
def get_my_bookmark(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not crud.get_book(db, book_id):
        raise HTTPException(status_code=404, detail="Book not found")
    return schemas.BookmarkOut(
        book_id=book_id,
        user_id=current_user.id,
        bookmarked=crud.is_book_bookmarked(db, current_user.id, book_id),
    )


@app.put("/books/{book_id}/bookmark", response_model=schemas.BookmarkOut)
def set_my_bookmark(
    book_id: int,
    data: schemas.BookmarkSet,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not crud.get_book(db, book_id):
        raise HTTPException(status_code=404, detail="Book not found")
    crud.set_book_bookmark(db, current_user.id, book_id, data.bookmarked)
    return schemas.BookmarkOut(
        book_id=book_id,
        user_id=current_user.id,
        bookmarked=data.bookmarked,
    )


@app.get("/users/me/bookmarks", response_model=list[schemas.BookOut])
def list_my_bookmarks(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return crud.list_user_bookmarks(db, current_user.id, limit=limit)


# ── Media uploads ─────────────────────────────────────────────────────────────

@app.post("/media/upload", response_model=schemas.MediaUploadOut)
async def upload_media(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Upload a photo or video for a post (auth required)."""
    del current_user  # auth gate only
    media_url, media_type = await save_upload(file)
    return schemas.MediaUploadOut(media_url=media_url, media_type=media_type)


@app.post("/media/embed", response_model=schemas.MediaEmbedOut)
def parse_media_embed(
    data: schemas.MediaEmbedIn,
    current_user: models.User = Depends(auth.get_current_user),
):
    """Parse a YouTube or Vimeo URL into an embeddable media_url."""
    del current_user
    embed_url = parse_video_embed(data.url)
    if not embed_url:
        raise HTTPException(
            status_code=400,
            detail="Unsupported video link. Use a YouTube or Vimeo URL.",
        )
    return schemas.MediaEmbedOut(media_url=embed_url)


# ── Posts ─────────────────────────────────────────────────────────────────────

def _book_cover(book: models.Book) -> str | None:
    return resolve_cover_url(book.cover_url, book.isbn)


def _post_feed_item(
    p: models.Post,
    *,
    score: int = 0,
    user_vote: int | None = None,
    comment_count: int = 0,
) -> schemas.PostFeedItem:
    return schemas.PostFeedItem(
        id=p.id,
        user_id=p.user_id,
        username=p.author.username,
        book_id=p.book_id,
        book_title=p.book.title,
        book_author=p.book.author,
        book_genre=p.book.genre,
        book_cover_url=_book_cover(p.book),
        title=p.title,
        content=p.content,
        media_url=p.media_url,
        media_type=p.media_type,
        created_at=p.created_at,
        score=score,
        user_vote=user_vote,
        comment_count=comment_count,
    )


def _feed_items_for_posts(
    db: Session,
    posts: list[models.Post],
    current_user: models.User | None = None,
) -> list[schemas.PostFeedItem]:
    post_ids = [p.id for p in posts]
    scores = crud.get_post_vote_scores(db, post_ids)
    comment_counts = crud.get_post_comment_counts(db, post_ids)
    user_votes = (
        crud.get_user_votes_on_posts(db, current_user.id, post_ids)
        if current_user
        else {}
    )
    return [
        _post_feed_item(
            p,
            score=scores.get(p.id, 0),
            user_vote=user_votes.get(p.id),
            comment_count=comment_counts.get(p.id, 0),
        )
        for p in posts
    ]


@app.post("/posts/", response_model=schemas.PostFeedItem, status_code=status.HTTP_201_CREATED)
def create_post(
    data: schemas.PostCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not crud.get_book(db, data.book_id):
        raise HTTPException(status_code=404, detail="Book not found")
    post = crud.create_post(db, user_id=current_user.id, data=data)
    enriched = crud.get_post_enriched(db, post.id)
    if not enriched:
        raise HTTPException(status_code=500, detail="Failed to load created post")
    return _post_feed_item(enriched)


@app.post(
    "/users/{user_id}/posts/",
    response_model=schemas.PostOut,
    status_code=status.HTTP_201_CREATED,
)
def create_post_for_user(user_id: int, data: schemas.PostCreate, db: Session = Depends(get_db)):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    if not crud.get_book(db, data.book_id):
        raise HTTPException(status_code=404, detail="Book not found")
    return crud.create_post(db, user_id=user_id, data=data)


@app.get("/books/{book_id}/posts/", response_model=list[schemas.PostFeedItem])
def list_posts(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(auth.get_optional_user),
):
    if not crud.get_book(db, book_id):
        raise HTTPException(status_code=404, detail="Book not found")
    posts = crud.list_posts_for_book(db, book_id)
    return _feed_items_for_posts(db, posts, current_user)


@app.get("/posts/{post_id}", response_model=schemas.PostFeedItem)
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(auth.get_optional_user),
):
    post = crud.get_post_enriched(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    items = _feed_items_for_posts(db, [post], current_user)
    return items[0]


@app.put("/posts/{post_id}", response_model=schemas.PostFeedItem)
def update_post(
    post_id: int,
    data: schemas.PostUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    updated = crud.update_post(db, post_id, current_user.id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Post not found or not yours")
    items = _feed_items_for_posts(db, [updated], current_user)
    return items[0]


@app.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not crud.delete_post(db, post_id, current_user.id):
        raise HTTPException(status_code=404, detail="Post not found or not yours")


@app.get("/posts/", response_model=list[schemas.PostFeedItem])
def list_feed(
    skip: int = 0,
    limit: int = 50,
    sort: FeedSort = Query("new", description="new | hot | top"),
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(auth.get_optional_user),
):
    """Global discussion feed with optional Hot / New / Top sorting."""
    posts = crud.list_feed_posts(db, skip=skip, limit=limit, sort=sort)
    return _feed_items_for_posts(db, posts, current_user)


@app.put("/posts/{post_id}/vote", response_model=schemas.PostVoteOut)
def vote_on_post(
    post_id: int,
    data: schemas.PostVoteSet,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    post = crud.set_post_vote(db, current_user.id, post_id, data.value)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    schedule_mf_retrain()

    user_vote = data.value if data.value != 0 else None
    return schemas.PostVoteOut(
        post_id=post_id,
        score=crud.get_post_score(db, post_id),
        user_vote=user_vote,
    )


# ── Comments ──────────────────────────────────────────────────────────────────

CommentSort = Literal["top", "new"]


@app.get("/posts/{post_id}/comments", response_model=list[schemas.CommentOut])
def list_post_comments(
    post_id: int,
    sort: CommentSort = Query("top", description="top | new"),
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(auth.get_optional_user),
):
    if not crud.get_post_enriched(db, post_id):
        raise HTTPException(status_code=404, detail="Post not found")

    comments = crud.list_comments_for_post(db, post_id)
    comment_ids = [c.id for c in comments]
    scores = crud.get_comment_vote_scores(db, comment_ids)
    user_upvotes = (
        crud.get_user_upvotes_on_comments(db, current_user.id, comment_ids)
        if current_user
        else set()
    )
    return crud.build_comment_tree(comments, scores, user_upvotes, sort)


@app.post(
    "/posts/{post_id}/comments",
    response_model=schemas.CommentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_post_comment(
    post_id: int,
    data: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not crud.get_post_enriched(db, post_id):
        raise HTTPException(status_code=404, detail="Post not found")
    try:
        comment = crud.create_comment(
            db, post_id, current_user.id, data.content, data.parent_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not comment:
        raise HTTPException(status_code=500, detail="Failed to create comment")

    parent = crud.get_comment(db, comment.parent_id) if comment.parent_id else None
    return schemas.CommentOut(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        username=comment.author.username,
        parent_id=comment.parent_id,
        reply_to_username=parent.author.username if parent else None,
        content=comment.content,
        created_at=comment.created_at,
        score=0,
        user_upvoted=False,
        depth=crud.get_comment_depth(db, comment),
        replies=[],
    )


@app.put("/comments/{comment_id}/vote", response_model=schemas.CommentVoteOut)
def vote_on_comment(
    comment_id: int,
    data: schemas.CommentVoteSet,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    comment = crud.set_comment_vote(db, current_user.id, comment_id, data.value)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    return schemas.CommentVoteOut(
        comment_id=comment_id,
        score=crud.get_comment_score(db, comment_id),
        user_upvoted=data.value == 1,
    )


@app.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not crud.delete_comment(db, comment_id, current_user.id):
        raise HTTPException(status_code=404, detail="Comment not found or not yours")


# ── Interactions ──────────────────────────────────────────────────────────────

@app.post(
    "/interactions/",
    response_model=schemas.InteractionOut,
    status_code=status.HTTP_201_CREATED,
)
def log_interaction(data: schemas.InteractionCreate, db: Session = Depends(get_db)):
    """
    Log or update a user→book signal.
    Idempotent: re-posting the same (user, book, type) updates the value.
    """
    if not crud.get_user(db, data.user_id):
        raise HTTPException(status_code=404, detail="User not found")
    if not crud.get_book(db, data.book_id):
        raise HTTPException(status_code=404, detail="Book not found")
    return crud.upsert_interaction(db, data)


@app.get(
    "/interactions/matrix/",
    response_model=list[schemas.SparseMatrixRow],
)
def get_sparse_matrix_data(
    interaction_type: InteractionType = InteractionType.rating,
    db: Session = Depends(get_db),
):
    """
    Returns all (user_id, book_id, value) triplets for the given interaction
    type.  Downstream callers can feed this directly into scipy.sparse or
    numpy for matrix factorisation / SVD-based recommendations.
    """
    rows = crud.get_interaction_matrix_rows(db, interaction_type)
    return [
        schemas.SparseMatrixRow(user_id=u, book_id=b, value=v)
        for u, b, v in rows
    ]


# ── Recommendations ───────────────────────────────────────────────────────────

@app.post("/recommendations/train", response_model=schemas.TrainResponse)
def train_recommender():
    """
    Re-train MF from star-rating interactions (collaborative signal).

    After importing a new catalog, call POST /recommendations/train-content
    to refresh description-based vectors.
    """
    try:
        result = recommender.fit()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return result


@app.post("/recommendations/train-content")
def train_content_recommender():
    """Rebuild TF-IDF + SVD content vectors from the current book catalog."""
    try:
        return content_recommender.fit()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


# ── Recommendation helpers ────────────────────────────────────────────────────

def _onboarding_rec_kwargs(user: models.User | None) -> dict:
    ob = parse_onboarding(user)
    return {
        "onboarding_genre_boosts": effective_genre_boosts(ob["mood"], ob["genres"]),
        "serendipity_beta": ob["serendipity_beta"],
    }


def _hybrid_recommendations_for_user(
    db: Session,
    user_id: int,
    n: int,
) -> tuple[list[dict], str, dict, bool]:
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    catalog_ids = list(content_recommender.idx_to_book_id.values())
    rated_ids = crud.get_user_rated_book_ids(db, user_id)
    bookmarked_ids = crud.get_user_bookmarked_book_ids(db, user_id)
    rated_values = crud.get_user_rating_values(db, user_id)
    book_genres = crud.get_book_genres_map(db, catalog_ids)
    book_authors = crud.get_book_authors_map(db, catalog_ids)
    rec_kw = _onboarding_rec_kwargs(user)

    top_books, strategy, meta = hybrid_recommend(
        user_id,
        rated_ids,
        n=n,
        rated_values=rated_values,
        bookmarked_book_ids=bookmarked_ids,
        book_genres=book_genres,
        book_authors=book_authors,
        **rec_kw,
    )
    cold_start = len(rated_ids) == 0
    return top_books, strategy, meta, cold_start


def _enriched_recommendations(
    db: Session,
    top_books: list[dict],
) -> list[schemas.RecommendedBook]:
    recommendations: list[schemas.RecommendedBook] = []
    for entry in top_books:
        book_id = int(entry["book_id"])
        book = crud.get_book(db, book_id)
        if book:
            recommendations.append(
                schemas.RecommendedBook(
                    book_id=book.id,
                    title=book.title,
                    author=book.author,
                    genre=book.genre,
                    cover_url=_book_cover(book),
                    predicted_score=entry["predicted_score"],
                    reason=entry.get("reason"),
                )
            )
    return recommendations


# ── Reader taste & onboarding ───────────────────────────────────────────────────

@app.post("/users/me/onboarding", response_model=schemas.OnboardingResultOut)
def submit_onboarding(
    data: schemas.OnboardingSubmit,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Save signup quiz and return archetype + starter recommendations."""
    if current_user.onboarding_completed:
        raise HTTPException(status_code=400, detail="Onboarding already completed")

    if data.skip:
        archetype, tagline = derive_archetype(None, None, [])
        payload = {"skipped": True}
    else:
        archetype, tagline = derive_archetype(data.mood, data.this_or_that, data.genres)
        payload = {
            "mood": data.mood,
            "this_or_that": data.this_or_that,
            "genres": data.genres,
            "book_ids": data.book_ids,
        }

    crud.complete_user_onboarding(
        db, current_user, data, archetype=archetype, payload=payload
    )
    schedule_mf_retrain()

    db.refresh(current_user)
    try:
        top_books, _, _, _ = _hybrid_recommendations_for_user(db, current_user.id, n=5)
        recs = _enriched_recommendations(db, top_books)
    except RuntimeError:
        recs = []

    return schemas.OnboardingResultOut(
        archetype=archetype,
        tagline=tagline,
        recommendations=recs,
    )


@app.get("/users/me/reader-taste", response_model=schemas.ReaderTasteOut)
def get_my_reader_taste(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Your Reading DNA — genre mix, reader archetype, and exploration score."""
    return build_reader_taste(db, current_user.id)


@app.get("/users/{user_id}/taste-match", response_model=schemas.TasteCompatibilityOut)
def get_taste_match(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """How similar your taste is to another reader (MF or content latent space)."""
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    result = taste_compatibility(current_user.id, user_id, db)
    if result is None:
        raise HTTPException(
            status_code=425,
            detail="Not enough data to compare tastes yet. Rate or save a few books first.",
        )
    return result


@app.get("/users/me/read-next", response_model=schemas.RecommendationResponse)
def get_read_next(
    n: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Personalised reading queue — diverse picks with reasons (BookReddit exclusive)."""
    user_id = current_user.id
    try:
        top_books, strategy, meta, cold_start = _hybrid_recommendations_for_user(
            db, user_id, n=n
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=425, detail=str(exc))

    recommendations = _enriched_recommendations(db, top_books)

    return schemas.RecommendationResponse(
        user_id=user_id,
        recommendations=recommendations,
        cold_start=cold_start,
        strategy=strategy,
        mf_weight=meta["mf_weight"],
        content_weight=meta["content_weight"],
        n_ratings=meta["n_ratings"],
        n_bookmarks=meta["n_bookmarks"],
        blend_method=meta.get("blend_method", "heuristic"),
        ranking=meta.get("ranking", "constrained_mmr"),
    )


@app.get("/recommendations/{user_id}", response_model=schemas.RecommendationResponse)
def get_recommendations(user_id: int, db: Session = Depends(get_db)):
    """
    Return the top-5 book recommendations for a user.

    Blends matrix factorization (collaborative) with TF-IDF + SVD on
  descriptions (content). Weight shifts toward MF as the user rates more books.
    """
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")

    try:
        top_books, strategy, meta, cold_start = _hybrid_recommendations_for_user(
            db, user_id, n=5
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=425, detail=str(exc))

    recommendations = _enriched_recommendations(db, top_books)

    return schemas.RecommendationResponse(
        user_id=user_id,
        recommendations=recommendations,
        cold_start=cold_start,
        strategy=strategy,
        mf_weight=meta["mf_weight"],
        content_weight=meta["content_weight"],
        n_ratings=meta["n_ratings"],
        n_bookmarks=meta["n_bookmarks"],
        blend_method=meta.get("blend_method", "heuristic"),
        ranking=meta.get("ranking", "constrained_mmr"),
    )


# ── Health & production SPA ───────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok", "app": "readit"}


_STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if _STATIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(_STATIC_DIR), html=True), name="frontend")
