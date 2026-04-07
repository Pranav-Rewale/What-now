# Google Auth Testing Playbook (Emergent OAuth)

## Credentials
- Admin: admin@boredideas.com / admin123
- App URL: https://ad92ad2e-1829-4460-9b95-3977adec5fab.preview.emergentagent.com

## Step 1: Manual DB Setup for Testing Google Auth
```
mongosh
use bored_ideas
var userId = new ObjectId()
var sessionToken = 'test_session_' + Date.now()
db.users.insertOne({_id: userId, email: 'test.google@example.com', name: 'Google Test User', role: 'user', auth_method: 'google', created_at: new Date()})
db.user_sessions.insertOne({user_id: userId.toString(), session_token: sessionToken, expires_at: new Date(Date.now() + 7*24*60*60*1000), created_at: new Date()})
print('session_token: ' + sessionToken)
```

## Step 2: Test Backend with Session Cookie
```
curl -s http://localhost:8001/api/auth/me \
  -H "Cookie: session_token=<sessionToken>"
```

## Step 3: Browser Testing
- Visit /auth page
- Verify "Continue with Google" button exists
- Click it - redirects to auth.emergentagent.com
- After real Google login, lands back on / with user logged in

## Step 4: Playwright Session Injection
```python
await page.context.add_cookies([{
  "name": "session_token",
  "value": "<sessionToken>",
  "domain": "ad92ad2e-1829-4460-9b95-3977adec5fab.preview.emergentagent.com",
  "path": "/",
  "httpOnly": True,
  "secure": True,
  "sameSite": "None"
}])
await page.goto("https://ad92ad2e-1829-4460-9b95-3977adec5fab.preview.emergentagent.com")
```

## Success Checklist
- [ ] /api/auth/me returns user data with session_token cookie
- [ ] Google button visible on /auth page
- [ ] /api/auth/logout clears session_token from DB and cookie
- [ ] Both auth methods (JWT + Google) work with same idea create/vote API
