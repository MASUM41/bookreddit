"""
seed.py — populate BookReddit with dummy data and train the recommender.

Run from the backend/ directory:
    python seed.py
"""

import random

import bcrypt
from app.database import Base, SessionLocal, engine
from app.models import Book, InteractionType, Post, User, UserBookInteraction
from app.recommender import recommender

random.seed(42)


# ── Helpers ───────────────────────────────────────────────────────────────────

def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def log(msg: str) -> None:
    print(msg, flush=True)


# ── Seed data ─────────────────────────────────────────────────────────────────

USERS = [
    {"username": "alice",   "email": "alice@bookreddit.dev",   "password": "password123"},
    {"username": "bob",     "email": "bob@bookreddit.dev",     "password": "password123"},
    {"username": "carol",   "email": "carol@bookreddit.dev",   "password": "password123"},
    {"username": "dave",    "email": "dave@bookreddit.dev",    "password": "password123"},
    {"username": "eve",     "email": "eve@bookreddit.dev",     "password": "password123"},
    {"username": "frank",   "email": "frank@bookreddit.dev",   "password": "password123"},
    {"username": "grace",   "email": "grace@bookreddit.dev",   "password": "password123"},
    {"username": "henry",   "email": "henry@bookreddit.dev",   "password": "password123"},
]

BOOKS = [
    # ── Literary Fiction ──────────────────────────────────────────────────────
    {"title": "The Great Gatsby",          "author": "F. Scott Fitzgerald", "genre": "Literary Fiction",   "isbn": "9780743273565", "description": "A portrait of the Jazz Age and the hollowness of the American Dream."},
    {"title": "To Kill a Mockingbird",     "author": "Harper Lee",          "genre": "Literary Fiction",   "isbn": "9780061935466", "description": "A young girl's view of racial injustice in the American South."},
    {"title": "One Hundred Years of Solitude", "author": "Gabriel García Márquez", "genre": "Magical Realism", "isbn": "9780060883287", "description": "Seven generations of the Buendía family in the mythical town of Macondo."},
    {"title": "Beloved",                   "author": "Toni Morrison",       "genre": "Literary Fiction",   "isbn": "9781400033416", "description": "A haunting story of slavery's aftermath in post-Civil War Ohio."},
    # ── Science Fiction ───────────────────────────────────────────────────────
    {"title": "Dune",                      "author": "Frank Herbert",       "genre": "Science Fiction",    "isbn": "9780441013593", "description": "An epic tale of politics, religion, and ecology on a desert planet."},
    {"title": "Neuromancer",               "author": "William Gibson",      "genre": "Science Fiction",    "isbn": "9780441569595", "description": "The founding text of the cyberpunk movement."},
    {"title": "The Left Hand of Darkness", "author": "Ursula K. Le Guin",  "genre": "Science Fiction",    "isbn": "9780441478125", "description": "An envoy visits a planet whose inhabitants have no fixed gender."},
    {"title": "Project Hail Mary",         "author": "Andy Weir",           "genre": "Science Fiction",    "isbn": "9780593135204", "description": "A lone astronaut must save Earth from an extinction-level threat."},
    # ── Fantasy ───────────────────────────────────────────────────────────────
    {"title": "The Name of the Wind",      "author": "Patrick Rothfuss",    "genre": "Fantasy",            "isbn": "9780756404079", "description": "A legendary wizard recounts his extraordinary life."},
    {"title": "American Gods",             "author": "Neil Gaiman",         "genre": "Fantasy",            "isbn": "9780060558123", "description": "Old gods clash with new ones in modern America."},
    {"title": "The Way of Kings",          "author": "Brandon Sanderson",   "genre": "Fantasy",            "isbn": "9780765326355", "description": "An epic fantasy set in a world of magical storms and ancient secrets."},
    # ── Mystery & Thriller ────────────────────────────────────────────────────
    {"title": "Gone Girl",                 "author": "Gillian Flynn",       "genre": "Thriller",           "isbn": "9780307588371", "description": "A marriage unravels in a dark and twisty psychological thriller."},
    {"title": "The Girl with the Dragon Tattoo", "author": "Stieg Larsson", "genre": "Mystery",            "isbn": "9780307454546", "description": "A journalist and hacker investigate a decades-old disappearance."},
    {"title": "Big Little Lies",           "author": "Liane Moriarty",      "genre": "Mystery",            "isbn": "9780399167065", "description": "Three women's lives unravel in a story of secrets and murder."},
    # ── Non-fiction ───────────────────────────────────────────────────────────
    {"title": "Sapiens",                   "author": "Yuval Noah Harari",   "genre": "Non-fiction",        "isbn": "9780062316097", "description": "A brief history of humankind from the Stone Age to today."},
    {"title": "Thinking, Fast and Slow",   "author": "Daniel Kahneman",     "genre": "Non-fiction",        "isbn": "9780374533557", "description": "How two systems of thinking shape our judgements and decisions."},
    {"title": "The Immortal Life of Henrietta Lacks", "author": "Rebecca Skloot", "genre": "Non-fiction", "isbn": "9781400052172", "description": "The story of cells taken without consent that transformed medicine."},
    # ── Historical Fiction ────────────────────────────────────────────────────
    {"title": "All the Light We Cannot See", "author": "Anthony Doerr",    "genre": "Historical Fiction", "isbn": "9781476746586", "description": "A blind French girl and a German soldier's paths collide in WWII."},
    {"title": "The Pillars of the Earth",  "author": "Ken Follett",         "genre": "Historical Fiction", "isbn": "9780451166890", "description": "The building of a cathedral in 12th-century England."},
    {"title": "Wolf Hall",                 "author": "Hilary Mantel",       "genre": "Historical Fiction", "isbn": "9780312429980", "description": "Thomas Cromwell's rise in the court of Henry VIII."},
]

