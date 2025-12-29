import { useEffect, useState } from 'react';
import { MapPin, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCSRFToken } from '../../utils/csrf';
import { BUILDING_OPTIONS } from '../../data/buildings';
import './Reviews.css';

function Reviews() {
  const { user } = useAuth();
  const [reviewHighlights, setReviewHighlights] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  const [customBuilding, setCustomBuilding] = useState('');
  const [customNeighborhood, setCustomNeighborhood] = useState('');
  const [unitDetails, setUnitDetails] = useState('');
  const [ratings, setRatings] = useState({
    noise: 0,
    management: 0,
    safety: 0,
    transport: 0,
  });
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewNotice, setReviewNotice] = useState('');

  useEffect(() => {
    fetch('/api/block-reviews/highlights/?limit=12', { credentials: 'include' })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load reviews');
        }
        return response.json();
      })
      .then((data) => {
        setReviewHighlights(Array.isArray(data) ? data : []);
        setReviewsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setReviewsError('Unable to load reviews right now.');
        setReviewsLoading(false);
      });
  }, []);

  const renderStars = (value) =>
    [1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={16}
        className={`block-review-star ${value >= star ? 'active' : ''}`}
      />
    ));

  const formatReviewDate = (value) => {
    if (!value) {
      return '';
    }

    try {
      return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return '';
    }
  };

  const handleBuildingChange = (event) => {
    const value = event.target.value;
    setSelectedBuilding(value);
    setReviewNotice('');

    if (!value || value === 'other') {
      setSelectedNeighborhood('');
      if (value !== 'other') {
        setCustomBuilding('');
        setCustomNeighborhood('');
        setUnitDetails('');
      }
      return;
    }

    const match = BUILDING_OPTIONS.find((item) => item.name === value);
    setSelectedNeighborhood(match?.neighborhood || '');
    setCustomBuilding('');
    setCustomNeighborhood('');
    setUnitDetails('');
  };

  const handleRatingChange = (key, value) => {
    setRatings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setReviewNotice('');

    const isOther = selectedBuilding === 'other';
    const blockName = isOther ? customBuilding.trim() : selectedBuilding;
    const neighborhood = isOther ? customNeighborhood.trim() : selectedNeighborhood;
    const unitDetailsValue = unitDetails.trim();

    if (!blockName || !neighborhood) {
      setReviewNotice('Please select a building and neighborhood.');
      return;
    }

    const ratingValues = Object.values(ratings);
    if (ratingValues.some((value) => !value)) {
      setReviewNotice('Please rate all categories.');
      return;
    }

    setReviewSubmitting(true);

    try {
      const response = await fetch('/api/block-reviews/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken() || '',
        },
        body: JSON.stringify({
          block_name: blockName,
          neighborhood,
          unit_details: unitDetailsValue,
          noise_rating: ratings.noise,
          management_rating: ratings.management,
          safety_rating: ratings.safety,
          transport_rating: ratings.transport,
          comment,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const keys = Object.keys(data);
        const firstKey = keys[0];
        const fallback =
          data.error ||
          data.detail ||
          (firstKey && Array.isArray(data[firstKey]) ? data[firstKey][0] : null) ||
          'Unable to submit review.';
        throw new Error(fallback);
      }

      setReviewNotice('Thanks! Your review is pending approval.');
      setSelectedBuilding('');
      setSelectedNeighborhood('');
      setCustomBuilding('');
      setCustomNeighborhood('');
      setUnitDetails('');
      setRatings({
        noise: 0,
        management: 0,
        safety: 0,
        transport: 0,
      });
      setComment('');
    } catch (err) {
      console.error(err);
      setReviewNotice(err.message || 'Unable to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const renderRatingPicker = (label, value, onChange) => (
    <div className="block-review-rating-row">
      <span className="block-review-rating-label">{label}</span>
      <div className="block-review-star-picker">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            className={`block-review-star-button ${value >= star ? 'active' : ''}`}
            onClick={() => onChange(star)}
            aria-label={`${label} rating ${star}`}
          >
            <Star size={18} />
          </button>
        ))}
      </div>
      <span className="block-review-rating-value">{value ? `${value}/5` : '-'}</span>
    </div>
  );

  return (
    <div className="reviews-page">
      <div className="reviews-hero">
        <h1>Reviews</h1>
        <p>
          Student feedback on living conditions in popular KU housing areas.
          Only approved reviews appear publicly.
        </p>
      </div>

      <div className="reviews-container">
        <div className="reviews-content">
          <div className="reviews-header">
            <div>
              <h2>Recent highlights</h2>
              <span className="block-review-muted">Verified feedback from fellow students</span>
            </div>
          </div>

          {reviewsLoading ? (
            <div className="loading">Loading reviews...</div>
          ) : reviewsError ? (
            <div className="block-review-muted">{reviewsError}</div>
          ) : reviewHighlights.length ? (
            <div className="reviews-grid">
              {reviewHighlights.map((review) => {
                const score = review.avg_overall ? Number(review.avg_overall) : 0;
                const avgNoise = review.avg_noise ? Number(review.avg_noise) : 0;
                const avgManagement = review.avg_management ? Number(review.avg_management) : 0;
                const avgSafety = review.avg_safety ? Number(review.avg_safety) : 0;
                const avgTransport = review.avg_transport ? Number(review.avg_transport) : 0;
                return (
                  <div key={`${review.block_name}-${review.neighborhood}`} className="block-review-card">
                    <div className="block-review-card-header">
                      <div>
                        <h3>{review.block_name}</h3>
                        <p className="block-review-location">
                          <MapPin size={14} />
                          {review.neighborhood}
                        </p>
                      </div>
                      <div className="block-review-score">
                        <div className="block-review-stars">{renderStars(Math.round(score))}</div>
                        <span>{score ? score.toFixed(1) : '-'}</span>
                      </div>
                    </div>
                    {review.latest_comment ? (
                      <p className="block-review-comment">"{review.latest_comment}"</p>
                    ) : (
                      <p className="block-review-muted">No comments yet.</p>
                    )}
                    {review.latest_unit_details && (
                      <p className="block-review-unit">
                        Unit: {review.latest_unit_details}
                      </p>
                    )}
                    <div className="block-review-meta">
                      <span>{review.review_count} review{review.review_count === 1 ? '' : 's'}</span>
                      <span>{formatReviewDate(review.latest_created_at)}</span>
                    </div>
                    <div className="block-review-breakdown">
                      <span>Noise {avgNoise.toFixed(1)}</span>
                      <span>Mgmt {avgManagement.toFixed(1)}</span>
                      <span>Safety {avgSafety.toFixed(1)}</span>
                      <span>Transport {avgTransport.toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="block-review-muted">No reviews yet.</div>
          )}
        </div>

        <div className="block-review-form-card">
          <h3>Share your experience</h3>
          <p className="block-review-muted">
            Help other KU students choose better housing. Comments are optional.
          </p>

          {user ? (
            <form onSubmit={handleReviewSubmit} className="block-review-form">
              <label>
                Building
                <select value={selectedBuilding} onChange={handleBuildingChange}>
                  <option value="">Select a building</option>
                  {BUILDING_OPTIONS.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                  <option value="other">Other (type manually)</option>
                </select>
              </label>

              {selectedBuilding === 'other' ? (
                <>
                  <label>
                    Building name
                    <input
                      type="text"
                      value={customBuilding}
                      onChange={(event) => setCustomBuilding(event.target.value)}
                      placeholder="Example: Panorama Suites"
                    />
                  </label>
                  <label>
                    Neighborhood
                    <input
                      type="text"
                      value={customNeighborhood}
                      onChange={(event) => setCustomNeighborhood(event.target.value)}
                      placeholder="Example: Zekeriyakoy"
                    />
                  </label>
                </>
              ) : (
                <label>
                  Neighborhood
                  <input
                    type="text"
                    value={selectedNeighborhood}
                    placeholder="Select a building first"
                    readOnly
                  />
                </label>
                )}

              <label>
                Block / apartment (optional)
                <input
                  type="text"
                  value={unitDetails}
                  onChange={(event) => setUnitDetails(event.target.value)}
                  placeholder="Example: B Block, Apt 55"
                />
              </label>

              {renderRatingPicker('Noise', ratings.noise, (value) =>
                handleRatingChange('noise', value))}
              {renderRatingPicker('Management', ratings.management, (value) =>
                handleRatingChange('management', value))}
              {renderRatingPicker('Safety', ratings.safety, (value) =>
                handleRatingChange('safety', value))}
              {renderRatingPicker('Transport', ratings.transport, (value) =>
                handleRatingChange('transport', value))}

              <label>
                Comment (optional)
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Share your experience. If you want, you can mention apartment details."
                />
              </label>

              <button type="submit" className="block-review-submit" disabled={reviewSubmitting}>
                {reviewSubmitting ? 'Submitting...' : 'Submit review'}
              </button>
              {reviewNotice && <div className="block-review-muted">{reviewNotice}</div>}
            </form>
          ) : (
            <div className="block-review-login">
              <p className="block-review-muted">Log in to leave a review.</p>
              <a href="/login" className="block-review-submit">
                Go to login
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Reviews;
