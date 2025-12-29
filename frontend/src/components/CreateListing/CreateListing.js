import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Home, MapPin, PlusCircle } from 'lucide-react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getCSRFToken } from '../../utils/csrf';
import './CreateListing.css';

const round6 = (value) => Number.parseFloat(value).toFixed(6);

const defaultForm = {
  title: '',
  description: '',
  listing_type: 'apartment',
  room_type: 'private',
  city: '',
  district: '',
  address: '',
  address_detail: '',
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
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState('');
  const [streetOptions, setStreetOptions] = useState([]);
  const [streetLoading, setStreetLoading] = useState(false);
  const [streetError, setStreetError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [neighborhoodLoading, setNeighborhoodLoading] = useState(false);
  const [geocodeWarning, setGeocodeWarning] = useState('');
  const [mapCenter, setMapCenter] = useState([39.0, 35.0]); // Turkey center
  const [markerPosition, setMarkerPosition] = useState(null);
  const [userMovedPin, setUserMovedPin] = useState(false);

  const DefaultIcon = L.icon({
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNeighborhoodChange = (value) => {
    setForm((prev) => ({
      ...prev,
      neighborhood: value,
      address: '',
      address_detail: '',
    }));
    setUserMovedPin(false);
    const hoodObj =
      neighborhoodOptions.find((h) => h.name === value) ||
      neighborhoodOptions.find((h) => h.neighborhood === value);
    const hoodId = hoodObj?.id || hoodObj?._id || '';
    setSelectedNeighborhoodId(hoodId);
    setStreetOptions([]);
    setStreetError('');
    if (hoodId) {
      fetchStreets(hoodId);
    }
    const coords = getCoords(hoodObj);
    if (coords) {
      setMapCenter([coords.lat, coords.lng]);
      setMarkerPosition(coords);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const fetchProvinces = async () => {
      setLocationLoading(true);
      setLocationError('');
      try {
        const response = await fetch('/api/addresses/provinces/', {
          signal: controller.signal,
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Unable to load provinces right now.');
        }
        const data = await response.json();
        const items = Array.isArray(data) ? data : data?.data || [];
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
      address: '',
      address_detail: '',
    }));
    setDistrictOptions(districts);
    setNeighborhoodOptions([]);
    setSelectedNeighborhoodId('');
    setStreetOptions([]);
    setStreetError('');
    setMarkerPosition(null);
    setUserMovedPin(false);
    const coords = getCoords(selected);
    if (coords) {
      setMapCenter([coords.lat, coords.lng]);
      setMarkerPosition(coords);
    }
  };

  const handleDistrictChange = (value) => {
    setForm((prev) => ({
      ...prev,
      district: value,
      neighborhood: '',
      address: '',
      address_detail: '',
    }));
    setNeighborhoodOptions([]);
    setSelectedNeighborhoodId('');
    setStreetOptions([]);
    setStreetError('');
    if (value) {
      const districtObj =
        districtOptions.find((d) => d.name === value) ||
        districtOptions.find((d) => d.district === value);
      const districtId = districtObj?.id || districtObj?._id || districtObj?.districtId;
      fetchNeighborhoods(value, districtId);
      const coords = getCoords(districtObj);
      if (coords) {
        setMapCenter([coords.lat, coords.lng]);
        setMarkerPosition(coords);
      }
    }
    setUserMovedPin(false);
  };

  // Re-center map based on selected city/district/neighborhood (best-effort).
  useEffect(() => {
    const controller = new AbortController();
    const { city, district, neighborhood, address, address_detail } = form;
    if (!city) return undefined;

    async function geocodeArea() {
      try {
        const attempts = [];
        const street = address?.trim();
        const detail = address_detail?.trim();
        if (street) attempts.push([street, detail, neighborhood, district, city]);
        if (neighborhood) attempts.push([neighborhood, district, city]);
        if (district) attempts.push([district, city]);
        if (city) attempts.push([city]);

        for (const parts of attempts) {
          const queryParts = [...parts, 'Türkiye'].filter(Boolean);
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
              signal: controller.signal,
              headers: { 'User-Agent': 'KUstay/1.0 (listing form)' },
            },
          );
          if (!response.ok) {
            continue;
          }
          const results = await response.json();
          if (Array.isArray(results) && results.length > 0) {
            const { lat, lon } = results[0];
            if (lat && lon) {
              const round6 = (v) => Number.parseFloat(v).toFixed(6);
              const coords = { lat: Number(round6(lat)), lng: Number(round6(lon)) };
              setMapCenter([coords.lat, coords.lng]);
              if (!userMovedPin) {
                setMarkerPosition(coords);
              }
              break;
            }
          }
        }
      } catch (err) {
        // silent best-effort
      }
    }

    geocodeArea();
    return () => controller.abort();
  }, [
    form.city,
    form.district,
    form.neighborhood,
    form.address,
    form.address_detail,
    userMovedPin,
  ]);

  const getCoords = (obj) => {
    if (!obj) return null;
    const lat =
      obj.latitude ??
      obj.lat ??
      obj?.geo?.latitude ??
      obj?.coordinates?.latitude ??
      obj?.location?.lat;
    const lng =
      obj.longitude ??
      obj.lon ??
      obj.lng ??
      obj?.geo?.longitude ??
      obj?.coordinates?.longitude ??
      obj?.location?.lng;
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      return { lat: Number(round6(lat)), lng: Number(round6(lng)) };
    }
    return null;
  };

  const fetchNeighborhoods = async (districtName, districtId) => {
    setNeighborhoodLoading(true);
    setLocationError('');
    try {
      const params = new URLSearchParams();
      if (districtId) {
        params.set('district_id', districtId);
      } else if (districtName) {
        params.set('district', districtName);
      }
      params.set('limit', '500');

      const response = await fetch(
        `/api/addresses/neighborhoods/?${params.toString()}`,
        { credentials: 'include' },
      );
      if (!response.ok) {
        throw new Error('Mahalleler alınamadı');
      }
      const data = await response.json();
      const items = Array.isArray(data) ? data : data?.data || [];
      setNeighborhoodOptions(items);
    } catch (err) {
      console.error(err);
      setLocationError('Mahalle listesi yüklenemedi, elle yazabilirsiniz.');
      setNeighborhoodOptions([]);
    } finally {
      setNeighborhoodLoading(false);
    }
  };

  const fetchStreets = async (neighborhoodId, query) => {
    if (!neighborhoodId) {
      setStreetOptions([]);
      return;
    }
    setStreetLoading(true);
    setStreetError('');
    try {
      const params = new URLSearchParams();
      params.set('neighborhood_id', neighborhoodId);
      params.set('limit', '5000');
      if (query) {
        params.set('q', query);
      }
      const response = await fetch(`/api/addresses/streets/?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Sokaklar alınamadı');
      }
      const data = await response.json();
      const items = Array.isArray(data) ? data : data?.data || [];
      setStreetOptions(items);
    } catch (err) {
      console.error(err);
      setStreetError('Sokak listesi yüklenemedi.');
      setStreetOptions([]);
    } finally {
      setStreetLoading(false);
    }
  };

  const handleStreetChange = (value) => {
    setForm((prev) => ({
      ...prev,
      address: value,
    }));
    setUserMovedPin(false);
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
    const addressDetail = form.address_detail.trim();

    if (!city || !district) {
      setError('Please enter your city and district.');
      return;
    }

    const composedAddress = [street, addressDetail, district, city].filter(Boolean).join(', ');

    setGeocodeWarning('');

    const coords = await geocodeAddress({
      street: [street, addressDetail].filter(Boolean).join(' '),
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

    const finalCoords = markerPosition || coords;
    if (finalCoords) {
      const latStr = Number(round6(finalCoords.lat)).toFixed(6);
      const lonStr = Number(round6(finalCoords.lng)).toFixed(6);
      payload.append('latitude', latStr);
      payload.append('longitude', lonStr);
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
          const coords = { lat: Number(round6(lat)), lng: Number(round6(lon)) };
          setMapCenter([coords.lat, coords.lng]);
          if (!userMovedPin) {
            setMarkerPosition(coords);
          }
          return coords;
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
                  onChange={(event) => handleNeighborhoodChange(event.target.value)}
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
                <span>Sokak *</span>
                <select
                  name="address"
                  value={form.address}
                  onChange={(event) => handleStreetChange(event.target.value)}
                  disabled={!selectedNeighborhoodId || streetLoading}
                  required
                >
                  <option value="">Sokak seçin</option>
                  {streetOptions.map((street) => (
                    <option
                      key={street.id || street.sokak_id || street.name || street.sokak_adi}
                      value={street.name || street.sokak_adi || street}
                    >
                      {street.name || street.sokak_adi || street}
                    </option>
                  ))}
                </select>
                {streetLoading && <small className="form-hint">Sokaklar yükleniyor…</small>}
                {streetError && <small className="form-error inline">{streetError}</small>}
              </label>
            </div>

            <div className="form-grid two">
              <label className="form-field">
                <span>Adres detayı (opsiyonel)</span>
                <input
                  name="address_detail"
                  type="text"
                  placeholder="Site adı, apartman no vb."
                  value={form.address_detail}
                  onChange={handleChange}
                />
              </label>
            </div>

            <div className="map-picker">
              <div className="map-header">
                <span>Konumu ince ayarla</span>
                <small>Adres bulunamazsa pini taşıyarak konumu seçin.</small>
              </div>
            <MapContainer
              center={mapCenter}
              zoom={13}
              scrollWheelZoom={false}
              className="picker-map"
            >
              <MapViewUpdater center={mapCenter} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            <MarkerDraggable
              markerPosition={markerPosition}
              setMarkerPosition={setMarkerPosition}
              defaultIcon={DefaultIcon}
              setMapCenter={setMapCenter}
              setUserMovedPin={setUserMovedPin}
            />
          </MapContainer>
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

function MarkerDraggable({
  markerPosition,
  setMarkerPosition,
  defaultIcon,
  setMapCenter,
  setUserMovedPin,
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setMarkerPosition({ lat: round6(lat), lng: round6(lng) });
      setMapCenter([lat, lng]);
      setUserMovedPin(true);
    },
  });

  if (!markerPosition) return null;

  return (
    <Marker
      position={[markerPosition.lat, markerPosition.lng]}
      draggable
      eventHandlers={{
        dragend: (event) => {
      const latlng = event.target.getLatLng();
      setMarkerPosition({ lat: round6(latlng.lat), lng: round6(latlng.lng) });
      setMapCenter([latlng.lat, latlng.lng]);
      setUserMovedPin(true);
    },
      }}
      icon={defaultIcon}
    />
  );
}

function MapViewUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      map.setView(center);
    }
  }, [center, map]);
  return null;
}

export default CreateListing;
