import React, { useState, useEffect } from 'react';
import { UserX, CheckCircle, Calendar } from 'lucide-react';
import apiClient from '../../utils/axiosClient';
import './BlockedUsersTab.css';

const BlockedUsersTab = () => {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unblocking, setUnblocking] = useState(null);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      const response = await apiClient.get('/api/blocked-users/');
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

    setUnblocking(userId);
    try {
      await apiClient.delete(`/api/unblock-user/${userId}/`);
      setBlockedUsers(blockedUsers.filter((entry) => entry.user.id !== userId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to unblock user');
    } finally {
      setUnblocking(null);
    }
  };

  if (loading) {
    return (
      <div className="blocked-users-tab">
        <div className="loading-state">
          <div className="spinner-small"></div>
          <p>Loading blocked users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="blocked-users-tab">
        <div className="error-state">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="blocked-users-tab">
      <div className="tab-header">
        <div>
          <h2>Blocked Users</h2>
          <p className="subtitle">Manage users you've blocked</p>
        </div>
      </div>

      {blockedUsers.length === 0 ? (
        <div className="empty-state">
          <UserX size={64} className="empty-icon" />
          <h3>No Blocked Users</h3>
          <p>You haven't blocked anyone yet.</p>
        </div>
      ) : (
        <div className="blocked-users-grid">
          {blockedUsers.map((entry) => (
            <div key={entry.block_id} className="blocked-user-card">
              <div className="user-avatar-placeholder">
                {entry.user.username.charAt(0).toUpperCase()}
              </div>
              
              <div className="user-details">
                <h3 className="user-name">{entry.user.username}</h3>
                <p className="user-email">{entry.user.email}</p>
                
                <div className="blocked-info">
                  <Calendar size={14} />
                  <span>Blocked {new Date(entry.blocked_at).toLocaleDateString()}</span>
                </div>
              </div>

              <button
                className="unblock-btn"
                onClick={() => handleUnblock(entry.user.id, entry.user.username)}
                disabled={unblocking === entry.user.id}
              >
                {unblocking === entry.user.id ? (
                  <>
                    <div className="btn-spinner"></div>
                    Unblocking...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Unblock
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlockedUsersTab;