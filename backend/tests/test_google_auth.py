"""Tests for Google OAuth session endpoints and dual-cookie auth (iteration 3)"""
import pytest
import requests
import os
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
MONGO_URL = os.environ.get('MONGO_URL', '')
DB_NAME = os.environ.get('DB_NAME', 'bored_ideas')

# Setup: insert a Google test user and session into MongoDB
@pytest.fixture(scope="module")
def google_session():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    user_id = ObjectId()
    session_token = f"test_session_{int(datetime.now().timestamp())}"
    db.users.insert_one({
        "_id": user_id,
        "email": "test.google.pytest@example.com",
        "name": "Google Pytest User",
        "role": "user",
        "auth_method": "google",
        "created_at": datetime.now(timezone.utc),
    })
    db.user_sessions.insert_one({
        "user_id": str(user_id),
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })
    yield {"user_id": str(user_id), "session_token": session_token}
    # Cleanup
    db.users.delete_one({"_id": user_id})
    db.user_sessions.delete_one({"session_token": session_token})
    client.close()


class TestGoogleOAuthBackend:
    """Google OAuth session-based auth backend tests"""

    def test_me_with_valid_session_token(self, google_session):
        """GET /api/auth/me returns user data when session_token cookie is set"""
        resp = requests.get(
            f"{BASE_URL}/api/auth/me",
            cookies={"session_token": google_session["session_token"]},
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["email"] == "test.google.pytest@example.com"
        assert data["name"] == "Google Pytest User"
        assert "id" in data

    def test_me_with_invalid_session_token(self):
        """GET /api/auth/me returns 401 for invalid session_token"""
        resp = requests.get(
            f"{BASE_URL}/api/auth/me",
            cookies={"session_token": "invalid_token_xyz"},
        )
        assert resp.status_code == 401

    def test_me_without_any_cookie(self):
        """GET /api/auth/me returns 401 when no cookies"""
        resp = requests.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 401

    def test_google_session_endpoint_exists(self):
        """POST /api/auth/google/session endpoint exists (returns 401 for fake session_id, not 404/500)"""
        resp = requests.post(
            f"{BASE_URL}/api/auth/google/session",
            json={"session_id": "fake_session_id_for_testing"},
        )
        # Should return 401 (invalid session_id from Emergent), not 404 or 500
        assert resp.status_code in [401, 422], f"Expected 401/422, got {resp.status_code}: {resp.text}"

    def test_logout_clears_session_token(self, google_session):
        """POST /api/auth/logout deletes session from DB and clears session_token cookie"""
        session = requests.Session()
        session.cookies.set("session_token", google_session["session_token"])
        resp = session.post(f"{BASE_URL}/api/auth/logout")
        assert resp.status_code == 200

        # Verify session was deleted from DB
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        remaining = db.user_sessions.find_one({"session_token": google_session["session_token"]})
        client.close()
        assert remaining is None, "Session should have been deleted from DB after logout"


class TestEmailAuthStillWorks:
    """Verify email/password auth is not broken by Google OAuth changes"""

    def test_login_admin(self):
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@boredideas.com", "password": "admin123"},
        )
        assert resp.status_code == 200, f"Admin login failed: {resp.text}"
        data = resp.json()
        assert data["email"] == "admin@boredideas.com"

    def test_me_with_jwt_cookie(self):
        """After login, access_token cookie allows /api/auth/me"""
        s = requests.Session()
        login_resp = s.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@boredideas.com", "password": "admin123"},
        )
        assert login_resp.status_code == 200
        me_resp = s.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == "admin@boredideas.com"

    def test_logout_clears_jwt(self):
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@boredideas.com", "password": "admin123"})
        logout_resp = s.post(f"{BASE_URL}/api/auth/logout")
        assert logout_resp.status_code == 200
        # After logout, /me should fail
        me_resp = s.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 401
