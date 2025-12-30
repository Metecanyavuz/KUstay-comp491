import React, { useState } from 'react';
import apiClient from '../../utils/axiosClient';
import './ReportModal.css';

const ReportModal = ({ isOpen, onClose, reportType, reportedUserId, reportedListingId, reportedMessageId }) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient.post(
        `/api/reports/create/`,
        {
          report_type: reportType,
          reported_user_id: reportedUserId,
          reported_listing_id: reportedListingId,
          reported_message_id: reportedMessageId,
          description: description.trim(),
        },
      );

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setDescription('');
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Report {reportType}</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {success ? (
          <div className="success-message">
            <p>✓ Report submitted successfully! Our team will review it shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the issue in detail..."
                rows="5"
                required
                minLength="10"
                maxLength="1000"
              />
              <small className="char-count">
                {description.length}/1000 characters (minimum 10)
              </small>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || description.trim().length < 10}
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
