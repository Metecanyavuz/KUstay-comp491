import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calendar, Home, Loader, MapPin, PlusCircle } from 'lucide-react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useAuth } from '../../context/AuthContext';
import { getCSRFToken } from '../../utils/csrf';
import { AMENITY_OPTIONS } from '../../data/amenities';
import { useI18n } from '../../context/I18nContext';
import '../CreateListing/CreateListing.css';
import './EditListing.css';

const round6 = (value) => Number.parseFloat(value).toFixed(6);

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

const defaultForm = {
  title: '',
  description: '',
  listing_type: 'apartment',
  room_type: 'private',
  city: '',
  district: '',
  neighborhood: '',
  address: '',
  address_detail: '',
  rent_amount: '',
  available_from: '',
  total_rooms: 1,
  available_rooms: 1,
  amenities: [],
  amenity_other: '',
  house_rules: '',
  is_active: true,
};

const OTHER_AMENITY_VALUE = 'Other';

const parseAddressParts = (address) => {
  if (!address) {
    return { city: '', district: '', street: '', detail: '' };
  }
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) {
    return { city: '', district: '', street: address.trim(), detail: '' };
  }
  if (parts.length === 2) {
    return { city: parts[1] || '', district: '', street: parts[0] || '', detail: '' };
  }
  if (parts.length === 3) {
    return {
      city: parts[2] || '',
      district: parts[1] || '',
      street: parts[0] || '',
      detail: '',
    };
  }
  return {
    city: parts[parts.length - 1] || '',
    district: parts[parts.length - 2] || '',
    street: parts[0] || '',
    detail: parts.slice(1, -2).join(', '),
  };
};

