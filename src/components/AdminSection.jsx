import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import Select from 'react-select';

import toast from 'react-hot-toast';
export default function AdminSection({ user, academy, db, onAcademyUpdate }) {
  const CURRENCIES = [
    { code: 'EUR', name: 'Euro' },
    { code: 'JPY', name: 'Yen japonés' },
    { code: 'GBP', name: 'Libra esterlina' },
    { code: 'ARS', name: 'Peso argentino' },
    { code: 'MXN', name: 'Peso mexicano' },
    { code: 'COP', name: 'Peso colombiano' },
    { code: 'CLP', name: 'Peso chileno' },
    { code: 'PEN', name: 'Sol peruano' },
    { code: 'BRL', name: 'Real brasileño' },
    { code: 'UYU', name: 'Peso uruguayo' },
    { code: 'VES', name: 'Bolívar soberano' },
    { code: 'PYG', name: 'Guaraní paraguayo' },
    { code: 'BOB', name: 'Boliviano' },
    { code: 'CAD', name: 'Dólar canadiense' },
    { code: 'AUD', name: 'Dólar australiano' },
    { code: 'CHF', name: 'Franco suizo' },
    { code: 'CNY', name: 'Yuan chino' },
    { code: 'INR', name: 'Rupia india' },
    { code: 'RUB', name: 'Rublo ruso' },
    { code: 'ZAR', name: 'Rand sudafricano' },
    { code: 'AED', name: 'Dírham de los Emiratos Árabes Unidos' },
    { code: 'SAR', name: 'Riyal saudí' },
    { code: 'QAR', name: 'Riyal catarí' },
    { code: 'TRY', name: 'Lira turca' },
    { code: 'ILS', name: 'Nuevo shéquel israelí' },
    { code: 'KRW', name: 'Won surcoreano' },
    { code: 'SGD', name: 'Dólar de Singapur' },
    { code: 'NZD', name: 'Dólar neozelandés' },
    { code: 'HKD', name: 'Dólar de Hong Kong' },
    { code: 'NOK', name: 'Corona noruega' },
    { code: 'SEK', name: 'Corona sueca' },
    { code: 'DKK', name: 'Corona danesa' },
    { code: 'PLN', name: 'Zloty polaco' },
    { code: 'HUF', name: 'Forinto húngaro' },
    { code: 'CZK', name: 'Corona checa' }
  ];

  const currencyOptions = CURRENCIES.map(c => ({
    value: c.code,
    label: `${c.code} - ${c.name}`
  }));

  const findCurrencyOption = (currencyCode) => currencyOptions.find(option => option.value === currencyCode);

  const [academyNameInput, setAcademyNameInput] = useState(academy.name);
  const [selectedCurrency, setSelectedCurrency] = useState(findCurrencyOption(academy.currency) || findCurrencyOption('USD'));
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [updateSettingsError, setUpdateSettingsError] = useState(null);

  // --- Tiers Logic ---
  const [tiers, setTiers] = useState([]);
  const [newTierName, setNewTierName] = useState('');
  const [newTierDescription, setNewTierDescription] = useState('');
  const [newTierPrice, setNewTierPrice] = useState('');
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [tierError, setTierError] = useState(null);
  const [editingTier, setEditingTier] = useState(null); // State for editing

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
        <div className="flex space-x-2">
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

  const handleUpdateAcademySettings = async (e) => {
    e.preventDefault();
    if (!user || !academyNameInput.trim() || !selectedCurrency?.value) return;

    setIsUpdatingSettings(true);
    setUpdateSettingsError(null);

    const academyRef = doc(db, "academies", user.uid);

    try {
      await updateDoc(academyRef, {
        name: academyNameInput.trim(),
        currency: selectedCurrency.value,
      });
      await onAcademyUpdate(); // Llama a la función para refrescar los datos en App.jsx
      toast.success("Academy settings updated successfully.");
    } catch (error) {
      console.error("Error al actualizar el nombre de la academia:", error);
      setUpdateSettingsError("Error al actualizar la configuración: " + error.message);
      toast.error("Error updating settings.");
    } finally {
      setIsUpdatingSettings(false);
    }
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


  return (
    <div className="space-y-8">
      {/* Sección para cambiar el nombre de la academia */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Academy Settings</h2>
        <form onSubmit={handleUpdateAcademySettings} className="space-y-4">
          <div>
            <label htmlFor="academyName" className="block text-sm font-medium text-gray-700">
              Academy Name
            </label>
            <input
              type="text"
              id="academyName"
              value={academyNameInput}
              onChange={(e) => setAcademyNameInput(e.target.value)}
              required
              minLength={3}
              maxLength={50}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="academyCurrency" className="block text-sm font-medium text-gray-700">
              Currency
            </label>
            <Select
              id="academyCurrency"
              options={currencyOptions}
              value={selectedCurrency}
              onChange={setSelectedCurrency}
              isSearchable
              placeholder="Search or select a currency..."
            />
          </div>
          {updateSettingsError && <p className="text-red-500 text-sm">{updateSettingsError}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUpdatingSettings}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingSettings ? 'Updating...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Sección de Tiers (movida aquí) */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Tier Management</h2>

        <form onSubmit={handleAddOrUpdateTier} className="space-y-4 mb-6 p-4 border border-gray-200 rounded-md">
          <h3 className="text-xl font-semibold text-gray-700">
            {editingTier ? 'Edit Tier' : 'Add New Tier'}
          </h3>
          <div>
            <label htmlFor="tierName" className="block text-sm font-medium text-gray-700">Tier Name</label>
            <input
              type="text"
              id="tierName"
              value={newTierName}
              onChange={(e) => setNewTierName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="tierDescription" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="tierDescription"
              value={newTierDescription}
              onChange={(e) => setNewTierDescription(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            ></textarea>
          </div>
          <div>
            <label htmlFor="tierPrice" className="block text-sm font-medium text-gray-700">Price</label>
            <input
              type="number"
              id="tierPrice"
              value={newTierPrice}
              onChange={(e) => setNewTierPrice(e.target.value)}
              required
              min="0"
              step="0.01"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {tierError && <p className="text-red-500 text-sm">{tierError}</p>}
          <div className="flex justify-end space-x-3">
            {editingTier && (
              <button
                type="button"
                onClick={() => {
                  setEditingTier(null);
                  setNewTierName('');
                  setNewTierDescription('');
                  setNewTierPrice('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              disabled={loadingTiers}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingTiers ? 'Saving...' : (editingTier ? 'Update Tier' : 'Add Tier')}
            </button>
          </div>
        </form>

        {tiers.length === 0 ? (
          <p className="text-gray-600">No tiers registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left">Name</th>
                  <th className="py-2 px-4 border-b text-left">Description</th>
                  <th className="py-2 px-4 border-b text-left">Price</th>
                  <th className="py-2 px-4 border-b text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map(tier => (
                  <tr key={tier.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">{tier.name}</td>
                    <td className="py-2 px-4 border-b">{tier.description}</td>
                    <td className="py-2 px-4 border-b">{formatCurrency(tier.price, academy.currency)}</td>
                    <td className="py-2 px-4 border-b">
                      <button onClick={() => handleEditClick(tier)} className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-2 rounded-md text-sm mr-2">Edit</button>
                      <button onClick={() => handleDeleteTier(tier.id)} className="bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded-md text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
