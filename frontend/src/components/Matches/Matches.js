import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  Heart, 
  MessageCircle, 
  Home,
  Moon,
  Sparkles,
  DollarSign,
  MapPin,
  AlertCircle,
  Loader
} from 'lucide-react';
import './Matches.css';
import { getCSRFToken } from '../../utils/csrf';

function MatchAvatar({ user }) {
  const [imageError, setImageError] = useState(false);
  const initials = (
    user.first_name?.[0] ??
    user.last_name?.[0] ??
    user.username?.[0] ??
    user.email?.[0] ??
    '?'
  ).toUpperCase();

  const hasPhoto = user.profile_photo_url && !imageError;

  return (
    <div className={`match-avatar ${hasPhoto ? 'has-photo' : ''}`}>
      {hasPhoto ? (
        <img
          src={user.profile_photo_url}
          alt={`${user.first_name || 'User'}'s profile`}
          onError={() => setImageError(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}

const CRITERIA_CONFIG = [
  { key: 'budget', label: 'Budget Overlap', icon: DollarSign },
  { key: 'sleep_schedule', label: 'Sleep Schedule', icon: Moon },
  { key: 'cleanliness', label: 'Cleanliness Expectations', icon: Sparkles },
  { key: 'location', label: 'Preferred Neighborhoods', icon: MapPin },
  { key: 'room_type', label: 'Room Type Preference', icon: Home },
  { key: 'lifestyle', label: 'Lifestyle Fit (Smoking/Pets)', icon: Users },
];

const normalizeScore = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

const parseCriteria = (rawCriteria) => {
  if (!rawCriteria) return {};
  if (typeof rawCriteria === 'string') {
    try {
      return JSON.parse(rawCriteria);
    } catch (err) {
      console.error('Failed to parse matching criteria JSON', err);
      return {};
    }
  }
  return rawCriteria;
};

const getCommonCriteria = (matchingCriteria) => {
  const criteria = parseCriteria(matchingCriteria);
  return CRITERIA_CONFIG.flatMap((criterionConfig) => {
    const criterion = criteria[criterionConfig.key];
    if (!criterion) return [];

    const score = Number(criterion.score ?? 0);
    const weight = Number(criterion.weight ?? 0);
    const ratio = weight > 0 ? score / weight : 0;

    // Only surface items where at least ~50% of the weight is achieved.
    if (!Number.isFinite(score) || score <= 0 || ratio < 0.5) {
      return [];
    }

    return [
      {
        ...criterionConfig,
        reason: criterion.reason || '',
      },
    ];
  });
};

function Matches() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'high', 'medium'

  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user]);

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/matches/top/', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setMatches(data.results || []);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to load matches');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Fetch matches error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    return 'Potential Match';
  };

  const filteredMatches = matches.filter((match) => {
    const score = normalizeScore(match.compatibility_score);
    if (filter === 'high') return score >= 80;
    if (filter === 'medium') return score >= 60 && score < 80;
    return true;
  });

  const startConversation = async (userId) => {
    try {
      const csrfToken = getCSRFToken();
      const response = await fetch('/api/conversations/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        body: JSON.stringify({ partner_id: userId }),
      });

      if (!response.ok) {
        throw new Error('Unable to start conversation. Please try again.');
      }

      const data = await response.json();
      const conversationId = data.conversation_id || data.id;
      if (conversationId) {
        navigate(`/conversations?open=${conversationId}`);
      } else {
        navigate('/conversations');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to start conversation.');
    }
  };

  if (!user) {
    return (
      <div className="matches-page">
        <div className="error-container">
          <AlertCircle size={48} />
          <h2>Please login to view matches</h2>
          <a href="/login" className="primary-button">Login</a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="matches-page">
        <div className="loading-container">
          <Loader className="spinner" size={48} />
          <p>Finding your perfect matches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="matches-page">
        <div className="error-container">
          <AlertCircle size={48} />
          <h2>{error}</h2>
          {error.toLowerCase().includes('profile') && (
            <>
              <p>Complete your profile to see compatible roommates</p>
              <a href="/profile" className="primary-button">Complete Profile</a>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="matches-page">
      <div className="matches-container">
        {/* Header */}
        <div className="matches-header">
          <div className="header-content">
            <div className="header-icon">
              <Heart size={32} />
            </div>
            <div className="header-text">
              <h1>Your Matches</h1>
              <p>Found {matches.length} compatible roommates based on your preferences</p>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Matches ({matches.length})
            </button>
            <button
              className={`filter-btn ${filter === 'high' ? 'active' : ''}`}
              onClick={() => setFilter('high')}
            >
              Excellent (80%+)
            </button>
            <button
              className={`filter-btn ${filter === 'medium' ? 'active' : ''}`}
              onClick={() => setFilter('medium')}
            >
              Good (60-79%)
            </button>
          </div>
        </div>

        {/* No Matches */}
        {filteredMatches.length === 0 ? (
          <div className="no-matches">
            <Users size={64} />
            <h2>No matches found</h2>
            <p>Try adjusting your preferences or check back later</p>
            <a href="/profile" className="secondary-button">Update Preferences</a>
          </div>
        ) : (
          /* Matches Grid */
          <div className="matches-grid">
            {filteredMatches.map((match) => {
              const displayScore = normalizeScore(match.compatibility_score);
              const commonCriteria = getCommonCriteria(match.matching_criteria);

              return (
                <div key={match.user.id} className="match-card">
                {/* Score Badge */}
                <div className={`score-badge ${getScoreColor(displayScore)}`}>
                  <span className="score-number">{displayScore}%</span>
                  <span className="score-label">{getScoreLabel(displayScore)}</span>
                </div>

                {/* User Info */}
                <div className="match-header">
                  <MatchAvatar user={match.user} />
                  <div className="match-info">
                    <h3>{match.user.first_name} {match.user.last_name}</h3>
                    <p className="match-department">
                      {match.user.department && match.user.faculty 
                        ? `${match.user.department}, ${match.user.faculty}`
                        : match.user.department || match.user.faculty || 'Student'}
                    </p>
                  </div>
                </div>

                {/* Matching Criteria */}
                <div className="match-criteria">
                  <h4>
                    <Sparkles size={16} />
                    What You Have in Common
                  </h4>
                  <div className="criteria-list">
                    {commonCriteria.length > 0 ? (
                      commonCriteria.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div className="criterion" key={item.key}>
                            <Icon size={16} />
                            <div className="criterion-text">
                              <span className="criterion-title">{item.label}</span>
                              {item.reason && (
                                <p className="criterion-reason">{item.reason}</p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="criterion empty-criteria">
                        <AlertCircle size={16} />
                        <span>We need more profile info to show common ground.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="match-actions">
                  <button
                    className="message-button"
                    onClick={() => startConversation(match.user.id)}
                  >
                    <MessageCircle size={18} />
                    <span>Send Message</span>
                  </button>
                  <a href={`/profile/${match.user.id}`} className="view-profile-button">
                    View Profile
                  </a>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Info Box */}
        <div className="info-box">
          <div className="info-icon">
            <Heart size={24} />
          </div>
          <div className="info-content">
            <h3>How Matching Works</h3>
            <p>
              We calculate compatibility based on your preferences including budget, 
              sleep schedule, cleanliness level, preferred neighborhoods, room type, and lifestyle fit. 
              Higher scores mean better compatibility!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Matches;
