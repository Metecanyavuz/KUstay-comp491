import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Home, MapPin, PlusCircle } from 'lucide-react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getCSRFToken } from '../../utils/csrf';
import { AMENITY_OPTIONS } from '../../data/amenities';
import { useI18n } from '../../context/I18nContext';
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
  amenities: [],
  amenity_other: '',
  house_rules: '',
};

const OTHER_AMENITY_VALUE = 'Other';

function CreateListing() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [form, setForm] = useState(defaultForm);
  const [imageFile, setImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const galleryInputRef = useRef(null);
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

  const listingTypeOptions = [
    { value: 'apartment', label: t('listings.apartment', 'Apartment') },
    { value: 'house', label: t('listings.house', 'House') },
    { value: 'room', label: t('listings.room', 'Room') },
  ];

  const roomTypeOptions = [
    { value: 'private', label: t('listings.privateRoom', 'Private Room') },
    { value: 'shared', label: t('listings.sharedRoom', 'Shared Room') },
    { value: 'entire_place', label: t('listings.entirePlace', 'Entire Place') },
  ];

  const amenityLabels = {
    'Wi-Fi Included': t('amenities.wifi', 'Wi-Fi Included'),
    'Utilities Included': t('amenities.utilities', 'Utilities Included'),
    'Washer/Dryer': t('amenities.washerDryer', 'Washer/Dryer'),
    'Parking Spot': t('amenities.parking', 'Parking Spot'),
    'Pet Friendly': t('amenities.petFriendly', 'Pet Friendly'),
    'Air Conditioning': t('amenities.ac', 'Air Conditioning'),
    Furnished: t('amenities.furnished', 'Furnished'),
    'Gym Access': t('amenities.gym', 'Gym Access'),
  };

  const otherAmenityLabel = t('createListing.amenityOther', 'Other');

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
          throw new Error(t('createListing.provinceLoadError', 'Unable to load provinces right now.'));
        }
        const data = await response.json();
        const items = Array.isArray(data) ? data : data?.data || [];
        setProvinceData(items);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
          setLocationError(
            t(
              'createListing.cityLoadError',
              'Unable to load cities. Please enter manually or try again.',
            ),
          );
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
        throw new Error(t('createListing.neighborhoodLoadError', 'Unable to load neighborhoods.'));
      }
      const data = await response.json();
      const items = Array.isArray(data) ? data : data?.data || [];
      setNeighborhoodOptions(items);
    } catch (err) {
      console.error(err);
      setLocationError(
        t(
          'createListing.neighborhoodLoadErrorDetail',
          'Neighborhood list failed to load; you can type manually.',
        ),
      );
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
        throw new Error(t('createListing.streetLoadError', 'Unable to load streets.'));
      }
      const data = await response.json();
      const items = Array.isArray(data) ? data : data?.data || [];
      setStreetOptions(items);
    } catch (err) {
      console.error(err);
      setStreetError(t('createListing.streetLoadErrorDetail', 'Could not load streets.'));
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

  const handleGalleryChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setGalleryFiles((prev) => {
      const seen = new Set(prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const next = [...prev];
      files.forEach((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (!seen.has(key)) {
          seen.add(key);
          next.push(file);
        }
      });
      return next;
    });
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }
  };

  const handleGalleryRemove = (index) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGalleryClear = () => {
    setGalleryFiles([]);
  };

  const handleAmenityToggle = (amenity) => {
    setForm((prev) => {
      const currentAmenities = Array.isArray(prev.amenities) ? prev.amenities : [];
      const hasAmenity = currentAmenities.includes(amenity);
      const nextAmenities = hasAmenity
        ? currentAmenities.filter((item) => item !== amenity)
        : [...currentAmenities, amenity];
      return {
        ...prev,
        amenities: nextAmenities,
        amenity_other: amenity === OTHER_AMENITY_VALUE && hasAmenity ? '' : prev.amenity_other,
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.title.trim() || !form.description.trim() || !form.address.trim()) {
      setError(t('createListing.errorRequired', 'Title, description, and address are required.'));
      return;
    }

    if (!form.rent_amount) {
      setError(t('createListing.errorRent', 'Please add a monthly rent amount.'));
      return;
    }

    const selectedAmenities = Array.isArray(form.amenities)
      ? form.amenities
      : form.amenities
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
    const hasOtherAmenity = selectedAmenities.includes(OTHER_AMENITY_VALUE);
    const otherAmenity = form.amenity_other.trim();
    const combinedAmenities = selectedAmenities.filter(
      (item) => item !== OTHER_AMENITY_VALUE,
    );
    if (hasOtherAmenity && otherAmenity) {
      const extraAmenities = otherAmenity
        .split(/,|\n/)
        .map((item) => item.trim())
        .filter(Boolean);
      combinedAmenities.push(...extraAmenities);
    }
    const amenities = combinedAmenities.reduce((acc, item) => {
      const key = item.toLowerCase();
      if (!acc.seen.has(key)) {
        acc.seen.add(key);
        acc.list.push(item);
      }
      return acc;
    }, { list: [], seen: new Set() }).list;

    const city = form.city.trim();
    const district = form.district.trim();
    const neighborhood = form.neighborhood.trim();
    const street = form.address.trim();
    const addressDetail = form.address_detail.trim();

    if (!city || !district) {
      setError(t('createListing.errorCityDistrict', 'Please enter your city and district.'));
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
    if (galleryFiles.length) {
      galleryFiles.forEach((file) => payload.append('images', file));
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
        let message = t(
          'createListing.errorSave',
          'Could not save listing. Please check your info and try again.',
        );
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
        setGeocodeWarning(
          t(
            'createListing.geocodeNotFound',
            'Address location not found; it will be saved without coordinates.',
          ),
        );
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
      setGeocodeWarning(
        t(
          'createListing.geocodeNotFound',
          'Address location not found; it will be saved without coordinates.',
        ),
      );
      return null;
    } catch (error) {
      console.warn('Geocoding failed', error);
      setGeocodeWarning(
        t(
          'createListing.geocodeFailed',
          'Location validation failed; it will be saved without coordinates.',
        ),
      );
      return null;
    }
  };

  return (
    <div className="create-listing-page">
      <div className="create-listing-shell">
        <header className="create-listing-header">
          <div>
            <p className="eyebrow">{t('createListing.eyebrow', 'Share your place')}</p>
            <h1>{t('createListing.title', 'Create a new listing')}</h1>
            <p className="lede">
              {t(
                'createListing.lede',
                'Add details about your place so the KUstay community can discover it.',
              )}
            </p>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => navigate('/listings')}
          >
            {t('createListing.backToListings', 'Back to listings')}
          </button>
        </header>

        <form className="create-listing-form" onSubmit={handleSubmit}>
          <section className="form-panel">
            <div className="panel-header">
              <Home size={18} />
              <h2>{t('createListing.sectionBasics', 'Listing basics')}</h2>
            </div>

            <div className="form-grid">
              <label className="form-field">
                <span>{t('createListing.titleLabel', 'Title *')}</span>
                <input
                  name="title"
                  type="text"
                  placeholder={t('createListing.titlePlaceholder', 'Cozy 2+1 near campus')}
                  value={form.title}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="form-field">
                <span>{t('createListing.listingTypeLabel', 'Listing type')}</span>
                <select
                  name="listing_type"
                  value={form.listing_type}
                  onChange={handleChange}
                >
                  {listingTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>{t('createListing.roomTypeLabel', 'Room type')}</span>
                <select
                  name="room_type"
                  value={form.room_type}
                  onChange={handleChange}
                >
                  {roomTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>{t('createListing.monthlyRentLabel', 'Monthly rent (₺) *')}</span>
                <input
                  name="rent_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('createListing.rentPlaceholder', '7500')}
                  value={form.rent_amount}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="form-field">
                <span>{t('createListing.availableFromLabel', 'Available from')}</span>
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
                <span>{t('createListing.coverImageLabel', 'Cover image (optional)')}</span>
                <input
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
              <label className="form-field">
                <span>{t('createListing.additionalPhotosLabel', 'Additional photos (optional)')}</span>
                <input
                  name="images"
                  type="file"
                  accept="image/*"
                  multiple
                  ref={galleryInputRef}
                  onChange={handleGalleryChange}
                />
                <small className="form-hint">
                  {t(
                    'createListing.additionalPhotosHint',
                    'Select multiple images or add more after the first pick.',
                  )}
                </small>
                {galleryFiles.length > 0 && (
                  <div className="file-list">
                    <div className="file-list-header">
                      <span>
                        {galleryFiles.length} {t('createListing.filesSelected', 'selected')}
                      </span>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={handleGalleryClear}
                      >
                        {t('createListing.clear', 'Clear')}
                      </button>
                    </div>
                    <div className="file-chips">
                      {galleryFiles.map((file, index) => (
                        <span key={`${file.name}-${file.size}-${file.lastModified}`} className="file-chip">
                          {file.name}
                          <button
                            type="button"
                            onClick={() => handleGalleryRemove(index)}
                            aria-label={`${t('createListing.removeFile', 'Remove')} ${file.name}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </label>
            </div>
          </section>

          <section className="form-panel">
            <div className="panel-header">
              <MapPin size={18} />
              <h2>{t('createListing.sectionLocation', 'Location')}</h2>
            </div>

            <div className="form-grid two">
              <label className="form-field">
                <span>{t('createListing.cityLabel', 'City *')}</span>
                <select
                  name="city"
                  value={form.city}
                  onChange={(event) => handleCityChange(event.target.value)}
                  required
                >
                  <option value="">{t('createListing.citySelect', 'Select city')}</option>
                  {provinceData.map((province) => (
                    <option key={province.id || province.name} value={province.name}>
                      {province.name}
                    </option>
                  ))}
                </select>
                {locationLoading && (
                  <small className="form-hint">
                    {t('createListing.cityLoading', 'Cities are loading...')}
                  </small>
                )}
                {locationError && <small className="form-error inline">{locationError}</small>}
              </label>

              <label className="form-field">
                <span>{t('createListing.districtLabel', 'District *')}</span>
                <select
                  name="district"
                  value={form.district}
                  onChange={(event) => handleDistrictChange(event.target.value)}
                  required
                  disabled={!form.city}
                >
                  <option value="">{t('createListing.districtSelect', 'Select district')}</option>
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
                <span>{t('createListing.neighborhoodLabel', 'Neighborhood')}</span>
                <select
                  name="neighborhood"
                  value={form.neighborhood}
                  onChange={(event) => handleNeighborhoodChange(event.target.value)}
                  disabled={!form.district}
                >
                  <option value="">{t('createListing.neighborhoodSelect', 'Select neighborhood')}</option>
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
                  <small className="form-hint">
                    {t('createListing.neighborhoodLoading', 'Neighborhoods are loading...')}
                  </small>
                )}
              </label>

              <label className="form-field">
                <span>{t('createListing.streetLabel', 'Street *')}</span>
                <select
                  name="address"
                  value={form.address}
                  onChange={(event) => handleStreetChange(event.target.value)}
                  disabled={!selectedNeighborhoodId || streetLoading}
                  required
                >
                  <option value="">{t('createListing.streetSelect', 'Select street')}</option>
                  {streetOptions.map((street) => (
                    <option
                      key={street.id || street.sokak_id || street.name || street.sokak_adi}
                      value={street.name || street.sokak_adi || street}
                    >
                      {street.name || street.sokak_adi || street}
                    </option>
                  ))}
                </select>
                {streetLoading && (
                  <small className="form-hint">
                    {t('createListing.streetLoading', 'Streets are loading...')}
                  </small>
                )}
                {streetError && <small className="form-error inline">{streetError}</small>}
              </label>
            </div>

            <div className="form-grid two">
              <label className="form-field">
                <span>{t('createListing.addressDetailLabel', 'Address detail (optional)')}</span>
                <input
                  name="address_detail"
                  type="text"
                  placeholder={t('createListing.addressDetailPlaceholder', 'Site name, apartment no, etc.')}
                  value={form.address_detail}
                  onChange={handleChange}
                />
              </label>
            </div>

            <div className="map-picker">
              <div className="map-header">
                <span>{t('createListing.mapAdjustTitle', 'Fine-tune location')}</span>
                <small>
                  {t(
                    'createListing.mapAdjustHint',
                    'If the address is not found, move the pin to select the location.',
                  )}
                </small>
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
              <h2>{t('createListing.sectionDetails', 'Details')}</h2>
            </div>

            <div className="form-grid three">
              <label className="form-field">
                <span>{t('createListing.totalRoomsLabel', 'Total rooms')}</span>
                <input
                  name="total_rooms"
                  type="number"
                  min="1"
                  value={form.total_rooms}
                  onChange={handleChange}
                />
              </label>
              <label className="form-field">
                <span>{t('createListing.availableRoomsLabel', 'Available rooms')}</span>
                <input
                  name="available_rooms"
                  type="number"
                  min="1"
                  value={form.available_rooms}
                  onChange={handleChange}
                />
              </label>
              <div className="form-field amenity-field">
                <span>{t('createListing.amenitiesLabel', 'Amenities')}</span>
                <div className="amenities-grid">
                  {[...AMENITY_OPTIONS, OTHER_AMENITY_VALUE].map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      className={`amenity-chip ${
                        form.amenities.includes(amenity) ? 'active' : ''
                      }`}
                      onClick={() => handleAmenityToggle(amenity)}
                    >
                      {amenity === OTHER_AMENITY_VALUE ? otherAmenityLabel : amenityLabels[amenity] || amenity}
                    </button>
                  ))}
                </div>
                <small className="form-hint">
                  {t('createListing.amenitiesHint', 'Select all that apply.')}
                </small>
              </div>
              {form.amenities.includes(OTHER_AMENITY_VALUE) && (
                <label className="form-field amenity-other">
                  <span>{t('createListing.otherAmenitiesLabel', 'Other amenities (optional)')}</span>
                  <input
                    name="amenity_other"
                    type="text"
                    placeholder={t(
                      'createListing.otherAmenitiesPlaceholder',
                      'e.g. Balcony, Dishwasher',
                    )}
                    value={form.amenity_other}
                    onChange={handleChange}
                  />
                  <small className="form-hint">
                    {t(
                      'createListing.otherAmenitiesHint',
                      'Separate multiple items with commas.',
                    )}
                  </small>
                </label>
              )}
            </div>

            <label className="form-field">
              <span>{t('createListing.descriptionLabel', 'Description *')}</span>
              <textarea
                name="description"
                rows="4"
                placeholder={t(
                  'createListing.descriptionPlaceholder',
                  'Describe the place, nearby spots, roommates, etc.',
                )}
                value={form.description}
                onChange={handleChange}
                required
              />
            </label>

            <label className="form-field">
              <span>{t('createListing.houseRulesLabel', 'House rules')}</span>
              <textarea
                name="house_rules"
                rows="3"
                placeholder={t(
                  'createListing.houseRulesPlaceholder',
                  'No smoking, quiet hours, etc.',
                )}
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
              {t('createListing.cancel', 'Cancel')}
            </button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting
                ? t('createListing.saving', 'Saving...')
                : t('createListing.publish', 'Publish listing')}
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
