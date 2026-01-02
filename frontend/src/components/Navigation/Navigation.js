import { useState } from 'react';
import { Menu, X, Home, MessageCircle, Star, User, LogOut, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import './Navigation.css';

function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const { t, toggleLanguage, language } = useI18n();

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to logout. Please try again.');
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <a href="/" className="nav-logo">
          <Home size={24} />
          <span>{t('nav.brand', 'KUstay')}</span>
        </a>

        {/* Desktop Menu */}
        <div className="nav-menu desktop">
          <a href="/" className="nav-link">{t('nav.home', 'Home')}</a>
          <a href="/listings" className="nav-link">{t('nav.listings', 'Listings')}</a>
          <a href="/map" className="nav-link">{t('nav.map', 'Map')}</a>
          {user && (
            <>
              <a href="/matches" className="nav-link">{t('nav.matches', 'Matches')}</a>
              <a href="/reviews" className="nav-link">
                <Star size={18} />
                <span>{t('nav.reviews', 'Reviews')}</span>
              </a>
              <a href="/conversations" className="nav-link">
                <MessageCircle size={18} />
                <span>{t('nav.messages', 'Messages')}</span>
              </a>
            </>
          )}
        </div>

        {/* Desktop Auth Buttons */}
        <div className="nav-auth desktop">
          {user ? (
            <>
              <a href="/profile" className="nav-link profile-link">
                <User size={18} />
                <span>{user.username || user.email}</span>
              </a>
              <button onClick={handleLogout} className="nav-button secondary">
                <LogOut size={18} />
                <span>{t('nav.logout', 'Logout')}</span>
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="nav-button secondary">
                <LogIn size={18} />
                <span>{t('nav.login', 'Login')}</span>
              </a>
              <a href="/signup" className="nav-button primary">
                <UserPlus size={18} />
                <span>{t('nav.signup', 'Sign Up')}</span>
              </a>
            </>
          )}
          <button
            type="button"
            className="nav-button tertiary"
            onClick={toggleLanguage}
            aria-label={t('nav.toggleLanguage', 'Toggle language')}
          >
            {language === 'en' ? 'TR' : 'EN'}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button className="mobile-menu-button" onClick={toggleMenu}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="mobile-menu">
          <a href="/" className="mobile-nav-link" onClick={() => setIsOpen(false)}>{t('nav.home', 'Home')}</a>
          <a href="/listings" className="mobile-nav-link" onClick={() => setIsOpen(false)}>{t('nav.listings', 'Listings')}</a>
          <a href="/map" className="mobile-nav-link" onClick={() => setIsOpen(false)}>{t('nav.map', 'Map')}</a>
          {user && (
            <>
              <a href="/matches" className="mobile-nav-link" onClick={() => setIsOpen(false)}>{t('nav.matches', 'Matches')}</a>
              <a href="/reviews" className="mobile-nav-link" onClick={() => setIsOpen(false)}>{t('nav.reviews', 'Reviews')}</a>
              <a href="/conversations" className="mobile-nav-link" onClick={() => setIsOpen(false)}>{t('nav.messages', 'Messages')}</a>
              <a href="/profile" className="mobile-nav-link" onClick={() => setIsOpen(false)}>{t('nav.profile', 'Profile')}</a>
              <button onClick={handleLogout} className="mobile-nav-link logout-btn">
                <LogOut size={18} />
                <span>{t('nav.logout', 'Logout')}</span>
              </button>
            </>
          )}
          {!user && (
            <>
              <a href="/login" className="mobile-nav-link" onClick={() => setIsOpen(false)}>{t('nav.login', 'Login')}</a>
              <a href="/signup" className="mobile-nav-link" onClick={() => setIsOpen(false)}>{t('nav.signup', 'Sign Up')}</a>
            </>
          )}
          <button
            type="button"
            className="mobile-nav-link"
            onClick={() => {
              toggleLanguage();
              setIsOpen(false);
            }}
          >
            {language === 'en' ? t('nav.switchToTurkish', 'Türkçe') : t('nav.switchToEnglish', 'English')}
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navigation;
