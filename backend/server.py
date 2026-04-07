from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import os
import bcrypt
import jwt

app = FastAPI()

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mongo_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = mongo_client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=2592000, path="/")


def format_user(user: dict) -> dict:
    user_id = str(user["_id"])
    return {
        "id": user_id,
        "_id": user_id,
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "role": user.get("role", "user"),
    }


async def get_current_user(request: Request) -> Optional[dict]:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        return None
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            return None
        return format_user(user)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


async def require_auth(request: Request) -> dict:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def format_idea(idea: dict, user_vote: Optional[str] = None) -> dict:
    return {
        "id": str(idea["_id"]),
        "title": idea.get("title", ""),
        "description": idea.get("description", ""),
        "category": idea.get("category", ""),
        "time_needed": idea.get("time_needed", ""),
        "image_url": idea.get("image_url"),
        "link_url": idea.get("link_url"),
        "author_id": idea.get("author_id", ""),
        "author_name": idea.get("author_name", ""),
        "upvotes": idea.get("upvotes", 0),
        "downvotes": idea.get("downvotes", 0),
        "score": idea.get("score", 0),
        "created_at": idea.get("created_at", datetime.now(timezone.utc)).isoformat(),
        "updated_at": idea.get("updated_at", datetime.now(timezone.utc)).isoformat(),
        "user_vote": user_vote,
    }


# ---- PYDANTIC MODELS ----

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class IdeaCreate(BaseModel):
    title: str
    description: str
    category: str
    time_needed: str
    image_url: Optional[str] = None
    link_url: Optional[str] = None


class IdeaUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    time_needed: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None


class VoteRequest(BaseModel):
    vote_type: str


# ---- AUTH ROUTES ----

@app.post("/api/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.lower().strip()
    if not email or not req.password or not req.name.strip():
        raise HTTPException(status_code=400, detail="All fields are required")

    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "email": email,
        "name": req.name.strip(),
        "password_hash": hash_password(req.password),
        "role": "user",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    return {"id": user_id, "_id": user_id, "email": email, "name": req.name.strip(), "role": "user"}


@app.post("/api/auth/login")
async def login(req: LoginRequest, response: Response, request: Request):
    email = req.email.lower().strip()

    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    attempt_doc = await db.login_attempts.find_one({"identifier": identifier})
    if attempt_doc and attempt_doc.get("count", 0) >= 5:
        lockout_until = attempt_doc.get("lockout_until")
        if lockout_until:
            if lockout_until.tzinfo is None:
                lockout_until = lockout_until.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) < lockout_until:
                raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"lockout_until": datetime.now(timezone.utc) + timedelta(minutes=15)}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})

    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    return {"id": user_id, "_id": user_id, "email": email, "name": user.get("name", ""), "role": user.get("role", "user")}


@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}


