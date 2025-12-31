import React, { useState, useEffect } from 'react';
import { MoreVertical, Flag, Ban, UserX, CheckCircle } from 'lucide-react';
import apiClient from '../../utils/axiosClient';
import ReportModal from '../Report/ReportModal';
import './UserActionsMenu.css';

const UserActionsMenu = ({ 
  userId, 
  username, 
  reportType = 'user',
  listingId = null,
  messageId = null,
  onBlockChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkBlockStatus();
  }, [userId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.user-actions-menu')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const checkBlockStatus = async () => {
    try {
      const response = await apiClient.get(`/api/block-user/${userId}/check/`);
      setIsBlocked(response.data.is_blocked);
    } catch (error) {
      console.error('Error checking block status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleBlock = async () => {
    if (!window.confirm(`Block ${username}? They will no longer be able to contact you.`)) {
      return;
    }

    setLoading(true);
    try {
      await apiClient.post(`/api/block-user/${userId}/`);
      setIsBlocked(true);
      if (onBlockChange) onBlockChange(true);
      setIsOpen(false);
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
      await apiClient.delete(`/api/unblock-user/${userId}/`);
      setIsBlocked(false);
      if (onBlockChange) onBlockChange(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Error unblocking user:', error);
      alert(error.response?.data?.error || 'Failed to unblock user');
    } finally {
      setLoading(false);
    }
  };

  const handleReportClick = () => {
    setShowReportModal(true);
    setIsOpen(false);
  };

  if (checking) {
    return <div className="user-actions-loading">...</div>;
  }

  return (
    <>
      <div className="user-actions-menu">
        <button 
          className="actions-trigger"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="User actions"
        >
          <MoreVertical size={20} />
        </button>

        {isOpen && (
          <div className="actions-dropdown">
            <button 
              className="action-item report-item"
              onClick={handleReportClick}
              disabled={loading}
            >
              <Flag size={18} />
              <span>Report {reportType}</span>
            </button>

            {isBlocked ? (
              <button 
                className="action-item unblock-item"
                onClick={handleUnblock}
                disabled={loading}
              >
                <CheckCircle size={18} />
                <span>Unblock {username}</span>
              </button>
            ) : (
              <button 
                className="action-item block-item"
                onClick={handleBlock}
                disabled={loading}
              >
                <Ban size={18} />
                <span>Block {username}</span>
              </button>
            )}
          </div>
        )}
      </div>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportType={reportType}
        reportedUserId={userId}
        reportedListingId={listingId}
        reportedMessageId={messageId}
      />
    </>
  );
};

export default UserActionsMenu;