# Persona-flavoured rating biases: each user has genre preferences.
# bias is added to a base random rating and clamped to [1, 5].
USER_GENRE_BIAS = {
    "alice": {"Literary Fiction": +1.5, "Magical Realism": +1.0},
    "bob":   {"Science Fiction":  +1.5, "Fantasy": +0.5},
    "carol": {"Mystery": +1.5, "Thriller": +1.0, "Literary Fiction": +0.5},
    "dave":  {"Non-fiction": +1.5, "Historical Fiction": +0.5},
    "eve":   {"Fantasy": +1.5, "Science Fiction": +0.5},
    "frank": {"Historical Fiction": +1.5, "Literary Fiction": +0.5},
    "grace": {"Science Fiction": +1.0, "Non-fiction": +1.0},
    "henry": {"Mystery": +1.0, "Thriller": +1.5},
}

DISCUSSION_POSTS = [
    ("alice",  "The Great Gatsby",            "Fitzgerald's prose still hits different",   "Re-read this for the third time and the green light metaphor gets more layered each time. The tragedy isn't Gatsby's death — it's that he never really understood Daisy at all."),
    ("bob",    "Dune",                        "The ecology worldbuilding is unmatched",     "Herbert spent years researching desert ecosystems before writing this. The spice economy as an oil metaphor was visionary in 1965 and somehow even more relevant now."),
    ("carol",  "Gone Girl",                   "Flynn's unreliable narrators are perfection","Both narrators lie to you the whole time and somehow that makes the story feel MORE honest about how people actually think. The ending is polarising but I loved it."),
    ("dave",   "Sapiens",                     "Changed how I think about money",            "The chapter where Harari argues money is just a collective fiction we all agree on broke my brain a little. Once you see it you can't unsee it."),
    ("eve",    "The Name of the Wind",        "Kvothe is an interesting Mary Sue problem",  "He's objectively overpowered but Rothfuss writes him with enough genuine failures that it never felt cheap to me. The framing device of him telling his own legend is doing a lot of work."),
    ("frank",  "All the Light We Cannot See", "Doerr's dual timeline structure",           "The way both storylines converge without rushing it was masterful. Werner's arc particularly — you feel the weight of every moral compromise he makes."),
    ("grace",  "Project Hail Mary",           "Best hard sci-fi in years",                 "Weir actually did the orbital mechanics maths. The alien communication problem is the most creative first-contact scenario I've read. Do not look up spoilers, go in blind."),
    ("henry",  "The Girl with the Dragon Tattoo", "Lisbeth is a genuinely new archetype", "She's both the most capable person in the room AND the most vulnerable. The way Larsson uses her trauma without exploiting it separates this from most thrillers."),
    ("alice",  "Beloved",                     "Toni Morrison demands full attention",       "This is not a comfortable read and it's not supposed to be. The non-linear structure mirrors the fragmented way trauma actually lives in the body. One of the greatest American novels."),
    ("bob",    "Neuromancer",                 "Held up shockingly well since 1984",         "Gibson invented cyberspace before the internet existed. Case's arc is surprisingly human beneath all the neon and jargon. The Wintermute/Neuromancer split is still haunting."),
]


# ── Main seeding logic ────────────────────────────────────────────────────────

