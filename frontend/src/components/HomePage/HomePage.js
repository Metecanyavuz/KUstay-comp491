import { useState, useEffect } from 'react';
import { Search, Home, Users, MessageCircle, Shield } from 'lucide-react';
import './HomePage.css';

function HomePage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
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
          <h1 className="hero-title">Find Your Perfect Roommate</h1>
          <p className="hero-subtitle">
            Connect with compatible roommates and discover your ideal living space near campus
          </p>
          
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search by location, neighborhood..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <button type="submit" className="search-button">
              Search
            </button>
          </form>

          <div className="hero-stats">
            <div className="stat">
              <div className="stat-number">500+</div>
              <div className="stat-label">Active Listings</div>
            </div>
            <div className="stat">
              <div className="stat-number">1000+</div>
              <div className="stat-label">Students</div>
            </div>
            <div className="stat">
              <div className="stat-number">95%</div>
              <div className="stat-label">Match Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="featured-listings">
        <div className="section-header">
          <h2>Featured Listings</h2>
          <a href="/listings" className="view-all">View All →</a>
        </div>

        {loading ? (
          <div className="loading">Loading listings...</div>
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
                    <span className="listing-rooms">{listing.available_rooms} rooms available</span>
                    <span className="listing-price">{listing.rent_amount} ₺/month</span>
                  </div>
                  <a href={`/listings/${listing.listing_id}`} className="listing-link">
                    View Details →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2>How KUstay Works</h2>
        <div className="steps-grid">
          <div className="step">
            <div className="step-icon">
              <Users size={32} />
            </div>
            <h3>Create Your Profile</h3>
            <p>Tell us about your preferences, lifestyle, and what you're looking for in a roommate</p>
          </div>
          <div className="step">
            <div className="step-icon">
              <Search size={32} />
            </div>
            <h3>Browse & Match</h3>
            <p>Explore listings and find compatible roommates based on your preferences</p>
          </div>
          <div className="step">
            <div className="step-icon">
              <MessageCircle size={32} />
            </div>
            <h3>Connect & Chat</h3>
            <p>Message potential roommates and schedule viewings</p>
          </div>
          <div className="step">
            <div className="step-icon">
              <Home size={32} />
            </div>
            <h3>Move In</h3>
            <p>Find your perfect match and start your new living experience</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <h2>Why Choose KUstay?</h2>
        <div className="features-grid">
          <div className="feature">
            <Shield className="feature-icon" size={24} />
            <h3>Verified Students</h3>
            <p>All users are verified KU students for your safety</p>
          </div>
          <div className="feature">
            <Users className="feature-icon" size={24} />
            <h3>Smart Matching</h3>
            <p>Our algorithm finds compatible roommates based on your lifestyle</p>
          </div>
          <div className="feature">
            <MessageCircle className="feature-icon" size={24} />
            <h3>Easy Communication</h3>
            <p>Built-in messaging to connect with potential roommates</p>
          </div>
          <div className="feature">
            <Home className="feature-icon" size={24} />
            <h3>Quality Listings</h3>
            <p>Curated housing options near campus</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-content">
          <h2>Ready to Find Your Perfect Place?</h2>
          <p>Join thousands of students who've found their ideal roommates</p>
          <div className="cta-buttons">
            <a href="/register" className="cta-button primary">Get Started</a>
            <a href="/listings" className="cta-button secondary">Browse Listings</a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;