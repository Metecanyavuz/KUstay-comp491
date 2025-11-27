import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Home, MapPin, PlusCircle } from 'lucide-react';
import { getCSRFToken } from '../../utils/csrf';
import './CreateListing.css';

const defaultForm = {
  title: '',
  description: '',
  listing_type: 'apartment',
  room_type: 'private',
  city: '',
  district: '',
  address: '',
  neighborhood: '',
  rent_amount: '',
  available_from: '',
  total_rooms: 1,
  available_rooms: 1,
  amenities: '',
  house_rules: '',
};

const LISTING_TYPE_OPTIONS = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'room', label: 'Room' },
];

const ROOM_TYPE_OPTIONS = [
  { value: 'private', label: 'Private Room' },
  { value: 'shared', label: 'Shared Room' },
  { value: 'entire_place', label: 'Entire Place' },
];

function CreateListing() {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [provinceData, setProvinceData] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [neighborhoodOptions, setNeighborhoodOptions] = useState([]);
  const [locationError, setLocationError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [neighborhoodLoading, setNeighborhoodLoading] = useState(false);
  const [geocodeWarning, setGeocodeWarning] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const controller = new AbortController();
    const fetchProvinces = async () => {
      setLocationLoading(true);
      setLocationError('');
      try {
        const response = await fetch('https://api.turkiyeapi.dev/v1/provinces', {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Unable to load provinces right now.');
        }
        const data = await response.json();
        const items = data?.data || [];
        setProvinceData(items);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
          setLocationError('Şehir verisi alınamadı. Lütfen manuel girin veya tekrar deneyin.');
        }
      } finally {
        setLocationLoading(false);
      }
    };
    fetchProvinces();
    return () => controller.abort();
  }, []);

  const handleCityChange = (value) => {
    const selected = provinceData.find((p) => p.name === value);
    const districts = selected?.districts || selected?.counties || [];
    setForm((prev) => ({
      ...prev,
      city: value,
      district: '',
      neighborhood: '',
    }));
    setDistrictOptions(districts);
    setNeighborhoodOptions([]);
  };

  const handleDistrictChange = (value) => {
    setForm((prev) => ({
      ...prev,
      district: value,
      neighborhood: '',
    }));
    setNeighborhoodOptions([]);
    if (value) {
      const districtObj =
        districtOptions.find((d) => d.name === value) ||
        districtOptions.find((d) => d.district === value);
      const districtId = districtObj?.id || districtObj?._id || districtObj?.districtId;
      fetchNeighborhoods(value, districtId);
    }
  };

  const fetchNeighborhoods = async (districtName, districtId) => {
    setNeighborhoodLoading(true);
    setLocationError('');
    try {
      const params = new URLSearchParams();
      if (districtId) {
        params.set('districtId', districtId);
      } else {
        params.set('district', districtName);
      }
      params.set('limit', '500');

      const response = await fetch(
        `https://api.turkiyeapi.dev/v1/neighborhoods?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error('Mahalleler alınamadı');
      }
      const data = await response.json();
      const items = data?.data || [];
      setNeighborhoodOptions(items);
    } catch (err) {
      console.error(err);
      setLocationError('Mahalle listesi yüklenemedi, elle yazabilirsiniz.');
      setNeighborhoodOptions([]);
    } finally {
      setNeighborhoodLoading(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setImageFile(file || null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.title.trim() || !form.description.trim() || !form.address.trim()) {
      setError('Title, description, and address are required.');
      return;
    }

    if (!form.rent_amount) {
      setError('Please add a monthly rent amount.');
      return;
    }

    const amenities = form.amenities
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const city = form.city.trim();
    const district = form.district.trim();
    const neighborhood = form.neighborhood.trim();
    const street = form.address.trim();

    if (!city || !district) {
      setError('Please enter your city and district.');
      return;
    }

    const composedAddress = [street, district, city].filter(Boolean).join(', ');

    setGeocodeWarning('');

    const coords = await geocodeAddress({
      street,
      neighborhood,
      district,
      city,
    });

    const payload = new FormData();
    payload.append('title', form.title.trim());
    payload.append('description', form.description.trim());
    payload.append('listing_type', form.listing_type);
    payload.append('room_type', form.room_type);
    payload.append('address', composedAddress);
    payload.append('neighborhood', neighborhood || district || city);
    payload.append('rent_amount', form.rent_amount);
    payload.append('total_rooms', Number(form.total_rooms) || 1);
    payload.append('available_rooms', Number(form.available_rooms) || 1);
    payload.append('amenities', JSON.stringify(amenities));
    payload.append('house_rules', form.house_rules.trim());
    payload.append('is_active', 'true');

    if (form.available_from) {
      payload.append('available_from', form.available_from);
    }

    if (coords) {
      payload.append('latitude', coords.lat);
      payload.append('longitude', coords.lng);
    }

    if (imageFile) {
      payload.append('image', imageFile);
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/listings/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': getCSRFToken() || '',
        },
        body: payload,
      });

      if (!response.ok) {
        let message = 'Could not save listing. Please check your info and try again.';
        try {
          const data = await response.json();
          if (data?.detail) {
            message = data.detail;
          } else if (typeof data === 'object' && data !== null) {
            const firstKey = Object.keys(data)[0];
            const firstVal = Array.isArray(data[firstKey])
              ? data[firstKey][0]
              : data[firstKey];
            message = `${firstKey}: ${firstVal}`;
          }
        } catch (parseErr) {
          // keep default message
        }
        throw new Error(message);
      }

      const data = await response.json();
      if (data?.listing_id) {
        navigate(`/listings/${data.listing_id}`);
      } else {
        navigate('/listings');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const geocodeAddress = async ({ street, neighborhood, district, city }) => {
    const queryParts = [street, neighborhood, district, city, 'Türkiye'].filter(Boolean);
    if (!queryParts.length) {
      return null;
    }

    try {
      const params = new URLSearchParams({
        q: queryParts.join(', '),
        format: 'json',
        limit: '1',
        addressdetails: '0',
        countrycodes: 'tr',
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            'User-Agent': 'KUstay/1.0 (listing creation)',
          },
        },
      );
      if (!response.ok) {
        throw new Error('Geocode failed');
      }
      const results = await response.json();
      if (!Array.isArray(results) || results.length === 0) {
        setGeocodeWarning('Adres konumu bulunamadı; koordinatlar olmadan kaydedilecek.');
        return null;
      }
      const { lat, lon } = results[0];
      if (lat && lon) {
        const round6 = (v) => Number.parseFloat(v).toFixed(6);
        return { lat: round6(lat), lng: round6(lon) };
      }
      setGeocodeWarning('Adres konumu bulunamadı; koordinatlar olmadan kaydedilecek.');
      return null;
    } catch (error) {
      console.warn('Geocoding failed', error);
      setGeocodeWarning('Konum doğrulama başarısız; koordinatlar olmadan kaydedilecek.');
      return null;
    }
  };

  return (
    <div className="create-listing-page">
      <div className="create-listing-shell">
        <header className="create-listing-header">
          <div>
            <p className="eyebrow">Share your place</p>
            <h1>Create a new listing</h1>
            <p className="lede">
              Add details about your place so the KUstay community can discover it.
            </p>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => navigate('/listings')}
          >
            Back to listings
          </button>
        </header>

        <form className="create-listing-form" onSubmit={handleSubmit}>
          <section className="form-panel">
            <div className="panel-header">
              <Home size={18} />
              <h2>Listing basics</h2>
            </div>

            <div className="form-grid">
              <label className="form-field">
                <span>Title *</span>
                <input
                  name="title"
                  type="text"
                  placeholder="Cozy 2+1 near campus"
                  value={form.title}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="form-field">
                <span>Listing type</span>
                <select
                  name="listing_type"
                  value={form.listing_type}
                  onChange={handleChange}
                >
                  {LISTING_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Room type</span>
                <select
                  name="room_type"
                  value={form.room_type}
                  onChange={handleChange}
                >
                  {ROOM_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Monthly rent (₺) *</span>
                <input
                  name="rent_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="7500"
                  value={form.rent_amount}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="form-field">
                <span>Available from</span>
                <div className="input-with-icon">
                  <Calendar size={16} />
                  <input
                    name="available_from"
                    type="date"
                    value={form.available_from}
                    onChange={handleChange}
                  />
                </div>
              </label>

              <label className="form-field">
                <span>Cover image (optional)</span>
                <input
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </section>

          <section className="form-panel">
            <div className="panel-header">
              <MapPin size={18} />
              <h2>Location</h2>
            </div>

            <div className="form-grid two">
              <label className="form-field">
                <span>İl *</span>
                <select
                  name="city"
                  value={form.city}
                  onChange={(event) => handleCityChange(event.target.value)}
                  required
                >
                  <option value="">İl seçin</option>
                  {provinceData.map((province) => (
                    <option key={province.id || province.name} value={province.name}>
                      {province.name}
                    </option>
                  ))}
                </select>
                {locationLoading && <small className="form-hint">Şehirler yükleniyor…</small>}
                {locationError && <small className="form-error inline">{locationError}</small>}
              </label>

              <label className="form-field">
                <span>İlçe *</span>
                <select
                  name="district"
                  value={form.district}
                  onChange={(event) => handleDistrictChange(event.target.value)}
                  required
                  disabled={!form.city}
                >
                  <option value="">İlçe seçin</option>
                  {districtOptions.map((district) => (
                    <option
                      key={district.id || district._id || district.name}
                      value={district.name}
                    >
                      {district.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-grid two">
              <label className="form-field">
                <span>Mahalle</span>
                <select
                  name="neighborhood"
                  value={form.neighborhood}
                  onChange={handleChange}
                  disabled={!form.district}
                >
                  <option value="">Mahalle seçin</option>
                  {neighborhoodOptions.map((hood) => (
                    <option
                      key={hood.id || hood._id || hood.name || hood}
                      value={hood.name || hood.neighborhood || hood}
                    >
                      {hood.name || hood.neighborhood || hood}
                    </option>
                  ))}
                </select>
                {neighborhoodLoading && (
                  <small className="form-hint">Mahalleler yükleniyor…</small>
                )}
              </label>

              <label className="form-field">
                <span>Address *</span>
                <input
                  name="address"
                  type="text"
                  placeholder="Street and number"
                  value={form.address}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>
          </section>

          <section className="form-panel">
            <div className="panel-header">
              <PlusCircle size={18} />
              <h2>Details</h2>
            </div>

            <div className="form-grid three">
              <label className="form-field">
                <span>Total rooms</span>
                <input
                  name="total_rooms"
                  type="number"
                  min="1"
                  value={form.total_rooms}
                  onChange={handleChange}
                />
              </label>
              <label className="form-field">
                <span>Available rooms</span>
                <input
                  name="available_rooms"
                  type="number"
                  min="1"
                  value={form.available_rooms}
                  onChange={handleChange}
                />
              </label>
              <label className="form-field">
                <span>Amenities (comma separated)</span>
                <input
                  name="amenities"
                  type="text"
                  placeholder="Wi-Fi, Parking, AC"
                  value={form.amenities}
                  onChange={handleChange}
                />
              </label>
            </div>

            <label className="form-field">
              <span>Description *</span>
              <textarea
                name="description"
                rows="4"
                placeholder="Describe the place, nearby spots, roommates, etc."
                value={form.description}
                onChange={handleChange}
                required
              />
            </label>

            <label className="form-field">
              <span>House rules</span>
              <textarea
                name="house_rules"
                rows="3"
                placeholder="No smoking, quiet hours, etc."
                value={form.house_rules}
                onChange={handleChange}
              />
            </label>
          </section>

          {error && <div className="form-error">{error}</div>}
          {geocodeWarning && <div className="form-error inline">{geocodeWarning}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="ghost-button secondary"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? 'Saving...' : 'Publish listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateListing;
