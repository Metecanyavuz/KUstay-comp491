import { useState } from 'react';
import { Menu, X, Home, List, MessageCircle, User, LogOut, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Navigation.css';

function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
    try {
      await logout();
      // Redirect to home page after successful logout
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
          <span>KUstay</span>
        </a>

        {/* Desktop Menu */}
        <div className="nav-menu desktop">
          <a href="/" className="nav-link">Home</a>
          <a href="/listings" className="nav-link">Listings</a>
          {user && (
            <>
              <a href="/matches" className="nav-link">Matches</a>
              <a href="/conversations" className="nav-link">
                <MessageCircle size={18} />
                <span>Messages</span>
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
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="nav-button secondary">
                <LogIn size={18} />
                <span>Login</span>
              </a>
              <a href="/signup" className="nav-button primary">
                <UserPlus size={18} />
                <span>Sign Up</span>
              </a>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="mobile-menu-button" onClick={toggleMenu}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="mobile-menu">
          <a href="/" className="mobile-nav-link" onClick={() => setIsOpen(false)}>Home</a>
          <a href="/listings" className="mobile-nav-link" onClick={() => setIsOpen(false)}>Listings</a>
          {user && (
            <>
              <a href="/matches" className="mobile-nav-link" onClick={() => setIsOpen(false)}>Matches</a>
              <a href="/conversations" className="mobile-nav-link" onClick={() => setIsOpen(false)}>Messages</a>
              <a href="/profile" className="mobile-nav-link" onClick={() => setIsOpen(false)}>Profile</a>
              <button onClick={handleLogout} className="mobile-nav-link logout-btn">
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </>
          )}
          {!user && (
            <>
              <a href="/login" className="mobile-nav-link" onClick={() => setIsOpen(false)}>Login</a>
              <a href="/signup" className="mobile-nav-link" onClick={() => setIsOpen(false)}>Sign Up</a>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navigation;