def seed():
    log("Creating database tables…")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # ── Guard: skip if already seeded ─────────────────────────────────────
        if db.query(User).count() > 0:
            log("Database already contains data — skipping seed.")
            log("Delete bookreddit.db and re-run if you want a fresh seed.")
            return

        # ── Users ─────────────────────────────────────────────────────────────
        log(f"\nSeeding {len(USERS)} users…")
        user_objs: dict[str, User] = {}
        for u in USERS:
            user = User(
                username=u["username"],
                email=u["email"],
                hashed_password=hash_pw(u["password"]),
            )
            db.add(user)
            user_objs[u["username"]] = user

        db.flush()  # assign IDs without committing
        log(f"  Created: {', '.join(user_objs)}")

        # ── Books ─────────────────────────────────────────────────────────────
        log(f"\nSeeding {len(BOOKS)} books…")
        book_objs: dict[str, Book] = {}
        for b in BOOKS:
            book = Book(
                title=b["title"],
                author=b["author"],
                genre=b["genre"],
                isbn=b.get("isbn"),
                description=b.get("description"),
            )
            db.add(book)
            book_objs[b["title"]] = book

        db.flush()
        log(f"  Created: {len(book_objs)} books across genres")

        # ── Ratings (dense enough for MF) ─────────────────────────────────────
        # Each user rates ~85 % of books so the matrix factorization has
        # sufficient signal. Ratings are biased by genre preference.
        log("\nSeeding user–book ratings…")
        rating_count = 0
        for username, user in user_objs.items():
            genre_bias = USER_GENRE_BIAS.get(username, {})

            # Sample without replacement so each user rates distinct books
            rated_books = random.sample(list(book_objs.values()), k=17)

            for book in rated_books:
                bias = genre_bias.get(book.genre, 0.0)
                # Base rating drawn from a slightly positive distribution
                base = random.gauss(3.3, 0.9)
                value = round(max(1.0, min(5.0, base + bias)))

                interaction = UserBookInteraction(
                    user_id=user.id,
                    book_id=book.id,
                    interaction_type=InteractionType.rating,
                    value=float(value),
                )
                db.add(interaction)
                rating_count += 1

        db.flush()
        log(f"  Created: {rating_count} ratings  "
            f"({rating_count}/{len(USERS) * len(BOOKS)} cells filled, "
            f"{100 * rating_count // (len(USERS) * len(BOOKS))}% density)")

        # ── Upvotes / bookmarks (supplementary signals) ───────────────────────
        log("\nSeeding supplementary interactions (upvotes + bookmarks)…")
        extra_count = 0
        for username, user in user_objs.items():
            # Upvote 4-6 random books
            for book in random.sample(list(book_objs.values()), k=random.randint(4, 6)):
                db.add(UserBookInteraction(
                    user_id=user.id,
                    book_id=book.id,
                    interaction_type=InteractionType.upvote,
                    value=1.0,
                ))
                extra_count += 1

            # Bookmark 2-4 random books
            for book in random.sample(list(book_objs.values()), k=random.randint(2, 4)):
                db.add(UserBookInteraction(
                    user_id=user.id,
                    book_id=book.id,
                    interaction_type=InteractionType.bookmark,
                    value=1.0,
                ))
                extra_count += 1

        db.flush()
        log(f"  Created: {extra_count} supplementary interactions")

        # ── Discussion posts ──────────────────────────────────────────────────
        log("\nSeeding discussion posts…")
        post_count = 0
        for username, book_title, post_title, content in DISCUSSION_POSTS:
            user = user_objs[username]
            book = book_objs[book_title]
            db.add(Post(
                user_id=user.id,
                book_id=book.id,
                title=post_title,
                content=content,
            ))
            post_count += 1

        db.commit()
        log(f"  Created: {post_count} posts")

        # ── Summary ───────────────────────────────────────────────────────────
        log("\n" + "-" * 52)
        log(f"  Users   : {db.query(User).count()}")
        log(f"  Books   : {db.query(Book).count()}")
        log(f"  Ratings : {db.query(UserBookInteraction).filter_by(interaction_type=InteractionType.rating).count()}")
        log(f"  Posts   : {db.query(Post).count()}")
        log("-" * 52)

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def train():
    log("\nTraining the Matrix Factorization recommender…")
    result = recommender.fit()
    log(f"  Matrix shape : {result['matrix_shape'][0]} users × {result['matrix_shape'][1]} books")
    log(f"  Latent factors: {result['n_factors']}")
    log(f"  Sparsity      : {result['sparsity']:.1%}")
    log(f"  Loss          : {result['initial_loss']:.2f} -> {result['final_loss']:.2f}")
    log("\nRecommender is ready. GET /recommendations/{user_id} is live.")


if __name__ == "__main__":
    seed()
    train()
    log("\nDone. Both servers already running — refresh http://localhost:3000\n")
