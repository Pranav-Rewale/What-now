"""Backend API tests for Bored Ideas crowdsourcing app"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test user credentials
TEST_EMAIL = "testuser_pytest@test.com"
TEST_PASSWORD = "test123"
TEST_NAME = "Pytest User"
ADMIN_EMAIL = "admin@boredideas.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_session(session):
    """Register or login test user"""
    # Try register first
    r = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_EMAIL, "password": TEST_PASSWORD, "name": TEST_NAME
    })
    if r.status_code not in [200, 201, 400]:
        pytest.skip(f"Register failed: {r.status_code}")
    if r.status_code == 400 and "already registered" in r.text:
        # Login instead
        r2 = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD
        })
        assert r2.status_code == 200, f"Login failed: {r2.text}"
    return session


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
    })
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return s


# --- Health ---
class TestHealth:
    def test_health(self, session):
        r = session.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
        print("PASS: health check")


# --- Auth ---
class TestAuth:
    def test_register_duplicate(self, session):
        """Duplicate email should return 400"""
        r = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": ADMIN_EMAIL, "password": "whatever", "name": "Test"
        })
        assert r.status_code == 400
        print("PASS: duplicate registration blocked")

    def test_login_success(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        assert r.status_code == 200
        data = r.json()
        assert "email" in data
        assert data["email"] == ADMIN_EMAIL
        print("PASS: admin login")

    def test_login_wrong_password(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": "wrongpass"
        })
        assert r.status_code == 401
        print("PASS: wrong password rejected")

    def test_me_authenticated(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert "email" in data
        print(f"PASS: /me returns user: {data['email']}")

    def test_me_unauthenticated(self, session):
        s = requests.Session()
        r = s.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401
        print("PASS: unauthenticated /me rejected")


# --- Ideas ---
class TestIdeas:
    def test_get_ideas_public(self, session):
        r = session.get(f"{BASE_URL}/api/ideas")
        assert r.status_code == 200
        data = r.json()
        assert "ideas" in data
        assert "total" in data
        assert len(data["ideas"]) > 0
        print(f"PASS: got {len(data['ideas'])} ideas, total={data['total']}")

    def test_get_ideas_filter_category(self, session):
        r = session.get(f"{BASE_URL}/api/ideas", params={"category": "cooking"})
        assert r.status_code == 200
        data = r.json()
        for idea in data["ideas"]:
            assert idea["category"] == "cooking"
        print(f"PASS: category filter: {len(data['ideas'])} cooking ideas")

    def test_get_ideas_filter_time(self, session):
        r = session.get(f"{BASE_URL}/api/ideas", params={"time_needed": "15 mins"})
        assert r.status_code == 200
        data = r.json()
        for idea in data["ideas"]:
            assert idea["time_needed"] == "15 mins"
        print(f"PASS: time filter: {len(data['ideas'])} ideas")

    def test_get_ideas_sort_newest(self, session):
        r = session.get(f"{BASE_URL}/api/ideas", params={"sort": "newest"})
        assert r.status_code == 200
        data = r.json()
        assert len(data["ideas"]) > 0
        print("PASS: sort newest works")

    def test_create_idea_unauthenticated(self, session):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/ideas", json={
            "title": "Test Idea", "description": "Test", "category": "cooking", "time_needed": "5 mins"
        })
        assert r.status_code == 401
        print("PASS: unauthenticated idea creation blocked")

    def test_create_and_delete_idea(self, auth_session):
        # Create
        r = auth_session.post(f"{BASE_URL}/api/ideas", json={
            "title": "TEST_Pytest Idea",
            "description": "Created by pytest automation",
            "category": "crafts",
            "time_needed": "5 mins"
        })
        assert r.status_code == 200, f"Create failed: {r.text}"
        idea = r.json()
        assert idea["title"] == "TEST_Pytest Idea"
        assert "id" in idea
        idea_id = idea["id"]
        print(f"PASS: idea created id={idea_id}")

        # Verify GET
        r2 = auth_session.get(f"{BASE_URL}/api/ideas/{idea_id}")
        assert r2.status_code == 200
        assert r2.json()["id"] == idea_id

        # Update
        r3 = auth_session.put(f"{BASE_URL}/api/ideas/{idea_id}", json={"title": "TEST_Updated Pytest Idea"})
        assert r3.status_code == 200
        assert r3.json()["title"] == "TEST_Updated Pytest Idea"
        print("PASS: idea updated")

        # Delete
        r4 = auth_session.delete(f"{BASE_URL}/api/ideas/{idea_id}")
        assert r4.status_code == 200

        # Verify deleted
        r5 = auth_session.get(f"{BASE_URL}/api/ideas/{idea_id}")
        assert r5.status_code == 404
        print("PASS: idea deleted and verified")

    def test_vote_on_idea(self, auth_session):
        # Get first idea
        r = auth_session.get(f"{BASE_URL}/api/ideas", params={"limit": 1})
        ideas = r.json()["ideas"]
        assert len(ideas) > 0
        idea_id = ideas[0]["id"]
        initial_upvotes = ideas[0]["upvotes"]

        # Upvote
        r2 = auth_session.post(f"{BASE_URL}/api/ideas/{idea_id}/vote", json={"vote_type": "upvote"})
        assert r2.status_code == 200
        data = r2.json()
        assert "upvotes" in data
        assert "user_vote" in data
        print(f"PASS: voted on idea {idea_id}, user_vote={data['user_vote']}")

        # Toggle off (same vote)
        r3 = auth_session.post(f"{BASE_URL}/api/ideas/{idea_id}/vote", json={"vote_type": "upvote"})
        assert r3.status_code == 200
        assert r3.json()["user_vote"] is None
        print("PASS: vote toggled off")

    def test_my_ideas(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/ideas/my")
        assert r.status_code == 200
        assert "ideas" in r.json()
        print(f"PASS: /ideas/my returns {len(r.json()['ideas'])} ideas")

    def test_delete_other_user_idea_forbidden(self, auth_session, admin_session):
        # Admin creates an idea
        r = admin_session.post(f"{BASE_URL}/api/ideas", json={
            "title": "TEST_Admin Idea",
            "description": "Admin only",
            "category": "outdoors",
            "time_needed": "5 mins"
        })
        assert r.status_code == 200
        idea_id = r.json()["id"]

        # Test user tries to delete
        r2 = auth_session.delete(f"{BASE_URL}/api/ideas/{idea_id}")
        assert r2.status_code == 403
        print("PASS: unauthorized delete blocked")

        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/ideas/{idea_id}")

    def test_invalid_vote_type(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/ideas", params={"limit": 1})
        idea_id = r.json()["ideas"][0]["id"]
        r2 = auth_session.post(f"{BASE_URL}/api/ideas/{idea_id}/vote", json={"vote_type": "invalid"})
        assert r2.status_code == 400
        print("PASS: invalid vote type rejected")
