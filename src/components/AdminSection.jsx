import React, { useState, useEffect, useRef, useCallback } from 'react';
import { doc, updateDoc, collection, query, getDocs, addDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import Select from 'react-select';
import toast from 'react-hot-toast';
import { Upload, Settings, Users } from 'lucide-react';
import { sanitizeEmail, sanitizeText, sanitizeFilename, validateFileType } from '../utils/validators';
import '../styles/sections.css';
export default function AdminSection({ user, academy, db, onAcademyUpdate, pendingInvites = [], onAcceptInvite, onDeclineInvite, isAcceptingInvite }) {
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
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(academy.logoUrl || '');
  const [studentLabelSingular, setStudentLabelSingular] = useState(academy.studentLabelSingular || 'Student');
  const [studentLabelPlural, setStudentLabelPlural] = useState(academy.studentLabelPlural || 'Students');
  const logoInputRef = useRef(null);
  const ACADEMY_CATEGORIES = ['Soccer', 'Basketball', 'Tennis', 'Other'];
  const [activeTab, setActiveTab] = useState('settings');
  const [inviteEmail, setInviteEmail] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamInvites, setTeamInvites] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteAcademyNames, setInviteAcademyNames] = useState({});
  const academyId = academy.id || academy.ownerId || user?.uid;
  const canManageTeam = academy.ownerId === user?.uid;

  // Sync form state when academy changes (e.g., switching dropdown)
  useEffect(() => {
    setAcademyNameInput(academy.name || '');
    setSelectedAcademyCategory(academy.category || '');
    setOtherCategory(academy.otherCategory || '');
    setLogoPreview(academy.logoUrl || '');
    setLogoFile(null);
    setStudentLabelSingular(academy.studentLabelSingular || 'Student');
    setStudentLabelPlural(academy.studentLabelPlural || 'Students');
    setInviteEmail('');
  }, [academy]);

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

  const fetchTeamData = useCallback(async () => {
    if (!user || !academyId) return;
    setTeamLoading(true);
    try {
      const [membersSnap, invitesSnap] = await Promise.all([
        getDocs(collection(db, `academies/${academyId}/members`)),
        getDocs(collection(db, `academies/${academyId}/invites`)),
      ]);
      const members = membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const invites = invitesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeamMembers(members);
      setTeamInvites(invites);
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast.error("No se pudo cargar el equipo.");
    } finally {
      setTeamLoading(false);
    }
  }, [academyId, db, user]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // Fetch academy names for pending invites
  useEffect(() => {
    const fetchInviteAcademyNames = async () => {
      if (!pendingInvites || pendingInvites.length === 0) return;

      const names = {};
      for (const invite of pendingInvites) {
        try {
          const academyRef = doc(db, 'academies', invite.academyId);
          const academySnap = await getDoc(academyRef);
          if (academySnap.exists()) {
            names[invite.academyId] = academySnap.data().name || invite.academyId;
          } else {
            names[invite.academyId] = invite.academyId;
          }
        } catch (err) {
          console.error(`Error fetching academy name for ${invite.academyId}:`, err);
          names[invite.academyId] = invite.academyId;
        }
      }
      setInviteAcademyNames(names);
    };

    fetchInviteAcademyNames();
  }, [pendingInvites, db]);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!canManageTeam || !inviteEmail.trim()) return;

    // Validate and sanitize email
    const sanitizedEmail = sanitizeEmail(inviteEmail);
    if (!sanitizedEmail) {
      toast.error("Por favor ingresa un correo electrónico válido.");
      return;
    }

    const isAlreadyMember = teamMembers.some(m => (m.email || '').toLowerCase() === sanitizedEmail);
    const isAlreadyInvited = teamInvites.some(i => (i.email || '').toLowerCase() === sanitizedEmail && i.status === 'pending');
    if (isAlreadyMember) {
      toast.error("Ese usuario ya es parte del equipo.");
      return;
    }
    if (isAlreadyInvited) {
      toast.error("Ya existe una invitación pendiente para ese correo.");
      return;
    }

    setIsInviting(true);
    try {
      await addDoc(collection(db, `academies/${academyId}/invites`), {
        email: sanitizedEmail,
        status: 'pending',
        invitedBy: user.uid,
        role: 'admin',
        invitedAt: serverTimestamp(),
      });
      toast.success("Invitación enviada.");
      setInviteEmail('');
      fetchTeamData();
    } catch (err) {
      console.error("Error inviting teammate:", err);
      toast.error("No se pudo enviar la invitación.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!canManageTeam) return;
    if (member.id === academy.ownerId || member.role === 'owner') {
      toast.error("No puedes eliminar al owner.");
      return;
    }

    const confirmed = window.confirm(`¿Estás seguro de que quieres eliminar a ${member.email || 'este miembro'}? Perderán acceso a la academia.`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, `academies/${academyId}/members`, member.id));
      if (member.userId || member.id) {
        const targetUserId = member.userId || member.id;
        try {
          await deleteDoc(doc(db, `users/${targetUserId}/memberships`, academyId));
        } catch (innerErr) {
          console.warn("No se pudo limpiar el membership del usuario:", innerErr);
        }
      }
      toast.success("Miembro eliminado exitosamente.");
      fetchTeamData();
    } catch (err) {
      console.error("Error removing member:", err);
      toast.error("No se pudo eliminar al miembro.");
    }
  };

  const handleCancelInvite = async (invite) => {
    if (!canManageTeam) return;
    try {
      await updateDoc(doc(db, `academies/${academyId}/invites`, invite.id), { status: 'revoked', revokedAt: serverTimestamp() });
      toast.success("Invitación revocada.");
      fetchTeamData();
    } catch (err) {
      console.error("Error canceling invite:", err);
      toast.error("No se pudo cancelar la invitación.");
    }
  };

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

    // Sanitize text inputs
    const sanitizedName = sanitizeText(academyNameInput, 100);
    const sanitizedOtherCategory = sanitizeText(otherCategory, 100);
    const sanitizedStudentSingular = sanitizeText(studentLabelSingular, 50) || 'Student';
    const sanitizedStudentPlural = sanitizeText(studentLabelPlural, 50) || 'Students';

    if (!sanitizedName) {
      toast.error("El nombre de la academia no puede estar vacío.");
      return;
    }

    setIsUpdatingSettings(true);
    setUpdateSettingsError(null);

    const academyRef = doc(db, "academies", academyId);
    const previousLogoPath = academy.logoPath || null;

    try {
      let logoUrl = academy.logoUrl || null;
      let logoPath = academy.logoPath || null;

      if (logoFile) {
        // Validate file type using magic bytes
        const buffer = await logoFile.arrayBuffer();
        const mimeType = logoFile.type;

        if (!['image/jpeg', 'image/png', 'image/gif'].includes(mimeType)) {
          toast.error("Solo se permiten imágenes (JPG, PNG, GIF).");
          setIsUpdatingSettings(false);
          return;
        }

        if (!validateFileType(buffer, mimeType)) {
          toast.error("El archivo no coincide con el tipo de imagen declarado.");
          setIsUpdatingSettings(false);
          return;
        }

        // Validate file size (max 5MB)
        if (logoFile.size > 5 * 1024 * 1024) {
          toast.error("El archivo debe ser menor a 5MB.");
          setIsUpdatingSettings(false);
          return;
        }

        const storage = getStorage();
        const sanitizedFilename = sanitizeFilename(logoFile.name);
        const newLogoPath = `academies/${academyId}/branding/logo_${Date.now()}_${sanitizedFilename}`;
        const logoRef = ref(storage, newLogoPath);
        const snap = await uploadBytes(logoRef, logoFile);
        logoUrl = await getDownloadURL(snap.ref);
        logoPath = newLogoPath;

        if (previousLogoPath && previousLogoPath !== newLogoPath) {
          try {
            await deleteObject(ref(storage, previousLogoPath));
          } catch (deleteErr) {
            console.warn("Failed to delete previous logo", deleteErr);
          }
        }
      }

      await updateDoc(academyRef, {
        name: sanitizedName,
        category: selectedAcademyCategory,
        otherCategory: selectedAcademyCategory === 'Other' ? sanitizedOtherCategory : '',
        currency: selectedCurrency.value,
        country: selectedCountry?.value || null,
        countryCode: selectedCountry?.countryCode || null,
        logoUrl: logoUrl || null,
        logoPath: logoPath || null,
        studentLabelSingular: sanitizedStudentSingular,
        studentLabelPlural: sanitizedStudentPlural,
      });
      await onAcademyUpdate(); // Llama a la función para refrescar los datos en App.jsx
      toast.success("Academy settings updated successfully.");
      setLogoFile(null);
    } catch (error) {
      console.error("Error updating academy:", error);
      setUpdateSettingsError("Error updating settings: " + error.message);
      toast.error("Error updating settings.");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    const MIN_DIMENSION = 100;
    const MAX_DIMENSION = 3000;

    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG or WEBP are allowed.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Image must be smaller than 2MB.");
      e.target.value = "";
      return;
    }

    const isValidDimensions = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const { width, height } = img;
          if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
            toast.error("Image is too small (min 100x100px).");
            resolve(false);
            return;
          }
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            toast.error("Image is too large (max 3000px).");
            resolve(false);
            return;
          }
          resolve(true);
        };
        img.onerror = () => resolve(false);
        img.src = ev.target.result;
      };
      reader.onerror = () => resolve(false);
      reader.readAsDataURL(file);
    });

    if (!isValidDimensions) {
      e.target.value = "";
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  return (
    <div className="section-container">
      <div className="section-content-wrapper space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Settings</h2>
          <div />
        </div>
        <div className="content-card-responsive space-y-8">
          <div className="tabs-container">
            <nav className="tabs-nav" aria-label="Tabs" role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === 'settings'}
                onClick={() => setActiveTab('settings')}
                className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
              >
                <Settings /> Preferences
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'team'}
                onClick={() => setActiveTab('team')}
                className={`tab-button ${activeTab === 'team' ? 'active' : ''}`}
              >
                <Users /> Team
              </button>
            </nav>
          </div>

          {activeTab === 'settings' && (
          <form onSubmit={handleUpdateAcademySettings} className="space-y-4 max-w-3xl">
            <div className="flex flex-col items-start space-y-2">
              <input
                type="file"
                ref={logoInputRef}
                accept="image/*"
                onChange={handleLogoFileChange}
                className="hidden"
              />
              <div
                className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden"
                onClick={() => logoInputRef.current?.click()}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Academy logo" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <p className="text-sm text-gray-600">Academy Logo</p>
              <p className="text-xs text-gray-500">Max 2MB · JPG/PNG/WEBP · 100–3000px</p>
            </div>
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
                Academy Category
              </label>
              <select
                id="academyCategory"
                value={selectedAcademyCategory}
                onChange={(e) => setSelectedAcademyCategory(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value="">Select a category</option>
                {ACADEMY_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            {selectedAcademyCategory === 'Other' && (
              <div>
                <label htmlFor="otherCategory" className="block font-medium text-gray-700">
                  Specify sport
                </label>
                <input
                  type="text" id="otherCategory" value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)} required={selectedAcademyCategory === 'Other'} placeholder="e.g., Paddle, Volleyball"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-gray-700">Students (singular)</label>
                <input
                  type="text"
                  value={studentLabelSingular}
                  onChange={(e) => setStudentLabelSingular(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Student"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700">Students (plural)</label>
                <input
                  type="text"
                  value={studentLabelPlural}
                  onChange={(e) => setStudentLabelPlural(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Students"
                />
              </div>
            </div>
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
                className="btn-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                {isUpdatingSettings ? 'Updating...' : 'Save Settings'}
              </button>
            </div>
          </form>
          )}

          {activeTab === 'team' && (
            <div className="space-y-6">
              {/* Invitaciones pendientes recibidas por el usuario */}
              {pendingInvites && pendingInvites.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Academy Invitations</h3>
                  <p className="text-sm text-blue-700 mb-4">You have been invited to join other academies.</p>
                  <div className="space-y-3">
                    {pendingInvites.map(invite => (
                      <div key={invite.id} className="bg-section border border-blue-200 rounded-md p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{inviteAcademyNames[invite.academyId] || 'Loading...'}</p>
                          <p className="text-xs text-gray-500">Role: {invite.role || 'admin'} · Invited by {invite.invitedBy || 'owner'}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => onDeclineInvite && onDeclineInvite(invite.id)}
                            className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded-md border border-gray-200"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => onAcceptInvite && onAcceptInvite(invite.id)}
                            disabled={isAcceptingInvite}
                            className="btn-primary-sm text-sm"
                          >
                            {isAcceptingInvite ? 'Joining...' : 'Accept'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-900">Team members</p>
                  <p className="text-sm text-gray-600">Invita o gestiona a quienes pueden administrar la academia.</p>
                </div>
                {canManageTeam && (
                  <form onSubmit={handleInviteSubmit} className="flex items-center space-x-2">
                    <input
                      type="email"
                      placeholder="email@domain.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      required
                    />
                    <button
                      type="submit"
                      className="btn-primary shadow-sm"
                      disabled={isInviting}
                    >
                      {isInviting ? 'Sending...' : 'Invite'}
                    </button>
                  </form>
                )}
              </div>

              {teamLoading ? (
                <p className="text-sm text-gray-600">Loading team...</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-2">Members</p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-section">
                        <thead>
                          <tr>
                            <th className="py-2 px-4 border-b text-left table-header">User</th>
                            <th className="py-2 px-4 border-b text-left table-header">Email</th>
                            <th className="py-2 px-4 border-b text-left table-header">Role</th>
                            <th className="py-2 px-4 border-b text-left table-header">Status</th>
                            <th className="py-2 px-4 border-b text-left table-header"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamMembers.length === 0 && (
                            <tr className="table-row-hover"><td className="py-3 px-4 text-sm text-gray-600 table-cell" colSpan={5}>No team members yet.</td></tr>
                          )}
                          {teamMembers.map(member => (
                            <tr key={member.id} className="hover:bg-gray-50 table-row-hover">
                              <td className="py-2 px-4 border-b font-medium text-gray-900 table-cell">{member.name || 'Member'}</td>
                              <td className="py-2 px-4 border-b text-gray-700 table-cell">{member.email || 'N/A'}</td>
                              <td className="py-2 px-4 border-b text-gray-700 capitalize table-cell">{member.role || 'admin'}</td>
                              <td className="py-2 px-4 border-b text-gray-700 capitalize table-cell">{member.status || 'active'}</td>
                              <td className="py-2 px-4 border-b text-right table-cell">
                                {canManageTeam && member.id !== academy.ownerId && member.role !== 'owner' && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(member)}
                                    className="text-sm text-red-600 hover:underline"
                                  >
                                    Remove
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-2">Invitations</p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-section">
                        <thead>
                          <tr>
                            <th className="py-2 px-4 border-b text-left table-header">Email</th>
                            <th className="py-2 px-4 border-b text-left table-header">Role</th>
                            <th className="py-2 px-4 border-b text-left table-header">Status</th>
                            <th className="py-2 px-4 border-b text-left table-header"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamInvites.filter(invite => invite.status === 'pending').length === 0 && (
                            <tr className="table-row-hover"><td className="py-3 px-4 text-sm text-gray-600 table-cell" colSpan={4}>No pending invitations.</td></tr>
                          )}
                          {teamInvites.filter(invite => invite.status === 'pending').map(invite => (
                            <tr key={invite.id} className="hover:bg-gray-50 table-row-hover">
                              <td className="py-2 px-4 border-b table-cell">{invite.email}</td>
                              <td className="py-2 px-4 border-b capitalize table-cell">{invite.role || 'admin'}</td>
                              <td className="py-2 px-4 border-b capitalize table-cell">{invite.status}</td>
                              <td className="py-2 px-4 border-b text-right table-cell">
                                {canManageTeam && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelInvite(invite)}
                                    className="text-sm text-red-600 hover:underline"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
