"""Lightweight SQLite migrations for columns added after first deploy."""

from __future__ import annotations

from sqlalchemy import text

from .database import engine


def run_migrations() -> None:
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(posts)")).fetchall()
        names = {row[1] for row in rows}
        if "media_url" not in names:
            conn.execute(text("ALTER TABLE posts ADD COLUMN media_url VARCHAR(512)"))
        if "media_type" not in names:
            conn.execute(text("ALTER TABLE posts ADD COLUMN media_type VARCHAR(16)"))

        user_rows = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        user_cols = {row[1] for row in user_rows}
        if "onboarding_completed" not in user_cols:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT 0"
            ))
            conn.execute(text("UPDATE users SET onboarding_completed = 1"))
        if "onboarding_archetype" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN onboarding_archetype VARCHAR(120)"))
        if "onboarding_payload" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN onboarding_payload TEXT"))

        book_rows = conn.execute(text("PRAGMA table_info(books)")).fetchall()
        book_cols = {row[1] for row in book_rows}
        if "cover_url" not in book_cols:
            conn.execute(text("ALTER TABLE books ADD COLUMN cover_url VARCHAR(512)"))
