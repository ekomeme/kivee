import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import Select from 'react-select';
// import { PlusCircle, Edit, Trash2 } from 'lucide-react'; // These are not used in AdminSection
import toast from 'react-hot-toast';
export default function AdminSection({ user, academy, db, onAcademyUpdate }) {
  const CURRENCIES = [
    { code: 'EUR', name: 'Euro' },
  ];

  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);

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

  const [academyNameInput, setAcademyNameInput] = useState(academy.name);
  const [selectedAcademyCategory, setSelectedAcademyCategory] = useState(academy.category || '');
  const [otherCategory, setOtherCategory] = useState(academy.otherCategory || '');
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [updateSettingsError, setUpdateSettingsError] = useState(null);
  const ACADEMY_CATEGORIES = ['Fútbol', 'Baloncesto', 'Tenis', 'Otro'];

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


  return (
    <div className="space-y-8">
      {/* Sección para cambiar el nombre de la academia */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Academy Settings</h2>
        <form onSubmit={handleUpdateAcademySettings} className="space-y-4">
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
              placeholder="Search or select a currency..." // text-base is default for Select
              className="mt-1"
              classNamePrefix="react-select" // Add a prefix for custom styling if needed
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
  );
}
