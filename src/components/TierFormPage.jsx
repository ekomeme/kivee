import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { useAcademy } from '../contexts/AcademyContext';
import { getLocations } from '../services/firestore';
import { COLLECTIONS } from '../config/constants';
import LoadingBar from './LoadingBar.jsx';

// Helper function to remove undefined fields from object
const removeUndefinedFields = (obj) => {
  const cleaned = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
};

export default function TierFormPage({ user, db }) {
  const { academy, membership } = useAcademy();
  const navigate = useNavigate();
  const { tierId } = useParams();
  const isEditing = !!tierId;

  // Form states
  const [newTierName, setNewTierName] = useState('');
  const [newTierDescription, setNewTierDescription] = useState('');
  const [pricingModel, setPricingModel] = useState('monthly');
  const [enabledLocations, setEnabledLocations] = useState({});
  const [locationPrices, setLocationPrices] = useState({});
  const [termStartDate, setTermStartDate] = useState('');
  const [termEndDate, setTermEndDate] = useState('');
  const [classesPerWeek, setClassesPerWeek] = useState('');
  const [classDuration, setClassDuration] = useState('');
  const [classLimitPerCycle, setClassLimitPerCycle] = useState('');
  const [autoRenew, setAutoRenew] = useState(true);
  const [requiresEnrollmentFee, setRequiresEnrollmentFee] = useState(false);
  const [status, setStatus] = useState('active');
  const [differentPricesByLocation, setDifferentPricesByLocation] = useState(false);
  const [activeLocationTab, setActiveLocationTab] = useState('');
  // Price variants structure: { locationId: [{ billingPeriod: 'monthly', price: '100', ... }] }
  // For custom-term: customTermName, termStartDate, termEndDate
  // For custom-duration: durationUnit, durationAmount
  const [priceVariants, setPriceVariants] = useState({});
  // Default price variants (when differentPricesByLocation is false)
  const [defaultPriceVariants, setDefaultPriceVariants] = useState([{ billingPeriod: '', price: '' }]);

  // Component states
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [tierError, setTierError] = useState(null);

  // Fetch locations on mount
  useEffect(() => {
    const fetchLocationsData = async () => {
      if (!academy?.id || !db) return;
      try {
        const locationsData = await getLocations(db, academy.id);
        setLocations(locationsData);
        // Set first active location as the active tab
        const firstActiveLocation = locationsData.find(loc => loc.status === 'active');
        if (firstActiveLocation) {
          setActiveLocationTab(firstActiveLocation.id);
        }

        // Only initialize price variants if editing and not already loaded
        // For new tiers, initialize with one empty variant per location
        if (!isEditing) {
          const initialVariants = {};
          locationsData.filter(loc => loc.status === 'active').forEach(loc => {
            initialVariants[loc.id] = [{ billingPeriod: '', price: '' }];
          });
          setPriceVariants(initialVariants);
        }
      } catch (err) {
        console.error('Error fetching locations:', err);
        toast.error('Failed to load locations');
      }
    };
    fetchLocationsData();
  }, [academy, db, isEditing]);

  // Fetch tier data if editing
  useEffect(() => {
    const fetchTierData = async () => {
      if (!isEditing || !academy?.id || !tierId) return;

      setLoadingData(true);
      try {
        const tierRef = doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.TIERS}`, tierId);
        const tierSnap = await getDoc(tierRef);

        if (tierSnap.exists()) {
          const tierData = tierSnap.data();
          setNewTierName(tierData.name || '');
          setNewTierDescription(tierData.description || '');
          setClassesPerWeek(tierData.classesPerWeek || '');
          setClassDuration(tierData.classDuration || '');
          setClassLimitPerCycle(tierData.classLimitPerCycle || '');
          setAutoRenew(tierData.autoRenew !== undefined ? tierData.autoRenew : true);
          setRequiresEnrollmentFee(tierData.requiresEnrollmentFee || false);
          setStatus(tierData.status || 'active');

          // Load price variants - load both sets to preserve data when switching modes
          setDifferentPricesByLocation(tierData.differentPricesByLocation || false);
          setPriceVariants(tierData.priceVariantsByLocation || {});
          setDefaultPriceVariants(tierData.defaultPriceVariants || [{ billingPeriod: '', price: '' }]);

          // Legacy fields for backward compatibility
          setPricingModel(tierData.pricingModel || 'monthly');
          setEnabledLocations(tierData.enabledLocations || {});
          setLocationPrices(tierData.locationPrices || {});
          setTermStartDate(tierData.termStartDate || '');
          setTermEndDate(tierData.termEndDate || '');
        } else {
          toast.error('Tier not found');
          navigate('/plans');
        }
      } catch (err) {
        console.error('Error fetching tier:', err);
        toast.error('Failed to load tier data');
        navigate('/plans');
      } finally {
        setLoadingData(false);
      }
    };

    fetchTierData();
  }, [isEditing, academy, tierId, db, navigate]);

  // Add a new price variant for a specific location
  const addPriceVariant = (locationId) => {
    setPriceVariants(prev => ({
      ...prev,
      [locationId]: [...(prev[locationId] || []), { billingPeriod: '', price: '' }]
    }));
  };

  // Remove a price variant for a specific location
  const removePriceVariant = (locationId, index) => {
    setPriceVariants(prev => ({
      ...prev,
      [locationId]: prev[locationId].filter((_, i) => i !== index)
    }));
  };

  // Update a specific price variant
  const updatePriceVariant = (locationId, index, field, value) => {
    setPriceVariants(prev => ({
      ...prev,
      [locationId]: prev[locationId].map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      )
    }));
  };

  // Add a new default price variant
  const addDefaultPriceVariant = () => {
    setDefaultPriceVariants(prev => [...prev, { billingPeriod: '', price: '' }]);
  };

  // Remove a default price variant
  const removeDefaultPriceVariant = (index) => {
    setDefaultPriceVariants(prev => prev.filter((_, i) => i !== index));
  };

  // Update a default price variant
  const updateDefaultPriceVariant = (index, field, value) => {
    setDefaultPriceVariants(prev =>
      prev.map((variant, i) => i === index ? { ...variant, [field]: value } : variant)
    );
  };

  // Helper function to check if a standard billing period is already used
  const isStandardPeriodUsed = (variants, period, currentIndex) => {
    const standardPeriods = ['monthly', 'semi-annual', 'annual'];
    if (!standardPeriods.includes(period)) return false;
    return variants.some((v, idx) => idx !== currentIndex && v.billingPeriod === period);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !academy || loading || !membership) return;

    const userIsOwner = academy?.ownerId === user.uid;
    if (!userIsOwner && !['admin'].includes(membership?.role)) {
      toast.error("You don't have permission to modify tiers.");
      return;
    }

    setLoading(true);
    setTierError(null);

    const tierData = {
      name: newTierName,
      ...(newTierDescription && { description: newTierDescription }),
      differentPricesByLocation,
      classesPerWeek: Number(classesPerWeek) || 0,
      classDuration: Number(classDuration) || 0,
      classLimitPerCycle: classLimitPerCycle ? Number(classLimitPerCycle) : null,
      autoRenew,
      requiresEnrollmentFee,
      status,
      academyId: academy.id,
      createdAt: isEditing ? undefined : new Date(),
      updatedAt: new Date(),
    };

    // Always save both price variant structures to preserve data when switching modes
    tierData.priceVariantsByLocation = priceVariants;
    tierData.defaultPriceVariants = defaultPriceVariants;

    // Legacy fields for backward compatibility
    tierData.pricingModel = pricingModel;
    tierData.price = 0;
    tierData.enabledLocations = enabledLocations;
    tierData.locationPrices = locationPrices;

    try {
      if (isEditing) {
        const tierDocRef = doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.TIERS}`, tierId);
        await updateDoc(tierDocRef, removeUndefinedFields(tierData));
        toast.success("Tier updated successfully.");
      } else {
        const tiersCollectionRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.TIERS}`);
        await addDoc(tiersCollectionRef, removeUndefinedFields(tierData));
        toast.success("Tier added successfully.");
      }
      navigate('/plans');
    } catch (err) {
      console.error("Error saving tier:", err);
      setTierError("Error saving tier: " + err.message);
      toast.error("Error saving tier.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="section-container">
        <div className="section-content-wrapper">
          <LoadingBar loading={true} />
          <div className="flex justify-center items-center py-12">
            <p className="text-gray-600">Loading tier data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-container">
      <div className="section-content-wrapper">
        <div className="mb-6">
          <button
            onClick={() => navigate('/plans')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Plans
          </button>
          <h2 className="section-title">{isEditing ? 'Edit Tier' : 'Create New Tier'}</h2>
        </div>

        <div className="max-w-3xl">
          <LoadingBar loading={loading} />

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div>
              <label htmlFor="tierName" className="block text-sm font-medium text-gray-700">
                Tier Name *
              </label>
              <input
                type="text"
                id="tierName"
                value={newTierName}
                onChange={(e) => setNewTierName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Class Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="classesPerWeek" className="block text-sm font-medium text-gray-700">
                  Classes per Week *
                </label>
                <input
                  type="number"
                  id="classesPerWeek"
                  value={classesPerWeek}
                  onChange={(e) => setClassesPerWeek(e.target.value)}
                  required
                  min="0"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label htmlFor="classDuration" className="block text-sm font-medium text-gray-700">
                  Class Duration (minutes) *
                </label>
                <input
                  type="number"
                  id="classDuration"
                  value={classDuration}
                  onChange={(e) => setClassDuration(e.target.value)}
                  required
                  min="0"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  placeholder="e.g., 30, 45, 60"
                />
              </div>
            </div>

            {/* Description field hidden for now */}
            <div style={{ display: 'none' }}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="tierDescription" className="block text-sm font-medium text-gray-700">
                    Description (Optional)
                  </label>
                  <textarea
                    id="tierDescription"
                    value={newTierDescription}
                    onChange={(e) => setNewTierDescription(e.target.value)}
                    rows="3"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Pricing Section with Location Tabs */}
            <div className="space-y-4">
              {/* Location Tabs Section */}
              <div className="border-b border-gray-200 relative">
                {/* Location Tabs */}
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  {locations
                    .filter(loc => loc.status === 'active')
                    .map(location => (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() => differentPricesByLocation && setActiveLocationTab(location.id)}
                        disabled={!differentPricesByLocation}
                        className={`
                          whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                          ${activeLocationTab === location.id && differentPricesByLocation
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500'
                          }
                          ${!differentPricesByLocation
                            ? 'cursor-not-allowed opacity-50'
                            : 'hover:text-gray-700 hover:border-gray-300'
                          }
                        `}
                      >
                        {location.name}
                      </button>
                    ))}
                </nav>

                {/* Switch for Different Prices by Location - Floating Right */}
                <div className="absolute right-0 top-0 bottom-0 flex items-center">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className="text-sm font-medium text-gray-700">Different prices by location</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={differentPricesByLocation}
                        onChange={(e) => {
                        const isChecked = e.target.checked;

                        // When enabling different prices by location for the first time,
                        // copy default prices to main location if it doesn't have data yet
                        if (isChecked) {
                          let mainLocation = locations.find(loc => loc.isDefault && loc.status === 'active');
                          if (!mainLocation) {
                            mainLocation = locations.find(loc => loc.status === 'active');
                          }

                          if (mainLocation) {
                            setPriceVariants(prev => {
                              // Only copy if the location doesn't have valid data
                              const currentLocationData = prev[mainLocation.id] || [];
                              const hasValidData = currentLocationData.some(v => v.billingPeriod && v.price);

                              if (!hasValidData && defaultPriceVariants.length > 0) {
                                const hasValidDefaults = defaultPriceVariants.some(v => v.billingPeriod && v.price);
                                if (hasValidDefaults) {
                                  return {
                                    ...prev,
                                    [mainLocation.id]: JSON.parse(JSON.stringify(defaultPriceVariants))
                                  };
                                }
                              }
                              return prev;
                            });
                            setActiveLocationTab(mainLocation.id);
                          }
                        } else {
                          // When disabling different prices by location,
                          // copy main location prices to default price variants
                          let mainLocation = locations.find(loc => loc.isDefault && loc.status === 'active');
                          if (!mainLocation) {
                            mainLocation = locations.find(loc => loc.status === 'active');
                          }

                          if (mainLocation) {
                            const mainLocationData = priceVariants[mainLocation.id] || [];
                            const hasValidData = mainLocationData.some(v => v.billingPeriod && v.price);

                            if (hasValidData) {
                              setDefaultPriceVariants(JSON.parse(JSON.stringify(mainLocationData)));
                            }
                          }
                        }

                        setDifferentPricesByLocation(isChecked);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </div>
                </label>
              </div>

                {/* Location Tabs */}
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  {locations
                    .filter(loc => loc.status === 'active')
                    .map(location => (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() => differentPricesByLocation && setActiveLocationTab(location.id)}
                        disabled={!differentPricesByLocation}
                        className={`
                          whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                          ${activeLocationTab === location.id && differentPricesByLocation
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500'
                          }
                          ${!differentPricesByLocation
                            ? 'cursor-not-allowed opacity-50'
                            : 'hover:text-gray-700 hover:border-gray-300'
                          }
                        `}
                      >
                        {location.name}
                      </button>
                    ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="rounded-md pb-6">
                {differentPricesByLocation ? (
                  <div className="space-y-4">
                    {/* Price variants for active location */}
                    {(priceVariants[activeLocationTab] || []).map((variant, index) => {
                      const activeVariants = priceVariants[activeLocationTab] || [];
                      return (
                        <div key={index} className={`space-y-3 rounded-md pb-4 ${variant.billingPeriod === 'custom-term' || variant.billingPeriod === 'custom-duration' ? 'bg-gray-50 -mx-2 px-2 py-4' : 'bg-white'}`}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div>
                              {index === 0 && (
                                <label htmlFor={`billing-${activeLocationTab}-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                  Billing Period
                                </label>
                              )}
                              <select
                                id={`billing-${activeLocationTab}-${index}`}
                                value={variant.billingPeriod}
                                onChange={(e) => updatePriceVariant(activeLocationTab, index, 'billingPeriod', e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white"
                              >
                                <option value="">Select</option>
                                <option
                                  value="monthly"
                                  disabled={isStandardPeriodUsed(activeVariants, 'monthly', index)}
                                >
                                  Monthly
                                </option>
                                <option
                                  value="semi-annual"
                                  disabled={isStandardPeriodUsed(activeVariants, 'semi-annual', index)}
                                >
                                  Semi-Annual
                                </option>
                                <option
                                  value="annual"
                                  disabled={isStandardPeriodUsed(activeVariants, 'annual', index)}
                                >
                                  Annual
                                </option>
                                <option value="custom-term">Custom Term</option>
                                <option value="custom-duration">Custom Duration</option>
                              </select>
                            </div>
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                {index === 0 && (
                                  <label htmlFor={`price-${activeLocationTab}-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                    Price
                                  </label>
                                )}
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 sm:text-sm">{academy.currency || '$'}</span>
                                  </div>
                                  <input
                                    type="number"
                                    id={`price-${activeLocationTab}-${index}`}
                                    value={variant.price}
                                    onChange={(e) => updatePriceVariant(activeLocationTab, index, 'price', e.target.value)}
                                    min="0"
                                    step="0.01"
                                    className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removePriceVariant(activeLocationTab, index)}
                                className="mb-0 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full -mr-12"
                                title="Remove variant"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Conditional fields for Custom Term */}
                          {variant.billingPeriod === 'custom-term' && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                              <div className="md:col-span-2">
                                <label htmlFor={`term-name-${activeLocationTab}-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                  Term Name
                                </label>
                                <input
                                  type="text"
                                  id={`term-name-${activeLocationTab}-${index}`}
                                  value={variant.customTermName || ''}
                                  onChange={(e) => updatePriceVariant(activeLocationTab, index, 'customTermName', e.target.value)}
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                  placeholder="e.g., Summer"
                                />
                              </div>
                              <div>
                                <label htmlFor={`term-start-${activeLocationTab}-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                  Start Date
                                </label>
                                <input
                                  type="date"
                                  id={`term-start-${activeLocationTab}-${index}`}
                                  value={variant.termStartDate || ''}
                                  onChange={(e) => updatePriceVariant(activeLocationTab, index, 'termStartDate', e.target.value)}
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                />
                              </div>
                              <div>
                                <label htmlFor={`term-end-${activeLocationTab}-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                  End Date
                                </label>
                                <input
                                  type="date"
                                  id={`term-end-${activeLocationTab}-${index}`}
                                  value={variant.termEndDate || ''}
                                  onChange={(e) => updatePriceVariant(activeLocationTab, index, 'termEndDate', e.target.value)}
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                />
                              </div>
                            </div>
                          )}

                          {/* Conditional fields for Custom Duration */}
                          {variant.billingPeriod === 'custom-duration' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                              <div>
                                <label htmlFor={`duration-unit-${activeLocationTab}-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                  Duration Unit
                                </label>
                                <select
                                  id={`duration-unit-${activeLocationTab}-${index}`}
                                  value={variant.durationUnit || ''}
                                  onChange={(e) => updatePriceVariant(activeLocationTab, index, 'durationUnit', e.target.value)}
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white"
                                >
                                  <option value="">Select Unit</option>
                                  <option value="days">Days</option>
                                  <option value="weeks">Weeks</option>
                                  <option value="months">Months</option>
                                </select>
                              </div>
                              <div>
                                <label htmlFor={`duration-amount-${activeLocationTab}-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                  Quantity
                                </label>
                                <input
                                  type="number"
                                  id={`duration-amount-${activeLocationTab}-${index}`}
                                  value={variant.durationAmount || ''}
                                  onChange={(e) => updatePriceVariant(activeLocationTab, index, 'durationAmount', e.target.value)}
                                  min="1"
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                  placeholder="e.g., 5"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add variant button */}
                    <button
                      type="button"
                      onClick={() => addPriceVariant(activeLocationTab)}
                      className="flex items-center gap-2 text-primary hover:text-primary-dark font-medium text-sm py-2 px-4 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add price variant
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Multiple default pricing variants when switch is off */}
                    {defaultPriceVariants.map((variant, index) => (
                      <div key={index} className={`space-y-3 rounded-md pb-4 ${variant.billingPeriod === 'custom-term' || variant.billingPeriod === 'custom-duration' ? 'bg-gray-50 -mx-2 px-2 py-4' : 'bg-white'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                          <div>
                            {index === 0 && (
                              <label htmlFor={`default-billing-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                Billing Period
                              </label>
                            )}
                            <select
                              id={`default-billing-${index}`}
                              value={variant.billingPeriod}
                              onChange={(e) => updateDefaultPriceVariant(index, 'billingPeriod', e.target.value)}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white"
                            >
                              <option value="">Select</option>
                              <option
                                value="monthly"
                                disabled={isStandardPeriodUsed(defaultPriceVariants, 'monthly', index)}
                              >
                                Monthly
                              </option>
                              <option
                                value="semi-annual"
                                disabled={isStandardPeriodUsed(defaultPriceVariants, 'semi-annual', index)}
                              >
                                Semi-Annual
                              </option>
                              <option
                                value="annual"
                                disabled={isStandardPeriodUsed(defaultPriceVariants, 'annual', index)}
                              >
                                Annual
                              </option>
                              <option value="custom-term">Custom Term</option>
                              <option value="custom-duration">Custom Duration</option>
                            </select>
                          </div>
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              {index === 0 && (
                                <label htmlFor={`default-price-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                  Price
                                </label>
                              )}
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <span className="text-gray-500 sm:text-sm">{academy.currency || '$'}</span>
                                </div>
                                <input
                                  type="number"
                                  id={`default-price-${index}`}
                                  value={variant.price}
                                  onChange={(e) => updateDefaultPriceVariant(index, 'price', e.target.value)}
                                  min="0"
                                  step="0.01"
                                  className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDefaultPriceVariant(index)}
                              className="mb-0 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full -mr-12"
                              title="Remove variant"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Conditional fields for Custom Term */}
                        {variant.billingPeriod === 'custom-term' && (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                            <div className="md:col-span-2">
                              <label htmlFor={`default-term-name-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                Term Name
                              </label>
                              <input
                                type="text"
                                id={`default-term-name-${index}`}
                                value={variant.customTermName || ''}
                                onChange={(e) => updateDefaultPriceVariant(index, 'customTermName', e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                placeholder="e.g., Summer"
                              />
                            </div>
                            <div>
                              <label htmlFor={`default-term-start-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date
                              </label>
                              <input
                                type="date"
                                id={`default-term-start-${index}`}
                                value={variant.termStartDate || ''}
                                onChange={(e) => updateDefaultPriceVariant(index, 'termStartDate', e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                              />
                            </div>
                            <div>
                              <label htmlFor={`default-term-end-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                End Date
                              </label>
                              <input
                                type="date"
                                id={`default-term-end-${index}`}
                                value={variant.termEndDate || ''}
                                onChange={(e) => updateDefaultPriceVariant(index, 'termEndDate', e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                              />
                            </div>
                          </div>
                        )}

                        {/* Conditional fields for Custom Duration */}
                        {variant.billingPeriod === 'custom-duration' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div>
                              <label htmlFor={`default-duration-unit-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                Duration Unit
                              </label>
                              <select
                                id={`default-duration-unit-${index}`}
                                value={variant.durationUnit || ''}
                                onChange={(e) => updateDefaultPriceVariant(index, 'durationUnit', e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white"
                              >
                                <option value="">Select Unit</option>
                                <option value="days">Days</option>
                                <option value="weeks">Weeks</option>
                                <option value="months">Months</option>
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`default-duration-amount-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity
                              </label>
                              <input
                                type="number"
                                id={`default-duration-amount-${index}`}
                                value={variant.durationAmount || ''}
                                onChange={(e) => updateDefaultPriceVariant(index, 'durationAmount', e.target.value)}
                                min="1"
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                placeholder="e.g., 5"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add variant button */}
                    <button
                      type="button"
                      onClick={addDefaultPriceVariant}
                      className="flex items-center gap-2 text-primary hover:text-primary-dark font-medium text-sm py-2 px-4 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add price variant
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                  <input
                    id="autoRenew"
                    type="checkbox"
                    checked={autoRenew}
                    onChange={(e) => setAutoRenew(e.target.checked)}
                    className="h-4 w-4 text-primary border-gray-300 rounded"
                  />
                  <label htmlFor="autoRenew" className="text-sm font-medium text-gray-700">
                    Auto-renew subscription
                  </label>
                </div>

                {isEditing && (
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="block w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
            </div>

            {/* Error Message */}
            {tierError && <p className="text-red-500 text-sm">{tierError}</p>}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => navigate('/plans')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary px-6"
              >
                {loading ? 'Saving...' : isEditing ? 'Update Tier' : 'Create Tier'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
