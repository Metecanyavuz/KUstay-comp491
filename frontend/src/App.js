import { useEffect, useState } from 'react';
import './App.css';

function App() {
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

  return (
    <div className="App">
      <h1>Listings</h1>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <ul className="listing-list">
          {listings.map((listing) => (
            <li key={listing.listing_id}>
              <strong>{listing.title}</strong>
              <span>{listing.rent_amount} ₺</span>
              <small>{listing.neighborhood || listing.address}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
