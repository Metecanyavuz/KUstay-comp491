import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  Heart, 
  MessageCircle, 
  Home, 
  Calendar,
  Moon,
  Sparkles,
  DollarSign,
  MapPin,
  AlertCircle,
  Loader
} from 'lucide-react';
import './Matches.css';

function Matches() {
  const { user } = useAuth();
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
    if (filter === 'high') return match.compatibility_score >= 80;
    if (filter === 'medium') return match.compatibility_score >= 60 && match.compatibility_score < 80;
    return true;
  });

  const startConversation = (userId) => {
    window.location.href = `/conversations/start/${userId}`;
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
            {filteredMatches.map((match) => (
              <div key={match.user.id} className="match-card">
                {/* Score Badge */}
                <div className={`score-badge ${getScoreColor(match.compatibility_score)}`}>
                  <span className="score-number">{Math.round(match.compatibility_score)}%</span>
                  <span className="score-label">{getScoreLabel(match.compatibility_score)}</span>
                </div>

                {/* User Info */}
                <div className="match-header">
                  <div className="match-avatar">
                    {match.user.first_name?.[0] || match.user.email[0].toUpperCase()}
                  </div>
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
                    {match.matching_criteria.budget_match && (
                      <div className="criterion">
                        <DollarSign size={16} />
                        <span>Similar Budget</span>
                      </div>
                    )}
                    {match.matching_criteria.sleep_schedule_match && (
                      <div className="criterion">
                        <Moon size={16} />
                        <span>Compatible Sleep Schedule</span>
                      </div>
                    )}
                    {match.matching_criteria.cleanliness_match && (
                      <div className="criterion">
                        <Sparkles size={16} />
                        <span>Same Cleanliness Level</span>
                      </div>
                    )}
                    {match.matching_criteria.neighborhood_match && (
                      <div className="criterion">
                        <MapPin size={16} />
                        <span>Preferred Neighborhoods</span>
                      </div>
                    )}
                    {match.matching_criteria.move_in_date_match && (
                      <div className="criterion">
                        <Calendar size={16} />
                        <span>Similar Move-in Date</span>
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
            ))}
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
              sleep schedule, cleanliness level, preferred neighborhoods, and move-in dates. 
              Higher scores mean better compatibility!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Matches;