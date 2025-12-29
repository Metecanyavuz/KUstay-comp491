import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BedDouble,
  Calendar,
  Home,
  Loader,
  MapPin,
  Star,
  Users,
} from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useAuth } from '../../context/AuthContext';
import { getCSRFToken } from '../../utils/csrf';
import './ListingDetail.css';
import 'leaflet/dist/leaflet.css';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const LISTING_TYPE_LABELS = {
  apartment: 'Apartment',
  house: 'House',
  room: 'Room',
};

const ROOM_TYPE_LABELS = {
  private: 'Private Room',
  shared: 'Shared Room',
  entire_place: 'Entire Place',
};

const formatPrice = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return `${value} ₺/month`;
  }

  return `${numericValue.toLocaleString('tr-TR')} ₺/month`;
};

const formatDate = (value) => {
  if (!value) {
    return 'Flexible move-in';
  }

  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return value;
  }
};

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
    return value;
  }
};

const normalizeList = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value
      .split(/,|\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    return normalized;
  }

  return [];
};

function ListingDetail() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewSummary, setReviewSummary] = useState({ average: null, count: 0 });
  const [existingReview, setExistingReview] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewNotice, setReviewNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function fetchListing() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/listings/${listingId}/`, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load listing');
        }

        const data = await response.json();
        setListing(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
          setError('Unable to load this listing right now.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchListing();

    return () => controller.abort();
  }, [listingId]);

  useEffect(() => {
    if (!listingId) {
      return undefined;
    }

    const controller = new AbortController();

    async function fetchReviews() {
      setReviewsLoading(true);
      setReviewsError('');

      try {
        const response = await fetch(`/api/listings/${listingId}/reviews/`, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load reviews');
        }

        const data = await response.json();
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        setReviewSummary({
          average: data.summary?.average ?? null,
          count: data.summary?.count ?? 0,
        });
        setExistingReview(data.existing_review || null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
          setReviewsError('Unable to load reviews right now.');
        }
      } finally {
        setReviewsLoading(false);
      }
    }

    fetchReviews();

    return () => controller.abort();
  }, [listingId]);

  const amenities = useMemo(
    () => normalizeList(listing?.amenities),
    [listing?.amenities],
  );
  const houseRules = useMemo(
    () => normalizeList(listing?.house_rules),
    [listing?.house_rules],
  );

  const primaryImage =
    listing?.image ||
    listing?.images?.find((img) => img.is_primary)?.image_url ||
    listing?.images?.[0]?.image_url ||
    null;
  const galleryImages = useMemo(() => {
    if (!listing?.images?.length) {
      return [];
    }
    const uniqueUrls = listing.images
      .map((img) => img.image_url)
      .filter(Boolean)
      .filter((url) => url !== primaryImage);
    return uniqueUrls.slice(0, 6);
  }, [listing?.images, primaryImage]);

  const listingCoords = useMemo(() => {
    const lat = Number(listing?.latitude);
    const lng = Number(listing?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    return null;
  }, [listing?.latitude, listing?.longitude]);

  const isOwner = Boolean(user && listing && listing.user === user.email);
  const averageRatingLabel =
    reviewSummary.average === null || reviewSummary.average === undefined
      ? '—'
      : reviewSummary.average.toFixed(1);

  const existingStatusLabel = existingReview?.moderation_status
    ? existingReview.moderation_status.replace('_', ' ')
    : '';

  const handleDelete = async () => {
    if (!listingId) return;
    setShowConfirm(true);
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setReviewNotice('');

    if (!rating) {
      setReviewNotice('Please select a rating.');
      return;
    }

    setReviewSubmitting(true);

    try {
      const response = await fetch(`/api/listings/${listingId}/reviews/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken() || '',
        },
        body: JSON.stringify({
          rating,
          comment,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to submit review.');
      }

      const data = await response.json();
      setExistingReview(data);
      setRating(0);
      setComment('');
      setReviewNotice('Thanks! Your review is pending approval.');
    } catch (err) {
      console.error(err);
      setReviewNotice(err.message || 'Unable to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const renderStars = (value, size = 16) =>
    [1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={size}
        className={`star-icon ${value >= star ? 'active' : ''}`}
      />
    ));

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      const response = await fetch(`/api/listings/${listingId}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRFToken': getCSRFToken() || '',
        },
      });
      if (!response.ok) {
        throw new Error('Silme işlemi başarısız oldu.');
      }
      navigate('/listings');
    } catch (err) {
      console.error(err);
      setDeleteError(err.message || 'Silme işlemi başarısız oldu.');
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="listing-detail-page">
      <div className="detail-shell">
        <div className="detail-nav">
          <button
            type="button"
            className="ghost-button"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <Link to="/listings" className="ghost-button secondary">
            Browse listings
          </Link>
          {user && (
            <button
              type="button"
              className="ghost-button danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete listing'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="detail-loading">
            <Loader size={26} />
            <p>Loading listing...</p>
          </div>
        ) : error ? (
          <div className="detail-error">
            <p>{error}</p>
            <Link to="/listings" className="ghost-button secondary">
              Return to listings
            </Link>
          </div>
        ) : listing ? (
          <>
            {deleteError && <div className="detail-error inline">{deleteError}</div>}
              <div className="detail-hero">
                <div className="hero-image">
                  {primaryImage ? (
                    <img src={primaryImage} alt={listing.title} />
                  ) : (
                  <div className="hero-placeholder">
                    <Home size={36} />
                  </div>
                )}
                <span className="type-pill">
                  {LISTING_TYPE_LABELS[listing.listing_type] ||
                    listing.listing_type}
                </span>
              </div>

              <div className="hero-content">
                <div className="hero-text">
                  <p className="eyebrow">Listing</p>
                  <h1>{listing.title}</h1>
                  <p className="location">
                    <MapPin size={18} />
                    <span>
                      {listing.neighborhood ||
                        listing.address ||
                        'Location shared on request'}
                    </span>
                  </p>
                </div>

                <div className="price-card">
                  <p className="label">Monthly rent</p>
                  <p className="price">{formatPrice(listing.rent_amount)}</p>
                  <div className="availability">
                    <Calendar size={16} />
                    <span>Available {formatDate(listing.available_from)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-grid">
              <section className="panel description">
                <div className="panel-header">
                  <h2>About this place</h2>
                </div>
                <p className="body-text">
                  {listing.description || 'No description provided yet.'}
                </p>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <h3>Quick facts</h3>
                </div>
                <div className="facts-grid">
                  <div className="fact">
                    <Home size={18} />
                    <div>
                      <p className="label">Listing type</p>
                      <p>
                        {LISTING_TYPE_LABELS[listing.listing_type] ||
                          listing.listing_type}
                      </p>
                    </div>
                  </div>
                  <div className="fact">
                    <BedDouble size={18} />
                    <div>
                      <p className="label">Room type</p>
                      <p>{ROOM_TYPE_LABELS[listing.room_type] || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="fact">
                    <Users size={18} />
                    <div>
                      <p className="label">Rooms</p>
                      <p>
                        {listing.available_rooms} / {listing.total_rooms} available
                      </p>
                    </div>
                  </div>
                  <div className="fact">
                    <Calendar size={18} />
                    <div>
                      <p className="label">Move-in</p>
                      <p>{formatDate(listing.available_from)}</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <h3>Amenities</h3>
                </div>
                {amenities.length ? (
                  <div className="pill-list">
                    {amenities.map((amenity) => (
                      <span key={amenity} className="pill">
                        {amenity}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No amenities listed for this place yet.</p>
                )}
              </section>

              <section className="panel">
                <div className="panel-header">
                  <h3>House rules</h3>
                </div>
                {houseRules.length ? (
                  <ul className="rules-list">
                    {houseRules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No house rules provided.</p>
                )}
              </section>

              {listingCoords && (
                <section className="panel location-panel">
                  <div className="panel-header">
                    <h3>Location</h3>
                  </div>
                  <p className="location-text">
                    <MapPin size={16} />
                    <span>
                      {listing.neighborhood ||
                        listing.address ||
                        'Location shared on request'}
                    </span>
                  </p>
                  <div className="detail-map">
                    <MapContainer
                      center={[listingCoords.lat, listingCoords.lng]}
                      zoom={15}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[listingCoords.lat, listingCoords.lng]}>
                        <Popup>{listing.title}</Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                </section>
              )}

            {galleryImages.length > 0 && (
              <section className="panel gallery">
                <div className="panel-header">
                  <h3>Gallery</h3>
                </div>
                <div className="gallery-grid">
                  {galleryImages.map((url) => (
                    <img key={url} src={url} alt="Listing" />
                  ))}
                </div>
              </section>
            )}

            <section className="panel reviews-panel">
              <div className="panel-header reviews-header">
                <div>
                  <h3>Ratings & comments</h3>
                  <p className="muted">
                    {reviewSummary.count
                      ? `${reviewSummary.count} review${reviewSummary.count === 1 ? '' : 's'}`
                      : 'No reviews yet'}
                  </p>
                </div>
                <div className="review-summary">
                  <div className="star-row">{renderStars(Math.round(reviewSummary.average || 0))}</div>
                  <span className="rating-number">{averageRatingLabel}</span>
                </div>
              </div>

              {reviewsLoading ? (
                <p className="muted">Loading reviews...</p>
              ) : reviewsError ? (
                <p className="muted">{reviewsError}</p>
              ) : reviews.length ? (
                <div className="reviews-list">
                  {reviews.map((review) => (
                    <div key={review.review_id} className="review-card">
                      <div className="review-header">
                        <div>
                          <p className="reviewer-name">
                            {review.reviewer?.first_name || review.reviewer?.last_name
                              ? `${review.reviewer?.first_name || ''} ${review.reviewer?.last_name || ''}`.trim()
                              : review.reviewer?.email || 'User'}
                          </p>
                          <p className="muted">{formatReviewDate(review.created_at)}</p>
                        </div>
                        <div className="star-row">{renderStars(review.rating)}</div>
                      </div>
                      {review.comment && <p className="review-comment">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No reviews yet.</p>
              )}

              {user ? (
                isOwner ? (
                  <p className="muted">You cannot review your own listing.</p>
                ) : existingReview ? (
                  <div className="review-existing">
                    <div className="review-header">
                      <div>
                        <p className="reviewer-name">Your review</p>
                        {existingStatusLabel && (
                          <p className="muted">Status: {existingStatusLabel}</p>
                        )}
                      </div>
                      <div className="star-row">{renderStars(existingReview.rating)}</div>
                    </div>
                    {existingReview.comment && (
                      <p className="review-comment">{existingReview.comment}</p>
                    )}
                  </div>
                ) : (
                  <form className="review-form" onSubmit={handleReviewSubmit}>
                    <div className="rating-picker">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          type="button"
                          key={value}
                          className={`star-button ${rating >= value ? 'active' : ''}`}
                          onClick={() => setRating(value)}
                          aria-label={`${value} stars`}
                        >
                          <Star size={22} />
                        </button>
                      ))}
                      <span className="rating-label">
                        {rating ? `${rating} / 5` : 'Select rating'}
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Share a comment (optional)"
                    />

                    <div className="review-actions">
                      <button
                        type="submit"
                        className="ghost-button secondary"
                        disabled={reviewSubmitting}
                      >
                        {reviewSubmitting ? 'Submitting…' : 'Submit review'}
                      </button>
                      {reviewNotice && <p className="muted">{reviewNotice}</p>}
                    </div>
                  </form>
                )
              ) : (
                <p className="muted">Log in to leave a review.</p>
              )}
            </section>
          </div>

          {showConfirm && (
              <div className="confirm-overlay">
                <div className="confirm-modal">
                  <h3>Delete listing?</h3>
                  <p>
                    Bu ilanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                  </p>
                  <div className="confirm-actions">
                    <button
                      type="button"
                      className="ghost-button secondary"
                      onClick={() => setShowConfirm(false)}
                      disabled={deleting}
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      className="ghost-button danger"
                      onClick={confirmDelete}
                      disabled={deleting}
                    >
                      {deleting ? 'Siliniyor…' : 'Evet, sil'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default ListingDetail;
