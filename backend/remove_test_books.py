"""Remove test fixture books (Test Book, Post Test Book, Vote Book) and linked data."""

from __future__ import annotations

import argparse
import sys

from sqlalchemy import delete, func, select

from app.database import SessionLocal
from app.models import (
    Book,
    Comment,
    CommentVote,
    Post,
    PostVote,
    UserBookInteraction,
)

TEST_TITLES = ("Test Book", "Post Test Book", "Vote Book")


def find_test_books(db) -> list[Book]:
    books: list[Book] = []
    for title in TEST_TITLES:
        book = db.scalar(select(Book).where(Book.title == title))
        if book:
            books.append(book)
    return books


def remove_test_books(*, dry_run: bool = False) -> dict:
    db = SessionLocal()
    try:
        books = find_test_books(db)
        if not books:
            print("No test books found.")
            return {"books": 0}

        book_ids = [b.id for b in books]
        print("Books to remove:")
        for b in books:
            print(f"  id={b.id} | {b.title!r} | {b.author!r}")

        post_ids = list(
            db.scalars(select(Post.id).where(Post.book_id.in_(book_ids))).all()
        )
        comment_ids = []
        if post_ids:
            comment_ids = list(
                db.scalars(select(Comment.id).where(Comment.post_id.in_(post_ids))).all()
            )

        counts = {
            "books": len(book_ids),
            "posts": len(post_ids),
            "post_votes": 0,
            "comments": len(comment_ids),
            "comment_votes": 0,
            "interactions": 0,
        }

        if post_ids:
            counts["post_votes"] = db.scalar(
                select(func.count()).select_from(PostVote).where(PostVote.post_id.in_(post_ids))
            ) or 0

        if comment_ids:
            counts["comment_votes"] = db.scalar(
                select(func.count()).select_from(CommentVote).where(
                    CommentVote.comment_id.in_(comment_ids)
                )
            ) or 0

        counts["interactions"] = db.scalar(
            select(func.count()).select_from(UserBookInteraction).where(
                UserBookInteraction.book_id.in_(book_ids)
            )
        ) or 0

        print("\nRelated rows:")
        for k, v in counts.items():
            if k != "books":
                print(f"  {k}: {v}")

        if dry_run:
            print("\nDry run — no changes written.")
            return counts

        if comment_ids:
            db.execute(delete(CommentVote).where(CommentVote.comment_id.in_(comment_ids)))
            db.execute(delete(Comment).where(Comment.id.in_(comment_ids)))

        if post_ids:
            db.execute(delete(PostVote).where(PostVote.post_id.in_(post_ids)))
            db.execute(delete(Post).where(Post.id.in_(post_ids)))

        db.execute(
            delete(UserBookInteraction).where(UserBookInteraction.book_id.in_(book_ids))
        )
        db.execute(delete(Book).where(Book.id.in_(book_ids)))
        db.commit()

        print("\nRemoved test books and related data.")
        return counts
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Remove test fixture books from the catalog")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    remove_test_books(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
