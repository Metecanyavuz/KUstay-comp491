import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
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
  MapPin,
  Building2,
  UserX
} from 'lucide-react';
import './Profile.css';

import { getCSRFToken } from '../../utils/csrf';
import LocationSelector from '../Shared/LocationSelector';
import DepartmentSelector from '../Shared/DepartmentSelector';
import MyListingsTab from './MyListingsTab';
import BlockedUsersTab from './BlockedUsersTab';


function Profile() {
  const { user, checkAuth } = useAuth();
  const { t } = useI18n();
  const locale = t('general.locale', 'en-US');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [photoError, setPhotoError] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [activeTab, setActiveTab] = useState('profile'); // profile, listings, blocked

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    departments: [],
    department_ids: [],
    budget_min: '',
    budget_max: '',
    preferred_neighborhoods: [],
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

  const getUserTypeLabel = () =>
    user?.user_type === 'KU_Student'
      ? t('profile.userTypeKu', 'KU Student')
      : t('profile.userTypeExternal', 'External Student');

  const getRoomTypeLabel = (value) => {
    if (value === 'private') {
      return t('profile.roomTypePrivate', 'Private Room');
    }
    if (value === 'shared') {
      return t('profile.roomTypeShared', 'Shared Room');
    }
    if (value === 'entire_place') {
      return t('profile.roomTypeEntire', 'Entire Place');
    }
    return value || t('general.notAvailable', 'Not available');
  };

  const getSleepScheduleLabel = (value) => {
    if (value === 'early_bird') {
      return t('profile.sleepEarlyBird', 'Early Bird');
    }
    if (value === 'night_owl') {
      return t('profile.sleepNightOwl', 'Night Owl');
    }
    return t('profile.sleepFlexible', 'Flexible');
  };

  const getCleanlinessLabel = (value) => {
    if (value === 'low') {
      return t('profile.cleanlinessLow', 'Low');
    }
    if (value === 'medium') {
      return t('profile.cleanlinessMedium', 'Medium');
    }
    if (value === 'high') {
      return t('profile.cleanlinessHigh', 'High');
    }
    return value
      ? value.charAt(0).toUpperCase() + value.slice(1)
      : t('general.notAvailable', 'Not available');
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
            alt={t('profile.photoAlt', 'Profile')}
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
    departments: data.departments || [],
    department_ids: (data.departments || []).map(d => d.id),
    budget_min: data.budget_min || '',
    budget_max: data.budget_max || '',
    preferred_neighborhoods: Array.isArray(data.preferred_neighborhoods)
      ? data.preferred_neighborhoods
      : data.preferred_neighborhoods
        ? [data.preferred_neighborhoods]
        : [],
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
        setFormData(mapProfileToForm(data));
        setPhotoFile(null);
        setPhotoPreview('');
        setPhotoError(false);
        setIsEditing(false);
      } else if (response.status === 404) {
        setError(t('profile.completeProfile', 'Please complete your profile to continue'));
        setIsEditing(true);
      } else {
        setError(t('profile.loadError', 'Failed to load profile'));
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
      setError(t('profile.completeProfile', 'Please complete your profile to continue'));
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

  const handleNeighborhoodsChange = (newNeighborhoods) => {
    setFormData(prev => ({
      ...prev,
      preferred_neighborhoods: newNeighborhoods
    }));
  };

  const handleDepartmentsChange = (newDepartments) => {
    setFormData(prev => ({
      ...prev,
      departments: newDepartments,
      department_ids: newDepartments.map(d => d.id)
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
      setError(t('profile.photoSizeError', 'Profile photo must be under 5MB.'));
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
      const dataToSend = new FormData();
      dataToSend.append('first_name', formData.first_name);
      dataToSend.append('last_name', formData.last_name);
      dataToSend.append('phone_number', formData.phone_number);
      formData.department_ids.forEach(id => {
        dataToSend.append('department_ids', id);
      });
      dataToSend.append('budget_min', formData.budget_min || 0);
      dataToSend.append('budget_max', formData.budget_max || 0);
      dataToSend.append('preferred_neighborhoods', JSON.stringify(formData.preferred_neighborhoods));
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
        setSuccessMessage(t('profile.saveSuccess', 'Profile saved successfully!'));
        setIsEditing(false);
        await checkAuth();

        setTimeout(() => {
          window.location.href = '/matches';
        }, 2000);
      } else {
        const errorData = await response.json();
        console.error('Server error:', errorData);

        if (typeof errorData.error === 'object') {
          const errorMessages = Object.entries(errorData.error)
            .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
            .join('\n');
          setError(errorMessages);
        } else {
          setError(errorData.error || t('profile.saveError', 'Failed to save profile'));
        }
      }
    } catch (err) {
      console.error('Save profile error:', err);
      setError(t('profile.genericError', 'Something went wrong. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="error-container">
          <AlertCircle size={48} />
          <h2>{t('profile.loginPrompt', 'Please login to view your profile')}</h2>
          <a href="/login" className="primary-button">{t('auth.loginButton', 'Login')}</a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>{t('profile.loading', 'Loading profile...')}</p>
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
              <p className="user-type">{getUserTypeLabel()}</p>
              {user.user_type === 'KU_Student' && (
                <>
                  {!user.is_verified && (
                    <span className="verification-badge pending">
                      <AlertCircle size={16} />
                      {t('profile.emailNotVerified', 'Email Not Verified')}
                    </span>
                  )}
                  {user.is_verified && (
                    <span className="verification-badge verified">
                      <CheckCircle size={16} />
                      {t('profile.verifiedKuStudent', 'Verified KU Student')}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {!isEditing && profile && activeTab === 'profile' && (
            <div className="header-actions">
              <button className="edit-button" onClick={() => setIsEditing(true)}>
                <Edit size={20} />
                {t('profile.editProfile', 'Edit Profile')}
              </button>
            </div>
          )}
        </div>

        {/* Tabs Navigation - 3 TAB */}
        <div className="tabs-container">
          <button 
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={20} />
            {t('profile.profileInfoTab', 'Profile Info')}
          </button>
          <button 
            className={`tab-button ${activeTab === 'listings' ? 'active' : ''}`}
            onClick={() => setActiveTab('listings')}
          >
            <Building2 size={20} />
            {t('profile.myListingsTab', 'My Listings')}
          </button>
          <button 
            className={`tab-button ${activeTab === 'blocked' ? 'active' : ''}`}
            onClick={() => setActiveTab('blocked')}
          >
            <UserX size={20} />
            {t('profile.blockedUsersTab', 'Blocked Users')}
          </button>
        </div>

        {/* Messages */}
        {error && activeTab === 'profile' && (
          <div className="error-alert">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && activeTab === 'profile' && (
          <div className="success-alert">
            <CheckCircle size={20} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <>
            {/* Profile Form/View */}
            {isEditing ? (
              <form onSubmit={handleSubmit} className="profile-form">
                {/* Personal Information */}
                <div className="form-section">
                  <h2>
                    <User size={24} />
                    {t('profile.personalInfo', 'Personal Information')}
                  </h2>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="first_name">{t('profile.firstName', 'First Name')} *</label>
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
                      <label htmlFor="last_name">{t('profile.lastName', 'Last Name')} *</label>
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
                      <label htmlFor="phone_number">{t('profile.phoneNumber', 'Phone Number')}</label>
                      <input
                        type="tel"
                        id="phone_number"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        placeholder={t('profile.phonePlaceholder', '+90 555 123 4567')}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">{t('profile.email', 'Email')}</label>
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="disabled-input"
                      />
                    </div>
                  </div>

                  <div className="photo-upload">
                    <label htmlFor="profile_photo_url">{t('profile.profilePhoto', 'Profile Photo')}</label>
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
                          {t('profile.choosePhoto', 'Choose a photo')}
                        </label>
                        <div className="divider-text">{t('profile.or', 'or')}</div>
                        <input
                          type="url"
                          id="profile_photo_url"
                          name="profile_photo_url"
                          value={formData.profile_photo_url}
                          onChange={handleChange}
                          placeholder={t('profile.photoUrlPlaceholder', 'https://example.com/photo.jpg')}
                        />
                        <small>{t('profile.photoHelp', 'Upload JPG, PNG, or WEBP (max 5MB) or paste a direct link.')}</small>
                      </div>
                    </div>
                  </div>

                  {user.user_type === 'KU_Student' && (
                    <div className="form-row">
                      <div className="form-group full-width">
                        <label>{t('profile.departments', 'Departments')}</label>
                        <DepartmentSelector
                          selectedDepartments={formData.departments}
                          onChange={handleDepartmentsChange}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Housing Preferences */}
                <div className="form-section">
                  <h2>
                    <Home size={24} />
                    {t('profile.housingPreferences', 'Housing Preferences')}
                  </h2>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="budget_min">{t('profile.budgetMin', 'Budget Min (₺/month)')} *</label>
                      <input
                        type="number"
                        id="budget_min"
                        name="budget_min"
                        value={formData.budget_min}
                        onChange={handleChange}
                        required
                        placeholder={t('profile.budgetMinPlaceholder', '3000')}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="budget_max">{t('profile.budgetMax', 'Budget Max (₺/month)')} *</label>
                      <input
                        type="number"
                        id="budget_max"
                        name="budget_max"
                        value={formData.budget_max}
                        onChange={handleChange}
                        required
                        placeholder={t('profile.budgetMaxPlaceholder', '5000')}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>{t('profile.preferredNeighborhoods', 'Preferred Neighborhoods')}</label>
                    <LocationSelector
                      selectedNeighborhoods={formData.preferred_neighborhoods}
                      onChange={handleNeighborhoodsChange}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="room_type_preference">{t('profile.roomTypePreference', 'Room Type Preference')}</label>
                      <select
                        id="room_type_preference"
                        name="room_type_preference"
                        value={formData.room_type_preference}
                        onChange={handleChange}
                      >
                        <option value="private">{t('profile.roomTypePrivate', 'Private Room')}</option>
                        <option value="shared">{t('profile.roomTypeShared', 'Shared Room')}</option>
                        <option value="entire_place">{t('profile.roomTypeEntire', 'Entire Place')}</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="move_in_date">{t('profile.moveInDate', 'Preferred Move-in Date')}</label>
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
                    {t('profile.lifestylePreferences', 'Lifestyle Preferences')}
                  </h2>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="sleep_schedule">{t('profile.sleepSchedule', 'Sleep Schedule')}</label>
                      <select
                        id="sleep_schedule"
                        name="sleep_schedule"
                        value={formData.sleep_schedule}
                        onChange={handleChange}
                      >
                        <option value="early_bird">{t('profile.sleepEarlyBird', 'Early Bird')}</option>
                        <option value="night_owl">{t('profile.sleepNightOwl', 'Night Owl')}</option>
                        <option value="flexible">{t('profile.sleepFlexible', 'Flexible')}</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="cleanliness_level">{t('profile.cleanlinessLevel', 'Cleanliness Level')}</label>
                      <select
                        id="cleanliness_level"
                        name="cleanliness_level"
                        value={formData.cleanliness_level}
                        onChange={handleChange}
                      >
                        <option value="low">{t('profile.cleanlinessLow', 'Low')}</option>
                        <option value="medium">{t('profile.cleanlinessMedium', 'Medium')}</option>
                        <option value="high">{t('profile.cleanlinessHigh', 'High')}</option>
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
                      <span>{t('profile.smokerLabel', 'I am a smoker')}</span>
                    </label>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="pets"
                        checked={formData.pets}
                        onChange={handleChange}
                      />
                      <span>{t('profile.petsLabel', 'I have pets')}</span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label htmlFor="lifestyle_notes">{t('profile.additionalNotes', 'Additional Notes')}</label>
                    <textarea
                      id="lifestyle_notes"
                      name="lifestyle_notes"
                      value={formData.lifestyle_notes}
                      onChange={handleChange}
                      rows="4"
                      placeholder={t('profile.notesPlaceholder', 'Tell potential roommates about yourself, your hobbies, preferences, etc.')}
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
                      {t('profile.cancel', 'Cancel')}
                    </button>
                  )}
                  <button type="submit" className="save-button" disabled={saving}>
                    <Save size={20} />
                    {saving ? t('profile.saving', 'Saving...') : t('profile.saveProfile', 'Save Profile')}
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
                    {t('profile.personalInfo', 'Personal Information')}
                  </h2>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>{t('profile.name', 'Name')}</label>
                      <p>{formData.first_name} {formData.last_name}</p>
                    </div>
                    <div className="info-item">
                      <label>{t('profile.email', 'Email')}</label>
                      <p>{user.email}</p>
                    </div>
                    {formData.phone_number && (
                      <div className="info-item">
                        <label>{t('profile.phone', 'Phone')}</label>
                        <p>{formData.phone_number}</p>
                      </div>
                    )}
                    {user.user_type === 'KU_Student' && (
                      <>
                        {formData.departments && formData.departments.length > 0 && (
                          <div className="info-item full-width">
                            <label>{t('profile.departments', 'Departments')}</label>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {formData.departments.map(dept => (
                                <span key={dept.id} className="department-tag">
                                  <GraduationCap size={12} />
                                  {dept.name}
                                </span>
                              ))}
                            </div>
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
                    {t('profile.housingPreferences', 'Housing Preferences')}
                  </h2>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>{t('profile.budgetRange', 'Budget Range')}</label>
                      <p>
                        ₺{formData.budget_min} - ₺{formData.budget_max} {t('currency.perMonth', '/ month')}
                      </p>
                    </div>
                    {formData.preferred_neighborhoods && formData.preferred_neighborhoods.length > 0 && (
                      <div className="info-item full-width">
                        <label>{t('profile.preferredNeighborhoods', 'Preferred Neighborhoods')}</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {Array.isArray(formData.preferred_neighborhoods) ? (
                            formData.preferred_neighborhoods.map((n, i) => (
                              <span key={i} className="location-tag">
                                <MapPin size={12} />
                                {n}
                              </span>
                            ))
                          ) : (
                            <span className="location-tag">
                              <MapPin size={12} />
                              {formData.preferred_neighborhoods}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="info-item">
                      <label>{t('profile.roomType', 'Room Type')}</label>
                      <p>{getRoomTypeLabel(formData.room_type_preference)}</p>
                    </div>
                    {formData.move_in_date && (
                      <div className="info-item">
                        <label>{t('profile.moveInDateLabel', 'Move-in Date')}</label>
                        <p>{new Date(formData.move_in_date).toLocaleDateString(locale)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lifestyle Preferences */}
                <div className="view-section">
                  <h2>
                    <Sparkles size={24} />
                    {t('profile.lifestylePreferences', 'Lifestyle Preferences')}
                  </h2>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>{t('profile.sleepSchedule', 'Sleep Schedule')}</label>
                      <p>{getSleepScheduleLabel(formData.sleep_schedule)}</p>
                    </div>
                    <div className="info-item">
                      <label>{t('profile.cleanlinessLevel', 'Cleanliness Level')}</label>
                      <p>{getCleanlinessLabel(formData.cleanliness_level)}</p>
                    </div>
                    <div className="info-item">
                      <label>{t('profile.smoker', 'Smoker')}</label>
                      <p>{formData.smoker ? t('profile.yes', 'Yes') : t('profile.no', 'No')}</p>
                    </div>
                    <div className="info-item">
                      <label>{t('profile.pets', 'Pets')}</label>
                      <p>{formData.pets ? t('profile.yes', 'Yes') : t('profile.no', 'No')}</p>
                    </div>
                  </div>
                  {formData.lifestyle_notes && (
                    <div className="info-item full-width">
                      <label>{t('profile.additionalNotes', 'Additional Notes')}</label>
                      <p>{formData.lifestyle_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* My Listings Tab */}
        {activeTab === 'listings' && (
          <MyListingsTab />
        )}

        {/* Blocked Users Tab */}
        {activeTab === 'blocked' && (
          <BlockedUsersTab />
        )}
      </div>
    </div>
  );
}

export default Profile;
