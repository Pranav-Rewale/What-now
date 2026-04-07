# PRD: Bored? — Crowdsourced Ideas App

## Problem Statement
Build a crowdsourcing app for bored ideas. Users submit ideas for things to do when bored. Ideas are organized by category and time needed. All ideas go to a global feed with upvote/downvote voting. Feed is filterable by category and time needed.

## Architecture
- **Frontend**: React 18 + Tailwind CSS + React Router v6 + Axios + Framer Motion + shadcn/ui
- **Backend**: FastAPI (Python) + Motor (async MongoDB driver)
- **Database**: MongoDB
- **Auth**: JWT-based (httpOnly cookie, 7-day access token, 30-day refresh token)

## Design System (v2 — April 2026)
Colors:
- primary: #FFE100, primaryDark: #000000
- grayDark: #1A1A1A, gray: #3C3C3C, grayLight: #E6E6E6, surface: #FAFAFA
- accentRed: #FF4757, accentCyan: #00E5FF, accentGreen: #2DFF72, accentViolet: #5D2EFF

Radii: small 4px / medium 8px / large 16px
Shadows: soft "0 4px 12px rgba(0,0,0,0.12)" / hard "0 2px 8px rgba(0,0,0,0.25)"

shadcn UI Components: Button (CVA variants), Badge, Input, Textarea, Label
Framer Motion: card entrance stagger, hover lift, vote button spring, modal slide-up

## User Choices
- JWT-based custom auth (email + password)
- Fun & colorful — modern high-contrast (yellow/black + vivid accents)
- Rich idea submission (title + description + category + time needed + optional image/link)
- Sort by Most Upvoted (popular) and Newest First
- Idea management: edit and delete own ideas

## What's Been Implemented

### Backend (/app/backend/server.py) — unchanged from v1
- JWT auth: register, login, logout, me, refresh (cookie-based)
- Brute force protection (5 attempts → 15 min lockout)
- Admin seeding + 12 sample ideas on first startup
- Full CRUD for ideas (author-only edit/delete)
- Vote toggle system (upvote/downvote with score tracking)
- MongoDB indexes for performance

### Frontend v2 (April 2026 redesign)
- [x] New design system applied throughout (palette, radii, shadows)
- [x] Header: dark black bg, yellow logo + icon, shadcn Button
- [x] IdeaCard: white card, soft shadow, colored top bar, framer motion entrance + hover lift
- [x] FilterBar: yellow active sort toggle, category-accent-colored filter pills, time yellow
- [x] IdeaForm: framer motion slide-up modal, shadcn Input/Textarea/Label
- [x] AuthPage: clean card, yellow CTA button, framer motion entrance
- [x] ProfilePage: stat cards with accent colors, animated entrance
- [x] Vote buttons: green (#2DFF72) upvote active, red (#FF4757) downvote active
- [x] shadcn components: Button (7 variants), Badge, Input, Textarea, Label
- [x] AnimatePresence for modal mount/unmount transitions

## Test Results
- v1 Backend: 16/16 passed
- v2 UI Redesign: 95% pass, all design elements verified

## Prioritized Backlog
### P1
- Comments/discussion per idea
- Keyword search
- Social sharing buttons
### P2
- Infinite scroll
- Email verification
- Password reset via email
- Trending section (hot algorithm)
- Dark mode toggle
- User follows / personalized feed
