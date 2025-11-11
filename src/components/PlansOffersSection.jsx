import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, collection, query, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Edit, Trash2, LayoutGrid, List, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PlansOffersSection({ user, academy, db }) {
  const [tiers, setTiers] = useState([]);
  const [newTierName, setNewTierName] = useState('');
  const [newTierDescription, setNewTierDescription] = useState('');
  const [newTierPrice, setNewTierPrice] = useState('');
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [tierError, setTierError] = useState(null);
  const [editingTier, setEditingTier] = useState(null); // State for editing
  const [showTierModal, setShowTierModal] = useState(false);
  const [view, setView] = useState('grid'); // 'grid' or 'table'
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
  }, [user, academy]);

  const handleAddOrUpdateTier = async (e) => {
    e.preventDefault();
    if (!user || !academy || loadingTiers) return;

    setLoadingTiers(true);
    setTierError(null);

    const tierData = {
      name: newTierName,
      description: newTierDescription,
      price: Number(newTierPrice),
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
      setNewTierPrice('');
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
    setNewTierPrice(tier.price);
  };

  const handleOpenTierModal = (tier = null) => {
    if (tier) {
      handleEditClick(tier);
    } else {
      setEditingTier(null);
      // Clear fields when opening for a new tier
      setNewTierName('');
      setNewTierDescription('');
      setNewTierPrice('');
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
      return `$${price.toFixed(2)}`;
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
      <div className="flex justify-between items-start mb-4 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Tier Management</h2>
        <div className="flex items-center space-x-4">
          {/* View Switcher Buttons */}
          <div className="flex items-center p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-md ${view === 'grid' ? 'bg-white shadow-sm' : 'bg-transparent text-gray-500 hover:bg-white/50'}`}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setView('table')}
              className={`p-2 rounded-md ${view === 'table' ? 'bg-white shadow-sm' : 'bg-transparent text-gray-500 hover:bg-white/50'}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={() => handleOpenTierModal()}
            className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md flex items-center flex-shrink-0"
          >
            <Plus className="mr-2 h-5 w-5" />
            <span>Add New Tier</span>
          </button>
        </div>
      </div>

      {tiers.length === 0 ? (
        <p className="text-gray-600">No tiers registered yet.</p>
      ) : (
        view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {tiers.map(tier => (
              <div key={tier.id} className="border rounded-lg p-6 shadow-sm flex flex-col bg-white">
                {/* Card Header with Name and Actions */}
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-800 break-words">{tier.name}</h3>
                  <div className="relative">
                    <button onClick={(e) => handleOpenActionsMenu(tier, e)} className="p-1 rounded-full hover:bg-gray-200 focus:outline-none">
                      <MoreVertical className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                </div>
                {/* Card Body with Price and Description */}
                <div className="flex-grow">
                  <p className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(tier.price, academy.currency)}</p>
                  <p className="text-gray-600 text-sm">{tier.description || 'No description provided.'}</p>
                </div>
              </div>
            ))}
          </div>)
        : ( // This is the 'else' part for the table view
          <div className="overflow-x-auto mt-6">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left text-base">Name</th>
                  <th className="py-2 px-4 border-b text-left text-base">Description</th>
                  <th className="py-2 px-4 border-b text-left text-base">Price</th>
                  <th className="py-2 px-4 border-b text-right text-base">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map(tier => (
                  <tr key={tier.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b text-base">{tier.name}</td>
                    <td className="py-2 px-4 border-b text-base">{tier.description}</td>
                    <td className="py-2 px-4 border-b">{formatCurrency(tier.price, academy.currency)}</td>
                    <td className="py-2 px-4 border-b text-right">
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
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
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
                <div>
                  <label htmlFor="tierPrice" className="block text-sm font-medium text-gray-700">Price</label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">{academy.currency || '$'}</span>
                    </div>
                    <input
                      type="number"
                      id="tierPrice"
                      value={newTierPrice}
                      onChange={(e) => setNewTierPrice(e.target.value)}
                      required
                      min="0"
                      step="0.01"
                      className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
              </div>
              {tierError && <p className="text-red-500 text-sm mt-4">{tierError}</p>}
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowTierModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md">Cancel</button>
                <button type="submit" disabled={loadingTiers} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md disabled:opacity-50">{loadingTiers ? 'Saving...' : 'Save Tier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}