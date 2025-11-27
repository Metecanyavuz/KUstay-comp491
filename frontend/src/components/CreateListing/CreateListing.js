import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Home, MapPin, PlusCircle } from 'lucide-react';
import { getCSRFToken } from '../../utils/csrf';
import './CreateListing.css';

const defaultForm = {
  title: '',
  description: '',
  listing_type: 'apartment',
  room_type: 'private',
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

    const payload = new FormData();
    payload.append('title', form.title.trim());
    payload.append('description', form.description.trim());
    payload.append('listing_type', form.listing_type);
    payload.append('room_type', form.room_type);
    payload.append('address', form.address.trim());
    payload.append('neighborhood', form.neighborhood.trim());
    payload.append('rent_amount', form.rent_amount);
    payload.append('total_rooms', Number(form.total_rooms) || 1);
    payload.append('available_rooms', Number(form.available_rooms) || 1);
    payload.append('amenities', JSON.stringify(amenities));
    payload.append('house_rules', form.house_rules.trim());
    payload.append('is_active', 'true');

    if (form.available_from) {
      payload.append('available_from', form.available_from);
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
        const data = await response.json().catch(() => ({}));
        const message =
          data?.detail ||
          data?.error ||
          'Could not save listing. Please check your info and try again.';
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

              <label className="form-field">
                <span>Neighborhood</span>
                <input
                  name="neighborhood"
                  type="text"
                  placeholder="Area or neighborhood"
                  value={form.neighborhood}
                  onChange={handleChange}
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
