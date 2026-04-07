# Auth Testing Playbook

## Test Credentials
- Admin Email: admin@boredideas.com
- Admin Password: admin123

## Step 1: MongoDB Verification
```
mongosh
use bored_ideas
db.users.find({role: "admin"}).pretty()
```

## Step 2: API Testing
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@boredideas.com","password":"admin123"}'

curl -b cookies.txt http://localhost:8001/api/auth/me
```

## Step 3: Frontend Testing
- Visit / (feed page) - should show ideas
- Click Login/Sign Up - should show auth form
- Register new user - should redirect to feed
- Click "Share Idea" - should show form modal
- Submit an idea - should appear in feed
- Upvote/downvote - should update vote counts
- Filter by category/time - should filter feed
- Sort by popular/newest - should reorder feed
- Go to profile - should show user's ideas
- Edit an idea - should update it
- Delete an idea - should remove it
