import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import Select from 'react-select';
// import { PlusCircle, Edit, Trash2 } from 'lucide-react'; // These are not used in AdminSection
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

  const currencyOptions = CURRENCIES.sort((a, b) => a.code.localeCompare(b.code)).map(c => ({
    value: c.code,
    label: `${c.code} - ${c.name}`
  }));

  const findCurrencyOption = (currencyCode) => currencyOptions.find(option => option.value === currencyCode);

  const [academyNameInput, setAcademyNameInput] = useState(academy.name);
  const [selectedAcademyCategory, setSelectedAcademyCategory] = useState(academy.category || '');
  const [otherCategory, setOtherCategory] = useState(academy.otherCategory || '');
  const [selectedCurrency, setSelectedCurrency] = useState(findCurrencyOption(academy.currency) || findCurrencyOption('USD'));
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [updateSettingsError, setUpdateSettingsError] = useState(null);
  const ACADEMY_CATEGORIES = ['Fútbol', 'Baloncesto', 'Tenis', 'Otro'];

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
