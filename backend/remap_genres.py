"""
One-time (or repeat-safe) remap of book.genre from Class_No codes to Dewey categories.

Usage (from backend/):
  python remap_genres.py
  python remap_genres.py --dry-run
"""

from __future__ import annotations

import argparse

from sqlalchemy import select

from app.database import SessionLocal
from app.dewey_genres import dewey_to_genre, looks_like_class_no
from app.models import Book


def main() -> None:
    parser = argparse.ArgumentParser(description="Remap Class_No values to Dewey genre labels")
    parser.add_argument("--dry-run", action="store_true", help="Print changes without saving")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        books = list(db.scalars(select(Book).where(Book.genre.isnot(None), Book.genre != "")))
        updated = 0
        samples: list[str] = []

        for book in books:
            if not looks_like_class_no(book.genre):
                continue
            new_genre = dewey_to_genre(book.genre)
            if new_genre == book.genre:
                continue
            if len(samples) < 8:
                samples.append(f"  {book.genre!r} -> {new_genre!r}")
            if not args.dry_run:
                book.genre = new_genre
            updated += 1

        if not args.dry_run and updated:
            db.commit()

        mode = "Would update" if args.dry_run else "Updated"
        print(f"{mode} {updated:,} of {len(books):,} books with genre set.")
        for line in samples:
            print(line)
        if updated > len(samples):
            print(f"  ... and {updated - len(samples):,} more")
    finally:
        db.close()


if __name__ == "__main__":
    main()
