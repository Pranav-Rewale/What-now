"""Isolated API integration coverage; no running MongoDB required."""
import asyncio
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-only-secret-with-at-least-32-characters")
    monkeypatch.setenv("SEED_DEMO_DATA", "true")
    monkeypatch.setenv("DEMO_PASSWORD", "TestPassword123!")
    monkeypatch.delenv("ADMIN_EMAIL", raising=False)
    monkeypatch.setattr(server, "db", AsyncMongoMockClient().test_database)
    with TestClient(server.app) as api:
        yield api


def test_seed_and_login(client):
    assert client.get("/api/ideas").json()["total"] >= 6
    assert len(client.get("/api/communities").json()["communities"]) == 10
    response = client.post("/api/auth/login", json={
        "email": "aanya@example.com", "password": "TestPassword123!"})
    assert response.status_code == 200
    assert "password_hash" not in response.json()
    assert client.get("/api/auth/me").json()["name"] == "Aanya Sharma"
    before = client.get("/api/ideas").json()["total"]
    asyncio.run(server.startup())
    assert client.get("/api/ideas").json()["total"] == before


def test_register_create_and_ownership(client):
    payload = {"name": "New Member", "email": "new@example.com", "password": "TestPassword123!"}
    assert client.post("/api/auth/register", json=payload).status_code == 200
    assert client.post("/api/auth/register", json=payload).status_code == 400
    idea = client.post("/api/ideas", json={"title": "Read outside", "description": "Bring a book to a park.",
        "category": "reading", "time_needed": "30 mins"})
    assert idea.status_code == 200
    idea_id = idea.json()["id"]
    assert client.get(f"/api/ideas/{idea_id}").status_code == 200
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401
    assert client.post("/api/ideas", json={"title": "x", "description": "x", "category": "reading", "time_needed": "30 mins"}).status_code == 401
    client.post("/api/auth/login", json={"email": "aanya@example.com", "password": "TestPassword123!"})
    assert client.delete(f"/api/ideas/{idea_id}").status_code == 403


def test_invalid_registration(client):
    assert client.post("/api/auth/register", json={"name": "X", "email": "invalid", "password": "short"}).status_code == 422
    assert client.post("/api/auth/login", json={"email": "aanya@example.com", "password": "wrong"}).status_code == 401
