from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .database import Base, engine, get_db
from .models import InteractionType
from .recommender import recommender

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="BookReddit API")


# ── Users ─────────────────────────────────────────────────────────────────────

@app.post("/users/", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def create_user(data: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_username(db, data.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.create_user(db, data)


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
def list_books(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return crud.list_books(db, skip=skip, limit=limit)


@app.get("/books/{book_id}", response_model=schemas.BookOut)
def get_book(book_id: int, db: Session = Depends(get_db)):
    book = crud.get_book(db, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


# ── Posts ─────────────────────────────────────────────────────────────────────

@app.post(
    "/users/{user_id}/posts/",
    response_model=schemas.PostOut,
    status_code=status.HTTP_201_CREATED,
)
def create_post(user_id: int, data: schemas.PostCreate, db: Session = Depends(get_db)):
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    if not crud.get_book(db, data.book_id):
        raise HTTPException(status_code=404, detail="Book not found")
    return crud.create_post(db, user_id=user_id, data=data)


@app.get("/books/{book_id}/posts/", response_model=list[schemas.PostOut])
def list_posts(book_id: int, db: Session = Depends(get_db)):
    if not crud.get_book(db, book_id):
        raise HTTPException(status_code=404, detail="Book not found")
    return crud.list_posts_for_book(db, book_id)


@app.get("/posts/", response_model=list[schemas.PostFeedItem])
def list_feed(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """Global discussion feed, newest first, enriched with author and book metadata."""
    posts = crud.list_feed_posts(db, skip=skip, limit=limit)
    return [
        schemas.PostFeedItem(
            id=p.id,
            user_id=p.user_id,
            username=p.author.username,
            book_id=p.book_id,
            book_title=p.book.title,
            book_author=p.book.author,
            title=p.title,
            content=p.content,
            created_at=p.created_at,
        )
        for p in posts
    ]


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
    Load all rating interactions from the DB, build the interaction matrix,
    and run SGD matrix factorization to fit user and book latent vectors.

    Call this endpoint after loading enough rating data.  Re-calling it
    re-trains from scratch on the current DB state.
    """
    try:
        result = recommender.fit()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return result


@app.get("/recommendations/{user_id}", response_model=schemas.RecommendationResponse)
def get_recommendations(user_id: int, db: Session = Depends(get_db)):
    """
    Return the top-5 book recommendations for a user.

    Scoring: ŝᵤ = P[u] @ Q.T
        P[u]  — trained latent factor vector for this user  (1 × k)
        Q.T   — all book latent vectors transposed          (k × n_books)

    Books the user has already rated are excluded from results.
    """
    if not crud.get_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")

    try:
        top_books = recommender.recommend(user_id, n=5)
    except RuntimeError as exc:
        raise HTTPException(status_code=425, detail=str(exc))
    except KeyError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Hydrate book_ids → full Book rows so the response carries useful metadata
    # book_id values are guaranteed Python int (not numpy.int64) by the recommender
    recommendations: list[schemas.RecommendedBook] = []
    for entry in top_books:
        book_id = int(entry["book_id"])   # belt-and-suspenders cast for SQLAlchemy 2.0
        book = crud.get_book(db, book_id)
        if book:
            recommendations.append(
                schemas.RecommendedBook(
                    book_id=book.id,
                    title=book.title,
                    author=book.author,
                    genre=book.genre,
                    predicted_score=entry["predicted_score"],
                )
            )

    return schemas.RecommendationResponse(user_id=user_id, recommendations=recommendations)
