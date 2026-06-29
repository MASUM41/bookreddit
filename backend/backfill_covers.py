"""
Backfill book cover_url from ISBN (Open Library) or a CSV with image_url.

Usage (from backend/):
  python backfill_covers.py
  python backfill_covers.py --csv data/my_new_books.csv
  python backfill_covers.py --dry-run
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

from sqlalchemy import func, select

from app.book_covers import open_library_cover_url
from app.database import SessionLocal
from app.migrate import run_migrations
from app.models import Book

run_migrations()


def log(msg: str) -> None:
    print(msg, flush=True)


def load_csv_covers(path: Path) -> dict[str, str]:
    """Map normalized ISBN -> image_url from CSV."""
    covers: dict[str, str] = {}
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            isbn_raw = row.get("ISBN") or row.get("isbn") or ""
            url = (row.get("image_url") or row.get("cover_url") or "").strip()
            if not isbn_raw or not url:
                continue
            digits = "".join(ch for ch in str(isbn_raw) if ch.isdigit() or ch in "Xx")
            if len(digits) >= 10:
                covers[digits[:13]] = url
    return covers


def backfill(*, csv_path: Path | None = None, dry_run: bool = False) -> dict:
    csv_covers = load_csv_covers(csv_path) if csv_path else {}
    if csv_path:
        log(f"Loaded {len(csv_covers):,} cover URLs from {csv_path.name}")

    db = SessionLocal()
    updated = 0
    from_csv = 0
    from_isbn = 0
    already = 0

    try:
        books = db.scalars(select(Book).order_by(Book.id)).all()
        for book in books:
            if book.cover_url and str(book.cover_url).strip():
                already += 1
                continue

            new_url: str | None = None
            if book.isbn:
                digits = "".join(ch for ch in book.isbn if ch.isdigit() or ch in "Xx")
                if digits in csv_covers:
                    new_url = csv_covers[digits[:13]]
                    from_csv += 1
                else:
                    new_url = open_library_cover_url(book.isbn)
                    if new_url:
                        from_isbn += 1

            if not new_url:
                continue

            if dry_run:
                if updated < 5:
                    log(f"  would set id={book.id}: {new_url[:70]}…")
            else:
                book.cover_url = new_url
            updated += 1

        if not dry_run and updated:
            db.commit()

        total = db.scalar(select(func.count()).select_from(Book))
        with_cover = db.scalar(
            select(func.count()).select_from(Book).where(
                Book.cover_url.isnot(None),
                Book.cover_url != "",
            )
        )
        log("-" * 48)
        log(f"  Updated      : {updated:,}" + (" (dry run)" if dry_run else ""))
        log(f"    from CSV   : {from_csv:,}")
        log(f"    from ISBN  : {from_isbn:,}")
        log(f"  Already had  : {already:,}")
        log(f"  With cover   : {with_cover:,} / {total:,}")
        log("-" * 48)
        return {"updated": updated, "with_cover": with_cover, "total": total}
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill book cover URLs")
    parser.add_argument(
        "--csv",
        type=Path,
        default=None,
        help="Optional CSV with ISBN + image_url (e.g. data/my_new_books.csv)",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.csv and not args.csv.exists():
        log(f"CSV not found: {args.csv}")
        sys.exit(1)

    backfill(csv_path=args.csv, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
