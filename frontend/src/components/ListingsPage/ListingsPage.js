import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BedDouble,
  Calendar,
  Filter,
  Home,
  Loader,
  MapPin,
  Search,
  Users,
  X,
} from 'lucide-react';
import './ListingsPage.css';

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

const AMENITY_OPTIONS = [
  'Wi-Fi Included',
  'Utilities Included',
  'Washer/Dryer',
  'Parking Spot',
  'Pet Friendly',
  'Air Conditioning',
  'Furnished',
  'Gym Access',
];

const createDefaultFilters = () => ({
  location: '',
  priceMin: '',
  priceMax: '',
  listingType: 'all',
  roomType: 'all',
  amenities: [],
});

const parseFiltersFromSearch = (search) => {
  const params = new URLSearchParams(search);
  const filters = createDefaultFilters();

  filters.location = params.get('location') || '';
  filters.priceMin = params.get('price_min') || '';
  filters.priceMax = params.get('price_max') || '';
  filters.listingType = params.get('listing_type') || 'all';
  filters.roomType = params.get('room_type') || 'all';

  const amenitiesParam = params.get('amenities');
  if (amenitiesParam) {
    filters.amenities = amenitiesParam
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return filters;
};

const buildSearchFromFilters = (filters) => {
  const params = new URLSearchParams();

  if (filters.location.trim()) {
    params.set('location', filters.location.trim());
  }
  if (filters.priceMin) {
    params.set('price_min', filters.priceMin);
  }
  if (filters.priceMax) {
    params.set('price_max', filters.priceMax);
  }
  if (filters.listingType && filters.listingType !== 'all') {
    params.set('listing_type', filters.listingType);
  }
  if (filters.roomType && filters.roomType !== 'all') {
    params.set('room_type', filters.roomType);
  }
  if (filters.amenities.length) {
    params.set('amenities', filters.amenities.join(','));
  }

  return params.toString();
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

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const safeTimestamp = (value) => {
  const time = new Date(value).valueOf();
  return Number.isFinite(time) ? time : 0;
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

const normalizeAmenities = (amenities) => {
  if (!amenities) {
    return [];
  }

  if (Array.isArray(amenities)) {
    return amenities;
  }

  if (typeof amenities === 'string') {
    try {
      const parsed = JSON.parse(amenities);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      // Fall back to comma separated parsing
    }

    return amenities
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

function ListingsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [formFilters, setFormFilters] = useState(() =>
    parseFiltersFromSearch(location.search),
  );
  const [activeFilters, setActiveFilters] = useState(() =>
    parseFiltersFromSearch(location.search),
  );
  const [sortOption, setSortOption] = useState('newest');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const parsed = parseFiltersFromSearch(location.search);
    setFormFilters(parsed);
    setActiveFilters(parsed);
  }, [location.search]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchListings() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (activeFilters.location.trim()) {
          params.set('location', activeFilters.location.trim());
        }
        if (activeFilters.priceMin) {
          params.set('price_min', activeFilters.priceMin);
        }
        if (activeFilters.priceMax) {
          params.set('price_max', activeFilters.priceMax);
        }
        if (activeFilters.amenities.length) {
          params.set('amenities', activeFilters.amenities.join(','));
        }

        const query = params.toString();
        const response = await fetch(
          query ? `/api/listings/?${query}` : '/api/listings/',
          {
            credentials: 'include',
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error('Failed to fetch listings');
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setListings(list);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
          setError('Unable to load listings. Please try again in a moment.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchListings();

    return () => controller.abort();
  }, [
    activeFilters.location,
    activeFilters.priceMin,
    activeFilters.priceMax,
    activeFilters.amenities,
  ]);

  const filteredListings = useMemo(() => {
    let result = [...listings];

    if (activeFilters.listingType !== 'all') {
      result = result.filter(
        (item) => item.listing_type === activeFilters.listingType,
      );
    }

    if (activeFilters.roomType !== 'all') {
      result = result.filter((item) => item.room_type === activeFilters.roomType);
    }

    switch (sortOption) {
      case 'price_low':
        result.sort((a, b) => safeNumber(a.rent_amount) - safeNumber(b.rent_amount));
        break;
      case 'price_high':
        result.sort((a, b) => safeNumber(b.rent_amount) - safeNumber(a.rent_amount));
        break;
      case 'rooms':
        result.sort(
          (a, b) => (b.available_rooms || 0) - (a.available_rooms || 0),
        );
        break;
      default:
        result.sort(
          (a, b) => safeTimestamp(b.created_at) - safeTimestamp(a.created_at),
        );
    }

    return result;
  }, [
    listings,
    sortOption,
    activeFilters.listingType,
    activeFilters.roomType,
  ]);

  const activeChips = useMemo(() => {
    const chips = [];

    if (activeFilters.location) {
      chips.push({
        key: 'location',
        label: `Location: ${activeFilters.location}`,
        type: 'location',
      });
    }

    if (activeFilters.priceMin || activeFilters.priceMax) {
      const labelParts = [
        activeFilters.priceMin ? `₺${activeFilters.priceMin}` : 'Any',
        activeFilters.priceMax ? `₺${activeFilters.priceMax}` : 'Any',
      ];
      chips.push({
        key: 'price',
        label: `Budget: ${labelParts[0]} - ${labelParts[1]}`,
        type: 'price',
      });
    }

    if (activeFilters.listingType !== 'all') {
      chips.push({
        key: 'listingType',
        label: LISTING_TYPE_LABELS[activeFilters.listingType],
        type: 'listingType',
      });
    }

    if (activeFilters.roomType !== 'all') {
      chips.push({
        key: 'roomType',
        label: ROOM_TYPE_LABELS[activeFilters.roomType],
        type: 'roomType',
      });
    }

    activeFilters.amenities.forEach((amenity) => {
      chips.push({
        key: `amenity-${amenity}`,
        label: amenity,
        type: 'amenity',
        value: amenity,
      });
    });

    return chips;
  }, [activeFilters]);

  const pushFiltersToUrl = (filters, replace = false) => {
    const search = buildSearchFromFilters(filters);
    navigate(
      {
        pathname: '/listings',
        search: search ? `?${search}` : '',
      },
      { replace },
    );
  };

  const handleApplyFilters = (event) => {
    if (event) {
      event.preventDefault();
    }
    pushFiltersToUrl(formFilters);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAmenityToggle = (amenity) => {
    setFormFilters((prev) => {
      const hasAmenity = prev.amenities.includes(amenity);
      const nextAmenities = hasAmenity
        ? prev.amenities.filter((item) => item !== amenity)
        : [...prev.amenities, amenity];

      return {
        ...prev,
        amenities: nextAmenities,
      };
    });
  };

  const handleClearFilters = () => {
    const cleared = createDefaultFilters();
    setFormFilters(cleared);
    pushFiltersToUrl(cleared);
  };

  const handleRemoveChip = (chip) => {
    const nextFilters = {
      ...activeFilters,
      amenities: [...activeFilters.amenities],
    };

    switch (chip.type) {
      case 'location':
        nextFilters.location = '';
        break;
      case 'price':
        nextFilters.priceMin = '';
        nextFilters.priceMax = '';
        break;
      case 'listingType':
        nextFilters.listingType = 'all';
        break;
      case 'roomType':
        nextFilters.roomType = 'all';
        break;
      case 'amenity':
        nextFilters.amenities = nextFilters.amenities.filter(
          (item) => item !== chip.value,
        );
        break;
      default:
        break;
    }

    setFormFilters(nextFilters);
    pushFiltersToUrl(nextFilters);
  };

  return (
    <div className="listings-page">
      <section className="listings-hero">
        <div className="listings-hero-content">
          <p className="eyebrow">Discover KUstay Listings</p>
          <h1>Browse verified housing and find your next roommate</h1>
          <p className="subtitle">
            Filter by location, budget, or your must-have amenities. Every
            listing is created by a KUstay community member.
          </p>

          <form className="listings-hero-search" onSubmit={handleApplyFilters}>
            <div className="hero-search-input">
              <MapPin size={18} />
              <input
                type="text"
                name="location"
                placeholder="Search neighborhood, address, or keyword"
                value={formFilters.location}
                onChange={handleInputChange}
              />
            </div>
            <button type="submit">
              <Search size={18} />
              Search
            </button>
          </form>
        </div>
      </section>

      <div className="listings-layout">
        <aside className="filters-panel">
          <div className="filters-header">
            <div>
              <p className="eyebrow">Filters</p>
              <h2>Tailor your search</h2>
            </div>
            <Filter size={18} />
          </div>

          <form className="filters-form" onSubmit={handleApplyFilters}>
            <div className="filter-group">
              <label htmlFor="location">Location</label>
              <div className="input-with-icon">
                <MapPin size={16} />
                <input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="Neighborhood, street..."
                  value={formFilters.location}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="filter-group">
              <label>Monthly budget</label>
              <div className="price-inputs">
                <div className="input-with-icon">
                  <Home size={16} />
                  <input
                    type="number"
                    name="priceMin"
                    placeholder="Min ₺"
                    value={formFilters.priceMin}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="input-with-icon">
                  <Home size={16} />
                  <input
                    type="number"
                    name="priceMax"
                    placeholder="Max ₺"
                    value={formFilters.priceMax}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <div className="filter-group">
              <label htmlFor="listingType">Property type</label>
              <select
                id="listingType"
                name="listingType"
                value={formFilters.listingType}
                onChange={handleInputChange}
              >
                <option value="all">Any</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="room">Room</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="roomType">Room type</label>
              <select
                id="roomType"
                name="roomType"
                value={formFilters.roomType}
                onChange={handleInputChange}
              >
                <option value="all">Any</option>
                <option value="private">Private Room</option>
                <option value="shared">Shared Room</option>
                <option value="entire_place">Entire Place</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Amenities</label>
              <div className="amenities-grid">
                {AMENITY_OPTIONS.map((amenity) => (
                  <button
                    key={amenity}
                    type="button"
                    className={`amenity-chip ${
                      formFilters.amenities.includes(amenity) ? 'active' : ''
                    }`}
                    onClick={() => handleAmenityToggle(amenity)}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-actions">
              <button type="submit" className="apply-button">
                Apply Filters
              </button>
              <button
                type="button"
                className="clear-button"
                onClick={handleClearFilters}
              >
                Clear all
              </button>
            </div>
          </form>
        </aside>

        <section className="listings-results">
          <div className="results-header">
            <div>
              <p className="eyebrow">Results</p>
              <h2>
                {loading ? 'Finding listings...' : `${filteredListings.length} places`}
              </h2>
              <p className="results-subtitle">
                Showing active listings that match your filters
              </p>
            </div>

            <div className="sort-control">
              <label htmlFor="sort">Sort by</label>
              <select
                id="sort"
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value)}
              >
                <option value="newest">Newest first</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="rooms">Most rooms available</option>
              </select>
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="active-chips">
              {activeChips.map((chip) => (
                <button
                  type="button"
                  key={chip.key}
                  className="active-chip"
                  onClick={() => handleRemoveChip(chip)}
                >
                  <span>{chip.label}</span>
                  <X size={14} />
                </button>
              ))}
              <button
                type="button"
                className="active-chip reset"
                onClick={handleClearFilters}
              >
                Reset filters
              </button>
            </div>
          )}

          {error && <div className="error-state">{error}</div>}

          {loading ? (
            <div className="loading-state">
              <Loader size={28} />
              <p>Loading listings...</p>
            </div>
          ) : filteredListings.length ? (
            <div className="listings-grid">
              {filteredListings.map((listing) => {
                const amenities = normalizeAmenities(listing.amenities);
                const fallbackImage =
                  listing.images?.find((img) => img.is_primary)?.image_url ||
                  listing.images?.[0]?.image_url ||
                  null;

                return (
                  <article
                    key={listing.listing_id}
                    className="listing-card"
                  >
                    <div className="listing-card-image">
                      {listing.image || fallbackImage ? (
                        <img
                          src={listing.image || fallbackImage}
                          alt={listing.title}
                        />
                      ) : (
                        <div className="listing-placeholder">
                          <Home size={32} />
                        </div>
                      )}
                      <span className="listing-type-badge">
                        {LISTING_TYPE_LABELS[listing.listing_type] ||
                          listing.listing_type}
                      </span>
                    </div>

                    <div className="listing-card-content">
                      <div className="listing-card-header">
                        <h3>{listing.title}</h3>
                        <p className="listing-price">
                          {formatPrice(listing.rent_amount)}
                        </p>
                      </div>

                      <p className="listing-location">
                        <MapPin size={16} />
                        <span>{listing.neighborhood || listing.address}</span>
                      </p>

                      <div className="listing-meta">
                        <span>
                          <BedDouble size={16} />
                          {ROOM_TYPE_LABELS[listing.room_type] ||
                            'Room type'}
                        </span>
                        <span>
                          <Users size={16} />
                          {listing.available_rooms} / {listing.total_rooms} rooms
                        </span>
                        <span>
                          <Calendar size={16} />
                          {formatDate(listing.available_from)}
                        </span>
                      </div>

                      {amenities.length > 0 && (
                        <div className="listing-amenities">
                          {amenities.slice(0, 3).map((amenity) => (
                            <span key={amenity} className="amenity-pill">
                              {amenity}
                            </span>
                          ))}
                          {amenities.length > 3 && (
                            <span className="amenity-pill muted">
                              +{amenities.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="listing-actions">
                        <a href={`/listings/${listing.listing_id}`}>
                          View details
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <p>No listings match your filters yet.</p>
              <p>Try expanding your search area or adjusting your budget.</p>
              <button type="button" onClick={handleClearFilters}>
                Clear filters
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default ListingsPage;
