"""Tests for new features: communities, follow system, image upload, following feed"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    resp = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@boredideas.com", "password": "admin123"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return s

# --- Communities ---

def test_get_communities(session):
    resp = session.get(f"{BASE_URL}/api/communities")
    assert resp.status_code == 200
    data = resp.json()
    assert "communities" in data
    names = [c["name"] for c in data["communities"]]
    for city in ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Hyderabad",
                 "New York City", "Los Angeles", "Chicago", "Houston", "Phoenix"]:
        assert city in names, f"{city} not found in communities"
    print(f"PASS: Got {len(data['communities'])} communities with all 10 cities")

def test_community_has_joined_field(session):
    resp = session.get(f"{BASE_URL}/api/communities")
    assert resp.status_code == 200
    communities = resp.json()["communities"]
    for c in communities:
        assert "joined" in c
    print("PASS: All communities have 'joined' field")

def test_get_community_details(session):
    resp = session.get(f"{BASE_URL}/api/communities")
    communities = resp.json()["communities"]
    mumbai = next(c for c in communities if c["name"] == "Mumbai")
    detail = session.get(f"{BASE_URL}/api/communities/{mumbai['id']}")
    assert detail.status_code == 200
    data = detail.json()
    assert data["name"] == "Mumbai"
    assert data["country"] == "India"
    print(f"PASS: Mumbai community detail returned correctly")

def test_mumbai_community_ideas(session):
    resp = session.get(f"{BASE_URL}/api/communities")
    communities = resp.json()["communities"]
    mumbai = next(c for c in communities if c["name"] == "Mumbai")
    ideas_resp = session.get(f"{BASE_URL}/api/ideas?community_id={mumbai['id']}")
    assert ideas_resp.status_code == 200
    data = ideas_resp.json()
    assert data["total"] >= 5
    titles = [i["title"] for i in data["ideas"]]
    assert any("Juhu" in t for t in titles), f"Mumbai ideas don't include Juhu Beach: {titles}"
    print(f"PASS: Mumbai has {data['total']} ideas including Juhu Beach")

def test_join_community(session):
    resp = session.get(f"{BASE_URL}/api/communities")
    communities = resp.json()["communities"]
    chicago = next(c for c in communities if c["name"] == "Chicago")
    cid = chicago["id"]
    # Leave first to ensure clean state
    session.delete(f"{BASE_URL}/api/communities/{cid}/join")
    join_resp = session.post(f"{BASE_URL}/api/communities/{cid}/join")
    assert join_resp.status_code == 200
    assert join_resp.json()["joined"] == True
    print("PASS: Join community works")

def test_leave_community(session):
    resp = session.get(f"{BASE_URL}/api/communities")
    communities = resp.json()["communities"]
    chicago = next(c for c in communities if c["name"] == "Chicago")
    cid = chicago["id"]
    session.post(f"{BASE_URL}/api/communities/{cid}/join")
    leave_resp = session.delete(f"{BASE_URL}/api/communities/{cid}/join")
    assert leave_resp.status_code == 200
    assert leave_resp.json()["joined"] == False
    print("PASS: Leave community works")

def test_global_feed_excludes_community_ideas(session):
    resp = session.get(f"{BASE_URL}/api/ideas")
    assert resp.status_code == 200
    data = resp.json()
    for idea in data["ideas"]:
        assert idea["community_id"] is None, f"Global feed has community idea: {idea['title']}"
    print(f"PASS: Global feed excludes community ideas ({data['total']} ideas)")

# --- Follow System ---

def test_get_following_unauthenticated():
    resp = requests.get(f"{BASE_URL}/api/users/following")
    assert resp.status_code == 401
    print("PASS: /api/users/following requires auth")

def test_get_following_empty(session):
    resp = session.get(f"{BASE_URL}/api/users/following")
    assert resp.status_code == 200
    data = resp.json()
    assert "users" in data
    print(f"PASS: Following list returned ({len(data['users'])} users)")

def test_following_feed_empty(session):
    resp = session.get(f"{BASE_URL}/api/ideas/following")
    assert resp.status_code == 200
    data = resp.json()
    assert "ideas" in data
    assert "total" in data
    print(f"PASS: Following feed returned (total={data['total']})")

def test_cannot_follow_self(session):
    me = session.get(f"{BASE_URL}/api/auth/me").json()
    resp = session.post(f"{BASE_URL}/api/users/{me['id']}/follow")
    assert resp.status_code == 400
    print("PASS: Cannot follow self")

def test_follow_unfollow_user(session):
    # Register test user to follow
    import uuid
    test_email = f"TEST_follow_{uuid.uuid4().hex[:6]}@example.com"
    reg = requests.post(f"{BASE_URL}/api/auth/register", json={"email": test_email, "name": "Test Follow User", "password": "test123"})
    assert reg.status_code == 200
    target_id = reg.json()["id"]
    
    # Follow
    follow_resp = session.post(f"{BASE_URL}/api/users/{target_id}/follow")
    assert follow_resp.status_code == 200
    assert follow_resp.json()["following"] == True
    
    # Verify in list
    following_resp = session.get(f"{BASE_URL}/api/users/following")
    following_ids = [u["id"] for u in following_resp.json()["users"]]
    assert target_id in following_ids
    
    # Unfollow
    unfollow_resp = session.delete(f"{BASE_URL}/api/users/{target_id}/follow")
    assert unfollow_resp.status_code == 200
    assert unfollow_resp.json()["following"] == False
    print("PASS: Follow/unfollow user works")

# --- Image Upload ---

def test_image_upload_requires_auth():
    import io
    files = {"file": ("test.jpg", io.BytesIO(b"fake"), "image/jpeg")}
    resp = requests.post(f"{BASE_URL}/api/upload/image", files=files)
    assert resp.status_code == 401
    print("PASS: Image upload requires auth")

def test_image_upload_success(session):
    import io
    png_bytes = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
        b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00'
        b'\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
    )
    files = {"file": ("test.png", io.BytesIO(png_bytes), "image/png")}
    # Create upload session without JSON content-type
    upload_session = requests.Session()
    upload_session.cookies = session.cookies
    resp = upload_session.post(f"{BASE_URL}/api/upload/image", files=files)
    assert resp.status_code == 200, f"Upload failed: {resp.text}"
    data = resp.json()
    assert "url" in data
    assert data["url"].startswith("http")
    print(f"PASS: Image upload works, url={data['url']}")

def test_image_upload_invalid_type(session):
    import io
    files = {"file": ("test.txt", io.BytesIO(b"text content"), "text/plain")}
    upload_session = requests.Session()
    upload_session.cookies = session.cookies
    resp = upload_session.post(f"{BASE_URL}/api/upload/image", files=files)
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
    print("PASS: Image upload rejects non-image files")
