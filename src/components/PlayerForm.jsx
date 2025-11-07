import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import toast from 'react-hot-toast';

export default function PlayerForm({ user, academy, db, onComplete, playerToEdit }) {
  // Player Info
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [playerPhotoFile, setPlayerPhotoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [category, setCategory] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [playerPhonePrefix, setPlayerPhonePrefix] = useState('+1');
  const [playerContactPhone, setPlayerContactPhone] = useState('');

  // Tutor Info
  const [hasTutor, setHasTutor] = useState(false);
  const [tutorName, setTutorName] = useState('');
  const [tutorLastName, setTutorLastName] = useState('');
  const [tutorEmail, setTutorEmail] = useState('');
  const [tutorPhonePrefix, setTutorPhonePrefix] = useState('+1');
  const [tutorContactPhone, setTutorContactPhone] = useState('');

  // Payment Info
  const [tierId, setTierId] = useState('');
  const [isFreeTrial, setIsFreeTrial] = useState(false);
  const [freeTrialEndDate, setFreeTrialEndDate] = useState('');
  const [paymentType, setPaymentType] = useState('Mensual');
  const [startDate, setStartDate] = useState('');
  const [paidDate, setPaidDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [receipt, setReceipt] = useState('');
  const [notes, setNotes] = useState('');

  // Component State
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const COUNTRY_CODES = [
    { code: '+1', country: 'USA' },
    { code: '+44', country: 'UK' },
    { code: '+54', country: 'Argentina' },
  ];
  // Fetch Tiers for the dropdown
  useEffect(() => {
    const fetchTiers = async () => {
      if (!user || !academy) return;
      const tiersRef = collection(db, `academies/${user.uid}/tiers`);
      const querySnapshot = await getDocs(tiersRef);
      setTiers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    fetchTiers();
  }, [user, academy, db]);

  // Calculate category based on birthday
  useEffect(() => {
    if (birthday) {
      const birthDate = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setCategory(`U${age + 1}`);
    } else {
      setCategory('');
    }
  }, [birthday]);

  // Calculate expiry date
  useEffect(() => {
    const calculateExpiry = () => {
      const initialDate = isFreeTrial && freeTrialEndDate ? freeTrialEndDate : paidDate;
      if (!initialDate) {
        setExpiryDate('');
        return;
      }

      const date = new Date(initialDate);
      if (paymentType === 'Mensual') {
        date.setMonth(date.getMonth() + 1);
      } else if (paymentType === 'Semestral') {
        date.setMonth(date.getMonth() + 6);
      } else if (paymentType === 'Anual') {
        date.setFullYear(date.getFullYear() + 1);
      }
      setExpiryDate(date.toISOString().split('T')[0]);
    };

    calculateExpiry();
  }, [paidDate, freeTrialEndDate, isFreeTrial, paymentType]);

  // Populate form if editing a player
  useEffect(() => {
    if (playerToEdit) {
      // Player Info
      setName(playerToEdit.name || '');
      setLastName(playerToEdit.lastName || '');
      setGender(playerToEdit.gender || '');
      setBirthday(playerToEdit.birthday || '');
      setPhotoURL(playerToEdit.photoURL || '');
      setCategory(playerToEdit.category || '');
      setPlayerEmail(playerToEdit.email || '');
      if (playerToEdit.contactPhone) {
        const phoneParts = playerToEdit.contactPhone.match(/^(\+\d+)(\d+)$/);
        if (phoneParts) {
          setPlayerPhonePrefix(phoneParts[1]);
          setPlayerContactPhone(phoneParts[2]);
        } else {
          setPlayerContactPhone(playerToEdit.contactPhone);
        }
      }

      // Tutor Info
      if (playerToEdit.tutorId && playerToEdit.tutor) {
        setHasTutor(true);
        setTutorName(playerToEdit.tutor.name || '');
        setTutorLastName(playerToEdit.tutor.lastName || '');
        setTutorEmail(playerToEdit.tutor.email || '');
        if (playerToEdit.tutor.contactPhone) {
          const tutorPhoneParts = playerToEdit.tutor.contactPhone.match(/^(\+\d+)(\d+)$/);
          if (tutorPhoneParts) {
            setTutorPhonePrefix(tutorPhoneParts[1]);
            setTutorContactPhone(tutorPhoneParts[2]);
          } else {
            setTutorContactPhone(playerToEdit.tutor.contactPhone);
          }
        }
      }

      // Payment Info
      setTierId(playerToEdit.tierId || '');
      setIsFreeTrial(playerToEdit.isFreeTrial || false);
      setFreeTrialEndDate(playerToEdit.freeTrialEndDate || '');
      setPaymentType(playerToEdit.paymentType || 'Mensual');
      setStartDate(playerToEdit.startDate || '');
      setPaidDate(playerToEdit.paidDate || '');
      setExpiryDate(playerToEdit.expiryDate || '');
      setReceipt(playerToEdit.receipt || '');
      setNotes(playerToEdit.notes || '');
    }
  }, [playerToEdit]);

  const handlePhotoFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 5 * 1024 * 1024) { // 5MB limit
      setPlayerPhotoFile(file);
      setPhotoURL(URL.createObjectURL(file)); // Preview
    } else {
      alert("La foto debe ser menor a 5MB.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !academy || loading) return;

    setLoading(true);
    setError(null);

    let finalPhotoURL = playerToEdit?.photoURL || photoURL;

    if (playerPhotoFile) {
      const storage = getStorage();
      const storageRef = ref(storage, `academies/${user.uid}/player_photos/${Date.now()}_${playerPhotoFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, playerPhotoFile);

      try {
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error("Upload failed:", error);
              setError("Error al subir la foto: " + error.message);
              setLoading(false);
              reject(error);
            },
            async () => {
              finalPhotoURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      } catch (err) {
        return; // Stop submission if photo upload fails
      }
    }
    let linkedTutorId = playerToEdit?.tutorId || null;

    if (hasTutor) {
      const tutorData = {
        name: tutorName,
        lastName: tutorLastName,
        email: tutorEmail,
        contactPhone: tutorContactPhone ? `${tutorPhonePrefix}${tutorContactPhone}` : null,
        academyId: user.uid,
        createdAt: playerToEdit?.tutor?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      try {
        if (playerToEdit?.tutor) { // If editing an existing tutor
          await updateDoc(doc(db, `academies/${user.uid}/tutors`, playerToEdit.tutor.id), tutorData);
          linkedTutorId = playerToEdit.tutor.id;
        } else { // Create a new tutor
          const tutorRef = await addDoc(collection(db, `academies/${user.uid}/tutors`), tutorData);
          linkedTutorId = tutorRef.id;
        }
      } catch (err) {
        setError("Error al guardar el tutor: " + err.message);
        setLoading(false);
        return;
      }
    }

    const playerData = {
      name,
      lastName,
      gender,
      birthday,
      photoURL: finalPhotoURL,
      category,
      email: playerEmail || null,
      contactPhone: playerContactPhone ? `${playerPhonePrefix}${playerContactPhone}` : null,
      tutorId: hasTutor ? linkedTutorId : null,
      tierId,
      isFreeTrial,
      freeTrialEndDate: isFreeTrial && freeTrialEndDate ? freeTrialEndDate : null,
      paymentType,
      startDate: startDate || null,
      paidDate: isFreeTrial && freeTrialEndDate ? freeTrialEndDate : (paidDate || null),
      expiryDate,
      receipt,
      notes,
      academyId: user.uid,
      createdAt: playerToEdit ? playerToEdit.createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (playerToEdit) {
        const playerDocRef = doc(db, `academies/${user.uid}/players`, playerToEdit.id);
        await updateDoc(playerDocRef, playerData);
        toast.success("Jugador actualizado con éxito.");
      } else {
        const playersCollectionRef = collection(db, `academies/${user.uid}/players`);
        await addDoc(playersCollectionRef, playerData);
        toast.success("Jugador agregado con éxito.");
      }
      onComplete();
    } catch (err) {
      console.error("Error al guardar jugador:", err);
      setError("Error al guardar jugador: " + err.message);
      toast.error("Error al guardar el jugador.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Player Info Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">Información del Jugador</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div><label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre</label><input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div><label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Apellido</label><input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div><label htmlFor="birthday" className="block text-sm font-medium text-gray-700">Fecha de Nacimiento</label><input type="date" id="birthday" value={birthday} onChange={(e) => setBirthday(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div><label htmlFor="gender" className="block text-sm font-medium text-gray-700">Género</label><select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"><option value="">Selecciona</option><option value="Masculino">Masculino</option><option value="Femenino">Femenino</option><option value="Otro">Otro</option></select></div>
            <div><label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría (Calculada)</label><input type="text" id="category" value={category} readOnly className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100" /></div>
            <div><label htmlFor="playerEmail" className="block text-sm font-medium text-gray-700">Email (Opcional)</label><input type="email" id="playerEmail" value={playerEmail} onChange={(e) => setPlayerEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div>
              <label htmlFor="playerContactPhone" className="block text-sm font-medium text-gray-700">Teléfono (Opcional)</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <select value={playerPhonePrefix} onChange={(e) => setPlayerPhonePrefix(e.target.value)} className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">{COUNTRY_CODES.map(cc => <option key={cc.code} value={cc.code}>{cc.code} ({cc.country})</option>)}</select>
                <input type="tel" id="playerContactPhone" value={playerContactPhone} onChange={(e) => setPlayerContactPhone(e.target.value)} className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-blue-500" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="playerPhoto" className="block text-sm font-medium text-gray-700">Foto del Jugador (Opcional, max 5MB)</label>
              <input type="file" id="playerPhoto" accept="image/*" onChange={handlePhotoFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              {uploadProgress > 0 && <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2"><div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div></div>}
              {photoURL && <div className="mt-2"><img src={photoURL} alt="Foto actual" className="w-20 h-20 object-cover rounded-full" /></div>}
            </div>
          </div>
        </fieldset>

        {/* Tutor Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">Tutor / Responsable</legend>
          <div className="mt-4">
            <label htmlFor="hasTutor" className="block text-sm font-medium text-gray-700">¿Tiene tutor?</label>
            <select id="hasTutor" value={hasTutor} onChange={(e) => setHasTutor(e.target.value === 'true')} className="mt-1 block w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500">
              <option value={false}>No</option>
              <option value={true}>Sí</option>
            </select>
          </div>
          {hasTutor && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div><label htmlFor="tutorName" className="block text-sm font-medium text-gray-700">Nombre Tutor</label><input type="text" id="tutorName" value={tutorName} onChange={(e) => setTutorName(e.target.value)} required={hasTutor} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
              <div><label htmlFor="tutorLastName" className="block text-sm font-medium text-gray-700">Apellido Tutor</label><input type="text" id="tutorLastName" value={tutorLastName} onChange={(e) => setTutorLastName(e.target.value)} required={hasTutor} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
              <div><label htmlFor="tutorEmail" className="block text-sm font-medium text-gray-700">Email Tutor (Opcional)</label><input type="email" id="tutorEmail" value={tutorEmail} onChange={(e) => setTutorEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
              <div>
                <label htmlFor="tutorContactPhone" className="block text-sm font-medium text-gray-700">Teléfono Tutor (Opcional)</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <select value={tutorPhonePrefix} onChange={(e) => setTutorPhonePrefix(e.target.value)} className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">{COUNTRY_CODES.map(cc => <option key={cc.code} value={cc.code}>{cc.code} ({cc.country})</option>)}</select>
                  <input type="tel" id="tutorContactPhone" value={tutorContactPhone} onChange={(e) => setTutorContactPhone(e.target.value)} className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-blue-500" />
                </div>
              </div>
            </div>
          )}
        </fieldset>

        {/* Payment Info Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">Información de Pago</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="md:col-span-2"><label className="flex items-center"><input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600" checked={isFreeTrial} onChange={(e) => setIsFreeTrial(e.target.checked)} /><span className="ml-2 text-sm font-medium text-gray-700">¿Periodo de prueba?</span></label></div>
            {isFreeTrial && (
              <div><label htmlFor="freeTrialEndDate" className="block text-sm font-medium text-gray-700">Fin del periodo de prueba</label><input type="date" id="freeTrialEndDate" value={freeTrialEndDate} onChange={(e) => { setFreeTrialEndDate(e.target.value); setPaidDate(e.target.value); }} required={isFreeTrial} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
            )}
            <div><label htmlFor="tier" className="block text-sm font-medium text-gray-700">Plan Asignado</label><select id="tier" value={tierId} onChange={(e) => setTierId(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"><option value="">Selecciona un Plan</option>{tiers.map(tier => (<option key={tier.id} value={tier.id}>{tier.name}</option>))}</select></div>
            <div><label htmlFor="paymentType" className="block text-sm font-medium text-gray-700">Tipo de Pago</label><select id="paymentType" value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"><option value="Mensual">Mensual</option><option value="Semestral">Semestral</option><option value="Anual">Anual</option></select></div>
            <div><label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Fecha de Inicio</label><input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
            {!isFreeTrial && <div><label htmlFor="paidDate" className="block text-sm font-medium text-gray-700">Fecha de Pago</label><input type="date" id="paidDate" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>}
            <div><label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700">Fecha de Vencimiento (Calculada)</label><input type="text" id="expiryDate" value={expiryDate} readOnly className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100" /></div>
            <div className="md:col-span-2"><label htmlFor="receipt" className="block text-sm font-medium text-gray-700">Recibo (Texto)</label><input type="text" id="receipt" value={receipt} onChange={(e) => setReceipt(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
            <div className="md:col-span-2"><label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notas</label><textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"></textarea></div>
          </div>
        </fieldset>

        {/* Form Actions */}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={onComplete} className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
            Cancelar
          </button>
          <button type="submit" disabled={loading || uploadProgress > 0} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (uploadProgress > 0 ? `Subiendo... ${uploadProgress.toFixed(0)}%` : 'Guardando...') : (playerToEdit ? 'Actualizar Jugador' : 'Agregar Jugador')}
          </button>
        </div>
        </form>
    </div>
  );
}
