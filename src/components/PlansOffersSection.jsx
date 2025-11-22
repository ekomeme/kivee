import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, collection, query, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Edit, Trash2, MoreVertical, Package, Tag, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PlansOffersSection({ user, academy, db }) {
  const [tiers, setTiers] = useState([]);
  const [oneTimeProducts, setOneTimeProducts] = useState([]);
  const [trials, setTrials] = useState([]);

  const [activeTab, setActiveTab] = useState('tiers'); // 'tiers', 'products', 'trials'

  const [newTierName, setNewTierName] = useState('');
  const [newTierDescription, setNewTierDescription] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [semiAnnualPrice, setSemiAnnualPrice] = useState('');
  const [annualPrice, setAnnualPrice] = useState('');
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
  const [actionsMenuPosition, setActionsMenuPosition] = useState({ x: 0, y: 0 });

  const fetchTiers = async () => {
    if (!user || !academy) return;
    const tiersRef = collection(db, `academies/${user.uid}/tiers`);
    const q = query(tiersRef);
    const querySnapshot = await getDocs(q);
    const tiersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTiers(tiersData);
  };

  useEffect(() => {
    fetchTiers();
    // We will add fetch functions for products and trials later
  }, [user, academy]);

  const handleAddOrUpdateTier = async (e) => {
    e.preventDefault();
    if (!user || !academy || loadingTiers) return;

    setLoadingTiers(true);
    setTierError(null);

    const tierData = {
      name: newTierName,
      description: newTierDescription,
      monthlyPrice: Number(monthlyPrice) || 0,
      semiAnnualPrice: semiAnnualPrice ? Number(semiAnnualPrice) : null,
      annualPrice: annualPrice ? Number(annualPrice) : null,
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
      setMonthlyPrice('');
      setSemiAnnualPrice('');
      setAnnualPrice('');
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
    setMonthlyPrice(tier.monthlyPrice || '');
    setSemiAnnualPrice(tier.semiAnnualPrice || '');
    setAnnualPrice(tier.annualPrice || '');
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
      setMonthlyPrice('');
      setSemiAnnualPrice('');
      setAnnualPrice('');
      setClassesPerWeek('');
      setClassLimitPerCycle('');
      setAutoRenew(true);
      setRequiresEnrollmentFee(false);
      setStatus('active');
      setTierError(null);
    }
    setShowTierModal(true);
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Plans & Offers</h2>
        <div className="flex items-center">
          <button
            onClick={() => handleOpenTierModal()}
            className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md flex items-center flex-shrink-0"
          >
            <Plus className="mr-2 h-5 w-5" />
            <span>Add New</span>
          </button>
        </div>
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
      {tiers.length === 0 ? (
        <p className="text-gray-600">No tiers registered yet.</p>
      ) : (
          <div className="overflow-x-auto mt-6">
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
                    <td className="py-3 px-4 border-b text-base">{formatCurrency(tier.monthlyPrice, academy.currency)}/mo</td>
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
        <div className="text-center p-10 text-gray-500">
          <p>One-time Products management coming soon.</p>
        </div>
      )}
      {activeTab === 'trials' && (
        <div className="text-center p-10 text-gray-500">
          <p>Trials management coming soon.</p>
        </div>
      )}
      {/* Actions Menu - Rendered outside the table to avoid clipping */}
      {activeTierMenu && (
        <ActionsMenu
          tier={activeTierMenu}
          onClose={() => setActiveTierMenu(null)}
        />
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="monthlyPrice" className="block text-sm font-medium text-gray-700">Monthly Price</label>
                    <input type="number" id="monthlyPrice" value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.target.value)} required min="0" step="0.01" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                  </div>
                  <div>
                    <label htmlFor="semiAnnualPrice" className="block text-sm font-medium text-gray-700">Semi-Annual Price (Optional)</label>
                    <input type="number" id="semiAnnualPrice" value={semiAnnualPrice} onChange={(e) => setSemiAnnualPrice(e.target.value)} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                  </div>
                  <div>
                    <label htmlFor="annualPrice" className="block text-sm font-medium text-gray-700">Annual Price (Optional)</label>
                    <input type="number" id="annualPrice" value={annualPrice} onChange={(e) => setAnnualPrice(e.target.value)} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                  </div>
                </div>

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
    </div>
  );
}