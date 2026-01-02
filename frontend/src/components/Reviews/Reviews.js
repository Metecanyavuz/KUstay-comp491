import { useEffect, useState } from 'react';
import { MapPin, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCSRFToken } from '../../utils/csrf';
import { BUILDING_OPTIONS } from '../../data/buildings';
import { useI18n } from '../../context/I18nContext';
import './Reviews.css';

function Reviews() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [buildingGroups, setBuildingGroups] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [buildingsError, setBuildingsError] = useState('');
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
    fetch('/api/block-reviews/buildings/', { credentials: 'include' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(t('reviews.loadBuildingsError', 'Failed to load buildings'));
        }
        return response.json();
      })
      .then((data) => {
        setBuildingGroups(Array.isArray(data) ? data : []);
        setBuildingsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setBuildingsError(t('reviews.loadBuildingsError', 'Unable to load buildings right now.'));
        setBuildingsLoading(false);
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

  const buildReviewLink = (blockName, neighborhood) => {
    const encodedName = encodeURIComponent(blockName);
    const params = new URLSearchParams();
    if (neighborhood) {
      params.set('neighborhood', neighborhood);
    }
    const query = params.toString();
    return query ? `/reviews/${encodedName}?${query}` : `/reviews/${encodedName}`;
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
      setReviewNotice(t('reviews.selectBuilding', 'Please select a building and neighborhood.'));
      return;
    }

    const ratingValues = Object.values(ratings);
    if (ratingValues.some((value) => !value)) {
      setReviewNotice(t('reviews.rateAll', 'Please rate all categories.'));
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
          t('reviews.submitError', 'Unable to submit review.');
        throw new Error(fallback);
      }

      setReviewNotice(t('reviews.thanks', 'Thanks! Your review is pending approval.'));
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
      setReviewNotice(err.message || t('reviews.submitError', 'Unable to submit review.'));
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
        <h1>{t('reviews.title', 'Reviews')}</h1>
        <p>
          {t('reviews.subtitle', 'Student feedback on living conditions in popular KU housing areas. Only approved reviews appear publicly.')}
        </p>
      </div>

      <div className="reviews-container">
        <div className="reviews-content">
          <div className="reviews-header">
            <div>
              <h2>{t('reviews.browse', 'Browse by building')}</h2>
              <span className="block-review-muted">{t('reviews.browseHint', 'All buildings with approved reviews')}</span>
            </div>
          </div>

          {buildingsLoading ? (
            <div className="loading">{t('reviews.loading', 'Loading buildings...')}</div>
          ) : buildingsError ? (
            <div className="block-review-muted">{buildingsError}</div>
          ) : buildingGroups.length ? (
            <div className="reviews-grid">
              {buildingGroups.map((building) => {
                const score = building.avg_overall ? Number(building.avg_overall) : 0;
                return (
                  <div
                    key={`${building.block_name}-${building.neighborhood}`}
                    className="block-review-card compact"
                  >
                    <div className="block-review-card-header">
                      <div>
                        <h3>{building.block_name}</h3>
                        <p className="block-review-location">
                          <MapPin size={14} />
                          {building.neighborhood}
                        </p>
                      </div>
                      <div className="block-review-score">
                        <div className="block-review-stars">{renderStars(Math.round(score))}</div>
                        <span>{score ? score.toFixed(1) : '-'}</span>
                      </div>
                    </div>
                    {building.latest_comment ? (
                      <p className="block-review-comment">"{building.latest_comment}"</p>
                    ) : (
                      <p className="block-review-muted">{t('reviews.noComments', 'No comments yet.')}</p>
                    )}
                    {building.latest_unit_details && (
                      <p className="block-review-unit">
                        Unit: {building.latest_unit_details}
                      </p>
                    )}
                    <div className="block-review-meta">
                      <span>{building.review_count} {building.review_count === 1 ? t('reviews.review', 'review') : t('reviews.reviews', 'reviews')}</span>
                      <span>{formatReviewDate(building.latest_created_at)}</span>
                    </div>
                    <Link
                      className="review-detail-link"
                      to={buildReviewLink(building.block_name, building.neighborhood)}
                    >
                      {t('reviews.viewBuilding', 'View building reviews')}
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="block-review-muted">{t('reviews.none', 'No building reviews yet.')}</div>
          )}
        </div>

        <div className="block-review-form-card">
          <h3>{t('reviews.share', 'Share your experience')}</h3>
          <p className="block-review-muted">
            {t('reviews.shareDesc', 'Help other KU students choose better housing. Comments are optional.')}
          </p>

          {user ? (
            <form onSubmit={handleReviewSubmit} className="block-review-form">
              <label>
                {t('reviews.building', 'Building')}
                <select value={selectedBuilding} onChange={handleBuildingChange}>
                  <option value="">{t('reviews.selectBuildingOption', 'Select a building')}</option>
                  {BUILDING_OPTIONS.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                  <option value="other">{t('reviews.otherBuilding', 'Other (type manually)')}</option>
                </select>
              </label>

              {selectedBuilding === 'other' ? (
                <>
                  <label>
                    {t('reviews.buildingName', 'Building name')}
                    <input
                      type="text"
                      value={customBuilding}
                      onChange={(event) => setCustomBuilding(event.target.value)}
                      placeholder={t('reviews.buildingPlaceholder', 'Example: Panorama Suites')}
                    />
                  </label>
                  <label>
                    {t('reviews.neighborhood', 'Neighborhood')}
                    <input
                      type="text"
                      value={customNeighborhood}
                      onChange={(event) => setCustomNeighborhood(event.target.value)}
                      placeholder={t('reviews.neighborhoodPlaceholder', 'Example: Zekeriyakoy')}
                    />
                  </label>
                </>
              ) : (
                <label>
                  {t('reviews.neighborhood', 'Neighborhood')}
                  <input
                    type="text"
                    value={selectedNeighborhood}
                    placeholder={t('reviews.selectBuildingFirst', 'Select a building first')}
                    readOnly
                  />
                </label>
                )}

              <label>
                {t('reviews.unit', 'Block / apartment (optional)')}
                <input
                  type="text"
                  value={unitDetails}
                  onChange={(event) => setUnitDetails(event.target.value)}
                  placeholder={t('reviews.unitPlaceholder', 'Example: B Block, Apt 55')}
                />
              </label>

              {renderRatingPicker(t('reviews.noise', 'Noise'), ratings.noise, (value) =>
                handleRatingChange('noise', value))}
              {renderRatingPicker(t('reviews.management', 'Management'), ratings.management, (value) =>
                handleRatingChange('management', value))}
              {renderRatingPicker(t('reviews.safety', 'Safety'), ratings.safety, (value) =>
                handleRatingChange('safety', value))}
              {renderRatingPicker(t('reviews.transport', 'Transport'), ratings.transport, (value) =>
                handleRatingChange('transport', value))}

              <label>
                {t('reviews.comment', 'Comment (optional)')}
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={t('reviews.commentPlaceholder', 'Share your experience. If you want, you can mention apartment details.')}
                />
              </label>

              <button type="submit" className="block-review-submit" disabled={reviewSubmitting}>
                {reviewSubmitting ? t('reviews.submitting', 'Submitting...') : t('reviews.submit', 'Submit review')}
              </button>
              {reviewNotice && <div className="block-review-muted">{reviewNotice}</div>}
            </form>
          ) : (
            <div className="block-review-login">
              <p className="block-review-muted">{t('reviews.loginPrompt', 'Log in to leave a review.')}</p>
              <a href="/login" className="block-review-submit">
                {t('auth.loginButton', 'Login')}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Reviews;
