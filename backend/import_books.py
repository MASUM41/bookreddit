"""
import_books.py — bulk load the book catalog from CSV or JSON into SQLite.

Expected columns (names are flexible — see COLUMN_ALIASES below):
  title, author, genre, description, isbn (optional)

Usage (from backend/):
  python import_books.py path/to/books.csv
  python import_books.py path/to/books.json
  python import_books.py path/to/books.csv --dry-run
  python import_books.py path/to/books.csv --limit 100
  python import_books.py path/to/new_books.csv --clear-books   # replace entire catalog

Place your CSV anywhere, e.g. backend/data/books.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

from sqlalchemy import delete, func, select

from app.database import Base, SessionLocal, engine
from app.book_covers import resolve_cover_url
from app.dewey_genres import dewey_to_genre, looks_like_class_no
from app.models import Book, Post, PostVote, UserBookInteraction

# ── Column aliases (lowercase keys) ───────────────────────────────────────────

COLUMN_ALIASES: dict[str, list[str]] = {
    "title": ["title", "book_title", "name", "book name"],
    "author": ["author", "authors", "writer", "book_author", "author_editor"],
    "genre": ["genre", "genres", "category", "categories", "subject", "class_no"],
    "description": ["description", "desc", "summary", "synopsis", "overview", "about"],
    "isbn": ["isbn", "isbn13", "isbn_13", "isbn10"],
    "cover_url": ["cover_url", "image_url", "cover", "thumbnail", "cover_image"],
}

REQUIRED_FIELDS = ("title", "author")


# ── Helpers ───────────────────────────────────────────────────────────────────

def log(msg: str) -> None:
    print(msg, flush=True)


def normalize_key(key: str) -> str:
    return re.sub(r"[\s_\-]+", "_", key.strip().lower())


def normalize_isbn(raw: str) -> str | None:
    """Handle plain digits and Excel-style scientific notation (e.g. 9.78E+12)."""
    s = str(raw).strip()
    if not s or s.lower() in ("nan", "none"):
        return None
    try:
        if "e" in s.lower():
            s = str(int(float(s)))
    except ValueError:
        pass
    digits = re.sub(r"[^0-9Xx]", "", s)
    if not digits:
        return None
    return digits[:13]


def map_row(raw: dict) -> dict | None:
    """Map a raw CSV/JSON row to {title, author, genre, description, isbn}."""
    normalized = {normalize_key(k): (v.strip() if isinstance(v, str) else v) for k, v in raw.items() if v is not None}

    mapped: dict[str, str | None] = {}
    for field, aliases in COLUMN_ALIASES.items():
        value = None
        for alias in aliases:
            if alias in normalized:
                candidate = normalized[alias]
                if candidate is not None and str(candidate).strip():
                    value = str(candidate).strip()
                    break
        mapped[field] = value

    if not mapped.get("title") or not mapped.get("author"):
        return None

    # Field length limits match models.Book
    mapped["title"] = mapped["title"][:255]
    mapped["author"] = mapped["author"][:255]
    if mapped.get("genre"):
        raw_genre = mapped["genre"]
        if looks_like_class_no(raw_genre):
            mapped["genre"] = dewey_to_genre(raw_genre)
        mapped["genre"] = mapped["genre"][:100]
    if mapped.get("isbn"):
        mapped["isbn"] = normalize_isbn(mapped["isbn"])

    mapped["cover_url"] = resolve_cover_url(
        mapped.get("cover_url"),
        mapped.get("isbn"),
    )

    return mapped


def load_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader)


def load_json(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8-sig").strip()
    if text.startswith("["):
        data = json.loads(text)
        if not isinstance(data, list):
            raise ValueError("JSON root must be an array of objects")
        return data
    # JSONL
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def load_rows(path: Path) -> list[dict]:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return load_csv(path)
    if suffix in (".json", ".jsonl"):
        return load_json(path)
    raise ValueError(f"Unsupported file type: {suffix} (use .csv, .json, or .jsonl)")


def existing_keys(db) -> tuple[set[str], set[tuple[str, str]]]:
    """Return (isbn_set, (title_lower, author_lower) set) for dedup."""
    isbns: set[str] = set()
    title_author: set[tuple[str, str]] = set()

    for isbn, title, author in db.execute(select(Book.isbn, Book.title, Book.author)):
        if isbn:
            isbns.add(isbn)
        title_author.add((title.lower(), author.lower()))

    return isbns, title_author


def clear_books_catalog(db) -> dict:
    """
    Remove all books and book-linked data (posts, votes, ratings).
    Users and accounts are kept.
    """
    votes = db.execute(delete(PostVote)).rowcount
    posts = db.execute(delete(Post)).rowcount
    interactions = db.execute(delete(UserBookInteraction)).rowcount
    books = db.execute(delete(Book)).rowcount
    db.commit()
    return {
        "post_votes_deleted": votes,
        "posts_deleted": posts,
        "interactions_deleted": interactions,
        "books_deleted": books,
    }


# ── Import ────────────────────────────────────────────────────────────────────

def import_books(
    path: Path,
    *,
    dry_run: bool = False,
    limit: int | None = None,
    batch_size: int = 500,
    clear_books: bool = False,
) -> dict:
    Base.metadata.create_all(bind=engine)

    raw_rows = load_rows(path)
    if limit:
        raw_rows = raw_rows[:limit]

    log(f"Read {len(raw_rows):,} rows from {path.name}")

    parsed: list[dict] = []
    skipped_bad = 0
    for raw in raw_rows:
        row = map_row(raw)
        if row:
            parsed.append(row)
        else:
            skipped_bad += 1

    log(f"Parsed {len(parsed):,} valid rows ({skipped_bad:,} skipped — missing title/author)")

    if dry_run:
        log("\n-- Dry run sample (first 3) --")
        for row in parsed[:3]:
            log(f"  * {row['title'][:60]} - {row['author'][:40]} [{row.get('genre') or 'no genre'}]")
        if clear_books:
            log("\n--clear-books would wipe all books, posts, votes, and ratings first.")
        log("\nNo changes written (dry run).")
        return {"read": len(raw_rows), "parsed": len(parsed), "inserted": 0, "skipped_dup": 0}

    db = SessionLocal()
    inserted = 0
    skipped_dup = 0
    batch: list[Book] = []

    try:
        if clear_books:
            log("Clearing existing books and related posts/ratings...")
            cleared = clear_books_catalog(db)
            log(
                f"  Removed {cleared['books_deleted']:,} books, "
                f"{cleared['posts_deleted']:,} posts, "
                f"{cleared['interactions_deleted']:,} ratings/interactions"
            )

        isbn_set, ta_set = existing_keys(db)
        log(f"Database already has {len(ta_set):,} books")

        for row in parsed:
            isbn = row.get("isbn")
            ta_key = (row["title"].lower(), row["author"].lower())

            if isbn and isbn in isbn_set:
                skipped_dup += 1
                continue
            if ta_key in ta_set:
                skipped_dup += 1
                continue

            book = Book(
                title=row["title"],
                author=row["author"],
                genre=row.get("genre"),
                description=row.get("description"),
                isbn=isbn,
                cover_url=row.get("cover_url"),
            )
            batch.append(book)

            if isbn:
                isbn_set.add(isbn)
            ta_set.add(ta_key)

            if len(batch) >= batch_size:
                db.add_all(batch)
                db.commit()
                inserted += len(batch)
                log(f"  ... {inserted:,} inserted")
                batch.clear()

        if batch:
            db.add_all(batch)
            db.commit()
            inserted += len(batch)

        total = db.scalar(select(func.count()).select_from(Book))
        log("\n" + "-" * 48)
        log(f"  Inserted : {inserted:,}")
        log(f"  Skipped  : {skipped_dup:,} (duplicate isbn or title+author)")
        log(f"  Total in DB: {total:,} books")
        log("-" * 48)

        return {
            "read": len(raw_rows),
            "parsed": len(parsed),
            "inserted": inserted,
            "skipped_dup": skipped_dup,
            "total": total,
        }

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Import book catalog into BookReddit SQLite DB")
    parser.add_argument("file", type=Path, help="Path to .csv, .json, or .jsonl file")
    parser.add_argument("--dry-run", action="store_true", help="Parse and preview without writing")
    parser.add_argument("--limit", type=int, default=None, help="Only import first N rows (for testing)")
    parser.add_argument("--batch-size", type=int, default=500, help="Commit every N rows (default 500)")
    parser.add_argument(
        "--clear-books",
        action="store_true",
        help="Delete all existing books, posts, votes, and ratings before import (users kept)",
    )
    args = parser.parse_args()

    if not args.file.exists():
        log(f"File not found: {args.file}")
        sys.exit(1)

    import_books(
        args.file,
        dry_run=args.dry_run,
        limit=args.limit,
        batch_size=args.batch_size,
        clear_books=args.clear_books,
    )


if __name__ == "__main__":
    main()
