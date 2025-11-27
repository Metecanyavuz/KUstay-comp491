import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function ListingList() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/listings/', { credentials: 'include' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setListings(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading…</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  return (
    <div>
      <h1>Listings</h1>
      <ul className="listing-list">
        {listings.map((listing) => (
          <li key={listing.listing_id} className="listing-card">
            <Link to={`/listings/${listing.listing_id}`}>
              <strong>{listing.title}</strong>
            </Link>
            <span>{listing.rent_amount} ₺</span>
            <small>{listing.neighborhood || listing.address}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
