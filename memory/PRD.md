# PRD: Bored? — Crowdsourced Ideas App

## Problem Statement
Build a crowdsourcing app for bored ideas. Users submit ideas for things to do when bored. Ideas are organized by category and time needed. All ideas go to a global feed with upvote/downvote voting. Feed is filterable by category and time needed.

## Architecture
- **Frontend**: React 18 + Tailwind CSS + React Router v6 + Axios
- **Backend**: FastAPI (Python) + Motor (async MongoDB driver)
- **Database**: MongoDB
- **Auth**: JWT-based (httpOnly cookie, 7-day access token, 30-day refresh token)

## User Choices
- JWT-based custom auth (email + password)
- Fun & colorful (bright, playful) Neo-Brutalist design
- Rich idea submission (title + description + category + time needed + optional image/link)
- Sort by Most Upvoted (popular) and Newest First
- Idea management: edit and delete own ideas

## Core Requirements (Static)
1. User registration and login (JWT, bcrypt)
2. Global idea feed with pagination (12/page)
3. Filter by category (12 categories) and time needed (6 options)
4. Sort by Popular (score desc) or Newest (date desc)
5. Submit idea with title, description, category, time, optional image URL + link URL
6. Upvote/downvote ideas (toggle behavior)
7. Edit own ideas
8. Delete own ideas (2-click confirmation)
9. User profile page with stats (ideas count, total upvotes)
10. Admin account with seed data

## Categories
outdoors, crafts, cooking, painting, entertainment, music, reading, gaming, fitness, social, learning, relaxing

## Time Options
5 mins, 15 mins, 30 mins, 1 hr, 1-2 hrs, 2+ hrs

## What's Been Implemented (April 2026)

### Backend (/app/backend/server.py)
- [x] JWT auth: register, login, logout, me, refresh
- [x] Brute force protection (5 attempts → 15 min lockout)
- [x] Admin seeding on startup
- [x] 12 sample ideas seeded on first startup
- [x] GET /api/ideas with filters (category, time_needed, sort, skip, limit)
- [x] POST /api/ideas (authenticated)
- [x] GET /api/ideas/my (authenticated, returns author's ideas)
- [x] GET /api/ideas/{id}
- [x] PUT /api/ideas/{id} (author only)
- [x] DELETE /api/ideas/{id} (author only, also deletes votes)
- [x] POST /api/ideas/{id}/vote (toggle upvote/downvote)
- [x] MongoDB indexes for performance

### Frontend (/app/frontend/src/)
- [x] App.js: BrowserRouter, routes, global IdeaForm modal
- [x] AuthContext: session check, login, register, logout
- [x] AppContext: global form state (create/edit), refresh key
- [x] Header: logo, Share Idea button, profile link, logout
- [x] FeedPage: hero, FilterBar, IdeaCard grid, pagination
- [x] AuthPage: Login/Register toggle form
- [x] ProfilePage: user stats, my ideas grid
- [x] IdeaCard: category badge, time badge, vote buttons, edit/delete
- [x] IdeaForm: create/edit modal with all fields
- [x] FilterBar: category + time filters + sort toggle

## Test Results (April 2026)
- Backend: 16/16 tests passed
- Frontend: All flows verified (feed, auth, submit, vote, edit, delete, filter, sort, profile)

## Prioritized Backlog

### P0 (Critical — already done)
- All core features implemented ✓

### P1 (High Value Enhancements)
- Infinite scroll instead of "Load More" button
- Comments/discussion on ideas
- Search by keyword
- Share idea to social media

### P2 (Nice to Have)
- Email verification on register
- Password reset via email
- Trending ideas section (hot algorithm)
- User follows / personalized feed
- Idea collections/bookmarks
- Dark mode toggle

## Next Tasks
1. Consider adding comments to ideas for deeper engagement
2. Add keyword search to the filter bar
3. Add social sharing buttons on idea cards
