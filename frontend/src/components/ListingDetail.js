import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function ListingDetail() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/listings/${listingId}/`, { credentials: 'include' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setListing(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [listingId]);

  if (loading) {
    return <p>Loading…</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (!listing) {
    return <p>Listing not found.</p>;
  }

  return (
    <div>
      <p><Link to="/listings">← Back to listings</Link></p>
      <h1>{listing.title}</h1>
      <p><strong>Rent:</strong> {listing.rent_amount} ₺</p>
      <p><strong>Location:</strong> {listing.neighborhood || listing.address}</p>
      <p><strong>Description:</strong></p>
      <p>{listing.description}</p>
      <p><strong>Amenities:</strong> {listing.amenities?.join(', ') || '—'}</p>
      <p><strong>Available from:</strong> {listing.available_from || '—'}</p>
    </div>
  );
}
