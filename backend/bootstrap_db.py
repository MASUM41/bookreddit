"""Ensure catalog exists (used at Docker build and container start)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import func, select

from app.database import Base, SessionLocal, engine
from app.migrate import run_migrations
from app.models import Book

BACKEND_DIR = Path(__file__).resolve().parent
CATALOG_CANDIDATES = [
    BACKEND_DIR / "Final_Merged_Dataset.csv",
    BACKEND_DIR / "data" / "my_new_books.csv",
    BACKEND_DIR / "data" / "books.sample.csv",
]


def resolve_catalog_csv(explicit: Path | None = None) -> Path | None:
    if explicit and explicit.exists():
        return explicit
    for path in CATALOG_CANDIDATES:
        if path.exists():
            return path
    return None


def book_count() -> int:
    db = SessionLocal()
    try:
        return db.scalar(select(func.count()).select_from(Book)) or 0
    finally:
        db.close()


def ensure_catalog(csv_path: Path | None = None, *, min_books: int = 100) -> int:
    """Create schema and import catalog if the DB is empty or tiny."""
    Base.metadata.create_all(bind=engine)
    run_migrations()

    count = book_count()
    if count >= min_books:
        print(f"Catalog OK ({count:,} books).")
        return count

    path = resolve_catalog_csv(csv_path)
    if not path:
        print(f"No catalog CSV found; skipping import ({count:,} books).")
        return count

    print(f"Importing catalog from {path.name} ({count:,} books currently)…")
    from import_books import import_books

    result = import_books(path)
    final = result.get("total") or book_count()
    print(f"Import done — {final:,} books in DB.")
    return final


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap Readit SQLite catalog")
    parser.add_argument("--csv", type=Path, default=None)
    parser.add_argument("--min-books", type=int, default=100)
    args = parser.parse_args()

    try:
        ensure_catalog(args.csv, min_books=args.min_books)
    except Exception as exc:
        print(f"Bootstrap failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
