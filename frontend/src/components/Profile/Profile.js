import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  DollarSign,
  Home,
  Moon,
  Sparkles,
  Edit,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Briefcase,
  GraduationCap,
  MapPin
} from 'lucide-react';
import './Profile.css';

import { getCSRFToken } from '../../utils/csrf';

function Profile() {
  const { user, checkAuth } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [photoError, setPhotoError] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    department: '',
    faculty: '',
    budget_min: '',
    budget_max: '',
    preferred_neighborhoods: '',
    move_in_date: '',
    smoker: false,
    pets: false,
    sleep_schedule: 'flexible',
    cleanliness_level: 'medium',
    room_type_preference: 'private',
    lifestyle_notes: '',
    profile_photo_url: '',
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    setPhotoError(false);
  }, [formData.profile_photo_url, photoPreview]);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const getInitials = () => {
    const firstInitial = formData.first_name?.[0] || '';
    const lastInitial = formData.last_name?.[0] || '';
    const initials = `${firstInitial}${lastInitial}`.trim();
    return initials || user.email[0].toUpperCase();
  };

  const renderAvatar = () => {
    const hasPreview = !!photoPreview;
    const hasPhotoUrl = formData.profile_photo_url && !photoError;
    const hasPhoto = hasPreview || hasPhotoUrl;
    const imageSrc = hasPreview ? photoPreview : hasPhotoUrl ? formData.profile_photo_url : '';

    return (
      <div className={`user-avatar ${hasPhoto ? 'has-photo' : ''}`}>
        {hasPhoto ? (
          <img
            src={imageSrc}
            alt="Profile"
            onError={() => {
              if (!hasPreview) {
                setPhotoError(true);
              }
            }}
          />
        ) : (
          getInitials()
        )}
      </div>
    );
  };

  const mapProfileToForm = (data = {}) => ({
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    phone_number: data.phone_number || '',
    department: data.department || '',
    faculty: data.faculty || '',
    budget_min: data.budget_min || '',
    budget_max: data.budget_max || '',
    preferred_neighborhoods: Array.isArray(data.preferred_neighborhoods)
      ? data.preferred_neighborhoods.join(', ')
      : '',
    move_in_date: data.move_in_date || '',
    smoker: data.smoker || false,
    pets: data.pets || false,
    sleep_schedule: data.sleep_schedule || 'flexible',
    cleanliness_level: data.cleanliness_level || 'medium',
    room_type_preference: data.room_type_preference || 'private',
    lifestyle_notes: data.lifestyle_notes || '',
    profile_photo_url: data.profile_photo_url || '',
  });

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile/', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        
        // Set form data with fetched profile
        setFormData(mapProfileToForm(data));
        setPhotoFile(null);
        setPhotoPreview('');
        setPhotoError(false);
        
        setIsEditing(false);
      } else if (response.status === 404) {
        // Profile doesn't exist yet, show form
        setError('Please complete your profile to continue');
        setIsEditing(true);
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
      setError('Please complete your profile to continue');
      setIsEditing(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoFile(null);
      setPhotoPreview('');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Profile photo must be under 5MB.');
      return;
    }

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(file);
    setPhotoError(false);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage('');
  
    try {
      // Parse preferred_neighborhoods from comma-separated string to array
      const neighborhoods = formData.preferred_neighborhoods
        .split(',')
        .map(n => n.trim())
        .filter(n => n);

      const dataToSend = new FormData();
      dataToSend.append('first_name', formData.first_name);
      dataToSend.append('last_name', formData.last_name);
      dataToSend.append('phone_number', formData.phone_number);
      dataToSend.append('department', formData.department);
      dataToSend.append('faculty', formData.faculty);
      dataToSend.append('budget_min', formData.budget_min || 0);
      dataToSend.append('budget_max', formData.budget_max || 0);
      dataToSend.append('preferred_neighborhoods', JSON.stringify(neighborhoods));
      dataToSend.append('move_in_date', formData.move_in_date || '');
      dataToSend.append('smoker', formData.smoker);
      dataToSend.append('pets', formData.pets);
      dataToSend.append('sleep_schedule', formData.sleep_schedule);
      dataToSend.append('cleanliness_level', formData.cleanliness_level);
      dataToSend.append('room_type_preference', formData.room_type_preference);
      dataToSend.append('lifestyle_notes', formData.lifestyle_notes);
      dataToSend.append('profile_photo_url', formData.profile_photo_url);
      if (photoFile) {
        dataToSend.set('profile_photo', photoFile);
      }
  
      const response = await fetch('/api/profile/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCSRFToken() || '',
        },
        credentials: 'include',
        body: dataToSend,
      });
  
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData(mapProfileToForm(data));
        setPhotoFile(null);
        setPhotoPreview('');
        setPhotoError(false);
        setSuccessMessage('Profile saved successfully!');
        setIsEditing(false);
        await checkAuth();
        
        setTimeout(() => {
          window.location.href = '/matches';
        }, 2000);
      } else {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        
        // Format error message nicely
        if (typeof errorData.error === 'object') {
          const errorMessages = Object.entries(errorData.error)
            .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
            .join('\n');
          setError(errorMessages);
        } else {
          setError(errorData.error || 'Failed to save profile');
        }
      }
    } catch (err) {
      console.error('Save profile error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="error-container">
          <AlertCircle size={48} />
          <h2>Please login to view your profile</h2>
          <a href="/login" className="primary-button">Login</a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <div className="header-content">
            {renderAvatar()}
            <div className="user-info">
              <h1>{formData.first_name && formData.last_name 
                ? `${formData.first_name} ${formData.last_name}` 
                : user.email}</h1>
              <p className="user-type">{user.user_type === 'KU_Student' ? 'KU Student' : 'External Student'}</p>
              {user.user_type === 'KU_Student' && (
                <>
                  {!user.is_verified && (
                    <span className="verification-badge pending">
                      <AlertCircle size={16} />
                      Email Not Verified
                    </span>
                  )}
                  {user.is_verified && (
                    <span className="verification-badge verified">
                      <CheckCircle size={16} />
                      Verified KU Student
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {!isEditing && profile && (
            <button className="edit-button" onClick={() => setIsEditing(true)}>
              <Edit size={20} />
              Edit Profile
            </button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="error-alert">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="success-alert">
            <CheckCircle size={20} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Profile Form/View */}
        {isEditing ? (
          <form onSubmit={handleSubmit} className="profile-form">
            {/* Personal Information */}
            <div className="form-section">
              <h2>
                <User size={24} />
                Personal Information
              </h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="first_name">First Name *</label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="last_name">Last Name *</label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone_number">Phone Number</label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="+90 555 123 4567"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="disabled-input"
                  />
                </div>
              </div>

              <div className="photo-upload">
                <label htmlFor="profile_photo_url">Profile Photo</label>
                <div className="photo-input">
                  <div className="photo-preview">
                    {renderAvatar()}
                  </div>
                  <div className="photo-fields">
                    <label className="file-input-label">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                      Choose a photo
                    </label>
                    <div className="divider-text">or</div>
                    <input
                      type="url"
                      id="profile_photo_url"
                      name="profile_photo_url"
                      value={formData.profile_photo_url}
                      onChange={handleChange}
                      placeholder="https://example.com/photo.jpg"
                    />
                    <small>Upload JPG, PNG, or WEBP (max 5MB) or paste a direct link.</small>
                  </div>
                </div>
              </div>

              {user.user_type === 'KU_Student' && (
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="department">Department</label>
                    <input
                      type="text"
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="Computer Engineering"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="faculty">Faculty</label>
                    <input
                      type="text"
                      id="faculty"
                      name="faculty"
                      value={formData.faculty}
                      onChange={handleChange}
                      placeholder="Engineering"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Housing Preferences */}
            <div className="form-section">
              <h2>
                <Home size={24} />
                Housing Preferences
              </h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="budget_min">Budget Min (₺/month) *</label>
                  <input
                    type="number"
                    id="budget_min"
                    name="budget_min"
                    value={formData.budget_min}
                    onChange={handleChange}
                    required
                    placeholder="3000"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="budget_max">Budget Max (₺/month) *</label>
                  <input
                    type="number"
                    id="budget_max"
                    name="budget_max"
                    value={formData.budget_max}
                    onChange={handleChange}
                    required
                    placeholder="5000"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="preferred_neighborhoods">Preferred Neighborhoods</label>
                <input
                  type="text"
                  id="preferred_neighborhoods"
                  name="preferred_neighborhoods"
                  value={formData.preferred_neighborhoods}
                  onChange={handleChange}
                  placeholder="Etiler, Zekeriyaköy, Bebek (comma separated)"
                />
                <small>Enter neighborhoods separated by commas</small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="room_type_preference">Room Type Preference</label>
                  <select
                    id="room_type_preference"
                    name="room_type_preference"
                    value={formData.room_type_preference}
                    onChange={handleChange}
                  >
                    <option value="private">Private Room</option>
                    <option value="shared">Shared Room</option>
                    <option value="entire_place">Entire Place</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="move_in_date">Preferred Move-in Date</label>
                  <input
                    type="date"
                    id="move_in_date"
                    name="move_in_date"
                    value={formData.move_in_date}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Lifestyle Preferences */}
            <div className="form-section">
              <h2>
                <Sparkles size={24} />
                Lifestyle Preferences
              </h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sleep_schedule">Sleep Schedule</label>
                  <select
                    id="sleep_schedule"
                    name="sleep_schedule"
                    value={formData.sleep_schedule}
                    onChange={handleChange}
                  >
                    <option value="early_bird">Early Bird</option>
                    <option value="night_owl">Night Owl</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="cleanliness_level">Cleanliness Level</label>
                  <select
                    id="cleanliness_level"
                    name="cleanliness_level"
                    value={formData.cleanliness_level}
                    onChange={handleChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="smoker"
                    checked={formData.smoker}
                    onChange={handleChange}
                  />
                  <span>I am a smoker</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="pets"
                    checked={formData.pets}
                    onChange={handleChange}
                  />
                  <span>I have pets</span>
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="lifestyle_notes">Additional Notes</label>
                <textarea
                  id="lifestyle_notes"
                  name="lifestyle_notes"
                  value={formData.lifestyle_notes}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Tell potential roommates about yourself, your hobbies, preferences, etc."
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              {profile && (
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setIsEditing(false);
                    if (profile) {
                      setFormData(mapProfileToForm(profile));
                      setPhotoFile(null);
                      setPhotoPreview('');
                      setPhotoError(false);
                    }
                  }}
                >
                  <X size={20} />
                  Cancel
                </button>
              )}
              <button type="submit" className="save-button" disabled={saving}>
                <Save size={20} />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        ) : (
          // Profile View (when not editing)
          <div className="profile-view">
            {/* Personal Information */}
            <div className="view-section">
              <h2>
                <User size={24} />
                Personal Information
              </h2>
              <div className="info-grid">
                <div className="info-item">
                  <label>Name</label>
                  <p>{formData.first_name} {formData.last_name}</p>
                </div>
                <div className="info-item">
                  <label>Email</label>
                  <p>{user.email}</p>
                </div>
                {formData.phone_number && (
                  <div className="info-item">
                    <label>Phone</label>
                    <p>{formData.phone_number}</p>
                  </div>
                )}
                {user.user_type === 'KU_Student' && (
                  <>
                    {formData.department && (
                      <div className="info-item">
                        <label>Department</label>
                        <p>{formData.department}</p>
                      </div>
                    )}
                    {formData.faculty && (
                      <div className="info-item">
                        <label>Faculty</label>
                        <p>{formData.faculty}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Housing Preferences */}
            <div className="view-section">
              <h2>
                <Home size={24} />
                Housing Preferences
              </h2>
              <div className="info-grid">
                <div className="info-item">
                  <label>Budget Range</label>
                  <p>₺{formData.budget_min} - ₺{formData.budget_max} / month</p>
                </div>
                {formData.preferred_neighborhoods && (
                  <div className="info-item">
                    <label>Preferred Neighborhoods</label>
                    <p>{formData.preferred_neighborhoods}</p>
                  </div>
                )}
                <div className="info-item">
                  <label>Room Type</label>
                  <p>{formData.room_type_preference === 'private' ? 'Private Room' : 
                     formData.room_type_preference === 'shared' ? 'Shared Room' : 'Entire Place'}</p>
                </div>
                {formData.move_in_date && (
                  <div className="info-item">
                    <label>Move-in Date</label>
                    <p>{new Date(formData.move_in_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Lifestyle Preferences */}
            <div className="view-section">
              <h2>
                <Sparkles size={24} />
                Lifestyle Preferences
              </h2>
              <div className="info-grid">
                <div className="info-item">
                  <label>Sleep Schedule</label>
                  <p>{formData.sleep_schedule === 'early_bird' ? 'Early Bird' : 
                     formData.sleep_schedule === 'night_owl' ? 'Night Owl' : 'Flexible'}</p>
                </div>
                <div className="info-item">
                  <label>Cleanliness Level</label>
                  <p>{formData.cleanliness_level.charAt(0).toUpperCase() + formData.cleanliness_level.slice(1)}</p>
                </div>
                <div className="info-item">
                  <label>Smoker</label>
                  <p>{formData.smoker ? 'Yes' : 'No'}</p>
                </div>
                <div className="info-item">
                  <label>Pets</label>
                  <p>{formData.pets ? 'Yes' : 'No'}</p>
                </div>
              </div>
              {formData.lifestyle_notes && (
                <div className="info-item full-width">
                  <label>Additional Notes</label>
                  <p>{formData.lifestyle_notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
