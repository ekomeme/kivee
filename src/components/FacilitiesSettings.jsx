import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFacilities, createFacility, updateFacility, deleteFacility } from '../services/firestore';
import { sanitizeText } from '../utils/validators';
import { useAcademy } from '../contexts/AcademyContext';

export default function FacilitiesSettings({ db, location }) {
  const { academy, facilityLabelSingular, facilityLabelPlural } = useAcademy();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'court',
    capacity: '',
    status: 'active',
    description: ''
  });

  useEffect(() => {
    if (academy?.id && location?.id && db) {
      fetchFacilities();
    }
  }, [academy?.id, location?.id, db]);

  const fetchFacilities = async () => {
    setLoading(true);
    try {
      const facilitiesData = await getFacilities(db, academy.id, location.id);
      setFacilities(facilitiesData);
    } catch (error) {
      console.error('Error fetching facilities:', error);
      toast.error('Failed to load facilities');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingFacility(null);
    setFormData({
      name: '',
      type: 'court',
      capacity: '',
      status: 'active',
      description: ''
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (facility) => {
    setEditingFacility(facility);
    setFormData({
      name: facility.name,
      type: facility.type || 'court',
      capacity: facility.capacity || '',
      status: facility.status,
      description: facility.description || ''
    });
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingFacility(null);
    setFormData({
      name: '',
      type: 'court',
      capacity: '',
      status: 'active',
      description: ''
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const sanitizedName = sanitizeText(formData.name);
    const sanitizedDescription = sanitizeText(formData.description);

    if (!sanitizedName) {
      toast.error(`${facilityLabelSingular} name is required`);
      return;
    }

    try {
      const facilityData = {
        name: sanitizedName,
        type: formData.type,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        status: formData.status,
        description: sanitizedDescription || ''
      };

      if (editingFacility) {
        // Update existing facility
        await updateFacility(db, academy.id, location.id, editingFacility.id, facilityData);
        toast.success(`${facilityLabelSingular} updated successfully`);
      } else {
        // Create new facility
        await createFacility(db, academy.id, location.id, facilityData);
        toast.success(`${facilityLabelSingular} created successfully`);
      }

      handleCloseModal();
      fetchFacilities();
    } catch (error) {
      console.error('Error saving facility:', error);
      toast.error(`Failed to save ${facilityLabelSingular.toLowerCase()}`);
    }
  };

  const handleDelete = async (facilityId) => {
    if (!window.confirm(`Are you sure you want to delete this ${facilityLabelSingular.toLowerCase()}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteFacility(db, academy.id, location.id, facilityId);
      toast.success(`${facilityLabelSingular} deleted successfully`);
      fetchFacilities();
    } catch (error) {
      console.error('Error deleting facility:', error);
      toast.error(`Failed to delete ${facilityLabelSingular.toLowerCase()}`);
    }
  };

  const handleToggleStatus = async (facility) => {
    try {
      const newStatus = facility.status === 'active' ? 'inactive' : 'active';
      await updateFacility(db, academy.id, location.id, facility.id, { status: newStatus });
      toast.success(`${facilityLabelSingular} ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchFacilities();
    } catch (error) {
      console.error('Error updating facility status:', error);
      toast.error('Failed to update status');
    }
  };

  const getFacilityTypeLabel = (type) => {
    const labels = {
      court: 'Court',
      field: 'Field',
      pool: 'Pool',
      studio: 'Studio',
      room: 'Room',
      track: 'Track',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const getFacilityTypeIcon = (type) => {
    // Using Building2 for all types, but you can customize later
    return <Building2 className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-gray-600">Loading {facilityLabelPlural.toLowerCase()}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-800">{facilityLabelPlural}</h4>
          <p className="text-xs text-gray-600 mt-1">
            Manage physical spaces within this location
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover transition-colors"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add {facilityLabelSingular}
        </button>
      </div>

      {facilities.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <Building2 className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No {facilityLabelPlural.toLowerCase()}</h3>
          <p className="mt-1 text-xs text-gray-500">Get started by creating your first {facilityLabelSingular.toLowerCase()}.</p>
          <div className="mt-4">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" />
              Add {facilityLabelSingular}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {facilities.map(facility => (
            <div
              key={facility.id}
              className={`bg-white rounded-lg border p-3 ${
                facility.status === 'active' ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={facility.status === 'active' ? 'text-green-600' : 'text-gray-400'}>
                    {getFacilityTypeIcon(facility.type)}
                  </span>
                  <div>
                    <h5 className="font-semibold text-gray-900 text-sm">{facility.name}</h5>
                    <p className="text-xs text-gray-500">{getFacilityTypeLabel(facility.type)}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  facility.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {facility.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>

              {facility.capacity && (
                <p className="text-xs text-gray-600 mb-2">
                  Capacity: {facility.capacity} people
                </p>
              )}

              {facility.description && (
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {facility.description}
                </p>
              )}

              <div className="flex items-center space-x-2 mt-3">
                <button
                  onClick={() => handleOpenEditModal(facility)}
                  className="flex-1 flex items-center justify-center px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <Edit className="mr-1 h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={() => handleToggleStatus(facility)}
                  className={`flex-1 flex items-center justify-center px-2 py-1.5 text-xs font-medium rounded-md transition-colors border ${
                    facility.status === 'active'
                      ? 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                      : 'text-green-700 bg-green-50 border-green-300 hover:bg-green-100'
                  }`}
                >
                  <Check className="mr-1 h-3 w-3" />
                  {facility.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(facility.id)}
                  className="px-2 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {editingFacility ? `Edit ${facilityLabelSingular}` : `Add ${facilityLabelSingular}`}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="facilityName" className="block text-sm font-medium text-gray-700">
                  {facilityLabelSingular} Name
                </label>
                <input
                  type="text"
                  id="facilityName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="e.g., Court A, Studio 1, Pool Lane 3"
                  required
                />
              </div>

              <div>
                <label htmlFor="facilityType" className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  id="facilityType"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="court">Court</option>
                  <option value="field">Field</option>
                  <option value="pool">Pool</option>
                  <option value="studio">Studio</option>
                  <option value="room">Room</option>
                  <option value="track">Track</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="facilityCapacity" className="block text-sm font-medium text-gray-700">
                  Capacity (Optional)
                </label>
                <input
                  type="number"
                  id="facilityCapacity"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Max number of people"
                  min="1"
                />
              </div>

              <div>
                <label htmlFor="facilityDescription" className="block text-sm font-medium text-gray-700">
                  Description (Optional)
                </label>
                <textarea
                  id="facilityDescription"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Additional details about this facility"
                  rows="3"
                />
              </div>

              <div>
                <label htmlFor="facilityStatus" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="facilityStatus"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover transition-colors"
                >
                  {editingFacility ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
