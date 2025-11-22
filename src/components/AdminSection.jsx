import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, collection, query, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import Select from 'react-select';
import { Plus, Edit, Trash2, MoreVertical, Settings, Users } from 'lucide-react';
import toast from 'react-hot-toast';
export default function AdminSection({ user, academy, db, onAcademyUpdate }) {
  const [activeMainTab, setActiveMainTab] = useState('settings'); // 'settings', 'groups'
  const [activeGroupTab, setActiveGroupTab] = useState('groups'); // 'groups', 'schedule', 'transfers'

  // States for Academy Settings
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);
  const [academyNameInput, setAcademyNameInput] = useState(academy.name);
  const [selectedAcademyCategory, setSelectedAcademyCategory] = useState(academy.category || '');
  const [otherCategory, setOtherCategory] = useState(academy.otherCategory || '');
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [updateSettingsError, setUpdateSettingsError] = useState(null);
  const ACADEMY_CATEGORIES = ['Fútbol', 'Baloncesto', 'Tenis', 'Otro'];

  // States for Groups
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [activeGroupMenu, setActiveGroupMenu] = useState(null);
  const [actionsMenuPosition, setActionsMenuPosition] = useState({ x: 0, y: 0 });
  const [groupForm, setGroupForm] = useState({ name: '', description: '', minAge: '', maxAge: '', coach: '', maxCapacity: '', status: 'active' });
  const [groupError, setGroupError] = useState(null);

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        // Using a more comprehensive, free, and open-source currency API
        const response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json');
        const data = await response.json();

        // The API returns an object like { "aed": "United Arab Emirates Dirham", ... }
        // We convert it to the format react-select expects.
        const currencies = Object.entries(data).map(([code, name]) => ({
          value: code.toUpperCase(),
          label: `${code.toUpperCase()} - ${name}`
        }));

        currencies.sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically

        setCurrencyOptions(currencies);
      } catch (error) {
        console.error("Error fetching currencies:", error);
      }
    };

    fetchCurrencies();
  }, []);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
        const data = await response.json();
        const countries = data.map(country => ({
          value: country.name.common,
          label: country.name.common,
          countryCode: country.cca2 // Store the 2-letter country code
        }));
        countries.sort((a, b) => a.label.localeCompare(b.label));
        setCountryOptions(countries);
      } catch (error) {
        console.error("Error fetching countries:", error);
      }
    };
    fetchCountries();
  }, []);

  const fetchGroups = async () => {
    if (!user || !academy) return;
    setLoadingGroups(true);
    const groupsRef = collection(db, `academies/${user.uid}/groups`);
    const q = query(groupsRef);
    const querySnapshot = await getDocs(q);
    const groupsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setGroups(groupsData);
    setLoadingGroups(false);
  };

  useEffect(() => {
    fetchGroups();
  }, [user, academy]);

  const findCurrencyOption = (currencyCode) => currencyOptions.find(option => option.value === currencyCode);

  // This effect runs when currencyOptions are loaded or academy currency changes.
  // It ensures the correct currency is selected in the dropdown.
  useEffect(() => {
    if (currencyOptions.length > 0) {
      const currencyToSet = findCurrencyOption(academy.currency) || findCurrencyOption('USD');
      if (currencyToSet) {
        setSelectedCurrency(currencyToSet);
      }
    }
    if (countryOptions.length > 0 && academy.country) {
      const countryToSet = countryOptions.find(option => option.value === academy.country);
      if (countryToSet) {
        setSelectedCountry(countryToSet);
      }
    }
  }, [currencyOptions, countryOptions, academy.currency, academy.country]);

  const handleUpdateAcademySettings = async (e) => {
    e.preventDefault();
    if (!user || !academyNameInput.trim() || !selectedCurrency?.value) return;

    setIsUpdatingSettings(true);
    setUpdateSettingsError(null);

    const academyRef = doc(db, "academies", user.uid);

    try {
      await updateDoc(academyRef, {
        name: academyNameInput.trim(),
        category: selectedAcademyCategory,
        otherCategory: selectedAcademyCategory === 'Otro' ? otherCategory : '',
        currency: selectedCurrency.value,
        country: selectedCountry?.value || null,
        countryCode: selectedCountry?.countryCode || null,
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

  const handleGroupFormChange = (e) => {
    const { name, value } = e.target;
    setGroupForm(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenGroupModal = (group = null) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        name: group.name || '',
        description: group.description || '',
        minAge: group.minAge || '',
        maxAge: group.maxAge || '',
        coach: group.coach || '',
        maxCapacity: group.maxCapacity || '',
        status: group.status || 'active',
      });
    } else {
      setEditingGroup(null);
      setGroupForm({ name: '', description: '', minAge: '', maxAge: '', coach: '', maxCapacity: '', status: 'active' });
      setGroupError(null);
    }
    setShowGroupModal(true);
  };

  const handleAddOrUpdateGroup = async (e) => {
    e.preventDefault();
    if (!user || loadingGroups) return;

    setLoadingGroups(true);
    setGroupError(null);

    const groupData = {
      ...groupForm,
      minAge: Number(groupForm.minAge) || 0,
      maxAge: Number(groupForm.maxAge) || 0,
      maxCapacity: groupForm.maxCapacity ? Number(groupForm.maxCapacity) : null,
      academyId: user.uid,
      updatedAt: new Date(),
    };

    try {
      if (editingGroup) {
        const groupDocRef = doc(db, `academies/${user.uid}/groups`, editingGroup.id);
        await updateDoc(groupDocRef, groupData);
        toast.success("Group updated successfully.");
      } else {
        groupData.createdAt = new Date();
        const groupsCollectionRef = collection(db, `academies/${user.uid}/groups`);
        await addDoc(groupsCollectionRef, groupData);
        toast.success("Group added successfully.");
      }
      setShowGroupModal(false);
      fetchGroups();
    } catch (err) {
      setGroupError("Error saving group: " + err.message);
      toast.error("Error saving group.");
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    toast((t) => (
      <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center">
        <p className="text-center mb-4">Are you sure you want to delete this group?</p>
        <div className="flex space-x-2 text-base">
          <button onClick={async () => {
            toast.dismiss(t.id);
            try {
              await deleteDoc(doc(db, `academies/${user.uid}/groups`, groupId));
              fetchGroups();
              toast.success("Group deleted successfully.");
            } catch (error) {
              toast.error("Error deleting group.");
            }
          }} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Confirm</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">Cancel</button>
        </div>
      </div>
    ), { duration: 6000 });
  };


  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Account & Preferences</h2>

      {/* Main Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setActiveMainTab('settings')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeMainTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            <Settings className="mr-2 h-5 w-5" /> Academy Settings
          </button>
          <button onClick={() => setActiveMainTab('groups')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeMainTab === 'groups' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            <Users className="mr-2 h-5 w-5" /> Groups & Classes
          </button>
        </nav>
      </div>

      {activeMainTab === 'settings' && (
        <div className="space-y-8">
          <form onSubmit={handleUpdateAcademySettings} className="space-y-4 max-w-3xl">
            <div>
              <label htmlFor="academyName" className="block font-medium text-gray-700">
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="academyCategory" className="block font-medium text-gray-700">
                Categoría de la Academia
              </label>
              <select
                id="academyCategory"
                value={selectedAcademyCategory}
                onChange={(e) => setSelectedAcademyCategory(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value="">Selecciona una categoría</option>
                {ACADEMY_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            {selectedAcademyCategory === 'Otro' && (
              <div>
                <label htmlFor="otherCategory" className="block font-medium text-gray-700">
                  Especificar deporte
                </label>
                <input
                  type="text" id="otherCategory" value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)} required={selectedAcademyCategory === 'Otro'} placeholder="Ej: Pádel, Voleibol"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
              </div>
            )}
            <div>
              <label htmlFor="academyCountry" className="block font-medium text-gray-700">
                Country (Optional)
              </label>
              <Select
                id="academyCountry"
                options={countryOptions}
                value={selectedCountry}
                onChange={setSelectedCountry}
                isSearchable
                isClearable
                placeholder="Search or select a country..."
                className="mt-1"
                classNamePrefix="react-select"
              />
            </div>
            <div>
              <label htmlFor="academyCurrency" className="block font-medium text-gray-700">
                Currency
              </label>
              <Select
                id="academyCurrency"
                options={currencyOptions}
                value={selectedCurrency}
                onChange={setSelectedCurrency}
                isSearchable
                placeholder="Search or select a currency..."
                className="mt-1"
                classNamePrefix="react-select"
              />
            </div>
            {updateSettingsError && <p className="text-red-500 text-sm">{updateSettingsError}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingSettings}
                className="px-4 py-2 font-medium text-white bg-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingSettings ? 'Updating...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeMainTab === 'groups' && (
        <div>
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button onClick={() => setActiveGroupTab('groups')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeGroupTab === 'groups' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Groups</button>
              <button onClick={() => setActiveGroupTab('schedule')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeGroupTab === 'schedule' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Class Schedule</button>
              <button onClick={() => setActiveGroupTab('transfers')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeGroupTab === 'transfers' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Transfers</button>
            </nav>
          </div>

          {activeGroupTab === 'groups' && (
            <>
              <div className="flex justify-end mb-4">
                <button onClick={() => handleOpenGroupModal()} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md flex items-center">
                  <Plus className="mr-2 h-5 w-5" /> Add New Group
                </button>
              </div>
              {groups.length === 0 ? (
                <div className="text-center p-10 text-gray-500 border-2 border-dashed rounded-lg mt-4">
                  <p>No groups created yet.</p>
                  <p className="text-sm">Click "Add New Group" to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead><tr><th className="py-2 px-4 border-b text-left">Name</th><th className="py-2 px-4 border-b text-left">Age Range</th><th className="py-2 px-4 border-b text-left">Coach</th><th className="py-2 px-4 border-b text-left">Capacity</th><th className="py-2 px-4 border-b text-left">Status</th><th className="py-2 px-4 border-b text-right">Actions</th></tr></thead>
                    <tbody>
                      {groups.map(group => (
                        <tr key={group.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 border-b font-medium">{group.name}</td>
                          <td className="py-3 px-4 border-b">{group.minAge}-{group.maxAge} years</td>
                          <td className="py-3 px-4 border-b">{group.coach}</td>
                          <td className="py-3 px-4 border-b">{group.maxCapacity || 'N/A'}</td>
                          <td className="py-3 px-4 border-b"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${group.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{group.status}</span></td>
                          <td className="py-3 px-4 border-b text-right">
                            <button onClick={(e) => { e.stopPropagation(); setActiveGroupMenu(group); setActionsMenuPosition({ x: e.currentTarget.getBoundingClientRect().right + window.scrollX, y: e.currentTarget.getBoundingClientRect().top + window.scrollY }); }} className="p-1 rounded-full hover:bg-gray-200 focus:outline-none"><MoreVertical className="h-5 w-5 text-gray-500" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
          {activeGroupTab === 'schedule' && <div className="text-center p-10 text-gray-500 border-2 border-dashed rounded-lg mt-4"><p>Group session and class schedule management coming soon.</p></div>}
          {activeGroupTab === 'transfers' && <div className="text-center p-10 text-gray-500 border-2 border-dashed rounded-lg mt-4"><p>Module for moving students between groups coming soon.</p></div>}
        </div>
      )}

      {/* Group Actions Menu */}
      {activeGroupMenu && (
        <div className="fixed bg-white border border-gray-border rounded-md shadow-lg z-50" style={{ top: `${actionsMenuPosition.y}px`, left: `${actionsMenuPosition.x}px`, transform: 'translateX(-100%)' }}>
          <ul className="py-1">
            <li className="text-base w-32"><button onClick={() => { handleOpenGroupModal(activeGroupMenu); setActiveGroupMenu(null); }} className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 flex items-center"><Edit className="mr-3 h-4 w-4" /><span>Edit</span></button></li>
            <li className="text-base"><button onClick={() => { handleDeleteGroup(activeGroupMenu.id); setActiveGroupMenu(null); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center"><Trash2 className="mr-3 h-4 w-4" /><span>Delete</span></button></li>
          </ul>
        </div>
      )}

      {/* Group Form Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingGroup ? 'Edit Group' : 'Add New Group'}</h3>
            <form onSubmit={handleAddOrUpdateGroup} className="space-y-4">
              <div><label htmlFor="name" className="block text-sm font-medium text-gray-700">Group Name</label><input type="text" name="name" value={groupForm.name} onChange={handleGroupFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
              <div><label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optional)</label><textarea name="description" value={groupForm.description} onChange={handleGroupFormChange} rows="3" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"></textarea></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="minAge" className="block text-sm font-medium text-gray-700">Min Age</label><input type="number" name="minAge" value={groupForm.minAge} onChange={handleGroupFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
                <div><label htmlFor="maxAge" className="block text-sm font-medium text-gray-700">Max Age</label><input type="number" name="maxAge" value={groupForm.maxAge} onChange={handleGroupFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="coach" className="block text-sm font-medium text-gray-700">Assigned Coach</label><input type="text" name="coach" value={groupForm.coach} onChange={handleGroupFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
                <div><label htmlFor="maxCapacity" className="block text-sm font-medium text-gray-700">Max Capacity (Optional)</label><input type="number" name="maxCapacity" value={groupForm.maxCapacity} onChange={handleGroupFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
              </div>
              <div><label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label><select name="status" value={groupForm.status} onChange={handleGroupFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
              {groupError && <p className="text-red-500 text-sm mt-4">{groupError}</p>}
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowGroupModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md">Cancel</button>
                <button type="submit" disabled={loadingGroups} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md disabled:opacity-50">{loadingGroups ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
