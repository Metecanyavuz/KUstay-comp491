import { useState, useEffect } from 'react';
import { Home, MessageCircle, Search, Shield, Users } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import './HomePage.css';

function HomePage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useI18n();

  const [stats, setStats] = useState({
    active_listings: '500+',
    students: '1000+',
    match_rate: '95%'
  });

  useEffect(() => {
    // Fetch listings
    fetch('/api/listings/?limit=6', { credentials: 'include' })
      .then((response) => response.json())
      .then((data) => {
        setListings(data.slice(0, 6));
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });

    // Fetch stats
    fetch('/api/home/stats/')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setStats(data);
        }
      })
      .catch(err => console.error("Failed to load stats:", err));

  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/listings?location=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">{t('home.heroTitle', 'Find Your Perfect Roommate')}</h1>
          <p className="hero-subtitle">
            {t(
              'home.heroSubtitle',
              'Connect with compatible roommates and discover your ideal living space near campus',
            )}
          </p>

          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder={t('home.searchPlaceholder', 'Search by location, neighborhood...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <button type="submit" className="search-button">
              {t('home.searchButton', 'Search')}
            </button>
          </form>

          <div className="hero-stats">
            <div className="stat">
              <div className="stat-number">{stats.active_listings}</div>
              <div className="stat-label">{t('home.statsActive', 'Active Listings')}</div>
            </div>
            <div className="stat">
              <div className="stat-number">{stats.students}</div>
              <div className="stat-label">{t('home.statsStudents', 'Students')}</div>
            </div>
            <div className="stat">
              <div className="stat-number">{stats.match_rate}</div>
              <div className="stat-label">{t('home.statsMatch', 'Match Rate')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="featured-listings">
        <div className="section-header">
          <h2>{t('home.featuredTitle', 'Featured Listings')}</h2>
          <a href="/listings" className="view-all">{t('home.viewAll', 'View All →')}</a>
        </div>

        {loading ? (
          <div className="loading">{t('home.loading', 'Loading listings...')}</div>
        ) : (
          <div className="listings-grid">
            {listings.map((listing) => (
              <div key={listing.listing_id} className="listing-card">
                <div className="listing-image">
                  {listing.image ? (
                    <img src={listing.image} alt={listing.title} />
                  ) : (
                    <div className="listing-image-placeholder">
                      <Home size={40} />
                    </div>
                  )}
                  <span className="listing-type-badge">{listing.listing_type}</span>
                </div>
                <div className="listing-content">
                  <h3 className="listing-title">{listing.title}</h3>
                  <p className="listing-location">
                    {listing.neighborhood || listing.address}
                  </p>
                  <div className="listing-details">
                    <span className="listing-rooms">
                      {listing.available_rooms} {t('home.roomsAvailable', 'rooms available')}
                    </span>
                    <span className="listing-price">
                      {listing.rent_amount} {t('home.pricePerMonth', '₺/month')}
                    </span>
                  </div>
                  <a href={`/listings/${listing.listing_id}`} className="listing-link">
                    {t('home.viewDetails', 'View Details →')}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2>{t('home.howItWorks', 'How KUstay Works')}</h2>
        <div className="steps-grid">
          <div className="step">
            <div className="step-icon">
              <Users size={32} />
            </div>
            <h3>{t('home.stepCreateProfile', 'Create Your Profile')}</h3>
            <p>{t('home.stepCreateProfileDesc', "Tell us about your preferences, lifestyle, and what you're looking for in a roommate")}</p>
          </div>
          <div className="step">
            <div className="step-icon">
              <Search size={32} />
            </div>
            <h3>{t('home.stepBrowse', 'Browse & Match')}</h3>
            <p>{t('home.stepBrowseDesc', 'Explore listings and find compatible roommates based on your preferences')}</p>
          </div>
          <div className="step">
            <div className="step-icon">
              <MessageCircle size={32} />
            </div>
            <h3>{t('home.stepChat', 'Connect & Chat')}</h3>
            <p>{t('home.stepChatDesc', 'Message potential roommates and schedule viewings')}</p>
          </div>
          <div className="step">
            <div className="step-icon">
              <Home size={32} />
            </div>
            <h3>{t('home.stepMove', 'Move In')}</h3>
            <p>{t('home.stepMoveDesc', 'Find your perfect match and start your new living experience')}</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <h2>{t('home.whyChoose', 'Why Choose KUstay?')}</h2>
        <div className="features-grid">
          <div className="feature">
            <Shield className="feature-icon" size={24} />
            <h3>{t('home.featureVerified', 'Verified Students')}</h3>
            <p>{t('home.featureVerifiedDesc', 'All users are verified KU students for your safety')}</p>
          </div>
          <div className="feature">
            <Users className="feature-icon" size={24} />
            <h3>{t('home.featureMatching', 'Smart Matching')}</h3>
            <p>{t('home.featureMatchingDesc', 'Our algorithm finds compatible roommates based on your lifestyle')}</p>
          </div>
          <div className="feature">
            <MessageCircle className="feature-icon" size={24} />
            <h3>{t('home.featureCommunication', 'Easy Communication')}</h3>
            <p>{t('home.featureCommunicationDesc', 'Built-in messaging to connect with potential roommates')}</p>
          </div>
          <div className="feature">
            <Home className="feature-icon" size={24} />
            <h3>{t('home.featureListings', 'Quality Listings')}</h3>
            <p>{t('home.featureListingsDesc', 'Curated housing options near campus')}</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-content">
          <h2>{t('home.ready', 'Ready to Find Your Perfect Place?')}</h2>
          <p>{t('home.join', "Join thousands of students who've found their ideal roommates")}</p>
          <div className="cta-buttons">
            <a href="/signup" className="cta-button primary">{t('home.ctaPrimary', 'Get Started')}</a>
            <a href="/listings" className="cta-button secondary">{t('home.ctaSecondary', 'Browse Listings')}</a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