function EditListing() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();

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

  const [listing, setListing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [imageFile, setImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const galleryInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [geocodeWarning, setGeocodeWarning] = useState('');
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
  const [mapCenter, setMapCenter] = useState([39.0, 35.0]);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [userMovedPin, setUserMovedPin] = useState(false);
  const [locationInitialized, setLocationInitialized] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchListing() {
      setLoading(true);
      setLoadError('');

      try {
        const response = await fetch(`/api/listings/${listingId}/`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(t('editListing.loadError', 'Unable to load this listing right now.'));
        }
        const data = await response.json();
        setListing(data);

        const parsed = parseAddressParts(data.address || '');
        const rawAmenities = normalizeAmenities(data.amenities);
        const standardAmenities = rawAmenities.filter((item) =>
          AMENITY_OPTIONS.includes(item),
        );
        const customAmenities = rawAmenities.filter(
          (item) => !AMENITY_OPTIONS.includes(item),
        );

        setForm({
          title: data.title || '',
          description: data.description || '',
          listing_type: data.listing_type || 'apartment',
          room_type: data.room_type || 'private',
          city: parsed.city,
          district: parsed.district,
          neighborhood: data.neighborhood || '',
          address: parsed.street,
          address_detail: parsed.detail,
          rent_amount: data.rent_amount ?? '',
          available_from: data.available_from || '',
          total_rooms: data.total_rooms ?? 1,
          available_rooms: data.available_rooms ?? 1,
          amenities: customAmenities.length
            ? [...standardAmenities, OTHER_AMENITY_VALUE]
            : standardAmenities,
          amenity_other: customAmenities.join(', '),
          house_rules: data.house_rules || '',
          is_active: data.is_active !== undefined ? data.is_active : true,
        });

        const lat = Number(data.latitude);
        const lng = Number(data.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setMapCenter([lat, lng]);
          setMarkerPosition({ lat: round6(lat), lng: round6(lng) });
          setUserMovedPin(true);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
          setLoadError(t('editListing.loadError', 'Unable to load this listing right now.'));
        }
      } finally {
        setLoading(false);
      }
    }

    fetchListing();

    return () => controller.abort();
  }, [listingId]);

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

  const isOwner = useMemo(
    () => Boolean(user && listing && listing.user === user.email),
    [user, listing],
  );

  const currentImage = useMemo(() => {
    if (!listing) return null;
    return (
      listing.image ||
      listing.images?.find((img) => img.is_primary)?.image_url ||
      listing.images?.[0]?.image_url ||
      null
    );
  }, [listing]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

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

  const handleStreetChange = (value) => {
    setForm((prev) => ({
      ...prev,
      address: value,
    }));
    setUserMovedPin(false);
  };

  useEffect(() => {
    if (!listing || !provinceData.length || locationInitialized) {
      return;
    }

    const selected = provinceData.find((p) => p.name === form.city);
    const districts = selected?.districts || selected?.counties || [];
    setDistrictOptions(districts);

    if (form.district) {
      const districtObj = districts.find((d) => d.name === form.district);
      fetchNeighborhoods(form.district, districtObj?.id, form.neighborhood, form.address);
    }

    setLocationInitialized(true);
  }, [
    listing,
    provinceData,
    form.city,
    form.district,
    form.neighborhood,
    form.address,
    locationInitialized,
  ]);

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
              headers: { 'User-Agent': 'KUstay/1.0 (edit listing)' },
            },
          );
          if (!response.ok) {
            continue;
          }
          const results = await response.json();
          if (Array.isArray(results) && results.length > 0) {
            const { lat, lon } = results[0];
            if (lat && lon) {
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

  const fetchNeighborhoods = async (districtName, districtId, presetName, presetStreet) => {
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
      let items = Array.isArray(data) ? data : data?.data || [];
      if (presetName && !items.some((hood) => hood.name === presetName)) {
        items = [{ id: 'custom-neighborhood', name: presetName }, ...items];
      }
      setNeighborhoodOptions(items);

      if (presetName) {
        const hoodObj =
          items.find((hood) => hood.name === presetName) ||
          items.find((hood) => hood.neighborhood === presetName);
        const hoodId = hoodObj?.id || hoodObj?._id || '';
        setSelectedNeighborhoodId(hoodId);
        if (hoodId) {
          fetchStreets(hoodId, undefined, presetStreet);
        }
      }
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

  const fetchStreets = async (neighborhoodId, query, presetStreet) => {
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
      let items = Array.isArray(data) ? data : data?.data || [];
      if (presetStreet && !items.some((street) => street.name === presetStreet)) {
        items = [{ id: 'custom-street', name: presetStreet }, ...items];
      }
      setStreetOptions(items);
      if (presetStreet) {
        setForm((prev) => ({
          ...prev,
          address: presetStreet || prev.address,
        }));
      }
    } catch (err) {
      console.error(err);
      setStreetError(t('createListing.streetLoadErrorDetail', 'Could not load streets.'));
      setStreetOptions([]);
    } finally {
      setStreetLoading(false);
    }
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

  const geocodeAddress = async ({ street, neighborhood, district, city }) => {
    try {
      const params = new URLSearchParams({
        q: [street, neighborhood, district, city, 'Türkiye'].filter(Boolean).join(', '),
        format: 'json',
        limit: '1',
        addressdetails: '0',
        countrycodes: 'tr',
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: { 'User-Agent': 'KUstay/1.0 (edit listing)' },
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
        return { lat: Number(round6(lat)), lng: Number(round6(lon)) };
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setGeocodeWarning('');

    if (!isOwner) {
      setError(t('editListing.ownerError', 'You can only edit your own listing.'));
      return;
    }

    if (!form.title.trim() || !form.description.trim() || !form.address.trim()) {
      setError(t('createListing.errorRequired', 'Title, description, and address are required.'));
      return;
    }

    if (!form.rent_amount) {
      setError(t('createListing.errorRent', 'Please add a monthly rent amount.'));
      return;
    }

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
    const amenities = combinedAmenities.reduce(
      (acc, item) => {
        const key = item.toLowerCase();
        if (!acc.seen.has(key)) {
          acc.seen.add(key);
          acc.list.push(item);
        }
        return acc;
      },
      { list: [], seen: new Set() },
    ).list;

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
    payload.append('is_active', form.is_active ? 'true' : 'false');

    if (form.available_from) {
      payload.append('available_from', form.available_from);
    }

    if (imageFile) {
      payload.append('image', imageFile);
    }
    if (galleryFiles.length) {
      galleryFiles.forEach((file) => payload.append('images', file));
    }

    const coords = await geocodeAddress({
      street: [street, addressDetail].filter(Boolean).join(' '),
      neighborhood,
      district,
      city,
    });

    const finalCoords = markerPosition || coords;
    if (finalCoords) {
      const latStr = Number(round6(finalCoords.lat)).toFixed(6);
      const lonStr = Number(round6(finalCoords.lng)).toFixed(6);
      payload.append('latitude', latStr);
      payload.append('longitude', lonStr);
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'X-CSRFToken': getCSRFToken() || '',
        },
        body: payload,
      });

      if (!response.ok) {
        let message = t(
          'editListing.errorSave',
          'Could not update listing. Please check your info and try again.',
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

      navigate(`/listings/${listingId}`);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="create-listing-page edit-listing-page">
      <div className="create-listing-shell">
        <header className="create-listing-header">
          <div>
            <p className="eyebrow">{t('editListing.eyebrow', 'Update your listing')}</p>
            <h1>{t('editListing.title', 'Edit listing')}</h1>
            <p className="lede">
              {t('editListing.lede', 'Make changes and keep your listing up to date.')}
            </p>
          </div>
          <Link to={`/listings/${listingId}`} className="ghost-button secondary">
            {t('editListing.backToListing', 'Back to listing')}
          </Link>
        </header>

        {loading ? (
          <div className="detail-loading">
            <Loader size={26} />
            <p>{t('editListing.loading', 'Loading listing...')}</p>
          </div>
        ) : loadError ? (
          <div className="detail-error">
            <p>{loadError}</p>
            <button type="button" className="ghost-button" onClick={() => navigate('/listings')}>
              {t('createListing.backToListings', 'Back to listings')}
            </button>
          </div>
        ) : !isOwner ? (
          <div className="detail-error">
            <p>{t('editListing.ownerError', 'You can only edit your own listing.')}</p>
            <Link to={`/listings/${listingId}`} className="ghost-button secondary">
              {t('editListing.backToListing', 'Back to listing')}
            </Link>
          </div>
        ) : (
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
                  {currentImage && (
                    <div className="current-image">
                      <img src={currentImage} alt="Current listing" />
                      <span>{t('editListing.currentImage', 'Current image')}</span>
                    </div>
                  )}
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
                          <span
                            key={`${file.name}-${file.size}-${file.lastModified}`}
                            className="file-chip"
                          >
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

                <div className="form-field">
                  <span>{t('editListing.statusLabel', 'Listing status')}</span>
                  <label className="checkbox-field">
                    <input
                      name="is_active"
                      type="checkbox"
                      checked={form.is_active}
                      onChange={handleChange}
                    />
                    {t('editListing.statusActive', 'Active (visible in listings)')}
                  </label>
                </div>
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
                    placeholder={t(
                      'createListing.addressDetailPlaceholder',
                      'Site name, apartment no, etc.',
                    )}
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
                onClick={() => navigate(`/listings/${listingId}`)}
                disabled={saving}
              >
                {t('createListing.cancel', 'Cancel')}
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving
                  ? t('createListing.saving', 'Saving...')
                  : t('editListing.saveChanges', 'Save changes')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function normalizeAmenities(amenities) {
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
      // fall back to comma separated parsing
    }

    return amenities
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
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
          const { lat, lng } = event.target.getLatLng();
          setMarkerPosition({ lat: round6(lat), lng: round6(lng) });
          setMapCenter([lat, lng]);
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
    if (center) {
      map.setView(center);
    }
  }, [center, map]);

  return null;
}

export default EditListing;
