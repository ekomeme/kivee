import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit, Trash2, X, Check, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getLocations, createLocation, updateLocation, deleteLocation } from '../services/firestore';
import { sanitizeText } from '../utils/validators';
import FacilitiesSettings from './FacilitiesSettings';

export default function LocationsSettings({ db, academy }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [expandedLocationId, setExpandedLocationId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    status: 'active'
  });

  const locationLabelSingular = academy?.locationLabelSingular || 'Location';
  const locationLabelPlural = academy?.locationLabelPlural || 'Locations';

  useEffect(() => {
    if (academy?.id && db) {
      fetchLocations();
    }
  }, [academy?.id, db]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const locationsData = await getLocations(db, academy.id);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingLocation(null);
    setFormData({
      name: '',
      status: 'active'
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      status: location.status
    });
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingLocation(null);
    setFormData({
      name: '',
      status: 'active'
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const sanitizedName = sanitizeText(formData.name);

    if (!sanitizedName) {
      toast.error(`${locationLabelSingular} name is required`);
      return;
    }

    try {
      const locationData = {
        name: sanitizedName,
        status: formData.status,
        academyId: academy.id,
        isDefault: locations.length === 0 && !editingLocation // First location is default
      };

      if (editingLocation) {
        // Update existing location
        await updateLocation(db, academy.id, editingLocation.id, locationData);
        toast.success(`${locationLabelSingular} updated successfully`);
      } else {
        // Create new location
        await createLocation(db, academy.id, locationData);
        toast.success(`${locationLabelSingular} created successfully`);
      }

      handleCloseModal();
      fetchLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error(`Failed to save ${locationLabelSingular.toLowerCase()}`);
    }
  };

  const handleDelete = async (locationId) => {
    // Check if it's the default location
    const location = locations.find(loc => loc.id === locationId);
    if (location?.isDefault && locations.length > 1) {
      toast.error('Cannot delete the default location. Please set another location as default first.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete this ${locationLabelSingular.toLowerCase()}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteLocation(db, academy.id, locationId);
      toast.success(`${locationLabelSingular} deleted successfully`);
      fetchLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error(`Failed to delete ${locationLabelSingular.toLowerCase()}`);
    }
  };

  const handleToggleStatus = async (location) => {
    try {
      const newStatus = location.status === 'active' ? 'inactive' : 'active';
      await updateLocation(db, academy.id, location.id, { status: newStatus });
      toast.success(`${locationLabelSingular} ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchLocations();
    } catch (error) {
      console.error('Error updating location status:', error);
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-gray-600">Loading {locationLabelPlural.toLowerCase()}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">{locationLabelPlural}</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage your academy's locations. Students, groups, and pricing can be location-specific.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add {locationLabelSingular}
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <MapPin className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No {locationLabelPlural.toLowerCase()}</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first location.</p>
          <div className="mt-6">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Add {locationLabelSingular}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {locations.map(location => (
            <div
              key={location.id}
              className={`bg-white rounded-lg border-2 ${
                location.status === 'active' ? 'border-green-200' : 'border-gray-200'
              }`}
            >
              {/* Location Header */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2 flex-1">
                    <button
                      onClick={() => setExpandedLocationId(expandedLocationId === location.id ? null : location.id)}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {expandedLocationId === location.id ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>
                    <MapPin className={`h-5 w-5 ${location.status === 'active' ? 'text-green-600' : 'text-gray-400'}`} />
                    <h4 className="font-semibold text-gray-900">{location.name}</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    {location.isDefault && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Default
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      location.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {location.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-12">
                  <button
                    onClick={() => handleOpenEditModal(location)}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <Edit className="mr-1 h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(location)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      location.status === 'active'
                        ? 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                        : 'text-green-700 bg-green-100 hover:bg-green-200'
                    }`}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    {location.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  {!location.isDefault && (
                    <button
                      onClick={() => handleDelete(location.id)}
                      className="px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Facilities Section (Expanded) */}
              {expandedLocationId === location.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <FacilitiesSettings db={db} location={location} />
                </div>
              )}
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
                {editingLocation ? `Edit ${locationLabelSingular}` : `Add ${locationLabelSingular}`}
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
                <label htmlFor="locationName" className="block text-sm font-medium text-gray-700">
                  {locationLabelSingular} Name
                </label>
                <input
                  type="text"
                  id="locationName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="e.g., Main Campus, Downtown Branch"
                  required
                />
              </div>

              <div>
                <label htmlFor="locationStatus" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="locationStatus"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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
                  {editingLocation ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
