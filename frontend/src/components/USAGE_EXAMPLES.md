# Report & Block User Components - Usage Examples

## Report Modal Component

### Import
```javascript
import ReportModal from './Report/ReportModal';
```

### Example 1: Report a User
```javascript
import React, { useState } from 'react';
import ReportModal from './Report/ReportModal';

function UserProfile({ userId }) {
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <div>
      <button onClick={() => setShowReportModal(true)}>
        Report User
      </button>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportType="user"
        reportedUserId={userId}
      />
    </div>
  );
}
```

### Example 2: Report a Listing
```javascript
function ListingCard({ listing }) {
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <div>
      <button onClick={() => setShowReportModal(true)}>
        Report Listing
      </button>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportType="listing"
        reportedUserId={listing.user_id}
        reportedListingId={listing.id}
      />
    </div>
  );
}
```

### Example 3: Report a Message
```javascript
function MessageItem({ message }) {
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <div>
      <button onClick={() => setShowReportModal(true)}>
        Report Message
      </button>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportType="message"
        reportedUserId={message.sender_id}
        reportedMessageId={message.id}
      />
    </div>
  );
}
```

---

## Block Button Component

### Import
```javascript
import BlockButton from './BlockUser/BlockButton';
```

### Example 1: Simple Block Button
```javascript
function UserCard({ user }) {
  return (
    <div className="user-card">
      <h3>{user.username}</h3>
      <BlockButton
        userId={user.id}
        username={user.username}
      />
    </div>
  );
}
```

### Example 2: Block Button with Callback
```javascript
function UserProfile({ user }) {
  const handleBlockChange = (isBlocked) => {
    if (isBlocked) {
      console.log('User blocked');
      // Hide user's content, redirect, etc.
    } else {
      console.log('User unblocked');
      // Show user's content again
    }
  };

  return (
    <div>
      <h2>{user.username}</h2>
      <BlockButton
        userId={user.id}
        username={user.username}
        onBlockChange={handleBlockChange}
      />
    </div>
  );
}
```

---

## Blocked Users List Component

### Import
```javascript
import BlockedUsersList from './BlockUser/BlockedUsersList';
```

### Example: Blocked Users Page
```javascript
import React from 'react';
import BlockedUsersList from './BlockUser/BlockedUsersList';

function BlockedUsersPage() {
  return (
    <div className="page-container">
      <BlockedUsersList />
    </div>
  );
}

export default BlockedUsersPage;
```

---

## Complete Example: User Profile with Report & Block

```javascript
import React, { useState } from 'react';
import ReportModal from './Report/ReportModal';
import BlockButton from './BlockUser/BlockButton';

function UserProfile({ user, currentUserId }) {
  const [showReportModal, setShowReportModal] = useState(false);

  // Don't show report/block options for own profile
  if (user.id === currentUserId) {
    return <div className="user-profile">{/* Profile content */}</div>;
  }

  return (
    <div className="user-profile">
      <div className="user-header">
        <h2>{user.username}</h2>
        <div className="user-actions">
          <BlockButton
            userId={user.id}
            username={user.username}
            onBlockChange={(isBlocked) => {
              if (isBlocked) {
                // Optionally redirect or hide profile
                alert(`You have blocked ${user.username}`);
              }
            }}
          />
          <button
            className="report-btn"
            onClick={() => setShowReportModal(true)}
          >
            Report User
          </button>
        </div>
      </div>

      {/* Rest of profile content */}

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportType="user"
        reportedUserId={user.id}
      />
    </div>
  );
}

export default UserProfile;
```

---

## API Endpoints Reference

### Report Endpoints
- `POST /api/reports/create/` - Create a new report
- `GET /api/reports/` - Get user's submitted reports

### Block User Endpoints
- `POST /api/block-user/<user_id>/` - Block a user
- `DELETE /api/unblock-user/<user_id>/` - Unblock a user
- `GET /api/blocked-users/` - Get list of blocked users
- `GET /api/block-user/<user_id>/check/` - Check if user is blocked

---

## Component Props Reference

### ReportModal Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | boolean | Yes | Controls modal visibility |
| `onClose` | function | Yes | Callback to close modal |
| `reportType` | string | Yes | Type: 'user', 'listing', or 'message' |
| `reportedUserId` | number | Yes | ID of the reported user |
| `reportedListingId` | number | No | ID of reported listing (if applicable) |
| `reportedMessageId` | number | No | ID of reported message (if applicable) |

### BlockButton Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `userId` | number | Yes | ID of user to block/unblock |
| `username` | string | Yes | Username for display |
| `onBlockChange` | function | No | Callback when block status changes |

### BlockedUsersList Props
No props required - it's a standalone component.
