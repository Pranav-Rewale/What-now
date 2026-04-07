# Test Credentials

## Admin Account
- Email: admin@boredideas.com
- Password: admin123
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
- GET /api/ideas/{id}
- PUT /api/ideas/{id} (author only)
- DELETE /api/ideas/{id} (author only)
- POST /api/ideas/{id}/vote (authenticated)