@app.get("/api/auth/me")
async def me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@app.post("/api/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
        return {"message": "Token refreshed"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ---- IDEA ROUTES ----

@app.get("/api/ideas/my")
async def get_my_ideas(request: Request):
    user = await require_auth(request)
    ideas = await db.ideas.find({"author_id": user["id"]}).sort([("created_at", -1)]).to_list(None)

    idea_ids = [str(idea["_id"]) for idea in ideas]
    user_votes = await db.votes.find({"user_id": user["id"], "idea_id": {"$in": idea_ids}}).to_list(None)
    vote_map = {v["idea_id"]: v["vote_type"] for v in user_votes}

    return {"ideas": [format_idea(idea, vote_map.get(str(idea["_id"]))) for idea in ideas]}


@app.get("/api/ideas")
async def get_ideas(
    request: Request,
    category: Optional[str] = Query(None),
    time_needed: Optional[str] = Query(None),
    sort: str = Query("popular"),
    skip: int = Query(0),
    limit: int = Query(12),
):
    query = {}
    if category and category != "all":
        query["category"] = category
    if time_needed and time_needed != "all":
        query["time_needed"] = time_needed

    sort_order = [("score", -1), ("created_at", -1)] if sort == "popular" else [("created_at", -1)]

    ideas = await db.ideas.find(query).sort(sort_order).skip(skip).limit(limit).to_list(None)
    total = await db.ideas.count_documents(query)

    current_user = await get_current_user(request)
    result = []

    if current_user:
        idea_ids = [str(idea["_id"]) for idea in ideas]
        user_votes = await db.votes.find({"user_id": current_user["id"], "idea_id": {"$in": idea_ids}}).to_list(None)
        vote_map = {v["idea_id"]: v["vote_type"] for v in user_votes}
        for idea in ideas:
            result.append(format_idea(idea, vote_map.get(str(idea["_id"]))))
    else:
        for idea in ideas:
            result.append(format_idea(idea))

    return {"ideas": result, "total": total, "skip": skip, "limit": limit}


@app.post("/api/ideas")
async def create_idea(req: IdeaCreate, request: Request):
    user = await require_auth(request)

    idea_doc = {
        "title": req.title.strip(),
        "description": req.description.strip(),
        "category": req.category,
        "time_needed": req.time_needed,
        "image_url": req.image_url or None,
        "link_url": req.link_url or None,
        "author_id": user["id"],
        "author_name": user.get("name", user["email"]),
        "upvotes": 0,
        "downvotes": 0,
        "score": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.ideas.insert_one(idea_doc)
    idea_doc["_id"] = result.inserted_id
    return format_idea(idea_doc)


@app.get("/api/ideas/{idea_id}")
async def get_idea(idea_id: str, request: Request):
    try:
        idea = await db.ideas.find_one({"_id": ObjectId(idea_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Idea not found")

    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    current_user = await get_current_user(request)
    user_vote = None
    if current_user:
        vote = await db.votes.find_one({"user_id": current_user["id"], "idea_id": idea_id})
        if vote:
            user_vote = vote["vote_type"]

    return format_idea(idea, user_vote)


@app.put("/api/ideas/{idea_id}")
async def update_idea(idea_id: str, req: IdeaUpdate, request: Request):
    user = await require_auth(request)

    try:
        idea = await db.ideas.find_one({"_id": ObjectId(idea_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Idea not found")

    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    if idea["author_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = {k: v for k, v in req.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)

    await db.ideas.update_one({"_id": ObjectId(idea_id)}, {"$set": update_data})
    updated = await db.ideas.find_one({"_id": ObjectId(idea_id)})

    vote = await db.votes.find_one({"user_id": user["id"], "idea_id": idea_id})
    user_vote = vote["vote_type"] if vote else None
    return format_idea(updated, user_vote)


@app.delete("/api/ideas/{idea_id}")
async def delete_idea(idea_id: str, request: Request):
    user = await require_auth(request)

    try:
        idea = await db.ideas.find_one({"_id": ObjectId(idea_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Idea not found")

    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    if idea["author_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.ideas.delete_one({"_id": ObjectId(idea_id)})
    await db.votes.delete_many({"idea_id": idea_id})
    return {"message": "Idea deleted"}


@app.post("/api/ideas/{idea_id}/vote")
async def vote_idea(idea_id: str, req: VoteRequest, request: Request):
    user = await require_auth(request)

    if req.vote_type not in ["upvote", "downvote"]:
        raise HTTPException(status_code=400, detail="Invalid vote type")

    try:
        idea = await db.ideas.find_one({"_id": ObjectId(idea_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Idea not found")

    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    existing_vote = await db.votes.find_one({"user_id": user["id"], "idea_id": idea_id})
    user_vote = None

    if existing_vote:
        if existing_vote["vote_type"] == req.vote_type:
            # Toggle off
            await db.votes.delete_one({"_id": existing_vote["_id"]})
            if req.vote_type == "upvote":
                await db.ideas.update_one({"_id": ObjectId(idea_id)}, {"$inc": {"upvotes": -1, "score": -1}})
            else:
                await db.ideas.update_one({"_id": ObjectId(idea_id)}, {"$inc": {"downvotes": -1, "score": 1}})
            user_vote = None
        else:
            # Switch vote
            await db.votes.update_one({"_id": existing_vote["_id"]}, {"$set": {"vote_type": req.vote_type}})
            if req.vote_type == "upvote":
                await db.ideas.update_one({"_id": ObjectId(idea_id)}, {"$inc": {"upvotes": 1, "downvotes": -1, "score": 2}})
            else:
                await db.ideas.update_one({"_id": ObjectId(idea_id)}, {"$inc": {"upvotes": -1, "downvotes": 1, "score": -2}})
            user_vote = req.vote_type
    else:
        # New vote
        await db.votes.insert_one({
            "user_id": user["id"],
            "idea_id": idea_id,
            "vote_type": req.vote_type,
            "created_at": datetime.now(timezone.utc),
        })
        if req.vote_type == "upvote":
            await db.ideas.update_one({"_id": ObjectId(idea_id)}, {"$inc": {"upvotes": 1, "score": 1}})
        else:
            await db.ideas.update_one({"_id": ObjectId(idea_id)}, {"$inc": {"downvotes": 1, "score": -1}})
        user_vote = req.vote_type

    updated = await db.ideas.find_one({"_id": ObjectId(idea_id)})
    return {
        "upvotes": updated["upvotes"],
        "downvotes": updated["downvotes"],
        "score": updated["score"],
        "user_vote": user_vote,
    }


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ---- STARTUP ----

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.votes.create_index([("user_id", 1), ("idea_id", 1)], unique=True)
    await db.ideas.create_index([("score", -1)])
    await db.ideas.create_index([("created_at", -1)])
    await db.ideas.create_index("category")
    await db.ideas.create_index("time_needed")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@boredideas.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "name": "Admin",
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        })
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # Seed sample ideas
    count = await db.ideas.count_documents({})
    if count == 0:
        now = datetime.now(timezone.utc)
        sample = [
            {"title": "Go for a nature walk", "description": "Take a relaxing walk in the nearest park or natural area. Notice the plants, birds, and fresh air around you.", "category": "outdoors", "time_needed": "30 mins", "image_url": None, "link_url": None, "author_id": "system", "author_name": "Admin", "upvotes": 42, "downvotes": 3, "score": 39, "created_at": now, "updated_at": now},
            {"title": "Stargazing session", "description": "Find a dark spot away from city lights. Lay down a blanket, look up, and identify constellations you recognize.", "category": "outdoors", "time_needed": "1-2 hrs", "image_url": None, "link_url": None, "author_id": "system", "author_name": "Admin", "upvotes": 35, "downvotes": 2, "score": 33, "created_at": now, "updated_at": now},
            {"title": "Make a friendship bracelet", "description": "Grab some colorful thread and follow an easy pattern to make a bracelet for a friend. Great meditative activity!", "category": "crafts", "time_needed": "30 mins", "image_url": None, "link_url": None, "author_id": "system", "author_name": "Admin", "upvotes": 28, "downvotes": 1, "score": 27, "created_at": now, "updated_at": now},
            {"title": "Paper origami crane", "description": "Learn to fold a beautiful origami crane from a single sheet of paper. Legend says folding 1000 cranes grants a wish!", "category": "crafts", "time_needed": "15 mins", "image_url": None, "link_url": None, "author_id": "system", "author_name": "Admin", "upvotes": 31, "downvotes": 2, "score": 29, "created_at": now, "updated_at": now},
            {"title": "Bake chocolate chip cookies", "description": "A classic recipe everyone loves! Mix butter, sugar, eggs, flour and chocolate chips, then bake at 375F for 10-12 minutes.", "category": "cooking", "time_needed": "1 hr", "image_url": None, "link_url": None, "author_id": "system", "author_name": "Admin", "upvotes": 55, "downvotes": 1, "score": 54, "created_at": now, "updated_at": now},
            {"title": "5-minute mug cake", "description": "Mix flour, sugar, cocoa, egg, milk and oil in a mug. Microwave for 90 seconds. Instant dessert — seriously!", "category": "cooking", "time_needed": "5 mins", "image_url": None, "link_url": None, "author_id": "system", "author_name": "Admin", "upvotes": 48, "downvotes": 3, "score": 45, "created_at": now, "updated_at": now},
            {"title": "Watercolor sunset painting", "description": "Paint a simple sunset with just 3 colors blending into each other. Perfect for beginners using wet-on-wet technique.", "category": "painting", "time_needed": "1 hr", "image_url": None, "link_url": None, "author_id": "system", "author_name": "Admin", "upvotes": 38, "downvotes": 2, "score": 36, "created_at": now, "updated_at": now},
            {"title": "Watch a classic movie", "description": "Pick a film from the AFI Top 100 list you haven't seen yet. Make some popcorn and settle in for a great story.", "category": "entertainment", "time_needed": "2+ hrs", "image_url": None, "link_url": None, "author_id": "system", "author_name": "Admin", "upvotes": 22, "downvotes": 4, "score": 18, "created_at": now, "updated_at": now},
            {"title": "Learn 3 guitar chords", "description": "G, C, and D are all you need to play hundreds of songs. Grab a guitar and spend 15 minutes learning these basics.", "category": "music", "time_needed": "15 mins", "image_url": None, "link_url": None, "author_id": "system", "author_name": "Admin", "upvotes": 41, "downvotes": 2, "score": 39, "created_at": now, "updated_at": now},
            {"title": "Read a short story", "description": "Find a short story on Project Gutenberg or Reddit's r/shortscifi. You can finish a great story in just 15 minutes!", "category": "reading", "time_needed": "15 mins", "image_url": None, "link_url": "https://www.gutenberg.org", "author_id": "system", "author_name": "Admin", "upvotes": 19, "downvotes": 1, "score": 18, "created_at": now, "updated_at": now},
            {"title": "10-minute HIIT workout", "description": "No equipment needed! Do 30 seconds each of jumping jacks, burpees, mountain climbers, and squats. Repeat 3 times.", "category": "fitness", "time_needed": "15 mins", "image_url": None, "link_url": None, "author_id": "system", "author_name": "Admin", "upvotes": 33, "downvotes": 5, "score": 28, "created_at": now, "updated_at": now},
            {"title": "Call an old friend", "description": "Think of someone you haven't talked to in a while and give them a call. 5 minutes can reignite a friendship!", "category": "social", "time_needed": "5 mins", "image_url": None, "link_url": None, "author_id": "system", "author_name": "Admin", "upvotes": 44, "downvotes": 0, "score": 44, "created_at": now, "updated_at": now},
        ]
        await db.ideas.insert_many(sample)

    # Write test credentials
    import os as _os
    _os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"""# Test Credentials

## Admin Account
- Email: {admin_email}
- Password: {admin_password}
- Role: admin

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh

## Ideas Endpoints
- GET /api/ideas (filters: category, time_needed, sort, skip, limit)
- POST /api/ideas (authenticated)
- GET /api/ideas/my (authenticated)
- GET /api/ideas/{{id}}
- PUT /api/ideas/{{id}} (author only)
- DELETE /api/ideas/{{id}} (author only)
- POST /api/ideas/{{id}}/vote (authenticated)
""")

    print("Startup complete!")
