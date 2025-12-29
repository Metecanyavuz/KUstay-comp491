import React, { useState, useEffect } from 'react';
import { X, MapPin, Plus } from 'lucide-react';
import './LocationSelector.css';

const LocationSelector = ({ selectedNeighborhoods = [], onChange, maxSelection = 5 }) => {
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [neighborhoods, setNeighborhoods] = useState([]);

    const [selectedCity, setSelectedCity] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [currentNeighborhood, setCurrentNeighborhood] = useState('');

    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
    const [error, setError] = useState('');

    // Fetch Provinces on mount
    useEffect(() => {
        const fetchProvinces = async () => {
            setLoadingProvinces(true);
            try {
                const response = await fetch('https://api.turkiyeapi.dev/v1/provinces');
                if (!response.ok) throw new Error('Failed to load cities');
                const data = await response.json();
                setProvinces(data.data || []);
            } catch (err) {
                console.error(err);
                setError('Could not load cities. Please try refreshing.');
            } finally {
                setLoadingProvinces(false);
            }
        };
        fetchProvinces();
    }, []);

    // Handle City Change
    const handleCityChange = (e) => {
        const cityName = e.target.value;
        setSelectedCity(cityName);
        setSelectedDistrict('');
        setNeighborhoods([]);
        setCurrentNeighborhood('');

        if (cityName) {
            const cityData = provinces.find(p => p.name === cityName);
            setDistricts(cityData?.districts || []);
        } else {
            setDistricts([]);
        }
    };

    // Handle District Change
    const handleDistrictChange = (e) => {
        const districtName = e.target.value;
        setSelectedDistrict(districtName);
        setCurrentNeighborhood('');
        setNeighborhoods([]);

        if (districtName) {
            fetchNeighborhoods(districtName);
        }
    };

    // Fetch Neighborhoods
    const fetchNeighborhoods = async (districtName) => {
        setLoadingNeighborhoods(true);
        try {
            // Need to find district ID if possible, or search by name logic used in CreateListing
            // For simplicity and consistency with CreateListing:
            const params = new URLSearchParams();
            params.set('district', districtName);
            params.set('limit', '500');

            const response = await fetch(
                `https://api.turkiyeapi.dev/v1/neighborhoods?${params.toString()}`
            );

            if (!response.ok) throw new Error('Failed to load neighborhoods');

            const data = await response.json();
            setNeighborhoods(data.data || []);
        } catch (err) {
            console.error(err);
            setError('Could not load neighborhoods.');
        } finally {
            setLoadingNeighborhoods(false);
        }
    };

    // Add Neighborhood
    const handleAddNeighborhood = () => {
        if (!currentNeighborhood) return;

        // Create a composite key/display value
        // Format: "Neighborhood" (keeping it simple as per user preference to just list neighborhoods)
        // Or "District - Neighborhood" to be more specific. 
        // The implementation plan mentioned "Neighborhood" to maintain backward compatibility but "District - Neighborhood" for context.
        // Let's store "District - Neighborhood" for display clarity in the list, but if the backend expects just strings, this is fine.

        const valToAdd = `${selectedDistrict} - ${currentNeighborhood}`;

        // Check duplicates
        if (selectedNeighborhoods.includes(valToAdd)) {
            setCurrentNeighborhood('');
            return;
        }

        if (selectedNeighborhoods.length >= maxSelection) {
            setError(`You can only select up to ${maxSelection} neighborhoods.`);
            return;
        }

        const newSelection = [...selectedNeighborhoods, valToAdd];
        onChange(newSelection);
        setCurrentNeighborhood('');
        setError('');
    };

    // Remove Neighborhood
    const handleRemove = (itemToRemove) => {
        const newSelection = selectedNeighborhoods.filter(item => item !== itemToRemove);
        onChange(newSelection);
    };

    return (
        <div className="location-selector">
            <div className="selector-controls">
                <div className="select-group">
                    <select
                        value={selectedCity}
                        onChange={handleCityChange}
                        className="location-select"
                        disabled={loadingProvinces}
                    >
                        <option value="">Select City</option>
                        {provinces.map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="select-group">
                    <select
                        value={selectedDistrict}
                        onChange={handleDistrictChange}
                        className="location-select"
                        disabled={!selectedCity}
                    >
                        <option value="">Select District</option>
                        {districts.map(d => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                    </select>
                </div>

                <div className="select-group input-with-action">
                    <select
                        value={currentNeighborhood}
                        onChange={(e) => setCurrentNeighborhood(e.target.value)}
                        className="location-select"
                        disabled={!selectedDistrict || loadingNeighborhoods}
                    >
                        <option value="">Select Neighborhood</option>
                        {neighborhoods.map(n => (
                            <option key={n.id} value={n.name}>{n.name}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={handleAddNeighborhood}
                        className="add-btn"
                        disabled={!currentNeighborhood}
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {loadingNeighborhoods && <small className="loading-text">Loading neighborhoods...</small>}
            {error && <small className="error-text">{error}</small>}

            <div className="selected-tags">
                {selectedNeighborhoods.map((item, index) => (
                    <span key={index} className="location-tag">
                        <MapPin size={12} />
                        {item}
                        <button
                            type="button"
                            onClick={() => handleRemove(item)}
                            className="remove-tag"
                        >
                            <X size={12} />
                        </button>
                    </span>
                ))}
                {selectedNeighborhoods.length === 0 && (
                    <span className="placeholder-text">No neighborhoods selected</span>
                )}
            </div>
        </div>
    );
};

export default LocationSelector;
