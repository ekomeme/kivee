import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, collection, query, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Edit, Trash2, MoreVertical, Package, Tag, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PlansOffersSection({ user, academy, db }) {
  const [tiers, setTiers] = useState([]);
  const [oneTimeProducts, setOneTimeProducts] = useState([]);
  const [trials, setTrials] = useState([]);

  const [activeTab, setActiveTab] = useState('tiers'); // 'tiers', 'products', 'trials'

  // States for Membership Tiers
  const [newTierName, setNewTierName] = useState('');
  const [newTierDescription, setNewTierDescription] = useState('');
  const [pricingModel, setPricingModel] = useState('monthly'); // 'monthly', 'semi-annual', 'annual', 'term'
  const [price, setPrice] = useState('');
  const [termStartDate, setTermStartDate] = useState('');
  const [termEndDate, setTermEndDate] = useState('');
  const [classesPerWeek, setClassesPerWeek] = useState('');
  const [classLimitPerCycle, setClassLimitPerCycle] = useState('');
  const [autoRenew, setAutoRenew] = useState(true);
  const [requiresEnrollmentFee, setRequiresEnrollmentFee] = useState(false);
  const [status, setStatus] = useState('active');
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [tierError, setTierError] = useState(null);
  const [editingTier, setEditingTier] = useState(null); // State for editing
  const [showTierModal, setShowTierModal] = useState(false);
  const [activeTierMenu, setActiveTierMenu] = useState(null); // To control which tier's menu is open

  // States for One-time Products
  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState('enrollment');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [availableDate, setAvailableDate] = useState('');
  const [inventory, setInventory] = useState('');
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
  const [convertsToTierId, setConvertsToTierId] = useState('');
  const [loadingTrials, setLoadingTrials] = useState(false);
  const [trialError, setTrialError] = useState(null);
  const [editingTrial, setEditingTrial] = useState(null);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [activeTrialMenu, setActiveTrialMenu] = useState(null);


  const [actionsMenuPosition, setActionsMenuPosition] = useState({ x: 0, y: 0 });

  const fetchTiers = async () => {
    if (!user || !academy) return;
    const tiersRef = collection(db, `academies/${user.uid}/tiers`);
    const q = query(tiersRef);
    const querySnapshot = await getDocs(q);
    const tiersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTiers(tiersData);
  };

  const fetchProducts = async () => {
    if (!user || !academy) return;
    const productsRef = collection(db, `academies/${user.uid}/products`);
    const q = query(productsRef);
    const querySnapshot = await getDocs(q);
    const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setOneTimeProducts(productsData);
  };

  const fetchTrials = async () => {
    if (!user || !academy) return;
    const trialsRef = collection(db, `academies/${user.uid}/trials`);
    const q = query(trialsRef);
    const querySnapshot = await getDocs(q);
    const trialsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTrials(trialsData);
  };

  useEffect(() => {
    fetchTiers();
    fetchProducts();
    fetchTrials();
  }, [user, academy]);

  const handleAddOrUpdateTier = async (e) => {
    e.preventDefault();
    if (!user || !academy || loadingTiers) return;

    setLoadingTiers(true);
    setTierError(null);

    const tierData = {
      name: newTierName,
      description: newTierDescription,
      pricingModel: pricingModel,
      price: Number(price) || 0,
      termStartDate: pricingModel === 'term' ? termStartDate : null,
      termEndDate: pricingModel === 'term' ? termEndDate : null,
      classesPerWeek: Number(classesPerWeek) || 0,
      classLimitPerCycle: classLimitPerCycle ? Number(classLimitPerCycle) : null,
      autoRenew,
      requiresEnrollmentFee,
      status,
      academyId: user.uid,
      createdAt: editingTier ? editingTier.createdAt : new Date(),
      updatedAt: new Date(),
    };

    try {
      if (editingTier) {
        // Update existing tier
        const tierDocRef = doc(db, `academies/${user.uid}/tiers`, editingTier.id);
        await updateDoc(tierDocRef, tierData);
        toast.success("Tier updated successfully.");
      } else {
        // Add new tier
        const tiersCollectionRef = collection(db, `academies/${user.uid}/tiers`);
        await addDoc(tiersCollectionRef, tierData);
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
      setAutoRenew(true);
      setRequiresEnrollmentFee(false);
      setStatus('active');
      setEditingTier(null);
      setShowTierModal(false); // Close modal on success
      fetchTiers(); // Refresh the list
    } catch (err) {
      console.error("Error al guardar tier:", err);
      setTierError("Error al guardar tier: " + err.message);
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
    setTermStartDate(tier.termStartDate || '');
    setTermEndDate(tier.termEndDate || '');
    setClassesPerWeek(tier.classesPerWeek || '');
    setClassLimitPerCycle(tier.classLimitPerCycle || '');
    setAutoRenew(tier.autoRenew === false ? false : true);
    setRequiresEnrollmentFee(tier.requiresEnrollmentFee || false);
    setStatus(tier.status || 'active');
  };

  const handleOpenTierModal = (tier = null) => {
    if (tier) {
      handleEditClick(tier);
    } else {
      // Clear fields for a new tier
      setEditingTier(null);
      setNewTierName('');
      setNewTierDescription('');
      setPricingModel('monthly');
      setPrice('');
      setTermStartDate('');
      setTermEndDate('');
      setClassesPerWeek('');
      setClassLimitPerCycle('');
      setAutoRenew(true);
      setRequiresEnrollmentFee(false);
      setStatus('active');
      setTierError(null);
    }
    setShowTierModal(true);
  };

  const handleAddOrUpdateProduct = async (e) => {
    e.preventDefault();
    if (!user || !academy || loadingProducts) return;

    setLoadingProducts(true);
    setProductError(null);

    const productData = {
      name: productName,
      type: productType,
      description: productDescription,
      price: Number(productPrice) || 0,
      availableDate: availableDate || null,
      inventory: inventory ? Number(inventory) : null,
      academyId: user.uid,
      createdAt: editingProduct ? editingProduct.createdAt : new Date(),
      updatedAt: new Date(),
    };

    try {
      if (editingProduct) {
        const productDocRef = doc(db, `academies/${user.uid}/products`, editingProduct.id);
        await updateDoc(productDocRef, productData);
        toast.success("Product updated successfully.");
      } else {
        const productsCollectionRef = collection(db, `academies/${user.uid}/products`);
        await addDoc(productsCollectionRef, productData);
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
      setAvailableDate(product.availableDate || '');
      setInventory(product.inventory || '');
    } else {
      setEditingProduct(null);
      setProductName('');
      setProductType('enrollment');
      setProductDescription('');
      setProductPrice('');
      setAvailableDate('');
      setInventory('');
      setProductError(null);
    }
    setShowProductModal(true);
  };

  const handleAddOrUpdateTrial = async (e) => {
    e.preventDefault();
    if (!user || !academy || loadingTrials) return;

    setLoadingTrials(true);
    setTrialError(null);

    const trialData = {
      name: trialName,
      durationInDays: Number(durationInDays),
      classLimit: classLimit ? Number(classLimit) : 'unlimited',
      price: Number(trialPrice) || 0,
      convertsToTierId: convertsToTierId || null,
      autoRenew: false, // Trials never auto-renew
      academyId: user.uid,
      createdAt: editingTrial ? editingTrial.createdAt : new Date(),
      updatedAt: new Date(),
    };

    try {
      if (editingTrial) {
        const trialDocRef = doc(db, `academies/${user.uid}/trials`, editingTrial.id);
        await updateDoc(trialDocRef, trialData);
        toast.success("Trial updated successfully.");
      } else {
        const trialsCollectionRef = collection(db, `academies/${user.uid}/trials`);
        await addDoc(trialsCollectionRef, trialData);
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
      setConvertsToTierId(trial.convertsToTierId || '');
    } else {
      setEditingTrial(null);
      setTrialName('');
      setDurationInDays('');
      setClassLimit('');
      setTrialPrice('');
      setConvertsToTierId('');
      setTrialError(null);
    }
    setShowTrialModal(true);
  };

  const handleDeleteTier = async (tierId) => {
    const deleteAction = async () => {
      try {
        await deleteDoc(doc(db, `academies/${user.uid}/tiers`, tierId));
        fetchTiers();
        toast.success("Tier deleted successfully.");
      } catch (error) {
        console.error("Error al eliminar tier:", error);
        toast.error("Error deleting tier.");
      }
    };

    toast((t) => (
      <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center">
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
        await deleteDoc(doc(db, `academies/${user.uid}/products`, productId));
        fetchProducts();
        toast.success("Product deleted successfully.");
      } catch (error) {
        toast.error("Error deleting product.");
      }
    };
    toast((t) => (
      <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center">
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
        await deleteDoc(doc(db, `academies/${user.uid}/trials`, trialId));
        fetchTrials();
        toast.success("Trial deleted successfully.");
      } catch (error) {
        toast.error("Error deleting trial.");
      }
    };
    toast((t) => (
      <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center">
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


  const formatCurrency = (price, currencyCode) => {
    try {
      // Use Intl.NumberFormat for robust currency formatting
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode || 'USD',
      }).format(price);
    } catch (e) {
      // Fallback for invalid or missing currency codes
      return `$${Number(price).toFixed(2)}`;
    }
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
      <div className="fixed bg-white border border-gray-border rounded-md shadow-lg z-50" ref={menuRef} style={style}>
        <ul className="py-1">
          <li className="text-base w-32">
            <button onClick={(e) => { e.stopPropagation(); handleOpenTierModal(tier); onClose(); }} className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 flex items-center">
              <Edit className="mr-3 h-4 w-4" />
              <span>Edit</span>
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

  const handleOpenActionsMenu = (tier, event) => {
    event.stopPropagation(); // Prevent row click
    const rect = event.currentTarget.getBoundingClientRect();
    setActionsMenuPosition({
      x: rect.right + window.scrollX,
      y: rect.top + window.scrollY,
    });
    setActiveTierMenu(tier);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Plans & Offers</h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setActiveTab('tiers')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'tiers' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            <Zap className="mr-2 h-5 w-5" /> Membership Tiers
          </button>
          <button onClick={() => setActiveTab('products')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            <Package className="mr-2 h-5 w-5" /> One-time Products
          </button>
          <button onClick={() => setActiveTab('trials')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'trials' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            <Tag className="mr-2 h-5 w-5" /> Trials
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'tiers' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => handleOpenTierModal()} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md flex items-center">
              <Plus className="mr-2 h-5 w-5" /> Add New Tier
            </button>
          </div>
      {tiers.length === 0 ? (
        <div className="text-center p-10 text-gray-500 border-2 border-dashed rounded-lg mt-4">
          <p>No membership tiers registered yet.</p>
          <p className="text-sm">Click "Add New Tier" to get started.</p>
        </div>
      ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left text-base">Name</th>
                  <th className="py-2 px-4 border-b text-left text-base">Description</th>
                  <th className="py-2 px-4 border-b text-left text-base">Price</th>
                  <th className="py-2 px-4 border-b text-left text-base">Classes</th>
                  <th className="py-2 px-4 border-b text-left text-base">Status</th>
                  <th className="py-2 px-4 border-b text-right text-base">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map(tier => (
                  <tr key={tier.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b text-base font-medium">{tier.name}</td>
                    <td className="py-3 px-4 border-b text-sm text-gray-600 max-w-xs truncate">{tier.description}</td>
                    <td className="py-3 px-4 border-b text-base">
                      {tier.pricingModel === 'monthly' && `${formatCurrency(tier.price, academy.currency)}/mo`}
                      {tier.pricingModel === 'semi-annual' && `${formatCurrency(tier.price, academy.currency)}/6mo`}
                      {tier.pricingModel === 'annual' && `${formatCurrency(tier.price, academy.currency)}/yr`}
                      {tier.pricingModel === 'term' && (
                        <div>
                          <p>{formatCurrency(tier.price, academy.currency)}/term</p>
                          <p className="text-xs text-gray-500">{tier.termStartDate} - {tier.termEndDate}</p>
                        </div>
                      )}
                      {!tier.pricingModel && `${formatCurrency(tier.price, academy.currency)}`}
                    </td>
                    <td className="py-3 px-4 border-b text-sm text-gray-600">{tier.classesPerWeek ? `${tier.classesPerWeek} per week` : 'N/A'}</td>
                    <td className="py-3 px-4 border-b">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tier.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {tier.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-b text-right">
                      <button onClick={(e) => handleOpenActionsMenu(tier, e)} className="p-1 rounded-full hover:bg-gray-200 focus:outline-none">
                        <MoreVertical className="h-5 w-5 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      </>
      )}
      {activeTab === 'products' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => handleOpenProductModal()} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md flex items-center">
              <Plus className="mr-2 h-5 w-5" /> Add New Product
            </button>
          </div>
          {oneTimeProducts.length === 0 ? (
            <div className="text-center p-10 text-gray-500 border-2 border-dashed rounded-lg mt-4">
              <p>No one-time products created yet.</p>
              <p className="text-sm">Create products like enrollment fees, equipment, or event tickets.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left text-base">Name</th>
                    <th className="py-2 px-4 border-b text-left text-base">Type</th>
                    <th className="py-2 px-4 border-b text-left text-base">Price</th>
                    <th className="py-2 px-4 border-b text-left text-base">Inventory</th>
                    <th className="py-2 px-4 border-b text-right text-base">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {oneTimeProducts.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 border-b text-base font-medium">{product.name}</td>
                      <td className="py-3 px-4 border-b text-sm text-gray-600 capitalize">{product.type}</td>
                      <td className="py-3 px-4 border-b text-base">{formatCurrency(product.price, academy.currency)}</td>
                      <td className="py-3 px-4 border-b text-sm text-gray-600">{product.inventory ?? 'N/A'}</td>
                      <td className="py-3 px-4 border-b text-right">
                        <button onClick={(e) => { e.stopPropagation(); setActiveProductMenu(product); setActionsMenuPosition({ x: e.currentTarget.getBoundingClientRect().right + window.scrollX, y: e.currentTarget.getBoundingClientRect().top + window.scrollY }); }} className="p-1 rounded-full hover:bg-gray-200 focus:outline-none">
                          <MoreVertical className="h-5 w-5 text-gray-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {activeTab === 'trials' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => handleOpenTrialModal()} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md flex items-center">
              <Plus className="mr-2 h-5 w-5" /> Add New Trial
            </button>
          </div>
          {trials.length === 0 ? (
            <div className="text-center p-10 text-gray-500 border-2 border-dashed rounded-lg mt-4">
              <p>No trial packages created yet.</p>
              <p className="text-sm">Offer free or discounted trials to attract new students.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left text-base">Name</th>
                    <th className="py-2 px-4 border-b text-left text-base">Duration</th>
                    <th className="py-2 px-4 border-b text-left text-base">Class Limit</th>
                    <th className="py-2 px-4 border-b text-left text-base">Price</th>
                    <th className="py-2 px-4 border-b text-right text-base">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trials.map(trial => (
                    <tr key={trial.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 border-b text-base font-medium">{trial.name}</td>
                      <td className="py-3 px-4 border-b text-sm text-gray-600">{trial.durationInDays} days</td>
                      <td className="py-3 px-4 border-b text-sm text-gray-600 capitalize">{trial.classLimit}</td>
                      <td className="py-3 px-4 border-b text-base">{formatCurrency(trial.price, academy.currency)}</td>
                      <td className="py-3 px-4 border-b text-right">
                        <button onClick={(e) => { e.stopPropagation(); setActiveTrialMenu(trial); setActionsMenuPosition({ x: e.currentTarget.getBoundingClientRect().right + window.scrollX, y: e.currentTarget.getBoundingClientRect().top + window.scrollY }); }} className="p-1 rounded-full hover:bg-gray-200 focus:outline-none">
                          <MoreVertical className="h-5 w-5 text-gray-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {/* Actions Menu - Rendered outside the table to avoid clipping */}
      {activeTierMenu && (
        <ActionsMenu
          tier={activeTierMenu}
          onClose={() => setActiveTierMenu(null)}
        />
      )}
      {activeProductMenu && (
        <div className="fixed bg-white border border-gray-border rounded-md shadow-lg z-50" style={{ top: `${actionsMenuPosition.y}px`, left: `${actionsMenuPosition.x}px`, transform: 'translateX(-100%)' }}>
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
        <div className="fixed bg-white border border-gray-border rounded-md shadow-lg z-50" style={{ top: `${actionsMenuPosition.y}px`, left: `${actionsMenuPosition.x}px`, transform: 'translateX(-100%)' }}>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingTier ? 'Edit Tier' : 'Add New Tier'}</h3>
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
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
                    <div className="relative mt-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">{academy.currency || '$'}</span>
                      </div>
                      <input type="number" id="price" value={price} onChange={(e) => setPrice(e.target.value)} required min="0" step="0.01" className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="classesPerWeek" className="block text-sm font-medium text-gray-700">Classes per week</label>
                    <input type="number" id="classesPerWeek" value={classesPerWeek} onChange={(e) => setClassesPerWeek(e.target.value)} required min="0" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                  </div>
                  <div>
                    <label htmlFor="classLimitPerCycle" className="block text-sm font-medium text-gray-700">Class limit per cycle (Optional)</label>
                    <input type="number" id="classLimitPerCycle" value={classLimitPerCycle} onChange={(e) => setClassLimitPerCycle(e.target.value)} min="0" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="flex items-center space-x-3">
                    <input id="autoRenew" type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} className="h-4 w-4 text-primary border-gray-300 rounded" />
                    <label htmlFor="autoRenew" className="text-sm font-medium text-gray-700">Auto-renew</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input id="requiresEnrollmentFee" type="checkbox" checked={requiresEnrollmentFee} onChange={(e) => setRequiresEnrollmentFee(e.target.checked)} className="h-4 w-4 text-primary border-gray-300 rounded" />
                    <label htmlFor="requiresEnrollmentFee" className="text-sm font-medium text-gray-700">Requires enrollment fee</label>
                  </div>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                  <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

              </div>
              {tierError && <p className="text-red-500 text-sm mt-4">{tierError}</p>}
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowTierModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md">Cancel</button>
                <button type="submit" disabled={loadingTiers} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md disabled:opacity-50">{loadingTiers ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* One-time Product Form Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="productPrice" className="block text-sm font-medium text-gray-700">Price</label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">{academy.currency || '$'}</span>
                    </div>
                    <input type="number" id="productPrice" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} required min="0" step="0.01" className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                  </div>
                </div>
                <div>
                  <label htmlFor="inventory" className="block text-sm font-medium text-gray-700">Inventory (Optional)</label>
                  <input type="number" id="inventory" value={inventory} onChange={(e) => setInventory(e.target.value)} min="0" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
              </div>
              <div>
                <label htmlFor="availableDate" className="block text-sm font-medium text-gray-700">Available Date (Optional)</label>
                <input type="date" id="availableDate" value={availableDate} onChange={(e) => setAvailableDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
              </div>
              {productError && <p className="text-red-500 text-sm mt-4">{productError}</p>}
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowProductModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md">Cancel</button>
                <button type="submit" disabled={loadingProducts} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md disabled:opacity-50">{loadingProducts ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Trial Form Modal */}
      {showTrialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingTrial ? 'Edit Trial' : 'Add New Trial'}</h3>
            <form onSubmit={handleAddOrUpdateTrial} className="space-y-4">
              <div><label htmlFor="trialName" className="block text-sm font-medium text-gray-700">Trial Name</label><input type="text" id="trialName" value={trialName} onChange={(e) => setTrialName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
              <div><label htmlFor="durationInDays" className="block text-sm font-medium text-gray-700">Duration (in days)</label><input type="number" id="durationInDays" value={durationInDays} onChange={(e) => setDurationInDays(e.target.value)} required min="1" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="trialPrice" className="block text-sm font-medium text-gray-700">Price</label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">{academy.currency || '$'}</span>
                    </div>
                    <input type="number" id="trialPrice" value={trialPrice} onChange={(e) => setTrialPrice(e.target.value)} required min="0" step="0.01" className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                  </div>
                </div>
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
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowTrialModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md">Cancel</button>
                <button type="submit" disabled={loadingTrials} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md disabled:opacity-50">{loadingTrials ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
