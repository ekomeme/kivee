import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, collection, query, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Edit, Trash2, MoreVertical, Package, Tag, Zap, X, Copy, ArrowUp, ArrowDown, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingBar from './LoadingBar.jsx';
import '../styles/sections.css';
import { useAcademy } from '../contexts/AcademyContext';
import { hasValidMembership } from '../utils/permissions';
import { formatAcademyCurrency, toDateSafe } from '../utils/formatters';
import { COLLECTIONS } from '../config/constants';
import { getLocations } from '../services/firestore';
import { ROUTES } from '../config/routes';

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

export default function PlansOffersSection({ user, db }) {
  const { academy, membership, studentLabelPlural } = useAcademy();
  const navigate = useNavigate();
  const [tiers, setTiers] = useState([]);
  const [oneTimeProducts, setOneTimeProducts] = useState([]);
  const [trials, setTrials] = useState([]);

  const [activeTab, setActiveTab] = useState('tiers'); // 'tiers', 'products', 'trials'
  const touchStartX = useRef(0);
  const touchMoved = useRef(false);

  // States for Membership Tiers
  const [newTierName, setNewTierName] = useState('');
  const [newTierDescription, setNewTierDescription] = useState('');
  const [pricingModel, setPricingModel] = useState('monthly'); // 'monthly', 'semi-annual', 'annual', 'term'
  const [price, setPrice] = useState('');
  const [enabledLocations, setEnabledLocations] = useState({}); // { locationId: true/false }
  const [locationPrices, setLocationPrices] = useState({}); // { locationId: price }
  const [termStartDate, setTermStartDate] = useState('');
  const [termEndDate, setTermEndDate] = useState('');
  const [classesPerWeek, setClassesPerWeek] = useState('');
  const [classDuration, setClassDuration] = useState(''); // Duration in minutes
  const [classLimitPerCycle, setClassLimitPerCycle] = useState('');
  const [requiresEnrollmentFee, setRequiresEnrollmentFee] = useState(false);
  const [status, setStatus] = useState('active');
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [tierError, setTierError] = useState(null);
  const [editingTier, setEditingTier] = useState(null); // State for editing
  const [showTierModal, setShowTierModal] = useState(false);
  const [activeTierMenu, setActiveTierMenu] = useState(null); // To control which tier's menu is open
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // States for One-time Products
  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState('enrollment');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productEnabledLocations, setProductEnabledLocations] = useState({}); // { locationId: true/false }
  const [productLocationPrices, setProductLocationPrices] = useState({}); // { locationId: price }
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [activeProductMenu, setActiveProductMenu] = useState(null);

  // States for Trials
  const [trialName, setTrialName] = useState('');
  const [durationInDays, setDurationInDays] = useState('');
  const [classLimit, setClassLimit] = useState('');
  const [trialPrice, setTrialPrice] = useState('');
  const [trialEnabledLocations, setTrialEnabledLocations] = useState({}); // { locationId: true/false }
  const [trialLocationPrices, setTrialLocationPrices] = useState({}); // { locationId: price }
  const [convertsToTierId, setConvertsToTierId] = useState('');
  const [loadingTrials, setLoadingTrials] = useState(false);
  const [trialError, setTrialError] = useState(null);
  const [editingTrial, setEditingTrial] = useState(null);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [activeTrialMenu, setActiveTrialMenu] = useState(null);


  const [actionsMenuPosition, setActionsMenuPosition] = useState({ x: 0, y: 0 });
  const productMenuRef = useRef(null);
  const trialMenuRef = useRef(null);

  // Sorting state for tiers
  const [tiersSortConfig, setTiersSortConfig] = useState({ key: null, direction: 'ascending' });

  // Student count per tier
  const [tierStudentCounts, setTierStudentCounts] = useState({});

  const fetchTiers = async () => {
    if (!user || !academy || !membership) return;
    if (!hasValidMembership(membership)) {
      return;
    }
    const tiersRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.TIERS}`);
    const q = query(tiersRef);
    const querySnapshot = await getDocs(q);
    const tiersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort by creation date (newest first)
    tiersData.sort((a, b) => {
      const dateA = toDateSafe(a.createdAt) || new Date(0);
      const dateB = toDateSafe(b.createdAt) || new Date(0);
      return dateB - dateA; // Descending order (newest first)
    });

    setTiers(tiersData);
  };

  const fetchProducts = async () => {
    if (!user || !academy || !membership) return;
    if (!hasValidMembership(membership)) {
      return;
    }
    const productsRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.PRODUCTS}`);
    const q = query(productsRef);
    const querySnapshot = await getDocs(q);
    const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort by creation date (newest first)
    productsData.sort((a, b) => {
      const dateA = toDateSafe(a.createdAt) || new Date(0);
      const dateB = toDateSafe(b.createdAt) || new Date(0);
      return dateB - dateA; // Descending order (newest first)
    });

    setOneTimeProducts(productsData);
  };

  const fetchTrials = async () => {
    if (!user || !academy || !membership) return;
    if (!hasValidMembership(membership)) {
      return;
    }
    const trialsRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.TRIALS}`);
    const q = query(trialsRef);
    const querySnapshot = await getDocs(q);
    const trialsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort by creation date (newest first)
    trialsData.sort((a, b) => {
      const dateA = toDateSafe(a.createdAt) || new Date(0);
      const dateB = toDateSafe(b.createdAt) || new Date(0);
      return dateB - dateA; // Descending order (newest first)
    });

    setTrials(trialsData);
  };

  const fetchTierStudentCounts = async () => {
    if (!user || !academy || !membership) return;
    if (!hasValidMembership(membership)) {
      return;
    }
    try {
      const playersRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.PLAYERS}`);
      const querySnapshot = await getDocs(playersRef);

      const counts = {};
      querySnapshot.docs.forEach(doc => {
        const player = doc.data();
        if (player.plan && player.plan.type === 'tier' && player.plan.id) {
          const tierId = player.plan.id;
          counts[tierId] = (counts[tierId] || 0) + 1;
        }
      });

      setTierStudentCounts(counts);
    } catch (err) {
      console.error('Error fetching tier student counts:', err);
    }
  };

  useEffect(() => {
    fetchTiers();
    fetchProducts();
    fetchTrials();
    fetchLocationsData();
    fetchTierStudentCounts();
  }, [user, academy, membership]);

  const fetchLocationsData = async () => {
    if (!academy?.id || !db) return;
    setLoadingLocations(true);
    try {
      const locationsData = await getLocations(db, academy.id);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  // Helper function to get active locations for a tier
  const getTierActiveLocations = (tier) => {
    if (!tier || !locations || locations.length === 0) return [];

    const activeLocations = [];

    // New structure with location-based price variants
    if (tier.differentPricesByLocation && tier.priceVariantsByLocation) {
      Object.keys(tier.priceVariantsByLocation).forEach(locationId => {
        const locationVariants = tier.priceVariantsByLocation[locationId];
        if (locationVariants && Array.isArray(locationVariants)) {
          const hasValidVariants = locationVariants.some(v => v.billingPeriod && v.price);
          if (hasValidVariants) {
            const location = locations.find(loc => loc.id === locationId);
            if (location) activeLocations.push(location.name);
          }
        }
      });
    }
    // New structure with default price variants (same for all locations)
    else if (tier.defaultPriceVariants && tier.defaultPriceVariants.length > 0) {
      const hasValidVariants = tier.defaultPriceVariants.some(v => v.billingPeriod && v.price);
      if (hasValidVariants) {
        locations.forEach(loc => {
          if (loc.status === 'active') activeLocations.push(loc.name);
        });
      }
    }
    // Legacy structure - locationPrices
    else if (tier.locationPrices && Object.keys(tier.locationPrices).length > 0) {
      Object.keys(tier.locationPrices).forEach(locationId => {
        const price = tier.locationPrices[locationId];
        if (price && Number(price) > 0) {
          const location = locations.find(loc => loc.id === locationId);
          if (location) activeLocations.push(location.name);
        }
      });
    }

    return activeLocations;
  };

  // Helper function to format locations display
  const formatLocationsDisplay = (tier) => {
    const activeLocationNames = getTierActiveLocations(tier);

    if (activeLocationNames.length === 0) {
      return <span className="text-sm text-gray-500">No locations</span>;
    }

    if (activeLocationNames.length === 1) {
      return <span className="text-sm text-gray-700">{activeLocationNames[0]}</span>;
    }

    if (activeLocationNames.length === 2) {
      return <span className="text-sm text-gray-700">{activeLocationNames.join(', ')}</span>;
    }

    // Show first 2 and count the rest
    const firstTwo = activeLocationNames.slice(0, 2).join(', ');
    const remaining = activeLocationNames.length - 2;
    return (
      <span className="text-sm text-gray-700">
        {firstTwo}, <span className="text-gray-500">+{remaining}</span>
      </span>
    );
  };

  // Sorting functions for tiers
  const handleTiersSort = (key) => {
    let direction = 'ascending';
    if (tiersSortConfig.key === key && tiersSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setTiersSortConfig({ key, direction });
  };

  const getSortedTiers = () => {
    if (!tiersSortConfig.key) return tiers;

    const sorted = [...tiers].sort((a, b) => {
      let aVal, bVal;

      if (tiersSortConfig.key === 'name') {
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
      } else if (tiersSortConfig.key === 'classes') {
        aVal = Number(a.classesPerWeek) || 0;
        bVal = Number(b.classesPerWeek) || 0;
      } else if (tiersSortConfig.key === 'students') {
        aVal = tierStudentCounts[a.id] || 0;
        bVal = tierStudentCounts[b.id] || 0;
      }

      if (aVal < bVal) {
        return tiersSortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aVal > bVal) {
        return tiersSortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  };

  const handleAddOrUpdateTier = async (e) => {
    e.preventDefault();
    if (!user || !academy || loadingTiers || !membership) return;
    
    const userIsOwner = academy?.ownerId === user.uid;
    if (!userIsOwner && !['admin'].includes(membership?.role)) {
      toast.error("You don't have permission to modify tiers.");
      return;
    }

    setLoadingTiers(true);
    setTierError(null);

    // Filter only enabled locations with prices
    const filteredLocationPrices = {};
    Object.keys(enabledLocations).forEach(locId => {
      if (enabledLocations[locId] && locationPrices[locId]) {
        filteredLocationPrices[locId] = Number(locationPrices[locId]) || 0;
      }
    });

    const tierData = {
      name: newTierName,
      ...(newTierDescription && { description: newTierDescription }), // Only include if not empty
      pricingModel: pricingModel,
      price: 0, // No longer used, kept for backward compatibility
      enabledLocations: enabledLocations,
      locationPrices: filteredLocationPrices,
      termStartDate: pricingModel === 'term' ? termStartDate : null,
      termEndDate: pricingModel === 'term' ? termEndDate : null,
      classesPerWeek: Number(classesPerWeek) || 0,
      classDuration: Number(classDuration) || 0, // Duration in minutes
      classLimitPerCycle: classLimitPerCycle ? Number(classLimitPerCycle) : null,
      requiresEnrollmentFee,
      status,
      academyId: academy.id,
      createdAt: editingTier ? editingTier.createdAt : new Date(),
      updatedAt: new Date(),
    };

    try {
      if (editingTier) {
        // Update existing tier
        const tierDocRef = doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.TIERS}`, editingTier.id);
        await updateDoc(tierDocRef, removeUndefinedFields(tierData));
        toast.success("Tier updated successfully.");
      } else {
        // Add new tier
        const tiersCollectionRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.TIERS}`);
        await addDoc(tiersCollectionRef, removeUndefinedFields(tierData));
        toast.success("Tier added successfully.");
      }
      setNewTierName('');
      setNewTierDescription('');
      setPricingModel('monthly');
      setPrice('');
      setTermStartDate('');
      setTermEndDate('');
      setClassesPerWeek('');
      setClassLimitPerCycle('');
      setRequiresEnrollmentFee(false);
      setStatus('active');
      setEditingTier(null);
      setShowTierModal(false); // Close modal on success
      fetchTiers(); // Refresh the list
    } catch (err) {
      console.error("Error saving tier:", err);
      setTierError("Error saving tier: " + err.message);
      toast.error("Error saving tier.");
    } finally {
      setLoadingTiers(false);
    }
  };

  const handleEditClick = (tier) => {
    setEditingTier(tier);
    setNewTierName(tier.name);
    setNewTierDescription(tier.description);
    setPricingModel(tier.pricingModel || 'monthly');
    setPrice(tier.price || '');
    setEnabledLocations(tier.enabledLocations || {});
    setLocationPrices(tier.locationPrices || {});
    setTermStartDate(tier.termStartDate || '');
    setTermEndDate(tier.termEndDate || '');
    setClassesPerWeek(tier.classesPerWeek || '');
    setClassDuration(tier.classDuration || '');
    setClassLimitPerCycle(tier.classLimitPerCycle || '');
    setRequiresEnrollmentFee(tier.requiresEnrollmentFee || false);
    setStatus(tier.status || 'active');
  };

  const handleOpenTierModal = (tier = null) => {
    if (tier) {
      handleEditClick(tier);
    } else {
      // Clear fields for a new tier - enable all locations by default
      const defaultEnabledLocations = {};
      locations.filter(loc => loc.status === 'active').forEach(loc => {
        defaultEnabledLocations[loc.id] = true;
      });

      setEditingTier(null);
      setNewTierName('');
      setNewTierDescription('');
      setPricingModel('monthly');
      setPrice('');
      setEnabledLocations(defaultEnabledLocations);
      setLocationPrices({});
      setTermStartDate('');
      setTermEndDate('');
      setClassesPerWeek('');
      setClassDuration('');
      setClassLimitPerCycle('');
      setRequiresEnrollmentFee(false);
      setStatus('active');
      setTierError(null);
    }
    setShowTierModal(true);
  };

  const handleAddOrUpdateProduct = async (e) => {
    e.preventDefault();
    if (!user || !academy || loadingProducts || !membership) return;
    
    const userIsOwner = academy?.ownerId === user.uid;
    if (!userIsOwner && !['admin'].includes(membership?.role)) {
      toast.error("You don't have permission to modify products.");
      return;
    }

    setLoadingProducts(true);
    setProductError(null);

    // Filter only enabled locations with prices
    const filteredProductPrices = {};
    Object.keys(productEnabledLocations).forEach(locId => {
      if (productEnabledLocations[locId] && productLocationPrices[locId]) {
        filteredProductPrices[locId] = Number(productLocationPrices[locId]) || 0;
      }
    });

    const productData = {
      name: productName,
      type: productType,
      ...(productDescription && { description: productDescription }), // Only include if not empty
      price: 0, // No longer used
      enabledLocations: productEnabledLocations,
      locationPrices: filteredProductPrices,
      academyId: academy.id,
      createdAt: editingProduct ? editingProduct.createdAt : new Date(),
      updatedAt: new Date(),
    };

    try {
      if (editingProduct) {
        const productDocRef = doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.PRODUCTS}`, editingProduct.id);
        await updateDoc(productDocRef, removeUndefinedFields(productData));
        toast.success("Product updated successfully.");
      } else {
        const productsCollectionRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.PRODUCTS}`);
        await addDoc(productsCollectionRef, removeUndefinedFields(productData));
        toast.success("Product added successfully.");
      }
      setShowProductModal(false);
      fetchProducts();
    } catch (err) {
      setProductError("Error saving product: " + err.message);
      toast.error("Error saving product.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleOpenProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductName(product.name);
      setProductType(product.type);
      setProductDescription(product.description || '');
      setProductPrice(product.price || '');
      setProductEnabledLocations(product.enabledLocations || {});
      setProductLocationPrices(product.locationPrices || {});
    } else {
      // Enable all locations by default for new product
      const defaultEnabledLocations = {};
      locations.filter(loc => loc.status === 'active').forEach(loc => {
        defaultEnabledLocations[loc.id] = true;
      });

      setEditingProduct(null);
      setProductName('');
      setProductType('enrollment');
      setProductDescription('');
      setProductPrice('');
      setProductEnabledLocations(defaultEnabledLocations);
      setProductLocationPrices({});
      setProductError(null);
    }
    setShowProductModal(true);
  };

  const handleAddOrUpdateTrial = async (e) => {
    e.preventDefault();
    if (!user || !academy || loadingTrials || !membership) return;
    
    const userIsOwner = academy?.ownerId === user.uid;
    if (!userIsOwner && !['admin'].includes(membership?.role)) {
      toast.error("You don't have permission to modify trials.");
      return;
    }

    setLoadingTrials(true);
    setTrialError(null);

    // Filter only enabled locations with prices
    const filteredTrialPrices = {};
    Object.keys(trialEnabledLocations).forEach(locId => {
      if (trialEnabledLocations[locId] && trialLocationPrices[locId]) {
        filteredTrialPrices[locId] = Number(trialLocationPrices[locId]) || 0;
      }
    });

    const trialData = {
      name: trialName,
      durationInDays: Number(durationInDays),
      classLimit: classLimit ? Number(classLimit) : 'unlimited',
      price: 0, // No longer used
      enabledLocations: trialEnabledLocations,
      locationPrices: filteredTrialPrices,
      convertsToTierId: convertsToTierId || null,
      autoRenew: false, // Trials never auto-renew
      academyId: academy.id,
      createdAt: editingTrial ? editingTrial.createdAt : new Date(),
      updatedAt: new Date(),
    };

    try {
      if (editingTrial) {
        const trialDocRef = doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.TRIALS}`, editingTrial.id);
        await updateDoc(trialDocRef, removeUndefinedFields(trialData));
        toast.success("Trial updated successfully.");
      } else {
        const trialsCollectionRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.TRIALS}`);
        await addDoc(trialsCollectionRef, removeUndefinedFields(trialData));
        toast.success("Trial added successfully.");
      }
      setShowTrialModal(false);
      fetchTrials();
    } catch (err) {
      setTrialError("Error saving trial: " + err.message);
      toast.error("Error saving trial.");
    } finally {
      setLoadingTrials(false);
    }
  };

  const handleOpenTrialModal = (trial = null) => {
    if (trial) {
      setEditingTrial(trial);
      setTrialName(trial.name);
      setDurationInDays(trial.durationInDays);
      setClassLimit(trial.classLimit === 'unlimited' ? '' : trial.classLimit);
      setTrialPrice(trial.price);
      setTrialEnabledLocations(trial.enabledLocations || {});
      setTrialLocationPrices(trial.locationPrices || {});
      setConvertsToTierId(trial.convertsToTierId || '');
    } else {
      // Enable all locations by default for new trial
      const defaultEnabledLocations = {};
      locations.filter(loc => loc.status === 'active').forEach(loc => {
        defaultEnabledLocations[loc.id] = true;
      });

      setEditingTrial(null);
      setTrialName('');
      setDurationInDays('');
      setClassLimit('');
      setTrialPrice('');
      setTrialEnabledLocations(defaultEnabledLocations);
      setTrialLocationPrices({});
      setConvertsToTierId('');
      setTrialError(null);
    }
    setShowTrialModal(true);
  };

  const handleDuplicateTier = async (tier) => {
    try {
      const tierData = {
        name: `${tier.name} (Copy)`,
        description: tier.description,
        differentPricesByLocation: tier.differentPricesByLocation,
        classesPerWeek: tier.classesPerWeek,
        classDuration: tier.classDuration,
        classLimitPerCycle: tier.classLimitPerCycle,
        requiresEnrollmentFee: tier.requiresEnrollmentFee,
        status: tier.status,
        academyId: academy.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Copy price variant structures
        priceVariantsByLocation: tier.priceVariantsByLocation || {},
        defaultPriceVariants: tier.defaultPriceVariants || [],
        // Legacy fields for backward compatibility
        pricingModel: tier.pricingModel,
        price: tier.price || 0,
        enabledLocations: tier.enabledLocations || {},
        locationPrices: tier.locationPrices || {},
        termStartDate: tier.termStartDate,
        termEndDate: tier.termEndDate,
      };

      const tiersCollectionRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.TIERS}`);
      await addDoc(tiersCollectionRef, removeUndefinedFields(tierData));
      toast.success("Tier duplicated successfully.");
      fetchTiers();
    } catch (error) {
      console.error("Error duplicating tier:", error);
      toast.error("Error duplicating tier.");
    }
  };

  const handleToggleTierStatus = async (tier) => {
    const newStatus = tier.status === 'active' ? 'inactive' : 'active';
    try {
      const tierDocRef = doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.TIERS}`, tier.id);
      await updateDoc(tierDocRef, { status: newStatus });
      fetchTiers();
      toast.success(`Tier ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`);
    } catch (error) {
      console.error("Error updating tier status:", error);
      toast.error("Error updating tier status.");
    }
  };

  const handleDeleteTier = async (tierId) => {
    const deleteAction = async () => {
      try {
        await deleteDoc(doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.TIERS}`, tierId));
        fetchTiers();
        toast.success("Tier deleted successfully.");
      } catch (error) {
        console.error("Error deleting tier:", error);
        toast.error("Error deleting tier.");
      }
    };

    toast((t) => (
      <div className="bg-section p-4 rounded-lg shadow-lg flex flex-col items-center">
        <p className="text-center mb-4">Are you sure you want to delete this tier?</p>
        <div className="flex space-x-2 text-base">
          <button
            onClick={() => { toast.dismiss(t.id); deleteAction(); }}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Confirm
          </button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 6000,
    });
  };

  const handleDeleteProduct = async (productId) => {
    const deleteAction = async () => {
      try {
        await deleteDoc(doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.PRODUCTS}`, productId));
        fetchProducts();
        toast.success("Product deleted successfully.");
      } catch (error) {
        toast.error("Error deleting product.");
      }
    };
    toast((t) => (
      <div className="bg-section p-4 rounded-lg shadow-lg flex flex-col items-center">
        <p className="text-center mb-4">Are you sure you want to delete this product?</p>
        <div className="flex space-x-2 text-base">
          <button onClick={() => { toast.dismiss(t.id); deleteAction(); }} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Confirm</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">Cancel</button>
        </div>
      </div>
    ), {
      duration: 6000,
    });
  };

  const handleDeleteTrial = async (trialId) => {
    const deleteAction = async () => {
      try {
        await deleteDoc(doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.TRIALS}`, trialId));
        fetchTrials();
        toast.success("Trial deleted successfully.");
      } catch (error) {
        toast.error("Error deleting trial.");
      }
    };
    toast((t) => (
      <div className="bg-section p-4 rounded-lg shadow-lg flex flex-col items-center">
        <p className="text-center mb-4">Are you sure you want to delete this trial?</p>
        <div className="flex space-x-2 text-base">
          <button onClick={() => { toast.dismiss(t.id); deleteAction(); }} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Confirm</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">Cancel</button>
        </div>
      </div>
    ), {
      duration: 6000,
    });
  };

  // Custom hook to detect clicks outside a component
  const useOutsideClick = (ref, callback) => {
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (ref.current && !ref.current.contains(event.target)) {
          callback();
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [ref, callback]);
  };

  const ActionsMenu = ({ tier, onClose }) => {
    const menuRef = useRef(null);
    useOutsideClick(menuRef, onClose);

    const style = {
      top: `${actionsMenuPosition.y}px`,
      left: `${actionsMenuPosition.x}px`,
      transform: 'translateX(-100%)', // This will align the menu's right edge with the button's right edge
    };


    return (
      <div className="fixed bg-section border border-gray-border rounded-md shadow-lg z-50" ref={menuRef} style={style}>
        <ul className="py-1">
          <li className="text-base w-40">
            <button onClick={(e) => { e.stopPropagation(); navigate(ROUTES.PLAN_TIER_EDIT(tier.id)); onClose(); }} className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 flex items-center">
              <Edit className="mr-3 h-4 w-4" />
              <span>Edit</span>
            </button>
          </li>
          <li className="text-base">
            <button onClick={(e) => { e.stopPropagation(); handleDuplicateTier(tier); onClose(); }} className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 flex items-center">
              <Copy className="mr-3 h-4 w-4" />
              <span>Duplicate</span>
            </button>
          </li>
          <li className="text-base">
            <button onClick={(e) => { e.stopPropagation(); handleToggleTierStatus(tier); onClose(); }} className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 flex items-center">
              {tier.status === 'active' ? (
                <>
                  <XCircle className="mr-3 h-4 w-4" />
                  <span>Deactivate</span>
                </>
              ) : (
                <>
                  <CheckCircle className="mr-3 h-4 w-4" />
                  <span>Activate</span>
                </>
              )}
            </button>
          </li>
          <li className="text-base">
            <button onClick={(e) => { e.stopPropagation(); handleDeleteTier(tier.id); onClose(); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center">
              <Trash2 className="mr-3 h-4 w-4" />
              <span>Delete</span>
            </button>
          </li>
        </ul>
      </div>
    );
  };

  // Close product/trial menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeProductMenu && productMenuRef.current && !productMenuRef.current.contains(e.target)) {
        setActiveProductMenu(null);
      }
      if (activeTrialMenu && trialMenuRef.current && !trialMenuRef.current.contains(e.target)) {
        setActiveTrialMenu(null);
      }
    };
    if (activeProductMenu || activeTrialMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeProductMenu, activeTrialMenu]);

  // Helper function to get price display for tier
  const getTierPriceDisplay = (tier) => {
    // Check for location-based pricing (new structure with variants per location)
    if (tier.differentPricesByLocation && tier.priceVariantsByLocation) {
      // Get all variants from all locations
      const allLocationVariants = Object.values(tier.priceVariantsByLocation);
      const hasAnyValidVariants = allLocationVariants.some(locationVariants =>
        Array.isArray(locationVariants) && locationVariants.some(v => v.billingPeriod && v.price)
      );

      if (!hasAnyValidVariants) {
        return { type: 'none', display: <span className="text-sm text-gray-500">No price set</span> };
      }

      return { type: 'multiple', display: <span className="text-sm text-gray-600 italic">Price variants</span> };
    }

    // Check if tier uses new price variants structure (default for all locations)
    if (tier.defaultPriceVariants && tier.defaultPriceVariants.length > 0) {
      // Check if all variants have the same billing period and price
      const validVariants = tier.defaultPriceVariants.filter(v => v.billingPeriod && v.price);

      if (validVariants.length === 0) {
        return { type: 'none', display: <span className="text-sm text-gray-500">No price set</span> };
      }

      if (validVariants.length === 1) {
        const variant = validVariants[0];
        const periodLabel = variant.billingPeriod === 'monthly' ? 'Monthly' :
                          variant.billingPeriod === 'semi-annual' ? 'Semi-Annual' :
                          variant.billingPeriod === 'annual' ? 'Annual' :
                          variant.billingPeriod === 'custom-term' ? variant.customTermName || 'Custom Term' :
                          variant.billingPeriod === 'custom-duration' ? `${variant.durationAmount} ${variant.durationUnit}` :
                          'Custom';
        return {
          type: 'single',
          display: <span>{periodLabel} {formatAcademyCurrency(variant.price, academy)}</span>
        };
      }

      // Multiple variants
      return { type: 'multiple', display: <span className="text-sm text-gray-600 italic">Price variants</span> };
    }

    // Legacy structure - location prices
    if (tier.locationPrices && Object.keys(tier.locationPrices).length > 0) {
      const prices = Object.values(tier.locationPrices);
      const uniquePrices = [...new Set(prices)];

      if (uniquePrices.length === 1) {
        const periodLabel = tier.pricingModel === 'monthly' ? 'Monthly' :
                          tier.pricingModel === 'semi-annual' ? 'Semi-Annual' :
                          tier.pricingModel === 'annual' ? 'Annual' :
                          tier.pricingModel === 'term' ? 'Term' : '';
        return {
          type: 'single',
          display: <span>{periodLabel} {formatAcademyCurrency(uniquePrices[0], academy)}</span>
        };
      } else {
        return { type: 'multiple', display: <span className="text-sm text-gray-600 italic">Price variants</span> };
      }
    }

    return { type: 'none', display: <span className="text-sm text-gray-500">No price set</span> };
  };

  const handleOpenActionsMenu = (tier, event) => {
    event.stopPropagation(); // Prevent row click
    const rect = event.currentTarget.getBoundingClientRect();
    setActionsMenuPosition({
      x: rect.right + window.scrollX,
      y: rect.top + window.scrollY,
    });
    setActiveTierMenu(tier);
  };

  const handleTabTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchMoved.current = false;
  };

  const handleTabTouchMove = (e) => {
    if (Math.abs(e.touches[0].clientX - touchStartX.current) > 10) {
      touchMoved.current = true;
    }
  };

  const handleTabClick = (action) => () => {
    if (touchMoved.current) {
      touchMoved.current = false;
      return;
    }
    action();
  };

  return (
    <div className="section-container">
      <div className="section-content-wrapper space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Plans & Offers</h2>
          {activeTab === 'tiers' && (
            <button onClick={() => navigate(ROUTES.PLAN_TIER_NEW)} className="btn-primary">
              <Plus className="mr-2 h-5 w-5" /> Add New Tier
            </button>
          )}
          {activeTab === 'products' && (
            <button onClick={() => handleOpenProductModal()} className="btn-primary">
              <Plus className="mr-2 h-5 w-5" /> Add New Product
            </button>
          )}
          {activeTab === 'trials' && (
            <button onClick={() => handleOpenTrialModal()} className="btn-primary">
              <Plus className="mr-2 h-5 w-5" /> Add New Trial
            </button>
          )}
        </div>

        <div className="content-card-responsive">
          <LoadingBar loading={loadingTiers || loadingProducts || loadingTrials} />
          {/* Tabs */}
          <div className="tabs-container">
            <div
              className="tabs-scroll-wrapper"
              onTouchStart={handleTabTouchStart}
              onTouchMove={handleTabTouchMove}
            >
              <nav
                className="tabs-nav"
                aria-label="Tabs"
                role="tablist"
              >
                <button role="tab" aria-selected={activeTab === 'tiers'} onClick={handleTabClick(() => setActiveTab('tiers'))} className={`tab-button ${activeTab === 'tiers' ? 'active' : ''}`}>
                  <Zap /> Membership Tiers
                </button>
                <button role="tab" aria-selected={activeTab === 'products'} onClick={handleTabClick(() => setActiveTab('products'))} className={`tab-button ${activeTab === 'products' ? 'active' : ''}`}>
                  <Package /> One-time Products
                </button>
                {/* Trials tab temporarily disabled */}
                {/* <button role="tab" aria-selected={activeTab === 'trials'} onClick={handleTabClick(() => setActiveTab('trials'))} className={`tab-button ${activeTab === 'trials' ? 'active' : ''}`}>
                  <Tag /> Trials
                </button> */}
              </nav>
              <div className="tabs-scroll-gradient md:hidden" aria-hidden />
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'tiers' && (
            <>
              {tiers.length === 0 ? (
                <div className="text-center p-10 text-gray-500 border-2 border-dashed rounded-lg mt-4">
                  <p>No membership tiers registered yet.</p>
                  <p className="text-sm">Click "Add New Tier" to get started.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto hidden md:block mt-6">
                    <table className="min-w-full bg-section">
                      <thead>
                        <tr>
                          <th className="py-2 px-4 border-b text-left table-header">
                            <button onClick={() => handleTiersSort('name')} className="flex items-center hover:text-gray-900">
                              Name
                              {tiersSortConfig.key === 'name' && (
                                tiersSortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                              )}
                            </button>
                          </th>
                          <th className="py-2 px-4 border-b text-left table-header">
                            <button onClick={() => handleTiersSort('classes')} className="flex items-center hover:text-gray-900">
                              Classes
                              {tiersSortConfig.key === 'classes' && (
                                tiersSortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                              )}
                            </button>
                          </th>
                          <th className="py-2 px-4 border-b text-left table-header">Locations</th>
                          <th className="py-2 px-4 border-b text-left table-header">
                            <button onClick={() => handleTiersSort('students')} className="flex items-center hover:text-gray-900">
                              {studentLabelPlural}
                              {tiersSortConfig.key === 'students' && (
                                tiersSortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                              )}
                            </button>
                          </th>
                          <th className="py-2 px-4 border-b text-left table-header">Status</th>
                          <th className="py-2 px-4 border-b text-right table-header">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getSortedTiers().map(tier => (
                          <tr
                            key={tier.id}
                            className="hover:bg-gray-50 table-row-hover cursor-pointer"
                            onClick={() => navigate(ROUTES.PLAN_TIER_EDIT(tier.id))}
                          >
                            <td className="py-3 px-4 border-b text-base font-medium table-cell">{tier.name}</td>
                            <td className="py-3 px-4 border-b text-sm text-gray-600 table-cell">{tier.classesPerWeek ? `${tier.classesPerWeek} per week` : 'N/A'}</td>
                            <td className="py-3 px-4 border-b text-base table-cell">
                              {formatLocationsDisplay(tier)}
                            </td>
                            <td className="py-3 px-4 border-b text-sm text-gray-600 table-cell">
                              {tierStudentCounts[tier.id] || 0}
                            </td>
                            <td className="py-3 px-4 border-b table-cell">
                              <span className={`badge ${tier.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                                {tier.status.charAt(0).toUpperCase() + tier.status.slice(1)}
                              </span>
                            </td>
                            <td className="py-3 px-4 border-b text-right table-cell">
                              <button onClick={(e) => handleOpenActionsMenu(tier, e)} className="p-1 rounded-full hover:bg-gray-200 focus:outline-none" aria-label={`Actions for tier ${tier.name}`}>
                                <MoreVertical className="h-5 w-5 text-gray-500" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="grid gap-3 md:hidden mt-6">
                    {getSortedTiers().map(tier => (
                      <div
                        key={tier.id}
                        className="bg-section border border-gray-200 rounded-lg p-4 shadow-sm relative cursor-pointer"
                        onClick={() => navigate(ROUTES.PLAN_TIER_EDIT(tier.id))}
                      >
                        <button
                          onClick={(e) => handleOpenActionsMenu(tier, e)}
                          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
                          aria-label="More actions"
                        >
                          <MoreVertical className="h-5 w-5 text-gray-600" />
                        </button>
                        <p className="font-semibold text-gray-900 text-lg">{tier.name}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-700">
                          <div className="bg-gray-50 rounded-md p-2">
                            <p className="text-xs text-gray-500">Classes</p>
                            <p className="font-medium">{tier.classesPerWeek ? `${tier.classesPerWeek}/week` : 'N/A'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-md p-2">
                            <p className="text-xs text-gray-500">Locations</p>
                            <p className="font-medium">{formatLocationsDisplay(tier)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-md p-2">
                            <p className="text-xs text-gray-500">{studentLabelPlural}</p>
                            <p className="font-medium">{tierStudentCounts[tier.id] || 0}</p>
                          </div>
                          <div className="bg-gray-50 rounded-md p-2">
                            <p className="text-xs text-gray-500">Status</p>
                            <p className="font-medium capitalize">{tier.status}</p>
                          </div>
                          {tier.pricingModel === 'term' && (
                            <div className="bg-gray-50 rounded-md p-2 col-span-2">
                              <p className="text-xs text-gray-500">Term</p>
                              <p className="font-medium">{tier.termStartDate} - {tier.termEndDate}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )
              }
            </>
          )}
          {activeTab === 'products' && (
            <>
          {oneTimeProducts.length === 0 ? (
            <div className="text-center p-10 text-gray-500 border-2 border-dashed rounded-lg mt-4">
              <p>No one-time products created yet.</p>
              <p className="text-sm">Create products like enrollment fees, equipment, or event tickets.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto hidden md:block mt-6">
                <table className="min-w-full bg-section">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left table-header">Name</th>
                      <th className="py-2 px-4 border-b text-left table-header">Type</th>
                      <th className="py-2 px-4 border-b text-left table-header">Price</th>
                      <th className="py-2 px-4 border-b text-right table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oneTimeProducts.map(product => (
                      <tr key={product.id} className="hover:bg-gray-50 table-row-hover">
                        <td className="py-3 px-4 border-b text-base font-medium table-cell">{product.name}</td>
                        <td className="py-3 px-4 border-b text-sm text-gray-600 capitalize table-cell">{product.type}</td>
                        <td className="py-3 px-4 border-b text-base table-cell">
                          {product.locationPrices && Object.keys(product.locationPrices).length > 0 ? (
                            (() => {
                              const prices = Object.values(product.locationPrices);
                              const uniquePrices = [...new Set(prices)];
                              if (uniquePrices.length === 1) {
                                return formatAcademyCurrency(uniquePrices[0], academy);
                              } else {
                                return <span className="text-sm text-gray-600 italic">Varies by location</span>;
                              }
                            })()
                          ) : (
                            <span className="text-sm text-gray-500">No price set</span>
                          )}
                        </td>
                        <td className="py-3 px-4 border-b text-right table-cell">
                        <button onClick={(e) => { e.stopPropagation(); setActiveProductMenu(product); setActionsMenuPosition({ x: e.currentTarget.getBoundingClientRect().right + window.scrollX, y: e.currentTarget.getBoundingClientRect().top + window.scrollY }); }} className="p-1 rounded-full hover:bg-gray-200 focus:outline-none" aria-label={`Actions for product ${product.name}`}>
                          <MoreVertical className="h-5 w-5 text-gray-500" />
                        </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 md:hidden mt-6">
                {oneTimeProducts.map(product => (
                  <div key={product.id} className="bg-section border border-gray-200 rounded-lg p-4 shadow-sm relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveProductMenu(product); setActionsMenuPosition({ x: e.currentTarget.getBoundingClientRect().right + window.scrollX, y: e.currentTarget.getBoundingClientRect().top + window.scrollY }); }}
                      className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
                      aria-label="More actions"
                    >
                      <MoreVertical className="h-5 w-5 text-gray-600" />
                    </button>
                    <p className="font-semibold text-gray-900 text-lg">{product.name}</p>
                    <p className="text-sm text-gray-600 capitalize mt-1">{product.type}</p>
                    <div className="mt-3 bg-gray-50 rounded-md p-2 text-sm text-gray-700">
                      <p className="text-xs text-gray-500">Price</p>
                      <p className="font-medium">
                        {product.locationPrices && Object.keys(product.locationPrices).length > 0 ? (
                          (() => {
                            const prices = Object.values(product.locationPrices);
                            const uniquePrices = [...new Set(prices)];
                            if (uniquePrices.length === 1) {
                              return formatAcademyCurrency(uniquePrices[0], academy);
                            } else {
                              return <span className="text-sm text-gray-600 italic">Varies by location</span>;
                            }
                          })()
                        ) : (
                          <span className="text-sm text-gray-500">No price set</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {/* Trials section temporarily disabled */}
      {/* {activeTab === 'trials' && (
        <>
          {trials.length === 0 ? (
            <div className="text-center p-10 text-gray-500 border-2 border-dashed rounded-lg mt-4">
              <p>No trial packages created yet.</p>
              <p className="text-sm">Offer free or discounted trials to attract new students.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto hidden md:block mt-6">
                <table className="min-w-full bg-section">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left table-header">Name</th>
                      <th className="py-2 px-4 border-b text-left table-header">Duration</th>
                      <th className="py-2 px-4 border-b text-left table-header">Class Limit</th>
                      <th className="py-2 px-4 border-b text-left table-header">Price</th>
                      <th className="py-2 px-4 border-b text-right table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trials.map(trial => (
                      <tr key={trial.id} className="hover:bg-gray-50 table-row-hover">
                        <td className="py-3 px-4 border-b text-base font-medium table-cell">{trial.name}</td>
                        <td className="py-3 px-4 border-b text-sm text-gray-600 table-cell">{trial.durationInDays} days</td>
                        <td className="py-3 px-4 border-b text-sm text-gray-600 capitalize table-cell">{trial.classLimit}</td>
                        <td className="py-3 px-4 border-b text-base table-cell">
                          {trial.locationPrices && Object.keys(trial.locationPrices).length > 0 ? (
                            (() => {
                              const prices = Object.values(trial.locationPrices);
                              const uniquePrices = [...new Set(prices)];
                              if (uniquePrices.length === 1) {
                                return formatAcademyCurrency(uniquePrices[0], academy);
                              } else {
                                return <span className="text-sm text-gray-600 italic">Varies by location</span>;
                              }
                            })()
                          ) : (
                            <span className="text-sm text-gray-500">No price set</span>
                          )}
                        </td>
                        <td className="py-3 px-4 border-b text-right table-cell">
                        <button onClick={(e) => { e.stopPropagation(); setActiveTrialMenu(trial); setActionsMenuPosition({ x: e.currentTarget.getBoundingClientRect().right + window.scrollX, y: e.currentTarget.getBoundingClientRect().top + window.scrollY }); }} className="p-1 rounded-full hover:bg-gray-200 focus:outline-none" aria-label={`Actions for trial ${trial.name}`}>
                          <MoreVertical className="h-5 w-5 text-gray-500" />
                        </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 md:hidden mt-6">
                {trials.map(trial => (
                  <div key={trial.id} className="bg-section border border-gray-200 rounded-lg p-4 shadow-sm relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveTrialMenu(trial); setActionsMenuPosition({ x: e.currentTarget.getBoundingClientRect().right + window.scrollX, y: e.currentTarget.getBoundingClientRect().top + window.scrollY }); }}
                      className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
                      aria-label="More actions"
                    >
                      <MoreVertical className="h-5 w-5 text-gray-600" />
                    </button>
                    <p className="font-semibold text-gray-900 text-lg">{trial.name}</p>
                    <p className="text-sm text-gray-600 mt-1">Duration: {trial.durationInDays} days</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-700">
                      <div className="bg-gray-50 rounded-md p-2">
                        <p className="text-xs text-gray-500">Class Limit</p>
                        <p className="font-medium capitalize">{trial.classLimit}</p>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2">
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="font-medium">
                          {trial.locationPrices && Object.keys(trial.locationPrices).length > 0 ? (
                            (() => {
                              const prices = Object.values(trial.locationPrices);
                              const uniquePrices = [...new Set(prices)];
                              if (uniquePrices.length === 1) {
                                return formatAcademyCurrency(uniquePrices[0], academy);
                              } else {
                                return <span className="text-sm text-gray-600 italic">Varies by location</span>;
                              }
                            })()
                          ) : (
                            <span className="text-sm text-gray-500">No price set</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )} */}
      {/* Actions Menu - Rendered outside the table to avoid clipping */}
      {activeTierMenu && (
        <ActionsMenu
          tier={activeTierMenu}
          onClose={() => setActiveTierMenu(null)}
        />
      )}
      {activeProductMenu && (
        <div ref={productMenuRef} className="fixed bg-section border border-gray-border rounded-md shadow-lg z-50" style={{ top: `${actionsMenuPosition.y}px`, left: `${actionsMenuPosition.x}px`, transform: 'translateX(-100%)' }}>
          <ul className="py-1">
            <li className="text-base w-32">
              <button onClick={() => { handleOpenProductModal(activeProductMenu); setActiveProductMenu(null); }} className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 flex items-center"><Edit className="mr-3 h-4 w-4" /><span>Edit</span></button>
            </li>
            <li className="text-base">
              <button onClick={() => { handleDeleteProduct(activeProductMenu.id); setActiveProductMenu(null); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center"><Trash2 className="mr-3 h-4 w-4" /><span>Delete</span></button>
            </li>
          </ul>
        </div>
      )}
      {activeTrialMenu && (
        <div ref={trialMenuRef} className="fixed bg-section border border-gray-border rounded-md shadow-lg z-50" style={{ top: `${actionsMenuPosition.y}px`, left: `${actionsMenuPosition.x}px`, transform: 'translateX(-100%)' }}>
          <ul className="py-1">
            <li className="text-base w-32">
              <button onClick={() => { handleOpenTrialModal(activeTrialMenu); setActiveTrialMenu(null); }} className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 flex items-center"><Edit className="mr-3 h-4 w-4" /><span>Edit</span></button>
            </li>
            <li className="text-base">
              <button onClick={() => { handleDeleteTrial(activeTrialMenu.id); setActiveTrialMenu(null); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center"><Trash2 className="mr-3 h-4 w-4" /><span>Delete</span></button>
            </li>
          </ul>
        </div>
      )}
      {/* Tier Form Modal */}
      {showTierModal && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-section md:bg-black md:bg-opacity-50 overflow-y-auto">
          <div className="relative w-full h-full md:h-auto bg-section p-6 md:p-8 rounded-none shadow-none md:rounded-lg md:shadow-xl max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold">{editingTier ? 'Edit Tier' : 'Add New Tier'}</h3>
              <button
                type="button"
                onClick={() => setShowTierModal(false)}
                className="p-2 rounded-md hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddOrUpdateTier}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="tierName" className="block text-sm font-medium text-gray-700">Tier Name</label>
                  <input
                    type="text"
                    id="tierName"
                    value={newTierName}
                    onChange={(e) => setNewTierName(e.target.value)} 
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="tierDescription" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                  <textarea
                    id="tierDescription"
                    value={newTierDescription}
                    onChange={(e) => setNewTierDescription(e.target.value)} 
                    rows="3"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pricingModel" className="block text-sm font-medium text-gray-700">Pricing Model</label>
                    <select id="pricingModel" value={pricingModel} onChange={(e) => setPricingModel(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                      <option value="monthly">Monthly</option>
                      <option value="semi-annual">Semi-Annual</option>
                      <option value="annual">Annual</option>
                      <option value="term">Term</option>
                    </select>
                  </div>
                </div>

                {pricingModel === 'term' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md border">
                    <div>
                      <label htmlFor="termStartDate" className="block text-sm font-medium text-gray-700">Term Start Date</label>
                      <input type="date" id="termStartDate" value={termStartDate} onChange={(e) => setTermStartDate(e.target.value)} required={pricingModel === 'term'} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                      <label htmlFor="termEndDate" className="block text-sm font-medium text-gray-700">Term End Date</label>
                      <input type="date" id="termEndDate" value={termEndDate} onChange={(e) => setTermEndDate(e.target.value)} required={pricingModel === 'term'} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price per Location
                  </label>
                  <div className="p-4 bg-gray-50 rounded-md border space-y-3">
                    {loadingLocations ? (
                      <p className="text-sm text-gray-500">Loading locations...</p>
                    ) : locations.filter(loc => loc.status === 'active').length === 0 ? (
                      <p className="text-sm text-gray-500">No active locations available.</p>
                    ) : (
                      locations.filter(loc => loc.status === 'active').map(location => (
                        <div key={location.id} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`enabled-${location.id}`}
                            checked={enabledLocations[location.id] || false}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setEnabledLocations(prev => ({ ...prev, [location.id]: isChecked }));
                              // Clear price if disabled
                              if (!isChecked) {
                                setLocationPrices(prev => {
                                  const updated = { ...prev };
                                  delete updated[location.id];
                                  return updated;
                                });
                              }
                            }}
                            className="h-4 w-4 text-primary border-gray-300 rounded"
                          />
                          <label htmlFor={`enabled-${location.id}`} className="text-sm text-gray-700 min-w-[120px]">
                            {location.name}
                          </label>
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">{academy.currency || '$'}</span>
                            </div>
                            <input
                              type="number"
                              id={`price-${location.id}`}
                              value={locationPrices[location.id] || ''}
                              onChange={(e) => setLocationPrices(prev => ({ ...prev, [location.id]: e.target.value }))}
                              disabled={!enabledLocations[location.id]}
                              required={enabledLocations[location.id]}
                              min="0"
                              step="0.01"
                              className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="classesPerWeek" className="block text-sm font-medium text-gray-700">Classes per week</label>
                    <input type="number" id="classesPerWeek" value={classesPerWeek} onChange={(e) => setClassesPerWeek(e.target.value)} required min="0" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                  </div>
                  <div>
                    <label htmlFor="classDuration" className="block text-sm font-medium text-gray-700">Class duration (minutes)</label>
                    <input type="number" id="classDuration" value={classDuration} onChange={(e) => setClassDuration(e.target.value)} required min="0" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., 30, 45, 60" />
                  </div>
                </div>

                {editingTier && (
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}

              </div>
              {tierError && <p className="text-red-500 text-sm mt-4">{tierError}</p>}
              <div className="mt-6 flex justify-end space-x-3 md:static sticky bottom-0 left-0 right-0 bg-section py-3 md:bg-transparent md:py-0">
                <button type="button" onClick={() => setShowTierModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md w-full md:w-auto">Cancel</button>
                <button type="submit" disabled={loadingTiers} className="btn-primary w-full md:w-auto">{loadingTiers ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* One-time Product Form Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-section md:bg-black md:bg-opacity-50 overflow-y-auto">
          <div className="relative w-full h-full md:h-auto bg-section p-6 md:p-8 rounded-none shadow-none md:rounded-lg md:shadow-xl max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-2 rounded-md hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddOrUpdateProduct} className="space-y-4">
              <div>
                <label htmlFor="productName" className="block text-sm font-medium text-gray-700">Product Name</label>
                <input type="text" id="productName" value={productName} onChange={(e) => setProductName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
              </div>
              <div>
                <label htmlFor="productType" className="block text-sm font-medium text-gray-700">Type</label>
                <select id="productType" value={productType} onChange={(e) => setProductType(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                  <option value="enrollment">Enrollment</option>
                  <option value="equipment">Equipment</option>
                  <option value="trip">Trip</option>
                  <option value="event">Event</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="productDescription" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                <textarea id="productDescription" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} rows="3" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Location
                </label>
                <div className="p-4 bg-gray-50 rounded-md border space-y-3">
                  {loadingLocations ? (
                    <p className="text-sm text-gray-500">Loading locations...</p>
                  ) : locations.filter(loc => loc.status === 'active').length === 0 ? (
                    <p className="text-sm text-gray-500">No active locations available.</p>
                  ) : (
                    locations.filter(loc => loc.status === 'active').map(location => (
                      <div key={location.id} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`product-enabled-${location.id}`}
                          checked={productEnabledLocations[location.id] || false}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setProductEnabledLocations(prev => ({ ...prev, [location.id]: isChecked }));
                            if (!isChecked) {
                              setProductLocationPrices(prev => {
                                const updated = { ...prev };
                                delete updated[location.id];
                                return updated;
                              });
                            }
                          }}
                          className="h-4 w-4 text-primary border-gray-300 rounded"
                        />
                        <label htmlFor={`product-enabled-${location.id}`} className="text-sm text-gray-700 min-w-[120px]">
                          {location.name}
                        </label>
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">{academy.currency || '$'}</span>
                          </div>
                          <input
                            type="number"
                            id={`product-price-${location.id}`}
                            value={productLocationPrices[location.id] || ''}
                            onChange={(e) => setProductLocationPrices(prev => ({ ...prev, [location.id]: e.target.value }))}
                            disabled={!productEnabledLocations[location.id]}
                            required={productEnabledLocations[location.id]}
                            min="0"
                            step="0.01"
                            className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {productError && <p className="text-red-500 text-sm mt-4">{productError}</p>}
              <div className="mt-6 flex justify-end space-x-3 md:static sticky bottom-0 left-0 right-0 bg-section py-3 md:bg-transparent md:py-0">
                <button type="button" onClick={() => setShowProductModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md w-full md:w-auto">Cancel</button>
                <button type="submit" disabled={loadingProducts} className="btn-primary w-full md:w-auto">{loadingProducts ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Trial Form Modal */}
      {showTrialModal && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-section md:bg-black md:bg-opacity-50 overflow-y-auto">
          <div className="relative w-full h-full md:h-auto bg-section p-6 md:p-8 rounded-none shadow-none md:rounded-lg md:shadow-xl max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold">{editingTrial ? 'Edit Trial' : 'Add New Trial'}</h3>
              <button
                type="button"
                onClick={() => setShowTrialModal(false)}
                className="p-2 rounded-md hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddOrUpdateTrial} className="space-y-4">
              <div><label htmlFor="trialName" className="block text-sm font-medium text-gray-700">Trial Name</label><input type="text" id="trialName" value={trialName} onChange={(e) => setTrialName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
              <div><label htmlFor="durationInDays" className="block text-sm font-medium text-gray-700">Duration (in days)</label><input type="number" id="durationInDays" value={durationInDays} onChange={(e) => setDurationInDays(e.target.value)} required min="1" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Location
                </label>
                <div className="p-4 bg-gray-50 rounded-md border space-y-3">
                  {loadingLocations ? (
                    <p className="text-sm text-gray-500">Loading locations...</p>
                  ) : locations.filter(loc => loc.status === 'active').length === 0 ? (
                    <p className="text-sm text-gray-500">No active locations available.</p>
                  ) : (
                    locations.filter(loc => loc.status === 'active').map(location => (
                      <div key={location.id} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`trial-enabled-${location.id}`}
                          checked={trialEnabledLocations[location.id] || false}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setTrialEnabledLocations(prev => ({ ...prev, [location.id]: isChecked }));
                            if (!isChecked) {
                              setTrialLocationPrices(prev => {
                                const updated = { ...prev };
                                delete updated[location.id];
                                return updated;
                              });
                            }
                          }}
                          className="h-4 w-4 text-primary border-gray-300 rounded"
                        />
                        <label htmlFor={`trial-enabled-${location.id}`} className="text-sm text-gray-700 min-w-[120px]">
                          {location.name}
                        </label>
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">{academy.currency || '$'}</span>
                          </div>
                          <input
                            type="number"
                            id={`trial-price-${location.id}`}
                            value={trialLocationPrices[location.id] || ''}
                            onChange={(e) => setTrialLocationPrices(prev => ({ ...prev, [location.id]: e.target.value }))}
                            disabled={!trialEnabledLocations[location.id]}
                            required={trialEnabledLocations[location.id]}
                            min="0"
                            step="0.01"
                            className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="classLimit" className="block text-sm font-medium text-gray-700">Class Limit (leave empty for unlimited)</label>
                  <input type="number" id="classLimit" value={classLimit} onChange={(e) => setClassLimit(e.target.value)} min="1" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                <div>
                  <label htmlFor="convertsToTierId" className="block text-sm font-medium text-gray-700">Converts to (Optional)</label>
                  <select id="convertsToTierId" value={convertsToTierId} onChange={(e) => setConvertsToTierId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                    <option value="">No automatic conversion</option>
                    {tiers.filter(t => t.status === 'active').map(tier => (<option key={tier.id} value={tier.id}>{tier.name}</option>))}
                  </select>
                </div>
              </div>
              {trialError && <p className="text-red-500 text-sm mt-4">{trialError}</p>}
              <div className="mt-6 flex justify-end space-x-3 md:static sticky bottom-0 left-0 right-0 bg-section py-3 md:bg-transparent md:py-0">
                <button type="button" onClick={() => setShowTrialModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md w-full md:w-auto">Cancel</button>
                <button type="submit" disabled={loadingTrials} className="btn-primary w-full md:w-auto">{loadingTrials ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
