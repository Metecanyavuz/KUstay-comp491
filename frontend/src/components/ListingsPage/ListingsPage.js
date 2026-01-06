import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
import { AMENITY_OPTIONS } from '../../data/amenities';
import { resolveMediaUrl } from '../../utils/media';
import { useI18n } from '../../context/I18nContext';
import './ListingsPage.css';

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

const formatPrice = (value, perMonthLabel = '₺/month') => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return `${value} ${perMonthLabel}`;
  }

  return `${numericValue.toLocaleString('tr-TR')} ${perMonthLabel}`;
};

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const safeTimestamp = (value) => {
  const time = new Date(value).valueOf();
  return Number.isFinite(time) ? time : 0;
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
  const { t } = useI18n();
  const perMonthLabel = t('currency.perMonth', '₺/month');
  const amenityLabels = useMemo(
    () => ({
      'Wi-Fi Included': t('amenities.wifi', 'Wi-Fi Included'),
      'Utilities Included': t('amenities.utilities', 'Utilities Included'),
      'Washer/Dryer': t('amenities.washerDryer', 'Washer/Dryer'),
      'Parking Spot': t('amenities.parking', 'Parking Spot'),
      'Pet Friendly': t('amenities.petFriendly', 'Pet Friendly'),
      'Air Conditioning': t('amenities.ac', 'Air Conditioning'),
      Furnished: t('amenities.furnished', 'Furnished'),
      'Gym Access': t('amenities.gym', 'Gym Access'),
    }),
    [t],
  );

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
  const listingTypeLabels = useMemo(
    () => ({
      apartment: t('listings.apartment', 'Apartment'),
      house: t('listings.house', 'House'),
      room: t('listings.room', 'Room'),
    }),
    [t],
  );
  const roomTypeLabels = useMemo(
    () => ({
      private: t('listings.privateRoom', 'Private Room'),
      shared: t('listings.sharedRoom', 'Shared Room'),
      entire_place: t('listings.entirePlace', 'Entire Place'),
    }),
    [t],
  );

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
        label: listingTypeLabels[activeFilters.listingType],
        type: 'listingType',
      });
    }

    if (activeFilters.roomType !== 'all') {
      chips.push({
        key: 'roomType',
        label: roomTypeLabels[activeFilters.roomType],
        type: 'roomType',
      });
    }

    activeFilters.amenities.forEach((amenity) => {
      chips.push({
        key: `amenity-${amenity}`,
        label: amenityLabels[amenity] || amenity,
        type: 'amenity',
        value: amenity,
      });
    });

    return chips;
  }, [activeFilters, amenityLabels]);

  const formatDateLocalized = (value) => {
    if (!value) {
      return t('listings.flexible', 'Flexible move-in');
    }

    try {
      return new Date(value).toLocaleDateString(
        t('listings.locale', 'en-US'),
        {
          month: 'short',
          day: 'numeric',
        },
      );
    } catch (error) {
      return value;
    }
  };

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
          <p className="eyebrow">{t('listings.eyebrow', 'Discover KUstay Listings')}</p>
          <h1>{t('listings.title', 'Browse verified housing and find your next roommate')}</h1>
          <form className="listings-hero-search" onSubmit={handleApplyFilters}>
            <div className="hero-search-input">
              <MapPin size={18} />
              <input
                type="text"
                name="location"
                placeholder={t('listings.searchPlaceholder', 'Search neighborhood, address, or keyword')}
                value={formFilters.location}
                onChange={handleInputChange}
              />
            </div>
            <button type="submit">
              <Search size={18} />
              {t('home.searchButton', 'Search')}
            </button>
          </form>
        </div>
      </section>

      <div className="listings-layout">
        <aside className="filters-panel">
          <div className="filters-header">
            <div>
              <p className="eyebrow">{t('listings.filters', 'Filters')}</p>
              <h2>{t('listings.tailor', 'Tailor your search')}</h2>
            </div>
            <Filter size={18} />
          </div>

          <form className="filters-form" onSubmit={handleApplyFilters}>
            <div className="filter-group">
              <label htmlFor="location">{t('listings.location', 'Location')}</label>
              <div className="input-with-icon">
                <MapPin size={16} />
                <input
                  id="location"
                  name="location"
                  type="text"
                  placeholder={t('listings.searchPlaceholder', 'Search neighborhood, address, or keyword')}
                  value={formFilters.location}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="filter-group">
              <label>{t('listings.budget', 'Monthly budget')}</label>
              <div className="price-inputs">
                <div className="input-with-icon">
                  <Home size={16} />
                  <input
                    type="number"
                    name="priceMin"
                    placeholder={t('listings.min', 'Min ₺')}
                    value={formFilters.priceMin}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="input-with-icon">
                  <Home size={16} />
                  <input
                    type="number"
                    name="priceMax"
                    placeholder={t('listings.max', 'Max ₺')}
                    value={formFilters.priceMax}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <div className="filter-group">
              <label htmlFor="listingType">{t('listings.propertyType', 'Property type')}</label>
              <select
                id="listingType"
                name="listingType"
                value={formFilters.listingType}
                onChange={handleInputChange}
              >
                <option value="all">{t('listings.any', 'Any')}</option>
                <option value="apartment">{t('listings.apartment', 'Apartment')}</option>
                <option value="house">{t('listings.house', 'House')}</option>
                <option value="room">{t('listings.room', 'Room')}</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="roomType">{t('listings.roomType', 'Room type')}</label>
              <select
                id="roomType"
                name="roomType"
                value={formFilters.roomType}
                onChange={handleInputChange}
              >
                <option value="all">{t('listings.any', 'Any')}</option>
                <option value="private">{t('listings.privateRoom', 'Private Room')}</option>
                <option value="shared">{t('listings.sharedRoom', 'Shared Room')}</option>
                <option value="entire_place">{t('listings.entirePlace', 'Entire Place')}</option>
              </select>
            </div>

            <div className="filter-group">
              <label>{t('listings.amenities', 'Amenities')}</label>
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
                    {amenityLabels[amenity] || amenity}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-actions">
              <button type="submit" className="apply-button">
                {t('listings.apply', 'Apply Filters')}
              </button>
              <button
                type="button"
                className="clear-button"
                onClick={handleClearFilters}
              >
                {t('listings.clear', 'Clear all')}
              </button>
            </div>
          </form>
        </aside>

        <section className="listings-results">
          <div className="results-header">
            <div>
              <p className="eyebrow">{t('listings.results', 'Results')}</p>
              <h2 className="results-count">
                {loading ? (
                  <span>{t('listings.finding', 'Finding listings...')}</span>
                ) : (
                  <>
                    <span className="count-number">{filteredListings.length}</span>
                    <span className="count-label">{t('listings.places', 'places')}</span>
                  </>
                )}
              </h2>
              <p className="results-subtitle">
                {t('listings.subtitle', 'Showing active listings that match your filters')}
              </p>
            </div>

            <div className="sort-control">
              <label htmlFor="sort">{t('listings.sortBy', 'Sort by')}</label>
              <select
                id="sort"
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value)}
              >
                <option value="newest">{t('listings.sort.newest', 'Newest first')}</option>
                <option value="price_low">{t('listings.sort.priceLow', 'Price: Low to High')}</option>
                <option value="price_high">{t('listings.sort.priceHigh', 'Price: High to Low')}</option>
                <option value="rooms">{t('listings.sort.rooms', 'Most rooms available')}</option>
              </select>
            </div>
          </div>

          <div className="post-listing-cta">
            <div className="cta-text">{t('listings.postCta', 'Have a place to share?')}</div>
            <div className="cta-button-wrap">
              <Link to="/listings/new" className="action-button solid">
                {t('listings.postCtaAction', 'List your place')}
              </Link>
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
              {t('listings.resetFilters', 'Reset filters')}
            </button>
          </div>
          )}

          {error && <div className="error-state">{error}</div>}

          {loading ? (
            <div className="loading-state">
              <Loader size={28} />
              <p>{t('listings.loading', 'Loading listings...')}</p>
            </div>
          ) : filteredListings.length ? (
            <div className="listings-grid">
              {filteredListings.map((listing) => {
                const amenities = normalizeAmenities(listing.amenities);
                const fallbackImage = resolveMediaUrl(
                  listing.images?.find((img) => img.is_primary)?.image_url ||
                    listing.images?.[0]?.image_url ||
                    null,
                );
                const coverImage = resolveMediaUrl(listing.image);
                const cardImage = coverImage || fallbackImage;

                return (
                  <article
                    key={listing.listing_id}
                    className="listing-card"
                  >
                    <div className="listing-card-image">
                      {cardImage ? (
                        <img
                          src={cardImage}
                          alt={listing.title}
                        />
                      ) : (
                        <div className="listing-placeholder">
                          <Home size={32} />
                        </div>
                      )}
                      <span className="listing-type-badge">
                        {listingTypeLabels[listing.listing_type] ||
                          listing.listing_type}
                      </span>
                    </div>

                    <div className="listing-card-content">
                      <div className="listing-card-header">
                        <h3>{listing.title}</h3>
                        <p className="listing-price">
                          {formatPrice(listing.rent_amount, perMonthLabel)}
                        </p>
                      </div>

                      <p className="listing-location">
                        <MapPin size={16} />
                        <span>{listing.neighborhood || listing.address}</span>
                      </p>

                      <div className="listing-meta">
                        <span>
                          <BedDouble size={16} />
                          {roomTypeLabels[listing.room_type] ||
                            t('listings.roomType', 'Room type')}
                        </span>
                        <span>
                          <Users size={16} />
                          {listing.available_rooms} / {listing.total_rooms}{' '}
                          {t('listings.roomsLabel', 'rooms')}
                        </span>
                        <span>
                          <Calendar size={16} />
                          {formatDateLocalized(listing.available_from)}
                        </span>
                      </div>

                      {amenities.length > 0 && (
                      <div className="listing-amenities">
                        {amenities.slice(0, 3).map((amenity) => (
                          <span key={amenity} className="amenity-pill">
                            {amenityLabels[amenity] || amenity}
                          </span>
                        ))}
                        {amenities.length > 3 && (
                          <span className="amenity-pill muted">
                            +{amenities.length - 3} {t('listings.more', 'more')}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="listing-actions">
                      <Link to={`/listings/${listing.listing_id}`}>
                          {t('listings.viewDetails', 'View details')}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          ) : (
            <div className="empty-state">
              <p>{t('listings.emptyTitle', 'No listings match your filters yet.')}</p>
              <p>{t('listings.emptySubtitle', 'Try expanding your search area or adjusting your budget.')}</p>
              <button type="button" onClick={handleClearFilters}>
                {t('listings.clearFilters', 'Clear filters')}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default ListingsPage;
