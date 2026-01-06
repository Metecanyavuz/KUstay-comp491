import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import axiosClient from '../../utils/axiosClient';
import { Plus, Edit, Trash2, Eye, Home, Calendar, DollarSign, MapPin } from 'lucide-react';
import './MyListingsTab.css';

function MyListingsTab() {
  const { t } = useI18n();
  const locale = t('general.locale', 'en-US');
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
      // Use dedicated endpoint that returns all of the current user's listings (active + inactive)
      const response = await axiosClient.get('/api/listings/my_listings/');
      setListings(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError(t('myListings.loadError', 'Failed to load your listings. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (listingId) => {
    try {
      await axiosClient.delete(`/api/listings/${listingId}/`);
      setListings(listings.filter(listing => listing.listing_id !== listingId));
      setDeleteConfirm(null);
      alert(t('myListings.deleteSuccess', 'Listing deleted successfully!'));
    } catch (err) {
      console.error('Error deleting listing:', err);
      alert(t('myListings.deleteError', 'Failed to delete listing. Please try again.'));
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
      alert(t('myListings.updateStatusError', 'Failed to update listing status. Please try again.'));
    }
  };

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
    return value?.replace('_', ' ') || t('general.notAvailable', 'Not available');
  };

  if (loading) {
    return (
      <div className="my-listings-tab">
        <div className="loading-spinner">{t('myListings.loading', 'Loading your listings...')}</div>
      </div>
    );
  }

  return (
    <div className="my-listings-tab">
      <div className="listings-header">
        <div>
          <h2>{t('myListings.title', 'My Listings')}</h2>
          <p className="subtitle">{t('myListings.subtitle', 'Manage your property listings')}</p>
        </div>
        <button 
          className="create-listing-btn"
          onClick={() => navigate('/listings/new')}
        >
          <Plus size={20} />
          {t('myListings.create', 'Create New Listing')}
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
          <h3>{t('myListings.emptyTitle', 'No Listings Yet')}</h3>
          <p>{t('myListings.emptyBody', 'Create your first listing to start finding roommates!')}</p>
          <button 
            className="create-first-listing-btn"
            onClick={() => navigate('/listings/new')}
          >
            <Plus size={20} />
            {t('myListings.createFirst', 'Create Your First Listing')}
          </button>
        </div>
      ) : (
        <div className="listings-grid">
          {listings.map(listing => (
            <div key={listing.listing_id} className="listing-card">
              {/* Status Badge */}
              <div className={`status-badge ${listing.is_active ? 'active' : 'inactive'}`}>
                {listing.is_active ? t('myListings.statusActive', 'Active') : t('myListings.statusInactive', 'Inactive')}
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
                    <span>₺{Number(listing.rent_amount).toLocaleString(locale)} {t('currency.perMonth', '/ month')}</span>
                  </div>
                  {listing.available_from && (
                    <div className="detail-item">
                      <Calendar size={16} />
                      <span>{t('myListings.availableFrom', 'Available from')} {new Date(listing.available_from).toLocaleDateString(locale)}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <Home size={16} />
                    <span>
                      {getRoomTypeLabel(listing.room_type)} • {listing.available_rooms}{' '}
                      {listing.available_rooms === 1
                        ? t('myListings.roomAvailable', 'room available')
                        : t('myListings.roomsAvailable', 'rooms available')}
                    </span>
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
                  title={t('myListings.viewTitle', 'View Listing')}
                >
                  <Eye size={18} />
                  {t('myListings.view', 'View')}
                </button>
                <button
                  className="action-btn edit-btn"
                  onClick={() => navigate(`/listings/${listing.listing_id}/edit`)}
                  title={t('myListings.editTitle', 'Edit Listing')}
                >
                  <Edit size={18} />
                  {t('myListings.edit', 'Edit')}
                </button>
                <button
                  className="action-btn toggle-btn"
                  onClick={() => toggleActiveStatus(listing)}
                  title={listing.is_active ? t('myListings.deactivate', 'Deactivate') : t('myListings.activate', 'Activate')}
                >
                  {listing.is_active ? t('myListings.deactivate', 'Deactivate') : t('myListings.activate', 'Activate')}
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => setDeleteConfirm(listing.listing_id)}
                  title={t('myListings.deleteTitle', 'Delete Listing')}
                >
                  <Trash2 size={18} />
                  {t('myListings.delete', 'Delete')}
                </button>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === listing.listing_id && (
                <div className="delete-confirm">
                  <p>{t('myListings.deleteConfirm', 'Are you sure you want to delete this listing?')}</p>
                  <div className="confirm-actions">
                    <button
                      className="confirm-btn cancel"
                      onClick={() => setDeleteConfirm(null)}
                    >
                      {t('myListings.cancel', 'Cancel')}
                    </button>
                    <button
                      className="confirm-btn delete"
                      onClick={() => handleDelete(listing.listing_id)}
                    >
                      {t('myListings.delete', 'Delete')}
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

export default MyListingsTab;
