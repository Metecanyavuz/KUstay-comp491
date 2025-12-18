import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Loader,
  Navigation as NavIcon,
  LocateFixed,
  Home,
  DollarSign,
} from 'lucide-react';
import './MapView.css';
import 'leaflet/dist/leaflet.css';

// Modern dot-based marker icons
const listingIcon = L.divIcon({
  className: 'custom-marker listing-marker',
  html: '<div class="marker-pin"><span class="dot"></span></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const userIcon = L.divIcon({
  className: 'custom-marker user-marker',
  html: '<div class="marker-pin"><span class="dot"></span></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const DEFAULT_CENTER = [41.0857, 29.042]; // Koc University area fallback

const haversineKm = (a, b) => {
  if (!a || !b) return Infinity;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const la1 = toRad(lat1);
  const la2 = toRad(lat2);
  const aHarv =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv));
  return R * c;
};

function MapView() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userCoords, setUserCoords] = useState(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [onlyNearby, setOnlyNearby] = useState(true);
  const mapRef = useRef(null);

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        // ignore errors; fallback center will be used
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/listings/', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to load listings');
      }
      const data = await res.json();
      setListings(data || []);
    } catch (err) {
      setError(err.message || 'Unable to load listings.');
    } finally {
      setLoading(false);
    }
  };

  const listingsWithCoords = useMemo(
    () =>
      (listings || []).filter((l) => Number.isFinite(Number(l.latitude)) && Number.isFinite(Number(l.longitude))),
    [listings]
  );

  const filteredListings = useMemo(() => {
    if (!onlyNearby || !userCoords) return listingsWithCoords;
    return listingsWithCoords.filter((l) => {
      const dist = haversineKm(userCoords, [Number(l.latitude), Number(l.longitude)]);
      return dist <= radiusKm;
    });
  }, [onlyNearby, radiusKm, listingsWithCoords, userCoords]);

  const center = userCoords || (filteredListings[0] ? [Number(filteredListings[0].latitude), Number(filteredListings[0].longitude)] : DEFAULT_CENTER);

  const flyToUser = () => {
    if (mapRef.current && userCoords) {
      mapRef.current.setView(userCoords, 13);
    }
  };

  return (
    <div className="map-page">
      <div className="map-toolbar">
        <div className="toolbar-left">
          <h1>
            <MapPin size={20} /> Map View
          </h1>
          <p>See active listings on the map and filter by distance.</p>
        </div>
        <div className="toolbar-right">
          <label className="toggle">
            <input
              type="checkbox"
              checked={onlyNearby}
              onChange={(e) => setOnlyNearby(e.target.checked)}
            />
            <span>Only nearby</span>
          </label>
          <div className="radius-control">
            <span>{radiusKm} km</span>
            <input
              type="range"
              min="2"
              max="25"
              step="1"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              disabled={!userCoords}
            />
          </div>
          <button
            className="geo-btn"
            onClick={flyToUser}
            disabled={!userCoords}
            title={userCoords ? 'Go to my location' : 'Enable location to center'}
          >
            <LocateFixed size={18} />
            <span>My Location</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="map-loading">
          <Loader className="spin" size={32} />
          <p>Loading listings on the map...</p>
        </div>
      ) : error ? (
        <div className="map-error">
          <p>{error}</p>
          <button onClick={fetchListings}>Retry</button>
        </div>
      ) : (
        <div className="map-layout">
          <div className="map-wrapper">
            <MapContainer
              center={center}
              zoom={12}
              scrollWheelZoom
              ref={mapRef}
              className="map-canvas"
            >
              <TileLayer
                attribution='&copy; OpenStreetMap &copy; CartoDB'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              {userCoords && (
                <Marker position={userCoords} icon={userIcon}>
                  <Popup>
                    <div className="popup">
                      <strong>You are here</strong>
                    </div>
                  </Popup>
                </Marker>
              )}
              {filteredListings.map((listing) => {
                const position = [Number(listing.latitude), Number(listing.longitude)];
                const distance = userCoords
                  ? haversineKm(userCoords, position).toFixed(1)
                  : null;
                return (
                  <Marker key={listing.listing_id} position={position} icon={listingIcon}>
                    <Popup>
                      <div className="popup">
                        <h3>{listing.title}</h3>
                        <p className="popup-row">
                          <Home size={14} /> {listing.neighborhood || listing.address || '—'}
                        </p>
                        <p className="popup-row">
                          <DollarSign size={14} /> {listing.rent_amount} ₺/month
                        </p>
                        {distance && (
                          <p className="popup-row">
                            <NavIcon size={14} /> {distance} km away
                          </p>
                        )}
                        <Link to={`/listings/${listing.listing_id}`} className="popup-link">
                          View details
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          <div className="map-sidebar">
            <h2>Listings {onlyNearby && userCoords ? `(within ${radiusKm} km)` : ''}</h2>
            {filteredListings.length === 0 ? (
              <p className="muted">No listings match this filter.</p>
            ) : (
              <ul className="listing-list">
                {filteredListings.map((listing) => {
                  const pos = [Number(listing.latitude), Number(listing.longitude)];
                  const distance = userCoords ? haversineKm(userCoords, pos).toFixed(1) : null;
                  return (
                    <li key={listing.listing_id}>
                      <div>
                        <Link to={`/listings/${listing.listing_id}`} className="listing-title">
                          {listing.title}
                        </Link>
                        <p className="listing-meta">
                          {listing.neighborhood || listing.address || '—'}
                          {distance && <span className="distance-chip">{distance} km</span>}
                        </p>
                      </div>
                      <div className="price">{listing.rent_amount} ₺</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MapView;
