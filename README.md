# What-now
A community-powered engine to turn idle time into shared experience. #social-app #community #boredom-buster

## Run locally

The React frontend connects to FastAPI on port 8001. MongoDB stores users,
password hashes, ideas, votes, follows, communities, and memberships. Database
and uploaded images use persistent Docker volumes.

1. Install Docker Desktop and start its Linux engine.
2. Copy `backend/.env.example` to `backend/.env` if it does not already exist.
   Set `JWT_SECRET` to a random value of at least 32 characters and choose
   `DEMO_PASSWORD`. Generate a secret with
   `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
3. Run `docker compose up --build -d` from this directory.
4. In another terminal, run `cd frontend`, `npm install`, then `npm start`.
5. Open http://localhost:3000. API documentation: http://localhost:8001/docs.
   Database readiness: http://localhost:8001/api/health.

`frontend/.env.example` documents the API URL override for other environments.
The frontend defaults to `http://localhost:8001`.

## Sample data

With `SEED_DEMO_DATA=true`, startup inserts six fictional users, six hobby ideas
linked to their profiles, ten city communities, and fifty community activity
ideas. Repeated startup preserves existing demo users, passwords, and edits.
Sample emails: `aanya@example.com`, `rohan@example.com`, `meera@example.com`,
`arjun@example.com`, `sara@example.com`, and `dev@example.com`. All use the
`DEMO_PASSWORD` configured in your local environment file. No real user data is included.

Disable `SEED_DEMO_DATA` for a new production database; it does not delete
existing records. Optional `ADMIN_EMAIL` and `ADMIN_PASSWORD` provision an admin
without resetting an existing account. Use HTTPS and `COOKIE_SECURE=true` in
production, set your real frontend/backend URLs, and keep environment files private.
Google sign-in still uses the app's existing external OAuth provider; email/password
registration and login run directly against this backend.

## Run Python without Docker

Start MongoDB separately and set `MONGO_URL` in `backend/.env`. Create a virtual
environment, install `backend/requirements-runtime.txt`, then run
`python -m uvicorn server:app --app-dir backend --port 8001`.

## Backend verification

Install `pytest` and `mongomock-motor` in addition to runtime requirements, then
run `python -m pytest backend/tests/test_local_backend.py -q`.
These tests exercise the API with an isolated in-memory MongoDB substitute.
Use the health endpoint to verify your actual MongoDB deployment.
