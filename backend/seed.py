"""Repeatable fictional demo records; existing accounts and edits are preserved."""
import os
from datetime import datetime, timezone

DEMO_USERS = [
    ("Aanya Sharma", "aanya@example.com", "painting", "Paint a postcard for a friend", "Use watercolors or pencils to draw a favorite place on a small card. Add a personal note and send it to a friend."),
    ("Rohan Mehta", "rohan@example.com", "fitness", "Try a neighborhood photo walk", "Walk a new route for 30 minutes. Photograph five interesting colors, textures or buildings along the way."),
    ("Meera Patel", "meera@example.com", "cooking", "Cook a pantry challenge meal", "Choose three ingredients you already have and invent a simple meal. Share the recipe and what you would change next time."),
    ("Arjun Das", "arjun@example.com", "music", "Make a mood boosting playlist", "Pick ten songs that lift your mood. Arrange them into a playlist and share it with a friend."),
    ("Sara Khan", "sara@example.com", "reading", "Start a tiny book club", "Read a short story with a friend and swap your favorite lines. Decide on one question to discuss over tea."),
    ("Dev Rao", "dev@example.com", "learning", "Learn a paper folding trick", "Find a beginner origami crane tutorial. Practice with scrap paper and decorate your desk with the results."),
]


async def seed_demo_users(db, hash_password):
    password = os.environ.get("DEMO_PASSWORD")
    if not password or not 8 <= len(password.encode("utf-8")) <= 72:
        raise RuntimeError("Demo seeding requires DEMO_PASSWORD of 8–72 bytes")
    now = datetime.now(timezone.utc)
    for name, email, category, title, description in DEMO_USERS:
        await db.users.update_one({"email": email}, {"$setOnInsert": {
            "name": name, "password_hash": hash_password(password), "role": "user",
            "picture": "", "is_demo": True, "created_at": now,
        }}, upsert=True)
        user = await db.users.find_one({"email": email})
        # Never attach demo content to an existing real account with the same email.
        if not user.get("is_demo"):
            continue
        await db.ideas.update_one({"seed_key": email}, {"$setOnInsert": {
            "title": title, "description": description, "category": category,
            "time_needed": "30 mins", "image_url": None, "link_url": None,
            "community_id": None, "author_id": str(user["_id"]), "author_name": name,
            "upvotes": 0, "downvotes": 0, "score": 0,
            "created_at": now, "updated_at": now,
        }}, upsert=True)
