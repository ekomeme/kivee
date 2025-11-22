import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import toast from 'react-hot-toast';
import Select from 'react-select';

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
  const [selectedPlan, setSelectedPlan] = useState(null); // This will hold the selected plan object from react-select
  const [planStartDate, setPlanStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [paymentType, setPaymentType] = useState('Monthly');

  // Component State
  const [tiers, setTiers] = useState([]);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countryCodes, setCountryCodes] = useState([]);
  useEffect(() => {
    const fetchTiers = async () => {
      if (!user || !academy) return;
      const tiersRef = collection(db, `academies/${user.uid}/tiers`);
      const querySnapshot = await getDocs(tiersRef);
      setTiers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    const fetchTrials = async () => {
      if (!user || !academy) return;
      const trialsRef = collection(db, `academies/${user.uid}/trials`);
      const querySnapshot = await getDocs(trialsRef);
      setTrials(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    fetchTiers();
    fetchTrials();
  }, [user, academy, db]);

  // Fetch country codes for phone prefixes
  useEffect(() => {
    const fetchCountryCodes = async () => {
      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,idd,cca2');
        const data = await response.json();
        const codes = data
          .filter(country => country.idd?.root)
          .map(country => {
            const suffix = country.idd.suffixes?.[0] || '';
            const prefix = country.idd.suffixes?.length > 1 ? country.idd.root : `${country.idd.root}${suffix}`;
            return {
              value: prefix,
              label: `${country.name.common} (${prefix})`,
              cca2: country.cca2
            };
          })
          .sort((a, b) => a.label.localeCompare(b.label));
        
        // Remove duplicates by label, as some countries might share codes or names
        const uniqueCodes = Array.from(new Map(codes.map(item => [item.label, item])).values());

        setCountryCodes(uniqueCodes);

        // Set default prefix based on academy country, only for new players
        if (!playerToEdit && academy.countryCode) {
          const academyCountry = uniqueCodes.find(c => c.cca2 === academy.countryCode);
          if (academyCountry?.value) {
            setPlayerPhonePrefix(academyCountry.value);
            setTutorPhonePrefix(academyCountry.value);
          }
        }
      } catch (error) { console.error("Error fetching country codes:", error); }
    };
    fetchCountryCodes();
  }, [academy.countryCode, playerToEdit]);

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
      setPlayerPhonePrefix(playerToEdit.contactPhonePrefix || '+1');
      setPlayerContactPhone(playerToEdit.contactPhoneNumber || '');

      // Tutor Info
      if (playerToEdit.tutorId && playerToEdit.tutor) {
        setHasTutor(true);
        setTutorName(playerToEdit.tutor.name || '');
        setTutorLastName(playerToEdit.tutor.lastName || '');
        setTutorEmail(playerToEdit.tutor.email || '');
        setTutorPhonePrefix(playerToEdit.tutor.contactPhonePrefix || '+1');
        setTutorContactPhone(playerToEdit.tutor.contactPhoneNumber || '');
      }

      // Payment Info
      if (playerToEdit.plan && (tiers.length > 0 || trials.length > 0)) {
        const planValue = `${playerToEdit.plan.type}-${playerToEdit.plan.id}`;
        const allOptions = [
          ...(tiers.map(t => ({ value: `tier-${t.id}`, label: t.name }))),
          ...(trials.map(tr => ({ value: `trial-${tr.id}`, label: tr.name })))
        ];
        const planToSet = allOptions.find(opt => opt.value === planValue);
        if (planToSet) {
          setSelectedPlan(planToSet);
        }
        setPlanStartDate(playerToEdit.plan.startDate || new Date().toISOString().split('T')[0]);
        setPaymentType(playerToEdit.plan.paymentCycle || 'Monthly');
      } else { // For backward compatibility with old data structure
        if (playerToEdit.tierId && tiers.length > 0) {
            const tierToSet = tiers.find(t => t.id === playerToEdit.tierId);
            if (tierToSet) {
                setSelectedPlan({ value: `tier-${tierToSet.id}`, label: tierToSet.name });
                setPaymentType(playerToEdit.paymentType || 'Monthly');
            }
        }
      }
      setNotes(playerToEdit.notes || '');
    }
  }, [playerToEdit, tiers, trials]);

  const handlePhotoFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 5 * 1024 * 1024) { // 5MB limit
      setPlayerPhotoFile(file);
      setPhotoURL(URL.createObjectURL(file)); // Preview
    } else {
      toast.error("Photo must be smaller than 5MB.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic phone number length validation
    if (playerContactPhone && (playerContactPhone.length < 6 || playerContactPhone.length > 15)) {
      toast.error("Student's phone number has an invalid length.");
      return;
    }
    if (hasTutor && tutorContactPhone && (tutorContactPhone.length < 6 || tutorContactPhone.length > 15)) {
      toast.error("Tutor's phone number has an invalid length.");
      return;
    }

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
              toast.error("Error uploading photo.");
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
        contactPhonePrefix: tutorContactPhone ? tutorPhonePrefix : null,
        contactPhoneNumber: tutorContactPhone ? tutorContactPhone : null,
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
        toast.error("Error saving tutor.");
        return;
      }
    }

    let planData = null;
    if (selectedPlan) {
      const [type, id] = selectedPlan.value.split('-');
      planData = {
        type,
        id,
        startDate: type === 'tier' ? planStartDate : new Date().toISOString().split('T')[0],
        paymentCycle: type === 'tier' ? paymentType : null,
      };
    }

    const playerData = {
      name,
      lastName,
      gender,
      birthday,
      photoURL: finalPhotoURL,
      category,
      email: playerEmail || null,
      contactPhonePrefix: playerContactPhone ? playerPhonePrefix : null,
      contactPhoneNumber: playerContactPhone ? playerContactPhone : null,
      contactPhone: playerContactPhone ? `${playerPhonePrefix}${playerContactPhone}` : null,
      tutorId: hasTutor ? linkedTutorId : null,
      plan: planData,
      notes,
      academyId: user.uid,
      createdAt: playerToEdit ? playerToEdit.createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (playerToEdit) {
        const playerDocRef = doc(db, `academies/${user.uid}/players`, playerToEdit.id);
        await updateDoc(playerDocRef, playerData);
        toast.success("Player updated successfully.");
      } else {
        const playersCollectionRef = collection(db, `academies/${user.uid}/players`);
        await addDoc(playersCollectionRef, playerData);
        toast.success("Player added successfully.");
      }
      onComplete();
    } catch (err) {
      console.error("Error al guardar jugador:", err);
      setError("Error al guardar jugador: " + err.message);
      toast.error("Error saving player.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Player Info Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">Student Information</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div><label htmlFor="name" className="block text-sm font-medium text-gray-700">First Name</label><input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div><label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label><input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div><label htmlFor="birthday" className="block text-sm font-medium text-gray-700">Date of Birth</label><input type="date" id="birthday" value={birthday} onChange={(e) => setBirthday(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div><label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label><select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
            <div><label htmlFor="category" className="block text-sm font-medium text-gray-700">Category (Calculated)</label><input type="text" id="category" value={category} readOnly className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100" /></div>
            <div><label htmlFor="playerEmail" className="block text-sm font-medium text-gray-700">Email (Optional)</label><input type="email" id="playerEmail" value={playerEmail} onChange={(e) => setPlayerEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div>
              <label htmlFor="playerContactPhone" className="block text-sm font-medium text-gray-700">Phone (Optional)</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <Select
                  options={countryCodes}
                  value={countryCodes.find(c => c.value === playerPhonePrefix)}
                  onChange={(option) => setPlayerPhonePrefix(option.value)}
                  isSearchable
                  placeholder="Prefix"
                  className="w-60"
                  styles={{
                    control: (base) => ({ ...base, borderTopRightRadius: 0, borderBottomRightRadius: 0 }),
                    menu: (base) => ({ ...base, zIndex: 20 })
                  }}
                />
                <input type="tel" id="playerContactPhone" value={playerContactPhone} onChange={(e) => setPlayerContactPhone(e.target.value.replace(/\D/g, ''))} maxLength="15" className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-blue-500" placeholder="Phone number" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="playerPhoto" className="block text-sm font-medium text-gray-700">Student Photo (Optional, max 5MB)</label>
              <input type="file" id="playerPhoto" accept="image/*" onChange={handlePhotoFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              {uploadProgress > 0 && <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2"><div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div></div>}
              {photoURL && <div className="mt-2"><img src={photoURL} alt="Current photo" className="w-20 h-20 object-cover rounded-full" /></div>}
            </div>
          </div>
        </fieldset>

        {/* Tutor Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">Tutor / Guardian</legend>
          <div className="mt-4">
            <label htmlFor="hasTutor" className="block text-sm font-medium text-gray-700">Has tutor/guardian?</label>
            <select id="hasTutor" value={hasTutor} onChange={(e) => setHasTutor(e.target.value === 'true')} className="mt-1 block w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500">
              <option value={false}>No</option>
              <option value={true}>Sí</option>
            </select>
          </div>
          {hasTutor && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div><label htmlFor="tutorName" className="block text-sm font-medium text-gray-700">Tutor First Name</label><input type="text" id="tutorName" value={tutorName} onChange={(e) => setTutorName(e.target.value)} required={hasTutor} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
              <div><label htmlFor="tutorLastName" className="block text-sm font-medium text-gray-700">Tutor Last Name</label><input type="text" id="tutorLastName" value={tutorLastName} onChange={(e) => setTutorLastName(e.target.value)} required={hasTutor} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
              <div><label htmlFor="tutorEmail" className="block text-sm font-medium text-gray-700">Tutor Email (Optional)</label><input type="email" id="tutorEmail" value={tutorEmail} onChange={(e) => setTutorEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
              <div>
                <label htmlFor="tutorContactPhone" className="block text-sm font-medium text-gray-700">Tutor Phone (Optional)</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <Select
                    options={countryCodes}
                    value={countryCodes.find(c => c.value === tutorPhonePrefix)}
                    onChange={(option) => setTutorPhonePrefix(option.value)}
                    isSearchable
                    placeholder="Prefix"
                    className="w-60"
                    styles={{
                      control: (base) => ({ ...base, borderTopRightRadius: 0, borderBottomRightRadius: 0 }),
                      menu: (base) => ({ ...base, zIndex: 20 })
                    }}
                  />
                  <input type="tel" id="tutorContactPhone" value={tutorContactPhone} onChange={(e) => setTutorContactPhone(e.target.value.replace(/\D/g, ''))} maxLength="15" className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-blue-500" placeholder="Phone number" />
                </div>
              </div>
            </div>
          )}
        </fieldset>

        {/* Payment Info Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">Plan Information</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 items-start">
            <div>
              <label htmlFor="planType" className="block text-sm font-medium text-gray-700">Assign Plan</label>
              <Select
                id="planType"
                value={selectedPlan}
                onChange={setSelectedPlan}
                isClearable
                isSearchable
                placeholder="Select a plan..."
                className="mt-1"
                options={[
                  {
                    label: 'Membership Tiers',
                    options: tiers.filter(t => t.status === 'active').map(t => ({ value: `tier-${t.id}`, label: t.name }))
                  },
                  {
                    label: 'Free Trials',
                    options: trials.map(tr => ({ value: `trial-${tr.id}`, label: tr.name }))
                  }
                ]}
              />
            </div>

            {selectedPlan?.value.startsWith('tier-') && (
              <>
                <div><label htmlFor="paymentType" className="block text-sm font-medium text-gray-700">Billing cycle</label><select id="paymentType" value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"><option value="Monthly">Monthly</option><option value="Semiannual">Semiannual</option><option value="Annual">Annual</option></select></div>
                <div><label htmlFor="planStartDate" className="block text-sm font-medium text-gray-700">Start Date</label><input type="date" id="planStartDate" value={planStartDate} onChange={(e) => setPlanStartDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
              </>
            )}

            {selectedPlan?.value.startsWith('trial-') && (() => {
              const trialId = selectedPlan.value.split('-')[1];
              const selectedTrialData = trials.find(tr => tr.id === trialId);

              if (selectedTrialData?.convertsToTierId) {
                const conversionTier = tiers.find(t => t.id === selectedTrialData.convertsToTierId);
                if (conversionTier) {
                  const startDate = new Date(); // Trial starts today
                  const duration = Number(selectedTrialData.durationInDays);
                  const conversionDate = new Date(startDate);
                  conversionDate.setDate(startDate.getDate() + duration);

                  const formattedConversionDate = conversionDate.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });
                  return (
                    <div className="md:col-span-2 -mt-2">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm font-semibold text-blue-800">Automatic Conversion</p>
                        <p className="text-sm text-blue-700 mt-1">At the end of the trial on <strong>{formattedConversionDate}</strong>, this plan will convert to the <strong>{conversionTier.name}</strong> tier with <strong>Monthly</strong> billing.</p>
                      </div>
                    </div>
                  );
                }
              }
              return null;
            })()}

            <div className="md:col-span-2"><label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label><textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"></textarea></div>
          </div>
        </fieldset>

        {/* Form Actions */}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={onComplete} className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
            Cancel
          </button>
          <button type="submit" disabled={loading || uploadProgress > 0} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (uploadProgress > 0 ? `Uploading... ${uploadProgress.toFixed(0)}%` : 'Saving...') : (playerToEdit ? 'Update Student' : 'Add Student')}
          </button>
        </div>
        </form>
    </div>
  );
}
