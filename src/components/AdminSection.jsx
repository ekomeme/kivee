import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, collection, query, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import Select from 'react-select';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';
export default function AdminSection({ user, academy, db, onAcademyUpdate }) {
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
    const previousLogoPath = academy.logoPath || null;

    try {
      let logoUrl = academy.logoUrl || null;
      let logoPath = academy.logoPath || null;
      if (logoFile) {
        const storage = getStorage();
        const newLogoPath = `academies/${user.uid}/branding/logo_${Date.now()}_${logoFile.name}`;
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
        name: academyNameInput.trim(),
        category: selectedAcademyCategory,
        otherCategory: selectedAcademyCategory === 'Other' ? otherCategory : '',
        currency: selectedCurrency.value,
        country: selectedCountry?.value || null,
        countryCode: selectedCountry?.countryCode || null,
        logoUrl: logoUrl || null,
        logoPath: logoPath || null,
        studentLabelSingular: studentLabelSingular.trim() || 'Student',
        studentLabelPlural: studentLabelPlural.trim() || 'Students',
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
    <div className="p-6">
      <div className="w-full max-w-screen-xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Account & Preferences</h2>
          <div />
        </div>
        <div className="bg-white rounded-none shadow-none md:rounded-lg md:shadow-md p-4 md:p-6 space-y-8">
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
                className="px-4 py-2 font-medium text-white bg-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingSettings ? 'Updating...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
