import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../utils/axiosClient';
import { Plus, Edit, Trash2, Eye, Home, Calendar, DollarSign, MapPin } from 'lucide-react';
import './MyListings.css';

function MyListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyListings();
  }, []);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/api/listings/');
      // Filter to show only current user's listings
      const myListings = response.data.filter(listing => 
        listing.user === user?.username || listing.user === user?.email
      );
      setListings(myListings);
      setError(null);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load your listings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (listingId) => {
    try {
      await axiosClient.delete(`/api/listings/${listingId}/`);
      setListings(listings.filter(listing => listing.listing_id !== listingId));
      setDeleteConfirm(null);
      alert('Listing deleted successfully!');
    } catch (err) {
      console.error('Error deleting listing:', err);
      alert('Failed to delete listing. Please try again.');
    }
  };

  const toggleActiveStatus = async (listing) => {
    try {
      const response = await axiosClient.patch(`/api/listings/${listing.listing_id}/`, {
        is_active: !listing.is_active
      });
      setListings(listings.map(l => 
        l.listing_id === listing.listing_id ? response.data : l
      ));
    } catch (err) {
      console.error('Error updating listing status:', err);
      alert('Failed to update listing status. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="my-listings-container">
        <div className="loading-spinner">Loading your listings...</div>
      </div>
    );
  }

  return (
    <div className="my-listings-container">
      <div className="my-listings-header">
        <div className="header-content">
          <h1>My Listings</h1>
          <p className="subtitle">Manage your property listings</p>
        </div>
        <button 
          className="create-listing-btn"
          onClick={() => navigate('/listings/new')}
        >
          <Plus size={20} />
          Create New Listing
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {listings.length === 0 ? (
        <div className="empty-state">
          <Home size={64} className="empty-icon" />
          <h2>No Listings Yet</h2>
          <p>Create your first listing to start finding roommates!</p>
          <button 
            className="create-first-listing-btn"
            onClick={() => navigate('/listings/new')}
          >
            <Plus size={20} />
            Create Your First Listing
          </button>
        </div>
      ) : (
        <div className="listings-grid">
          {listings.map(listing => (
            <div key={listing.listing_id} className="listing-card">
              {/* Status Badge */}
              <div className={`status-badge ${listing.is_active ? 'active' : 'inactive'}`}>
                {listing.is_active ? 'Active' : 'Inactive'}
              </div>

              {/* Listing Image */}
              <div className="listing-image">
                {listing.image ? (
                  <img src={listing.image} alt={listing.title} />
                ) : (
                  <div className="no-image">
                    <Home size={48} />
                  </div>
                )}
              </div>

              {/* Listing Content */}
              <div className="listing-content">
                <h3 className="listing-title">{listing.title}</h3>
                
                <div className="listing-details">
                  <div className="detail-item">
                    <MapPin size={16} />
                    <span>{listing.neighborhood || listing.address}</span>
                  </div>
                  <div className="detail-item">
                    <DollarSign size={16} />
                    <span>₺{Number(listing.rent_amount).toLocaleString()} / month</span>
                  </div>
                  {listing.available_from && (
                    <div className="detail-item">
                      <Calendar size={16} />
                      <span>Available from {new Date(listing.available_from).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <Home size={16} />
                    <span>{listing.room_type?.replace('_', ' ')} • {listing.available_rooms} available</span>
                  </div>
                </div>

                <p className="listing-description">
                  {listing.description?.length > 120 
                    ? `${listing.description.substring(0, 120)}...` 
                    : listing.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="listing-actions">
                <button
                  className="action-btn view-btn"
                  onClick={() => navigate(`/listings/${listing.listing_id}`)}
                  title="View Listing"
                >
                  <Eye size={18} />
                  View
                </button>
                <button
                  className="action-btn edit-btn"
                  onClick={() => navigate(`/listings/${listing.listing_id}/edit`)}
                  title="Edit Listing"
                >
                  <Edit size={18} />
                  Edit
                </button>
                <button
                  className="action-btn toggle-btn"
                  onClick={() => toggleActiveStatus(listing)}
                  title={listing.is_active ? 'Deactivate' : 'Activate'}
                >
                  {listing.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => setDeleteConfirm(listing.listing_id)}
                  title="Delete Listing"
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === listing.listing_id && (
                <div className="delete-confirm">
                  <p>Are you sure you want to delete this listing?</p>
                  <div className="confirm-actions">
                    <button
                      className="confirm-btn cancel"
                      onClick={() => setDeleteConfirm(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="confirm-btn delete"
                      onClick={() => handleDelete(listing.listing_id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyListings;