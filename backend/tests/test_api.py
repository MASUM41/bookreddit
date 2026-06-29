"""API integration tests for BookReddit."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app import crud, schemas
from app.models import InteractionType

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def _register(username: str = "tester", email: str = "t@bookreddit.dev", password: str = "password123"):
    return client.post(
        "/auth/register",
        json={"username": username, "email": email, "password": password},
    )


def test_register_and_login():
    reg = _register()
    assert reg.status_code == 201
    assert "access_token" in reg.json()

    login = client.post("/auth/login", json={"username": "tester", "password": "password123"})
    assert login.status_code == 200
    assert login.json()["user"]["username"] == "tester"


def test_feed_sort_modes():
    reg = _register()
    token = reg.json()["access_token"]
    user_id = reg.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    db = TestingSessionLocal()
    book = crud.create_book(
        db,
        schemas.BookCreate(title="Test Book", author="Author", genre="Literature"),
    )
    crud.create_post(
        db,
        user_id=user_id,
        data=schemas.PostCreate(book_id=book.id, title="Post A", content="Hello world"),
    )
    db.close()

    for sort in ("new", "hot", "top"):
        resp = client.get("/posts/", params={"sort": sort})
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    authed = client.get("/posts/", params={"sort": "hot"}, headers=headers)
    assert authed.status_code == 200


def test_genres_endpoint():
    db = TestingSessionLocal()
    crud.create_book(
        db,
        schemas.BookCreate(title="B1", author="A1", genre="Literature"),
    )
    crud.create_book(
        db,
        schemas.BookCreate(title="B2", author="A2", genre="Science & Math"),
    )
    db.close()

    resp = client.get("/books/genres")
    assert resp.status_code == 200
    genres = resp.json()
    assert any(g["genre"] == "Literature" for g in genres)


def test_user_profile():
    _register("alice", "alice@bookreddit.dev")
    resp = client.get("/users/by-name/alice")
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "alice"
    assert data["post_count"] == 0


def test_upvote_interaction_stored():
    reg = _register("bob", "bob@bookreddit.dev")
    user_id = reg.json()["user"]["id"]

    db = TestingSessionLocal()
    book = crud.create_book(
        db,
        schemas.BookCreate(title="Signal Book", author="Auth", genre="Literature"),
    )
    crud.upsert_interaction(
        db,
        schemas.InteractionCreate(
            user_id=user_id,
            book_id=book.id,
            interaction_type=InteractionType.upvote,
            value=1.0,
        ),
    )
    interaction = crud.get_interaction(db, user_id, book.id, InteractionType.upvote)
    db.close()

    assert interaction is not None
    assert interaction.value == 1.0
