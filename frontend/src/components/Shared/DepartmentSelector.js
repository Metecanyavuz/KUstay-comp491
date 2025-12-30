import React, { useState, useEffect } from 'react';
import { Plus, X, GraduationCap } from 'lucide-react';
import './DepartmentSelector.css';

const DepartmentSelector = ({ selectedDepartments = [], onChange, maxSelection = 3 }) => {
    const [faculties, setFaculties] = useState([]);
    const [selectedFaculty, setSelectedFaculty] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Derive available departments based on selected faculty
    const availableDepartments = selectedFaculty
        ? faculties.find(f => f.id.toString() === selectedFaculty)?.departments || []
        : [];

    useEffect(() => {
        fetchFaculties();
    }, []);

    const fetchFaculties = async () => {
        try {
            const response = await fetch('/api/faculties/');
            if (!response.ok) throw new Error('Failed to load faculties');
            const data = await response.json();
            setFaculties(data);
        } catch (err) {
            console.error('Error loading faculties:', err);
            setError('Could not load department data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddDepartment = () => {
        if (!selectedDepartment) return;

        // Find the full department object to add
        const faculty = faculties.find(f => f.id.toString() === selectedFaculty);
        const department = faculty?.departments.find(d => d.id.toString() === selectedDepartment);

        // Check if already selected (by ID)
        if (selectedDepartments.some(d => d.id === department.id)) {
            // Already selected, maybe just clear input
            setSelectedDepartment('');
            return;
        }

        if (selectedDepartments.length >= maxSelection) {
            setError(`You can only select up to ${maxSelection} departments.`);
            return;
        }

        if (department) {
            onChange([...selectedDepartments, department]);
            // Reset selection
            setSelectedDepartment('');
            setError('');
        }
    };

    const handleRemove = (departmentId) => {
        onChange(selectedDepartments.filter(d => d.id !== departmentId));
    };

    return (
        <div className="department-selector">
            <div className="selector-controls">
                <div className="select-group">
                    <select
                        value={selectedFaculty}
                        onChange={(e) => {
                            setSelectedFaculty(e.target.value);
                            setSelectedDepartment('');
                        }}
                        className="department-select"
                        disabled={loading}
                    >
                        <option value="">Select Faculty</option>
                        {faculties.map(faculty => (
                            <option key={faculty.id} value={faculty.id}>
                                {faculty.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="select-group input-with-action">
                    <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        disabled={!selectedFaculty}
                        className="department-select"
                    >
                        <option value="">Select Department</option>
                        {availableDepartments.map(dept => (
                            <option key={dept.id} value={dept.id} disabled={selectedDepartments.some(d => d.id === dept.id)}>
                                {dept.name}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={handleAddDepartment}
                        className="add-btn"
                        disabled={!selectedDepartment || selectedDepartments.length >= maxSelection}
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {loading && <small className="loading-text">Loading departments...</small>}
            {error && <small className="error-text">{error}</small>}

            <div className="selected-tags">
                {selectedDepartments.map((dept) => (
                    <span key={dept.id} className="department-tag">
                        <GraduationCap size={12} />
                        {dept.name}
                        <button
                            type="button"
                            onClick={() => handleRemove(dept.id)}
                            className="remove-tag"
                        >
                            <X size={12} />
                        </button>
                    </span>
                ))}
                {selectedDepartments.length === 0 && (
                    <span className="placeholder-text">No departments selected</span>
                )}
            </div>
        </div>
    );
};

export default DepartmentSelector;
