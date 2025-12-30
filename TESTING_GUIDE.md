# Report & Block Features - Testing Guide

## Railway Deployment Test Instructions

### 1. Deploy Changes to Railway

First, commit and push all changes to your repository:

```bash
git add .
git commit -m "Add Report and Block User features

- Added ReportModal component for reporting users/listings/messages
- Added BlockButton component with block/unblock functionality
- Added BlockedUsersList page for managing blocked users
- Integrated Report and Block buttons into UserProfile
- Created API endpoints for all Report and Block operations"
git push origin Dev
```

Railway will automatically deploy your changes from the `Dev` branch.

---

## 2. Testing the Report Feature

### A. Test via User Interface (UserProfile page)

1. **Navigate to a user profile:**
   - Go to: `https://kustay-production.up.railway.app/profile/{user_id}`
   - Example: `https://kustay-production.up.railway.app/profile/5`

2. **Click the Report button (Flag icon)** next to the "Send Message" button

3. **Fill out the report form:**
   - Select report type: "User"
   - Enter description (minimum 10 characters, maximum 1000)
   - Click "Submit Report"

4. **Expected result:**
   - Success message: "Report submitted successfully"
   - Modal closes automatically
   - Report is saved to database

### B. Test via API (Using Browser Console)

Open browser console (F12) on your Railway site and run:

```javascript
// Test reporting a user
fetch('/api/reports/create/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    report_type: 'user',
    reported_user_id: 5,  // Replace with actual user ID
    description: 'This is a test report for demonstration purposes.'
  })
})
.then(res => res.json())
.then(data => console.log('Report created:', data))
.catch(err => console.error('Error:', err));
```

Expected response:
```json
{
  "message": "Report created successfully",
  "status": "pending",
  "report_id": 1
}
```

### C. View Your Reports

**Via Browser Console:**
```javascript
fetch('/api/reports/', {
  credentials: 'include'
})
.then(res => res.json())
.then(data => console.log('My reports:', data))
.catch(err => console.error('Error:', err));
```

---

## 3. Testing the Block User Feature

### A. Test via User Interface (UserProfile page)

1. **Navigate to a user profile:**
   - Go to: `https://kustay-production.up.railway.app/profile/{user_id}`

2. **Click the Block button (Ban icon)**

3. **Confirm the action** in the confirmation dialog

4. **Expected results:**
   - Button changes to "Unblock" with green color
   - You are redirected to `/matches` page
   - User is blocked

5. **Test unblocking:**
   - Navigate back to the same profile
   - Click "Unblock" button
   - Confirm the action
   - Button changes back to "Block"

### B. Test via API (Using Browser Console)

**Block a user:**
```javascript
fetch('/api/block-user/5/', {  // Replace 5 with actual user ID
  method: 'POST',
  credentials: 'include'
})
.then(res => res.json())
.then(data => console.log('Block result:', data))
.catch(err => console.error('Error:', err));
```

Expected response:
```json
{
  "message": "User blocked successfully"
}
```

**Check if a user is blocked:**
```javascript
fetch('/api/block-user/5/check/', {  // Replace 5 with actual user ID
  credentials: 'include'
})
.then(res => res.json())
.then(data => console.log('Is blocked:', data))
.catch(err => console.error('Error:', err));
```

Expected response:
```json
{
  "is_blocked": true
}
```

**Unblock a user:**
```javascript
fetch('/api/unblock-user/5/', {  // Replace 5 with actual user ID
  method: 'DELETE',
  credentials: 'include'
})
.then(res => res.json())
.then(data => console.log('Unblock result:', data))
.catch(err => console.error('Error:', err));
```

Expected response:
```json
{
  "message": "User unblocked successfully"
}
```

**Get all blocked users:**
```javascript
fetch('/api/blocked-users/', {
  credentials: 'include'
})
.then(res => res.json())
.then(data => console.log('Blocked users:', data))
.catch(err => console.error('Error:', err));
```

---

## 4. Testing the Blocked Users List Page

### A. Create a dedicated page (Add to your routes)

You need to add a route in your React app for the BlockedUsersList component:

**In your main routing file (e.g., `App.js` or `Routes.js`):**

```javascript
import BlockedUsersList from './components/BlockUser/BlockedUsersList';

// Add this route:
<Route path="/blocked-users" element={<BlockedUsersList />} />
```

### B. Test the page

1. Navigate to: `https://kustay-production.up.railway.app/blocked-users`
2. You should see:
   - List of all users you've blocked
   - Each user card shows: username, email, blocked date
   - "Unblock" button for each user
3. Click "Unblock" and confirm
4. User should be removed from the list

---

## 5. API Endpoints Summary

All endpoints are available at: `https://kustay-production.up.railway.app/api/`

### Report Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports/create/` | Create a new report |
| GET | `/api/reports/` | Get your submitted reports |

### Block User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/block-user/<user_id>/` | Block a user |
| DELETE | `/api/unblock-user/<user_id>/` | Unblock a user |
| GET | `/api/blocked-users/` | List all blocked users |
| GET | `/api/block-user/<user_id>/check/` | Check if user is blocked |

---

## 6. Testing Checklist

### Report Feature
- [ ] Can submit report for a user via UserProfile page
- [ ] Report modal validates minimum 10 characters
- [ ] Report modal validates maximum 1000 characters
- [ ] Success message appears after submission
- [ ] Can view list of submitted reports via API

### Block Feature
- [ ] Can block a user from UserProfile page
- [ ] Confirmation dialog appears before blocking
- [ ] Button changes to "Unblock" after blocking
- [ ] Redirects to /matches after blocking
- [ ] Can unblock a user
- [ ] Block status persists across page reloads

### Blocked Users List
- [ ] Page shows all blocked users
- [ ] Each card displays: username, email, blocked date
- [ ] Can unblock from the list
- [ ] User removed from list after unblocking

---

## 7. Common Issues & Solutions

### Issue: API returns 401 Unauthorized
**Solution:** Make sure you're logged in. The authentication uses cookies, so ensure `credentials: 'include'` is set in fetch requests.

### Issue: CORS errors
**Solution:** Check that your Django CORS settings include your Railway frontend URL in `CORS_ALLOWED_ORIGINS`.

### Issue: Report modal doesn't appear
**Solution:** Check browser console for errors. Ensure ReportModal.css is properly imported.

### Issue: Block button doesn't work
**Solution:**
- Check that userId is a valid integer
- Ensure user is logged in
- Check browser console for errors

---

## 8. Database Verification (Optional)

If you have access to Railway's PostgreSQL database, you can verify:

**Check reports table:**
```sql
SELECT * FROM kustay_report ORDER BY reported_at DESC;
```

**Check blocked users table:**
```sql
SELECT * FROM kustay_blockeduser ORDER BY blocked_at DESC;
```

---

## Need Help?

If any feature doesn't work as expected:
1. Check browser console (F12) for JavaScript errors
2. Check Railway logs for backend errors
3. Verify you're logged in with a valid session
4. Ensure all files are properly committed and deployed
