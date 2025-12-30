import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BlockedUsersList.css';

const BlockedUsersList = () => {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      const response = await axios.get(
        `/api/blocked-users/`,
        { withCredentials: true }
      );
      setBlockedUsers(response.data.blocked_users);
    } catch (err) {
      setError('Failed to load blocked users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to unblock ${username}?`)) {
      return;
    }

    try {
      await axios.delete(
        `/api/unblock-user/${userId}/`,
        { withCredentials: true }
      );
      setBlockedUsers(blockedUsers.filter((entry) => entry.user.id !== userId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to unblock user');
    }
  };

  if (loading) {
    return <div className="blocked-users-loading">Loading blocked users...</div>;
  }

  if (error) {
    return <div className="blocked-users-error">{error}</div>;
  }

  return (
    <div className="blocked-users-container">
      <h2>Blocked Users</h2>

      {blockedUsers.length === 0 ? (
        <div className="no-blocked-users">
          <p>You haven't blocked any users yet.</p>
        </div>
      ) : (
        <div className="blocked-users-list">
          {blockedUsers.map((entry) => (
            <div key={entry.block_id} className="blocked-user-card">
              <div className="user-info">
                <h3>{entry.user.username}</h3>
                <p className="user-email">{entry.user.email}</p>
                <p className="blocked-date">
                  Blocked on: {new Date(entry.blocked_at).toLocaleDateString()}
                </p>
              </div>
              <button
                className="unblock-btn"
                onClick={() => handleUnblock(entry.user.id, entry.user.username)}
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlockedUsersList;
