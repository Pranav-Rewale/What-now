from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request, Response, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import os, shutil, uuid
import bcrypt
import jwt
import httpx

# Ensure uploads dir exists before mounting
os.makedirs("/app/backend/uploads", exist_ok=True)

app = FastAPI()

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
APP_URL = os.environ.get("APP_URL", "http://localhost:8001")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images at /api/uploads/*
app.mount("/api/uploads", StaticFiles(directory="/app/backend/uploads"), name="uploads")

mongo_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = mongo_client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=2592000, path="/")


def format_user(user: dict) -> dict:
    user_id = str(user["_id"])
    return {"id": user_id, "_id": user_id, "email": user.get("email", ""), "name": user.get("name", ""), "role": user.get("role", "user"), "picture": user.get("picture", "")}


async def get_current_user(request: Request) -> Optional[dict]:
    session_token = request.cookies.get("session_token")
    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token})
        if session:
            expires_at = session.get("expires_at")
            if expires_at:
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at > datetime.now(timezone.utc):
                    user = await db.users.find_one({"_id": ObjectId(session["user_id"])})
                    if user:
                        return format_user(user)
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
        "community_id": idea.get("community_id"),
        "created_at": idea.get("created_at", datetime.now(timezone.utc)).isoformat(),
        "updated_at": idea.get("updated_at", datetime.now(timezone.utc)).isoformat(),
        "user_vote": user_vote,
    }


# ---- MODELS ----

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
    community_id: Optional[str] = None

class IdeaUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    time_needed: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None

class VoteRequest(BaseModel):
    vote_type: str

class GoogleSessionRequest(BaseModel):
    session_id: str


# ---- AUTH ----

@app.post("/api/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.lower().strip()
    if not email or not req.password or not req.name.strip():
        raise HTTPException(status_code=400, detail="All fields are required")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    result = await db.users.insert_one({"email": email, "name": req.name.strip(), "password_hash": hash_password(req.password), "role": "user", "created_at": datetime.now(timezone.utc)})
    user_id = str(result.inserted_id)
    set_auth_cookies(response, create_access_token(user_id, email), create_refresh_token(user_id))
    return {"id": user_id, "_id": user_id, "email": email, "name": req.name.strip(), "role": "user", "picture": ""}

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
        await db.login_attempts.update_one({"identifier": identifier}, {"$inc": {"count": 1}, "$set": {"lockout_until": datetime.now(timezone.utc) + timedelta(minutes=15)}}, upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": identifier})
    user_id = str(user["_id"])
    set_auth_cookies(response, create_access_token(user_id, email), create_refresh_token(user_id))
    return {"id": user_id, "_id": user_id, "email": email, "name": user.get("name", ""), "role": user.get("role", "user"), "picture": user.get("picture", "")}

@app.post("/api/auth/logout")
async def logout(request: Request, response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
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
        response.set_cookie(key="access_token", value=create_access_token(user_id, user["email"]), httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
        return {"message": "Token refreshed"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@app.post("/api/auth/google/session")
async def google_session(req: GoogleSessionRequest, response: Response):
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", headers={"X-Session-ID": req.session_id}, timeout=10.0)
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session_id")
    data = resp.json()
    email = data["email"].lower().strip()
    name = data.get("name", email.split("@")[0])
    picture = data.get("picture", "")
    session_token = data["session_token"]
    user = await db.users.find_one({"email": email})
    if user is None:
        result = await db.users.insert_one({"email": email, "name": name, "picture": picture, "role": "user", "auth_method": "google", "created_at": datetime.now(timezone.utc)})
        user_id = str(result.inserted_id)
    else:
        user_id = str(user["_id"])
        updates = {}
        if name and user.get("name") != name: updates["name"] = name
        if picture and user.get("picture") != picture: updates["picture"] = picture
        if updates: await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one({"user_id": user_id}, {"$set": {"session_token": session_token, "expires_at": expires_at, "created_at": datetime.now(timezone.utc)}}, upsert=True)
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    return format_user(user_doc)


# ---- IMAGE UPLOAD ----

@app.post("/api/upload/image")
async def upload_image(request: Request, file: UploadFile = File(...)):
    await require_auth(request)
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    ext = (file.filename or "image.jpg").rsplit(".", 1)[-1].lower()
    if ext not in {"jpg", "jpeg", "png", "gif", "webp", "avif"}:
        ext = "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = f"/app/backend/uploads/{filename}"
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"url": f"{APP_URL}/api/uploads/{filename}"}


# ---- FOLLOW SYSTEM ----

@app.get("/api/users/following")
async def get_following(request: Request):
    user = await require_auth(request)
    follows = await db.follows.find({"follower_id": user["id"]}).to_list(None)
    following_ids = [f["following_id"] for f in follows]
    if not following_ids:
        return {"users": []}
    users = await db.users.find({"_id": {"$in": [ObjectId(uid) for uid in following_ids]}}).to_list(None)
    return {"users": [format_user(u) for u in users]}

@app.post("/api/users/{target_id}/follow")
async def follow_user(target_id: str, request: Request):
    user = await require_auth(request)
    if user["id"] == target_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    existing = await db.follows.find_one({"follower_id": user["id"], "following_id": target_id})
    if existing:
        return {"following": True}
    await db.follows.insert_one({"follower_id": user["id"], "following_id": target_id, "created_at": datetime.now(timezone.utc)})
    return {"following": True}

@app.delete("/api/users/{target_id}/follow")
async def unfollow_user(target_id: str, request: Request):
    user = await require_auth(request)
    await db.follows.delete_one({"follower_id": user["id"], "following_id": target_id})
    return {"following": False}

@app.get("/api/users/{user_id}/profile")
async def get_user_profile(user_id: str, request: Request):
    try:
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="User not found")
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    ideas_count = await db.ideas.count_documents({"author_id": user_id})
    follower_count = await db.follows.count_documents({"following_id": user_id})
    return {**format_user(user_doc), "ideas_count": ideas_count, "follower_count": follower_count}


# ---- IDEAS ----

@app.get("/api/ideas/my")
async def get_my_ideas(request: Request):
    user = await require_auth(request)
    ideas = await db.ideas.find({"author_id": user["id"]}).sort([("created_at", -1)]).to_list(None)
    idea_ids = [str(idea["_id"]) for idea in ideas]
    user_votes = await db.votes.find({"user_id": user["id"], "idea_id": {"$in": idea_ids}}).to_list(None)
    vote_map = {v["idea_id"]: v["vote_type"] for v in user_votes}
    return {"ideas": [format_idea(idea, vote_map.get(str(idea["_id"]))) for idea in ideas]}

@app.get("/api/ideas/following")
async def get_following_feed(request: Request, skip: int = Query(0), limit: int = Query(12)):
    user = await require_auth(request)
    follows = await db.follows.find({"follower_id": user["id"]}).to_list(None)
    following_ids = [f["following_id"] for f in follows]
    if not following_ids:
        return {"ideas": [], "total": 0}
    query = {"author_id": {"$in": following_ids}}
    ideas = await db.ideas.find(query).sort([("created_at", -1)]).skip(skip).limit(limit).to_list(None)
    total = await db.ideas.count_documents(query)
    idea_ids = [str(idea["_id"]) for idea in ideas]
    user_votes = await db.votes.find({"user_id": user["id"], "idea_id": {"$in": idea_ids}}).to_list(None)
    vote_map = {v["idea_id"]: v["vote_type"] for v in user_votes}
    return {"ideas": [format_idea(idea, vote_map.get(str(idea["_id"]))) for idea in ideas], "total": total}

@app.get("/api/ideas")
async def get_ideas(
    request: Request,
    category: Optional[str] = Query(None),
    time_needed: Optional[str] = Query(None),
    sort: str = Query("popular"),
    skip: int = Query(0),
    limit: int = Query(12),
    community_id: Optional[str] = Query(None),
):
    query = {}
    if category and category != "all": query["category"] = category
    if time_needed and time_needed != "all": query["time_needed"] = time_needed
    if community_id: query["community_id"] = community_id
    else: query["community_id"] = None  # default feed excludes community posts

    sort_order = [("score", -1), ("created_at", -1)] if sort == "popular" else [("created_at", -1)]
    ideas = await db.ideas.find(query).sort(sort_order).skip(skip).limit(limit).to_list(None)
    total = await db.ideas.count_documents(query)

    current_user = await get_current_user(request)
    if current_user:
        idea_ids = [str(idea["_id"]) for idea in ideas]
        user_votes = await db.votes.find({"user_id": current_user["id"], "idea_id": {"$in": idea_ids}}).to_list(None)
        vote_map = {v["idea_id"]: v["vote_type"] for v in user_votes}
        result = [format_idea(idea, vote_map.get(str(idea["_id"]))) for idea in ideas]
    else:
        result = [format_idea(idea) for idea in ideas]
    return {"ideas": result, "total": total, "skip": skip, "limit": limit}

@app.post("/api/ideas")
async def create_idea(req: IdeaCreate, request: Request):
    user = await require_auth(request)
    idea_doc = {
        "title": req.title.strip(), "description": req.description.strip(),
        "category": req.category, "time_needed": req.time_needed,
        "image_url": req.image_url or None, "link_url": req.link_url or None,
        "community_id": req.community_id or None,
        "author_id": user["id"], "author_name": user.get("name", user["email"]),
        "upvotes": 0, "downvotes": 0, "score": 0,
        "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc),
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
        if vote: user_vote = vote["vote_type"]
    return format_idea(idea, user_vote)

@app.put("/api/ideas/{idea_id}")
async def update_idea(idea_id: str, req: IdeaUpdate, request: Request):
    user = await require_auth(request)
    try:
        idea = await db.ideas.find_one({"_id": ObjectId(idea_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Idea not found")
    if not idea: raise HTTPException(status_code=404, detail="Idea not found")
    if idea["author_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    update_data = {k: v for k, v in req.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.ideas.update_one({"_id": ObjectId(idea_id)}, {"$set": update_data})
    updated = await db.ideas.find_one({"_id": ObjectId(idea_id)})
    vote = await db.votes.find_one({"user_id": user["id"], "idea_id": idea_id})
    return format_idea(updated, vote["vote_type"] if vote else None)

@app.delete("/api/ideas/{idea_id}")
async def delete_idea(idea_id: str, request: Request):
    user = await require_auth(request)
    try:
        idea = await db.ideas.find_one({"_id": ObjectId(idea_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Idea not found")
    if not idea: raise HTTPException(status_code=404, detail="Idea not found")
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
    if not idea: raise HTTPException(status_code=404, detail="Idea not found")
    existing_vote = await db.votes.find_one({"user_id": user["id"], "idea_id": idea_id})
    user_vote = None
    if existing_vote:
        if existing_vote["vote_type"] == req.vote_type:
            await db.votes.delete_one({"_id": existing_vote["_id"]})
            inc = {"upvotes": -1, "score": -1} if req.vote_type == "upvote" else {"downvotes": -1, "score": 1}
        else:
            await db.votes.update_one({"_id": existing_vote["_id"]}, {"$set": {"vote_type": req.vote_type}})
            inc = {"upvotes": 1, "downvotes": -1, "score": 2} if req.vote_type == "upvote" else {"upvotes": -1, "downvotes": 1, "score": -2}
            user_vote = req.vote_type
        await db.ideas.update_one({"_id": ObjectId(idea_id)}, {"$inc": inc})
    else:
        await db.votes.insert_one({"user_id": user["id"], "idea_id": idea_id, "vote_type": req.vote_type, "created_at": datetime.now(timezone.utc)})
        inc = {"upvotes": 1, "score": 1} if req.vote_type == "upvote" else {"downvotes": 1, "score": -1}
        await db.ideas.update_one({"_id": ObjectId(idea_id)}, {"$inc": inc})
        user_vote = req.vote_type
    updated = await db.ideas.find_one({"_id": ObjectId(idea_id)})
    return {"upvotes": updated["upvotes"], "downvotes": updated["downvotes"], "score": updated["score"], "user_vote": user_vote}


# ---- COMMUNITIES ----

@app.get("/api/communities")
async def get_communities(request: Request):
    current_user = await get_current_user(request)
    communities = await db.communities.find().sort([("country", 1), ("name", 1)]).to_list(None)
    joined_set = set()
    if current_user:
        c_ids = [str(c["_id"]) for c in communities]
        memberships = await db.community_members.find({"user_id": current_user["id"], "community_id": {"$in": c_ids}}).to_list(None)
        joined_set = {m["community_id"] for m in memberships}
    result = []
    for c in communities:
        c_id = str(c["_id"])
        result.append({"id": c_id, "name": c.get("name"), "slug": c.get("slug"), "country": c.get("country"), "description": c.get("description"), "emoji": c.get("emoji"), "cover_color": c.get("cover_color", "#E6E6E6"), "members_count": c.get("members_count", 0), "joined": c_id in joined_set})
    return {"communities": result}

@app.get("/api/communities/{community_id}")
async def get_community(community_id: str, request: Request):
    try:
        c = await db.communities.find_one({"_id": ObjectId(community_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Community not found")
    if not c: raise HTTPException(status_code=404, detail="Community not found")
    current_user = await get_current_user(request)
    joined = False
    if current_user:
        m = await db.community_members.find_one({"user_id": current_user["id"], "community_id": community_id})
        joined = m is not None
    c_id = str(c["_id"])
    return {"id": c_id, "name": c.get("name"), "slug": c.get("slug"), "country": c.get("country"), "description": c.get("description"), "emoji": c.get("emoji"), "cover_color": c.get("cover_color", "#E6E6E6"), "members_count": c.get("members_count", 0), "joined": joined}

@app.post("/api/communities/{community_id}/join")
async def join_community(community_id: str, request: Request):
    user = await require_auth(request)
    try:
        c = await db.communities.find_one({"_id": ObjectId(community_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Community not found")
    if not c: raise HTTPException(status_code=404, detail="Community not found")
    existing = await db.community_members.find_one({"user_id": user["id"], "community_id": community_id})
    if not existing:
        await db.community_members.insert_one({"user_id": user["id"], "community_id": community_id, "joined_at": datetime.now(timezone.utc)})
        await db.communities.update_one({"_id": ObjectId(community_id)}, {"$inc": {"members_count": 1}})
    return {"joined": True}

@app.delete("/api/communities/{community_id}/join")
async def leave_community(community_id: str, request: Request):
    user = await require_auth(request)
    result = await db.community_members.delete_one({"user_id": user["id"], "community_id": community_id})
    if result.deleted_count:
        await db.communities.update_one({"_id": ObjectId(community_id)}, {"$inc": {"members_count": -1}})
    return {"joined": False}


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ---- STARTUP ----

COMMUNITIES_DATA = [
    {"name": "Mumbai", "slug": "mumbai", "country": "India", "description": "The city that never sleeps — beaches, street food, Bollywood, and the Arabian Sea.", "emoji": "🏖️", "cover_color": "#FF6B35"},
    {"name": "Delhi", "slug": "delhi", "country": "India", "description": "Historic capital with Mughal monuments, chaotic bazaars, and legendary street food.", "emoji": "🕌", "cover_color": "#5D2EFF"},
    {"name": "Bengaluru", "slug": "bengaluru", "country": "India", "description": "Garden city with vibrant third-wave cafes, lush parks, and tech culture.", "emoji": "🌸", "cover_color": "#2DFF72"},
    {"name": "Chennai", "slug": "chennai", "country": "India", "description": "Gateway to South India — temples, Marina Beach, filter coffee, and Carnatic music.", "emoji": "🏛️", "cover_color": "#00E5FF"},
    {"name": "Hyderabad", "slug": "hyderabad", "country": "India", "description": "City of Nizams, biryani, pearls, and the iconic Charminar.", "emoji": "💎", "cover_color": "#FFE100"},
    {"name": "New York City", "slug": "new-york-city", "country": "USA", "description": "The city that has everything — world-class food, culture, and energy 24/7.", "emoji": "🗽", "cover_color": "#FF4757"},
    {"name": "Los Angeles", "slug": "los-angeles", "country": "USA", "description": "City of Angels — beaches, hiking trails, and sunshine all year round.", "emoji": "🌴", "cover_color": "#FF8C00"},
    {"name": "Chicago", "slug": "chicago", "country": "USA", "description": "Windy City with stunning architecture, jazz clubs, and deep-dish pizza.", "emoji": "🏙️", "cover_color": "#5D2EFF"},
    {"name": "Houston", "slug": "houston", "country": "USA", "description": "Space City with an incredible diverse food scene, parks, and culture.", "emoji": "🚀", "cover_color": "#2DFF72"},
    {"name": "Phoenix", "slug": "phoenix", "country": "USA", "description": "Desert metropolis with epic hiking, stunning sunsets, and year-round warmth.", "emoji": "🌵", "cover_color": "#FF4757"},
]

COMMUNITY_IDEAS = {
    "mumbai": [
        {"title": "Sunset at Juhu Beach", "description": "Walk along Juhu Beach during sunset and grab bhel puri from the street vendors. The view of the Arabian Sea is magical.", "category": "outdoors", "time_needed": "1-2 hrs"},
        {"title": "Vada Pav at Anand Stall", "description": "Mumbai's most iconic street food. Head to Anand Stall near Vile Parle station for the city's best vada pav — crispy, spicy, and perfect.", "category": "cooking", "time_needed": "30 mins"},
        {"title": "Walk the Colaba Causeway", "description": "Explore the vibrant market of Colaba Causeway for clothes, trinkets, antiques, and street food. Great for bargain hunters and people-watchers.", "category": "social", "time_needed": "1-2 hrs"},
        {"title": "Gateway of India at Dawn", "description": "Visit the Gateway of India early morning before crowds arrive. The view of the harbor and the iconic arch is breathtaking at sunrise.", "category": "outdoors", "time_needed": "1 hr"},
        {"title": "Coffee at Kala Ghoda Cafe", "description": "Sit in this heritage neighborhood café in the art district, enjoy filter coffee and watch the city wake up amidst Victorian-era architecture.", "category": "relaxing", "time_needed": "30 mins"},
    ],
    "delhi": [
        {"title": "Sunrise at India Gate", "description": "Visit India Gate in the early morning when it's peaceful. Watch the flame of the Amar Jawan Jyoti and enjoy a quiet moment in the heart of Delhi.", "category": "outdoors", "time_needed": "1 hr"},
        {"title": "Paranthe Wali Gali Breakfast", "description": "In Old Delhi's famous lane, try the legendary stuffed parathas — aloo, paneer, mooli — cooked on huge tawas just like they have been since the 1870s.", "category": "cooking", "time_needed": "1 hr"},
        {"title": "Explore Lodhi Garden", "description": "Stroll through one of Delhi's most beautiful parks with 15th-century Mughal tombs. Perfect for morning walks, birdwatching, or quiet contemplation.", "category": "outdoors", "time_needed": "1-2 hrs"},
        {"title": "Vintage shopping in Hauz Khas Village", "description": "Browse indie boutiques, vintage stores, and art galleries in this bohemian village. Grab rooftop chai and soak in the views of the ancient reservoir.", "category": "social", "time_needed": "2+ hrs"},
        {"title": "Street food tour of Chandni Chowk", "description": "From jalebi to daulat ki chaat to kachori sabzi — Chandni Chowk is the ultimate street food destination. Go hungry!", "category": "cooking", "time_needed": "2+ hrs"},
    ],
    "bengaluru": [
        {"title": "Morning walk at Cubbon Park", "description": "Cubbon Park is Bengaluru's green lung. Take an early morning walk among ancient trees, fountains, and colonial buildings — peaceful before the city wakes.", "category": "outdoors", "time_needed": "1 hr"},
        {"title": "Third Wave Coffee on Church Street", "description": "Bengaluru has India's best coffee culture. Visit Third Wave Coffee or Matteo Coffea on Church Street for exceptional single-origin brews.", "category": "relaxing", "time_needed": "30 mins"},
        {"title": "Lalbagh Botanical Garden", "description": "Wander through 240 acres of botanical wonder. See the iconic Glass House, ancient trees, and seasonal flower shows in this UNESCO-recognized garden.", "category": "outdoors", "time_needed": "1-2 hrs"},
        {"title": "Craft beer at Toit Brewpub", "description": "Toit on Indiranagar's 100 Feet Road is Bengaluru's most loved brewery. Try their seasonal ales and relax in the massive garden seating area.", "category": "social", "time_needed": "2+ hrs"},
        {"title": "Explore commercial street market", "description": "Bengaluru's Commercial Street is a paradise for shoppers — fabrics, sarees, streetwear, accessories, and incredible chaat. Great people watching too.", "category": "social", "time_needed": "1-2 hrs"},
    ],
    "chennai": [
        {"title": "Sunrise walk on Marina Beach", "description": "At 13km, Marina is the world's longest urban beach. Walking it at sunrise with the cool sea breeze, fishing boats returning, and warm light is unforgettable.", "category": "outdoors", "time_needed": "1 hr"},
        {"title": "Filter coffee at Murugan Idli Shop", "description": "The perfect South Indian breakfast: soft idlis with sambar and chutneys, and a strong filter coffee. Murugan Idli Shop is an institution.", "category": "cooking", "time_needed": "30 mins"},
        {"title": "Visit Kapaleeshwarar Temple", "description": "The 7th-century Dravidian temple in Mylapore is Chennai's spiritual heart. The gopuram (tower) is stunning and the morning puja is worth attending.", "category": "learning", "time_needed": "1 hr"},
        {"title": "Book shopping in Nungambakkam", "description": "Higginbothams and independent bookstores around Nungambakkam High Road offer incredible finds in Tamil literature, spirituality, and fiction.", "category": "relaxing", "time_needed": "1-2 hrs"},
        {"title": "Carnatic concert at Music Academy", "description": "During the December Margazhi festival, attend a Carnatic music or Bharatanatyam dance concert at the legendary Music Academy — a truly unique experience.", "category": "entertainment", "time_needed": "2+ hrs"},
    ],
    "hyderabad": [
        {"title": "Charminar and Laad Bazaar", "description": "The Charminar is Hyderabad's iconic landmark. Walk through the labyrinthine lanes of Laad Bazaar for bangles, pearls, and traditional crafts.", "category": "learning", "time_needed": "2+ hrs"},
        {"title": "Biryani at Paradise Restaurant", "description": "Paradise Biryani is synonymous with Hyderabad. The aromatic Dum Biryani here has been perfected over generations — a must-eat experience.", "category": "cooking", "time_needed": "1 hr"},
        {"title": "Evening walk at KBR National Park", "description": "KBR Park is a surprise oasis in the middle of the city. Walk the tree-lined paths at dusk and spot deer, peacocks, and hyenas in their natural habitat.", "category": "outdoors", "time_needed": "1-2 hrs"},
        {"title": "Irani chai at Nimrah Cafe", "description": "Outside the Charminar, Nimrah Cafe has been serving Irani chai and Osmania biscuits since 1939. A timeless morning ritual for Hyderabadis.", "category": "relaxing", "time_needed": "30 mins"},
        {"title": "Explore Golconda Fort at sunset", "description": "The medieval Golconda Fort has an incredible acoustic trick — clap your hands at the main gate and hear it at the top of the hill. Sunset views are epic.", "category": "outdoors", "time_needed": "2+ hrs"},
    ],
    "new-york-city": [
        {"title": "Sunrise walk on The High Line", "description": "The High Line at sunrise, before the crowds, is one of NYC's most magical experiences. The elevated park above Hudson Yards is beautifully landscaped.", "category": "outdoors", "time_needed": "1 hr"},
        {"title": "Bagel at Ess-a-Bagel", "description": "The quintessential New York experience: a fresh everything bagel with lox and cream cheese from Ess-a-Bagel on 3rd Avenue. Don't skip the pickles.", "category": "cooking", "time_needed": "30 mins"},
        {"title": "Walk across Brooklyn Bridge", "description": "Walk the Brooklyn Bridge at dusk from Brooklyn to Manhattan. The views of the skyline, the East River, and the bridges are iconic and timeless.", "category": "outdoors", "time_needed": "1-2 hrs"},
        {"title": "Comedy show in the West Village", "description": "The West Village has intimate comedy clubs like Gotham Comedy Club. A great weeknight show with craft cocktails is the perfect NYC evening.", "category": "entertainment", "time_needed": "2+ hrs"},
        {"title": "Browse The Strand Bookstore", "description": "18 miles of books on three floors. The Strand on 12th and Broadway is a New York institution. You WILL find something you didn't know you needed.", "category": "relaxing", "time_needed": "1 hr"},
    ],
    "los-angeles": [
        {"title": "Hike Runyon Canyon at sunrise", "description": "Runyon Canyon Park in Hollywood Hills offers panoramic views of the LA skyline and the Hollywood sign. The sunrise hike is spectacular and energizing.", "category": "fitness", "time_needed": "1-2 hrs"},
        {"title": "In-N-Out Burger animal style", "description": "No LA trip is complete without In-N-Out. Get a Double-Double animal style — it's a religious experience. The fries are better well done.", "category": "cooking", "time_needed": "30 mins"},
        {"title": "Venice Beach Boardwalk walk", "description": "Walk the Venice Beach Boardwalk — street performers, skaters, muscle beach, and the Pacific. Best on a Saturday morning when it's alive but not too crowded.", "category": "outdoors", "time_needed": "1-2 hrs"},
        {"title": "Sunset at Griffith Observatory", "description": "Watching the sun set over the Pacific from Griffith Observatory with the Hollywood sign and the LA Basin below you is one of the best free views in the world.", "category": "outdoors", "time_needed": "2+ hrs"},
        {"title": "Vintage shopping on Melrose Ave", "description": "Melrose Avenue is lined with legendary vintage stores. From retro streetwear to 70s furniture, it's a treasure hunt. Wasteland and ReLove are must-visits.", "category": "social", "time_needed": "2+ hrs"},
    ],
    "chicago": [
        {"title": "Deep dish pizza at Lou Malnati's", "description": "Lou Malnati's on Wacker Drive is the gold standard for Chicago-style deep dish. Get the Malnati Chicago Classic with sausage. Order ahead — wait times are real.", "category": "cooking", "time_needed": "1 hr"},
        {"title": "Architecture river boat tour", "description": "The Chicago Architecture Foundation's boat tour on the Chicago River is the best way to understand why Chicago is considered the world's greatest modern city.", "category": "learning", "time_needed": "2+ hrs"},
        {"title": "Walk the 606 Bloomingdale Trail", "description": "An elevated trail through Chicago's Northwest Side neighborhoods. Perfect for a bike ride or leisurely walk with great views of the city and local art installations.", "category": "outdoors", "time_needed": "1-2 hrs"},
        {"title": "Jazz at Andy's Jazz Club", "description": "Andy's Jazz Club on Hubbard Street has been a Chicago institution since 1951. The early evening jazz sets are perfect for dinner with live music.", "category": "entertainment", "time_needed": "2+ hrs"},
        {"title": "Millennium Park and the Bean", "description": "Visit Cloud Gate (the Bean) in Millennium Park at any time of day. Morning is quiet and reflective, evenings have free concerts. Crown Fountain nearby too.", "category": "outdoors", "time_needed": "1 hr"},
    ],
    "houston": [
        {"title": "Visit Space Center Houston", "description": "The real deal — NASA's visitor center with actual spacecraft, the Saturn V rocket (the largest ever), and behind-the-scenes mission control tours.", "category": "learning", "time_needed": "2+ hrs"},
        {"title": "Breakfast tacos in EaDo", "description": "East Downtown Houston has incredible tacos at Tacos Tierra Caliente or Chilosos. The barbacoa and egg tacos before 10am are life-changing.", "category": "cooking", "time_needed": "30 mins"},
        {"title": "Explore Buffalo Bayou Park", "description": "This stunning linear park along the bayou has sculpture gardens, a dog park, kayak rentals, and the remarkable underground cistern art installation.", "category": "outdoors", "time_needed": "1-2 hrs"},
        {"title": "Pho on Bellaire Blvd", "description": "Houston's Bellaire Blvd 'Little Saigon' district has the best Vietnamese food outside of Vietnam. Pho Danh and Pho Binh are legendary for huge bowls.", "category": "cooking", "time_needed": "1 hr"},
        {"title": "Museum District free Thursday", "description": "Houston's Museum District is one of the best in the country. Many museums offer free admission on Thursdays — the Museum of Natural Science is unmissable.", "category": "learning", "time_needed": "2+ hrs"},
    ],
    "phoenix": [
        {"title": "Hike Camelback Mountain at dawn", "description": "Camelback Mountain's Echo Canyon Trail is a challenging but rewarding hike. Start before sunrise to avoid heat and catch the pink desert sky from the summit.", "category": "fitness", "time_needed": "2+ hrs"},
        {"title": "Desert Botanical Garden", "description": "120 acres of desert plants from around the world, including hundreds of rare cacti. The evening lights program in winter turns it into a magical wonderland.", "category": "outdoors", "time_needed": "1-2 hrs"},
        {"title": "Brunch at Cibo Urban Pizzeria", "description": "This converted historic home in Encanto neighborhood serves incredible wood-fired pizza and brunch. A true Phoenix hidden gem with a gorgeous outdoor garden.", "category": "cooking", "time_needed": "1-2 hrs"},
        {"title": "Sunset from South Mountain Park", "description": "South Mountain Park is the largest municipal park in the US. Drive or hike to Dobbins Lookout for sunset views over the entire Phoenix Valley — stunning.", "category": "outdoors", "time_needed": "1 hr"},
        {"title": "Art galleries in Roosevelt Row", "description": "The Roosevelt Arts District (RoRo) is Phoenix's arts hub. First Fridays each month transforms the streets into an outdoor art festival with local galleries, food, and music.", "category": "learning", "time_needed": "2+ hrs"},
    ],
}


@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.votes.create_index([("user_id", 1), ("idea_id", 1)], unique=True)
    await db.ideas.create_index([("score", -1)])
    await db.ideas.create_index([("created_at", -1)])
    await db.ideas.create_index("category")
    await db.ideas.create_index("time_needed")
    await db.ideas.create_index("community_id")
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.follows.create_index([("follower_id", 1), ("following_id", 1)], unique=True)
    await db.community_members.create_index([("user_id", 1), ("community_id", 1)], unique=True)
    await db.communities.create_index("slug", unique=True)

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@boredideas.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({"email": admin_email, "name": "Admin", "password_hash": hash_password(admin_password), "role": "admin", "created_at": datetime.now(timezone.utc)})
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # Seed global ideas
    count = await db.ideas.count_documents({"community_id": None})
    if count == 0:
        now = datetime.now(timezone.utc)
        sample = [
            {"title": "Go for a nature walk", "description": "Take a relaxing walk in the nearest park or natural area. Notice the plants, birds, and fresh air around you.", "category": "outdoors", "time_needed": "30 mins", "image_url": None, "link_url": None, "community_id": None, "author_id": "system", "author_name": "Admin", "upvotes": 42, "downvotes": 3, "score": 39, "created_at": now, "updated_at": now},
            {"title": "Stargazing session", "description": "Find a dark spot away from city lights. Lay down a blanket, look up, and identify constellations.", "category": "outdoors", "time_needed": "1-2 hrs", "image_url": None, "link_url": None, "community_id": None, "author_id": "system", "author_name": "Admin", "upvotes": 35, "downvotes": 2, "score": 33, "created_at": now, "updated_at": now},
            {"title": "Bake chocolate chip cookies", "description": "Mix butter, sugar, eggs, flour and chocolate chips, then bake at 375F for 10-12 minutes.", "category": "cooking", "time_needed": "1 hr", "image_url": None, "link_url": None, "community_id": None, "author_id": "system", "author_name": "Admin", "upvotes": 55, "downvotes": 1, "score": 54, "created_at": now, "updated_at": now},
            {"title": "5-minute mug cake", "description": "Mix flour, sugar, cocoa, egg, milk and oil in a mug. Microwave for 90 seconds. Instant dessert!", "category": "cooking", "time_needed": "5 mins", "image_url": None, "link_url": None, "community_id": None, "author_id": "system", "author_name": "Admin", "upvotes": 48, "downvotes": 3, "score": 45, "created_at": now, "updated_at": now},
            {"title": "Watercolor sunset painting", "description": "Paint a simple sunset with 3 colors blending into each other using wet-on-wet technique.", "category": "painting", "time_needed": "1 hr", "image_url": None, "link_url": None, "community_id": None, "author_id": "system", "author_name": "Admin", "upvotes": 38, "downvotes": 2, "score": 36, "created_at": now, "updated_at": now},
            {"title": "Learn 3 guitar chords", "description": "G, C, and D are all you need to play hundreds of songs. Spend 15 minutes on these basics.", "category": "music", "time_needed": "15 mins", "image_url": None, "link_url": None, "community_id": None, "author_id": "system", "author_name": "Admin", "upvotes": 41, "downvotes": 2, "score": 39, "created_at": now, "updated_at": now},
            {"title": "Call an old friend", "description": "Think of someone you haven't talked to in a while and give them a call. 5 minutes can reignite a friendship!", "category": "social", "time_needed": "5 mins", "image_url": None, "link_url": None, "community_id": None, "author_id": "system", "author_name": "Admin", "upvotes": 44, "downvotes": 0, "score": 44, "created_at": now, "updated_at": now},
            {"title": "10-minute HIIT workout", "description": "No equipment needed! Do 30 seconds each of jumping jacks, burpees, mountain climbers, squats. Repeat 3 times.", "category": "fitness", "time_needed": "15 mins", "image_url": None, "link_url": None, "community_id": None, "author_id": "system", "author_name": "Admin", "upvotes": 33, "downvotes": 5, "score": 28, "created_at": now, "updated_at": now},
            {"title": "Make a friendship bracelet", "description": "Grab colorful thread and follow an easy pattern to make a bracelet for a friend.", "category": "crafts", "time_needed": "30 mins", "image_url": None, "link_url": None, "community_id": None, "author_id": "system", "author_name": "Admin", "upvotes": 28, "downvotes": 1, "score": 27, "created_at": now, "updated_at": now},
            {"title": "Watch a classic movie", "description": "Pick a film from AFI Top 100 you haven't seen. Make popcorn and settle in.", "category": "entertainment", "time_needed": "2+ hrs", "image_url": None, "link_url": None, "community_id": None, "author_id": "system", "author_name": "Admin", "upvotes": 22, "downvotes": 4, "score": 18, "created_at": now, "updated_at": now},
        ]
        await db.ideas.insert_many(sample)

    # Seed communities
    comm_count = await db.communities.count_documents({})
    if comm_count == 0:
        now = datetime.now(timezone.utc)
        for city_data in COMMUNITIES_DATA:
            result = await db.communities.insert_one({**city_data, "members_count": 0, "created_at": now})
            community_id = str(result.inserted_id)
            # Seed ideas for this community
            slug = city_data["slug"]
            if slug in COMMUNITY_IDEAS:
                city_ideas = []
                for idea in COMMUNITY_IDEAS[slug]:
                    city_ideas.append({**idea, "image_url": None, "link_url": None, "community_id": community_id, "author_id": "system", "author_name": "Admin", "upvotes": 0, "downvotes": 0, "score": 0, "created_at": now, "updated_at": now})
                await db.ideas.insert_many(city_ideas)

    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n## Admin\n- Email: {os.environ.get('ADMIN_EMAIL')}\n- Password: {os.environ.get('ADMIN_PASSWORD')}\n- Role: admin\n")

    print("Startup complete!")
