# PRD: Bored? — Crowdsourced Ideas App

## Architecture
- Frontend: React 18 + Tailwind CSS + Framer Motion + shadcn/ui + React Router v6
- Backend: FastAPI + Motor (async MongoDB) + StaticFiles (image uploads)
- Auth: JWT cookie (email/password) + Emergent Google OAuth (session_token cookie)
- Fonts: Quicksand (headings) + Actor (body)

## Color Palette
primary #FFE100, primaryDark #000000, grayDark #1A1A1A, gray #3C3C3C, grayLight #E6E6E6, surface #FAFAFA
accentRed #FF4757, accentCyan #00E5FF, accentGreen #2DFF72, accentViolet #5D2EFF

## Features Implemented

### Auth
- [x] Email/password JWT auth (register, login, logout, refresh)
- [x] Google OAuth via Emergent Auth (AuthCallback.js, session_token cookie)
- [x] Brute force protection (5 attempts → 15 min lockout)

### Global Feed
- [x] Paginated ideas feed (12/page) with filters: category, time_needed, sort (popular/newest)
- [x] 12 pre-seeded global ideas
- [x] Upvote/downvote toggle system with score tracking

### Ideas
- [x] Rich submission: title, description, category, time_needed, image (upload or URL), optional link
- [x] Image file upload (POST /api/upload/image → /api/uploads/* static files)
- [x] Edit and delete own ideas (two-click confirm delete)
- [x] community_id field for local community ideas vs global feed

### Follow System
- [x] Follow/unfollow users from idea card author row
- [x] GET /api/users/following — list of followed users
- [x] POST/DELETE /api/users/:id/follow
- [x] GET /api/ideas/following — feed of followed users' ideas
- [x] Following page (/following)
- [x] Sidebar shows followed users list (desktop)

### Local Communities
- [x] 10 cities: Mumbai, Delhi, Bengaluru, Chennai, Hyderabad (India) + NYC, LA, Chicago, Houston, Phoenix (USA)
- [x] 5 seeded local ideas per city (50 total community ideas)
- [x] Join/leave communities (sidebar + community page + communities list page)
- [x] Community ideas feed at /communities/:id
- [x] Communities list page at /communities

### Layout
- [x] Desktop: sticky left sidebar (w-64) with Following section + India + US communities
- [x] Mobile: bottom nav bar (Feed | Following | Local | Profile)
- [x] All routes: /, /communities, /communities/:id, /following, /profile, /auth

## Test Results (All Iterations)
- Iteration 1: 16/16 backend, 100% frontend (initial MVP)
- Iteration 2: 95% UI redesign verification
- Iteration 3: 8/8 Google Auth + fonts
- Iteration 4: 15/15 new features (image upload, follow, communities)

## Backlog
### P1
- Comments per idea
- Keyword search in filter bar
- Social sharing buttons
### P2
- Trending/hot algorithm
- Dark mode toggle
- Email notifications for follows
- Community moderation (admin)
- User avatars from Google profile
