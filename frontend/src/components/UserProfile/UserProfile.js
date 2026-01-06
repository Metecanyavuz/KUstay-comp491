import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import {
  User,
  Phone,
  Calendar,
  DollarSign,
  Home,
  Moon,
  Sparkles,
  ArrowLeft,
  MessageCircle,
  AlertCircle,
  Briefcase,
  GraduationCap,
  MapPin,
  CheckCircle,
  Flag
} from 'lucide-react';
import './UserProfile.css';
import UserActionsMenu from '../Shared/UserActionsMenu';  // YENİ IMPORT

function UserProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const { t } = useI18n();
  const locale = t('general.locale', 'en-US');
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  useEffect(() => {
    setPhotoError(false);
  }, [profile?.profile_photo_url]);

  const getInitials = () => {
    if (!profile) return 'U';
    const firstInitial = profile.first_name?.[0] || '';
    const lastInitial = profile.last_name?.[0] || '';
    const initials = `${firstInitial}${lastInitial}`.trim();
    return initials || profile.user?.email?.[0]?.toUpperCase() || 'U';
  };

  const renderAvatar = () => {
    const hasPhoto = profile?.profile_photo_url && !photoError;
    const fallbackName = t('userProfile.userFallback', 'User');

    return (
      <div className={`user-avatar ${hasPhoto ? 'has-photo' : ''}`}>
        {hasPhoto ? (
          <img
            src={profile.profile_photo_url}
            alt={t('userProfile.photoAlt', `${profile.first_name || fallbackName}'s profile`)}
            onError={() => setPhotoError(true)}
          />
        ) : (
          getInitials()
        )}
      </div>
    );
  };

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`/api/profile/${userId}/`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else if (response.status === 404) {
        setError(t('userProfile.notFound', 'Profile not found'));
      } else {
        setError(t('userProfile.loadError', 'Failed to load profile'));
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
      setError(t('userProfile.genericError', 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  const startConversation = () => {
    if (currentUser) {
      window.location.href = `/conversations/start/${userId}`;
    } else {
      navigate('/login');
    }
  };

  if (!userId) {
    return (
      <div className="profile-page">
        <div className="error-container">
          <AlertCircle size={48} />
          <h2>{t('userProfile.invalid', 'Invalid profile')}</h2>
          <button onClick={() => navigate('/matches')} className="primary-button">
            {t('userProfile.backToMatches', 'Back to Matches')}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>{t('userProfile.loading', 'Loading profile...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="error-container">
          <AlertCircle size={48} />
          <h2>{error}</h2>
          <button onClick={() => navigate('/matches')} className="primary-button">
            {t('userProfile.backToMatches', 'Back to Matches')}
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="error-container">
          <AlertCircle size={48} />
          <h2>{t('userProfile.notFound', 'Profile not found')}</h2>
          <button onClick={() => navigate('/matches')} className="primary-button">
            {t('userProfile.backToMatches', 'Back to Matches')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Back Button */}
        <button 
          className="back-button" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} />
          {t('userProfile.back', 'Back')}
        </button>

        {/* Header */}
        <div className="profile-header">
          <div className="header-content">
            {renderAvatar()}
            <div className="user-info">
              <h1>{profile.first_name && profile.last_name 
                ? `${profile.first_name} ${profile.last_name}` 
                : profile.user?.email || t('userProfile.userFallback', 'User')}</h1>
              <p className="user-type">
                {profile.user?.user_type === 'KU_Student'
                  ? t('profile.userTypeKu', 'KU Student')
                  : t('profile.userTypeExternal', 'External Student')}
              </p>
              {profile.user?.user_type === 'KU_Student' && profile.user?.is_verified && (
                <span className="verification-badge verified">
                  <CheckCircle size={16} />
                  {t('profile.verifiedKuStudent', 'Verified KU Student')}
                </span>
              )}
            </div>
          </div>

          {/* GÜNCELLEME: Eski butonlar yerine UserActionsMenu ve Message butonu */}
          {currentUser && currentUser.id !== parseInt(userId) && (
            <div className="user-actions">
              <button className="message-button-header" onClick={startConversation}>
                <MessageCircle size={20} />
                {t('userProfile.sendMessage', 'Send Message')}
              </button>
              
              {/* ÜÇ NOKTA MENÜSÜ - BURAYA EKLENDİ */}
                <UserActionsMenu 
                  userId={parseInt(userId)}
                  username={profile.first_name || profile.user?.email || t('userProfile.userFallback', 'User')}
                  reportType="user"
                onBlockChange={(isBlocked) => {
                  if (isBlocked) {
                    navigate('/matches');
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Profile View */}
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
                <p>{profile.first_name} {profile.last_name}</p>
              </div>
              {profile.user?.user_type === 'KU_Student' && (
                <>
                  {profile.department && (
                    <div className="info-item">
                      <label>
                        <Briefcase size={16} />
                        {t('userProfile.department', 'Department')}
                      </label>
                      <p>{profile.department}</p>
                    </div>
                  )}
                  {profile.faculty && (
                    <div className="info-item">
                      <label>
                        <GraduationCap size={16} />
                        {t('userProfile.faculty', 'Faculty')}
                      </label>
                      <p>{profile.faculty}</p>
                    </div>
                  )}
                </>
              )}
              {profile.phone_number && (
                <div className="info-item">
                  <label>
                    <Phone size={16} />
                    {t('profile.phone', 'Phone')}
                  </label>
                  <p>{profile.phone_number}</p>
                </div>
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
              {(profile.budget_min || profile.budget_max) && (
                <div className="info-item">
                  <label>
                    <DollarSign size={16} />
                    {t('profile.budgetRange', 'Budget Range')}
                  </label>
                  <p>₺{profile.budget_min} - ₺{profile.budget_max} {t('currency.perMonth', '/ month')}</p>
                </div>
              )}
              {profile.preferred_neighborhoods && profile.preferred_neighborhoods.length > 0 && (
                <div className="info-item">
                  <label>
                    <MapPin size={16} />
                    {t('profile.preferredNeighborhoods', 'Preferred Neighborhoods')}
                  </label>
                  <p>{Array.isArray(profile.preferred_neighborhoods) 
                    ? profile.preferred_neighborhoods.join(', ') 
                    : profile.preferred_neighborhoods}</p>
                </div>
              )}
              {profile.room_type_preference && (
                <div className="info-item">
                  <label>{t('profile.roomType', 'Room Type')}</label>
                  <p>{profile.room_type_preference === 'private'
                    ? t('profile.roomTypePrivate', 'Private Room')
                    : profile.room_type_preference === 'shared'
                      ? t('profile.roomTypeShared', 'Shared Room')
                      : t('profile.roomTypeEntire', 'Entire Place')}</p>
                </div>
              )}
              {profile.move_in_date && (
                <div className="info-item">
                  <label>
                    <Calendar size={16} />
                    {t('profile.moveInDateLabel', 'Move-in Date')}
                  </label>
                  <p>{new Date(profile.move_in_date).toLocaleDateString(locale)}</p>
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
              {profile.sleep_schedule && (
                <div className="info-item">
                  <label>
                    <Moon size={16} />
                    {t('profile.sleepSchedule', 'Sleep Schedule')}
                  </label>
                  <p>{profile.sleep_schedule === 'early_bird'
                    ? t('profile.sleepEarlyBird', 'Early Bird')
                    : profile.sleep_schedule === 'night_owl'
                      ? t('profile.sleepNightOwl', 'Night Owl')
                      : t('profile.sleepFlexible', 'Flexible')}</p>
                </div>
              )}
              {profile.cleanliness_level && (
                <div className="info-item">
                  <label>
                    <Sparkles size={16} />
                    {t('profile.cleanlinessLevel', 'Cleanliness Level')}
                  </label>
                  <p>{profile.cleanliness_level === 'low'
                    ? t('profile.cleanlinessLow', 'Low')
                    : profile.cleanliness_level === 'medium'
                      ? t('profile.cleanlinessMedium', 'Medium')
                      : profile.cleanliness_level === 'high'
                        ? t('profile.cleanlinessHigh', 'High')
                        : profile.cleanliness_level}</p>
                </div>
              )}
              <div className="info-item">
                <label>{t('profile.smoker', 'Smoker')}</label>
                <p>{profile.smoker ? t('profile.yes', 'Yes') : t('profile.no', 'No')}</p>
              </div>
              <div className="info-item">
                <label>{t('profile.pets', 'Pets')}</label>
                <p>{profile.pets ? t('profile.yes', 'Yes') : t('profile.no', 'No')}</p>
              </div>
            </div>
            {profile.lifestyle_notes && (
              <div className="info-item full-width">
                <label>{t('profile.additionalNotes', 'Additional Notes')}</label>
                <p>{profile.lifestyle_notes}</p>
              </div>
            )}
          </div>

          {/* Contact Button */}
          {currentUser && currentUser.id !== parseInt(userId) && (
            <div className="contact-section">
              <button className="contact-button" onClick={startConversation}>
                <MessageCircle size={20} />
                {t('userProfile.sendMessageTo', 'Send Message to')} {profile.first_name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
