import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MapPin, Star } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import './Reviews.css';
import './ReviewsBuilding.css';

function ReviewsBuilding() {
  const { buildingName } = useParams();
  const location = useLocation();
  const decodedName = useMemo(
    () => (buildingName ? decodeURIComponent(buildingName) : ''),
    [buildingName],
  );
  const neighborhood = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('neighborhood') || '';
  }, [location.search]);

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({
    average: null,
    count: 0,
    avg_noise: null,
    avg_management: null,
    avg_safety: null,
    avg_transport: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!decodedName) {
      return;
    }

    const params = new URLSearchParams({ block_name: decodedName });
    if (neighborhood) {
      params.set('neighborhood', neighborhood);
    }

    setLoading(true);
    setError('');

    fetch(`/api/block-reviews/?${params.toString()}`, { credentials: 'include' })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load reviews');
        }
        return response.json();
      })
      .then((data) => {
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        setSummary({
          average: data.summary?.average ?? null,
          count: data.summary?.count ?? 0,
          avg_noise: data.summary?.avg_noise ?? null,
          avg_management: data.summary?.avg_management ?? null,
          avg_safety: data.summary?.avg_safety ?? null,
          avg_transport: data.summary?.avg_transport ?? null,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Unable to load reviews right now.');
        setLoading(false);
      });
  }, [decodedName, neighborhood]);

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
        year: 'numeric',
      });
    } catch (error) {
      return '';
    }
  };

  const averageLabel =
    summary.average === null || summary.average === undefined
      ? '-'
      : summary.average.toFixed(1);

  return (
    <div className="reviews-building-page">
      <div className="reviews-building-header">
        <Link to="/reviews" className="reviews-back-link">
          <ArrowLeft size={18} />
          Back to reviews
        </Link>

        <div className="reviews-building-title">
          <h1>{decodedName || 'Building reviews'}</h1>
          {neighborhood && (
            <p className="block-review-location">
              <MapPin size={14} />
              {neighborhood}
            </p>
          )}
        </div>

        <div className="building-summary-card">
          <div className="summary-score">
            <div className="block-review-stars">
              {renderStars(Math.round(summary.average || 0))}
            </div>
            <span className="summary-number">{averageLabel}</span>
            <span className="block-review-muted">
              {summary.count} review{summary.count === 1 ? '' : 's'}
            </span>
          </div>
          <div className="summary-grid">
            <div>Noise {summary.avg_noise ? summary.avg_noise.toFixed(1) : '-'}</div>
            <div>Mgmt {summary.avg_management ? summary.avg_management.toFixed(1) : '-'}</div>
            <div>Safety {summary.avg_safety ? summary.avg_safety.toFixed(1) : '-'}</div>
            <div>Transport {summary.avg_transport ? summary.avg_transport.toFixed(1) : '-'}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading reviews...</div>
      ) : error ? (
        <div className="block-review-muted">{error}</div>
      ) : reviews.length ? (
        <div className="reviews-list">
          {reviews.map((review) => {
            const overall =
              (Number(review.noise_rating || 0)
                + Number(review.management_rating || 0)
                + Number(review.safety_rating || 0)
                + Number(review.transport_rating || 0)) /
              4;

            const reviewerName =
              review.reviewer?.first_name || review.reviewer?.last_name
                ? `${review.reviewer?.first_name || ''} ${review.reviewer?.last_name || ''}`.trim()
                : review.reviewer?.email || 'Student';

            return (
              <div key={review.block_review_id} className="block-review-card">
                <div className="block-review-card-header">
                  <div>
                    <h3>{reviewerName}</h3>
                    <p className="block-review-muted">{formatReviewDate(review.created_at)}</p>
                  </div>
                  <div className="block-review-score">
                    <div className="block-review-stars">{renderStars(Math.round(overall))}</div>
                    <span>{overall ? overall.toFixed(1) : '-'}</span>
                  </div>
                </div>
                {review.unit_details && (
                  <p className="block-review-unit">Unit: {review.unit_details}</p>
                )}
                {review.comment ? (
                  <p className="block-review-comment">"{review.comment}"</p>
                ) : (
                  <p className="block-review-muted">No comment provided.</p>
                )}
                <div className="block-review-breakdown">
                  <span>Noise {Number(review.noise_rating).toFixed(1)}</span>
                  <span>Mgmt {Number(review.management_rating).toFixed(1)}</span>
                  <span>Safety {Number(review.safety_rating).toFixed(1)}</span>
                  <span>Transport {Number(review.transport_rating).toFixed(1)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="block-review-muted">No approved reviews yet.</div>
      )}
    </div>
  );
}

export default ReviewsBuilding;
