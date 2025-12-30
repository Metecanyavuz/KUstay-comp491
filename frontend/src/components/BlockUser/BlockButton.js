import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BlockButton.css';

const BlockButton = ({ userId, username, onBlockChange }) => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkBlockStatus();
  }, [userId]);

  const checkBlockStatus = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/block-user/${userId}/check/`,
        { withCredentials: true }
      );
      setIsBlocked(response.data.is_blocked);
    } catch (error) {
      console.error('Error checking block status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleBlock = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/block-user/${userId}/`,
        {},
        { withCredentials: true }
      );
      setIsBlocked(true);
      if (onBlockChange) onBlockChange(true);
    } catch (error) {
      console.error('Error blocking user:', error);
      alert(error.response?.data?.error || 'Failed to block user');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    setLoading(true);
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/unblock-user/${userId}/`,
        { withCredentials: true }
      );
      setIsBlocked(false);
      if (onBlockChange) onBlockChange(false);
    } catch (error) {
      console.error('Error unblocking user:', error);
      alert(error.response?.data?.error || 'Failed to unblock user');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <button className="block-btn" disabled>Loading...</button>;
  }

  return (
    <button
      className={`block-btn ${isBlocked ? 'blocked' : 'not-blocked'}`}
      onClick={isBlocked ? handleUnblock : handleBlock}
      disabled={loading}
    >
      {loading ? 'Processing...' : isBlocked ? `Unblock ${username}` : `Block ${username}`}
    </button>
  );
};

export default BlockButton;
