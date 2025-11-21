import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  ArrowLeft,
  MessageCircle,
  AlertCircle,
  Briefcase,
  GraduationCap,
  MapPin,
  CheckCircle
} from 'lucide-react';
import './UserProfile.css';

function UserProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

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
        setError('Profile not found');
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
      setError('Something went wrong');
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
          <h2>Invalid profile</h2>
          <button onClick={() => navigate('/matches')} className="primary-button">
            Back to Matches
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
          <p>Loading profile...</p>
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
            Back to Matches
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
          <h2>Profile not found</h2>
          <button onClick={() => navigate('/matches')} className="primary-button">
            Back to Matches
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
          Back
        </button>

        {/* Header */}
        <div className="profile-header">
          <div className="header-content">
            <div className="user-avatar">
              {profile.first_name?.[0] || profile.user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="user-info">
              <h1>{profile.first_name && profile.last_name 
                ? `${profile.first_name} ${profile.last_name}` 
                : profile.user?.email || 'User'}</h1>
              <p className="user-type">
                {profile.user?.user_type === 'KU_Student' ? 'KU Student' : 'External Student'}
              </p>
              {profile.user?.user_type === 'KU_Student' && profile.user?.is_verified && (
                <span className="verification-badge verified">
                  <CheckCircle size={16} />
                  Verified KU Student
                </span>
              )}
            </div>
          </div>

          {currentUser && currentUser.id !== parseInt(userId) && (
            <button className="message-button-header" onClick={startConversation}>
              <MessageCircle size={20} />
              Send Message
            </button>
          )}
        </div>

        {/* Profile View */}
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
                <p>{profile.first_name} {profile.last_name}</p>
              </div>
              {profile.user?.user_type === 'KU_Student' && (
                <>
                  {profile.department && (
                    <div className="info-item">
                      <label>
                        <Briefcase size={16} />
                        Department
                      </label>
                      <p>{profile.department}</p>
                    </div>
                  )}
                  {profile.faculty && (
                    <div className="info-item">
                      <label>
                        <GraduationCap size={16} />
                        Faculty
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
                    Phone
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
              Housing Preferences
            </h2>
            <div className="info-grid">
              {(profile.budget_min || profile.budget_max) && (
                <div className="info-item">
                  <label>
                    <DollarSign size={16} />
                    Budget Range
                  </label>
                  <p>₺{profile.budget_min} - ₺{profile.budget_max} / month</p>
                </div>
              )}
              {profile.preferred_neighborhoods && profile.preferred_neighborhoods.length > 0 && (
                <div className="info-item">
                  <label>
                    <MapPin size={16} />
                    Preferred Neighborhoods
                  </label>
                  <p>{Array.isArray(profile.preferred_neighborhoods) 
                    ? profile.preferred_neighborhoods.join(', ') 
                    : profile.preferred_neighborhoods}</p>
                </div>
              )}
              {profile.room_type_preference && (
                <div className="info-item">
                  <label>Room Type</label>
                  <p>{profile.room_type_preference === 'private' ? 'Private Room' : 
                     profile.room_type_preference === 'shared' ? 'Shared Room' : 'Entire Place'}</p>
                </div>
              )}
              {profile.move_in_date && (
                <div className="info-item">
                  <label>
                    <Calendar size={16} />
                    Move-in Date
                  </label>
                  <p>{new Date(profile.move_in_date).toLocaleDateString()}</p>
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
              {profile.sleep_schedule && (
                <div className="info-item">
                  <label>
                    <Moon size={16} />
                    Sleep Schedule
                  </label>
                  <p>{profile.sleep_schedule === 'early_bird' ? 'Early Bird' : 
                     profile.sleep_schedule === 'night_owl' ? 'Night Owl' : 'Flexible'}</p>
                </div>
              )}
              {profile.cleanliness_level && (
                <div className="info-item">
                  <label>
                    <Sparkles size={16} />
                    Cleanliness Level
                  </label>
                  <p>{profile.cleanliness_level.charAt(0).toUpperCase() + profile.cleanliness_level.slice(1)}</p>
                </div>
              )}
              <div className="info-item">
                <label>Smoker</label>
                <p>{profile.smoker ? 'Yes' : 'No'}</p>
              </div>
              <div className="info-item">
                <label>Pets</label>
                <p>{profile.pets ? 'Yes' : 'No'}</p>
              </div>
            </div>
            {profile.lifestyle_notes && (
              <div className="info-item full-width">
                <label>Additional Notes</label>
                <p>{profile.lifestyle_notes}</p>
              </div>
            )}
          </div>

          {/* Contact Button */}
          {currentUser && currentUser.id !== parseInt(userId) && (
            <div className="contact-section">
              <button className="contact-button" onClick={startConversation}>
                <MessageCircle size={20} />
                Send Message to {profile.first_name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserProfile;