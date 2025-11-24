import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import toast from 'react-hot-toast';
import Select from 'react-select'; // Import Select for country codes
import { Upload } from 'lucide-react'; // Import Upload icon

export default function PlayerForm({ user, academy, db, onComplete, playerToEdit }) {
  // Player Info
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [playerPhotoFile, setPlayerPhotoFile] = useState(null);
  const fileInputRef = React.useRef(null); // Ref for hidden file input
  const [uploadProgress, setUploadProgress] = useState(0);
  const [playerEmail, setPlayerEmail] = useState('');
  const [playerPhonePrefix, setPlayerPhonePrefix] = useState('+1');
  const [playerContactPhone, setPlayerContactPhone] = useState('');
  const [playerStatus, setPlayerStatus] = useState('active');
  const [groupId, setGroupId] = useState('');

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
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [notes, setNotes] = useState('');

  // Component State
  const [tiers, setTiers] = useState([]);
  const [oneTimeProducts, setOneTimeProducts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countryCodes, setCountryCodes] = useState([]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const parsed = date?.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return parsed.toLocaleDateString();
  };
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

    const fetchGroups = async () => {
      if (!user || !academy) return;
      const groupsRef = collection(db, `academies/${user.uid}/groups`);
      const querySnapshot = await getDocs(groupsRef);
      setGroups(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    const fetchProducts = async () => {
      if (!user || !academy) return;
      const productsRef = collection(db, `academies/${user.uid}/products`);
      const querySnapshot = await getDocs(productsRef);
      setOneTimeProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    fetchTiers();
    fetchTrials();
    fetchGroups();
    fetchProducts();
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

  const existingPlanStartDate = useMemo(() => {
    if (!playerToEdit?.plan) return null;
    if (playerToEdit.plan.type === 'tier') {
      const tierPayments = (playerToEdit.oneTimeProducts || []).filter(p => p.paymentFor === 'tier' && p.dueDate);
      if (tierPayments.length > 0) {
        const sorted = [...tierPayments].sort((a, b) => {
          const da = a.dueDate?.seconds ? new Date(a.dueDate.seconds * 1000) : new Date(a.dueDate);
          const db = b.dueDate?.seconds ? new Date(b.dueDate.seconds * 1000) : new Date(b.dueDate);
          return da - db;
        });
        return sorted[0].dueDate;
      }
    }
    return playerToEdit.plan.startDate || null;
  }, [playerToEdit]);

  // Populate form if editing a player
  useEffect(() => {
    if (playerToEdit) {
      // Player Info
      setName(playerToEdit.name || '');
      setLastName(playerToEdit.lastName || '');
      setGender(playerToEdit.gender || '');
      setBirthday(playerToEdit.birthday || '');
      setPhotoURL(playerToEdit.photoURL || '');
      setPlayerEmail(playerToEdit.email || '');
      setPlayerPhonePrefix(playerToEdit.contactPhonePrefix || '+1');
      setPlayerContactPhone(playerToEdit.contactPhoneNumber || '');
      setGroupId(playerToEdit.groupId || '');
      setPlayerStatus(playerToEdit.status || 'active');

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
      } else { // For backward compatibility with old data structure
        if (playerToEdit.tierId && tiers.length > 0) {
            const tierToSet = tiers.find(t => t.id === playerToEdit.tierId); // This part seems to have an issue, but let's keep it for now.
            if (tierToSet) {
                setSelectedPlan({ value: `tier-${tierToSet.id}`, label: tierToSet.name });
            }
        }
        if (playerToEdit.oneTimeProducts && oneTimeProducts.length > 0) {
          // When editing, we only want to manage products added *during this edit session*.
          // The final save will merge existing and new products.
          // So we start with an empty array for new products.
          setSelectedProducts([]);
        } else {
          setSelectedProducts([]);
        }
      }
      setNotes(playerToEdit.notes || '');
    }
  }, [playerToEdit, tiers, trials, oneTimeProducts, academy.currency]); // academy.currency is a dependency

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
    let finalPhotoPath = playerToEdit?.photoPath || null;

    if (playerPhotoFile) {
      const storage = getStorage();
      const storagePath = `academies/${user.uid}/player_photos/${Date.now()}_${playerPhotoFile.name}`;
      const storageRef = ref(storage, storagePath);
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
              setError("Error uploading photo: " + error.message);
              toast.error("Error uploading photo.");
              reject(error);
            },
            async () => {
              finalPhotoURL = await getDownloadURL(uploadTask.snapshot.ref);
              finalPhotoPath = storagePath;
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
        setError("Error saving tutor: " + err.message);
        toast.error("Error saving tutor.");
        return;
      }
    }

    let planData = null;
    if (selectedPlan) {
      const [type, id] = selectedPlan.value.split('-');
      if (type === 'tier') {
        const tier = tiers.find(t => t.id === id);
        planData = {
          type: 'tier',
          id: id,
          // We no longer store startDate or paymentCycle directly on the plan object
          // It will be part of the payment record.
        };
      } else { // It's a trial
        planData = {
          type: 'trial',
          id: id,
          startDate: new Date().toISOString().split('T')[0],
        };
      }
    }

    // Combine existing products with newly added ones for this session.
    const existingProducts = playerToEdit?.oneTimeProducts || [];
    const newProducts = selectedProducts || [];
    const combinedProducts = [...existingProducts, ...newProducts];

    // This is the key fix for the "Product not found" bug.
    // We process and clean each payment item according to its type.
    const finalProductsData = combinedProducts.map(item => {
      if (item.paymentFor === 'tier') {
        // This is a subscription payment, keep its structure.
        return item;
      }
      // This is a one-time product.
      return {
        productId: item.productId,
        status: item.status,
        paidAt: item.paidAt || null,
        paymentMethod: item.paymentMethod || null,
      };
    });

    // If a new tier is being assigned, create its first payment record.
    // This logic assumes we are not editing an existing plan, just assigning a new one.
    if (selectedPlan && selectedPlan.value.startsWith('tier-') && !playerToEdit?.plan) {
        const [type, id] = selectedPlan.value.split('-');
        const tierDetails = tiers.find(t => t.id === id);
        const firstPayment = {
            paymentFor: 'tier',
            itemId: id,
            itemName: tierDetails.name,
            amount: tierDetails.price,
            dueDate: planStartDate,
            status: 'unpaid',
        };
        finalProductsData.push(firstPayment); // We'll rename oneTimeProducts to payments later
    }

    const playerData = {
      name,
      lastName,
      gender,
      birthday,
      photoURL: finalPhotoURL,
      email: playerEmail || null,
      photoPath: finalPhotoPath || null,
      contactPhonePrefix: playerContactPhone ? playerPhonePrefix : null,
      contactPhoneNumber: playerContactPhone ? playerContactPhone : null,
      contactPhone: playerContactPhone ? `${playerPhonePrefix}${playerContactPhone}` : null,
      tutorId: hasTutor ? linkedTutorId : null,
      groupId: groupId || null,
      plan: planData,
      oneTimeProducts: finalProductsData,
      notes,
      academyId: user.uid,
      status: playerStatus || 'active',
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
      console.error("Error saving player:", err);
      setError("Error saving player: " + err.message);
      toast.error("Error saving player.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Student Photo Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">Student Photo</legend>
          <div className="flex flex-col items-center justify-center mt-4">
            <input type="file" ref={fileInputRef} onChange={handlePhotoFileChange} accept="image/*" className="hidden" />
            <div
              className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden"
              onClick={() => fileInputRef.current.click()}
            >
              {photoURL ? (
                <img src={photoURL} alt="Student" className="w-full h-full object-cover" />
              ) : (
                <Upload className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <p className="text-sm text-gray-600 mt-2">Student Photo</p>
            {uploadProgress > 0 && uploadProgress < 100 && <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-2"><div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div></div>}
          </div>
        </fieldset>

        {/* Student Information Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">Student Information</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div><label htmlFor="name" className="block text-sm font-medium text-gray-700">First Name</label><input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div><label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label><input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div><label htmlFor="birthday" className="block text-sm font-medium text-gray-700">Date of Birth</label><input type="date" id="birthday" value={birthday} onChange={(e) => setBirthday(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
              <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select>
            </div>
            <div>
              <label htmlFor="group" className="block text-sm font-medium text-gray-700">Group</label>
              <select id="group" value={groupId} onChange={(e) => setGroupId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"><option value="">Select a Group</option>{groups.filter(g => g.status === 'active').map(group => (<option key={group.id} value={group.id}>{group.name}</option>))}</select>
            </div>
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
            {playerToEdit && (
              <div>
                <label htmlFor="playerStatus" className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  id="playerStatus"
                  value={playerStatus}
                  onChange={(e) => setPlayerStatus(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>
        </fieldset>

        {/* Tutor Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">Tutor / Guardian</legend>
          <div className="mt-4">
            <label htmlFor="hasTutor" className="block text-sm font-medium text-gray-700">Has tutor/guardian?</label>
            <select id="hasTutor" value={hasTutor} onChange={(e) => setHasTutor(e.target.value === 'true')} className="mt-1 block w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500">
              <option value={false}>No</option>
              <option value={true}>Yes</option>
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
            {playerToEdit?.plan ? (
              <div className="md:col-span-2 space-y-2">
                <p className="text-sm font-medium text-gray-700">Assigned Plan</p>
                <p className="text-gray-900 font-semibold">{selectedPlan?.label || 'Unknown plan'}</p>
                <p className="text-sm text-gray-700">Start date: <span className="font-semibold">{formatDate(existingPlanStartDate)}</span></p>
              </div>
            ) : (
              <>
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
              </>
            )}

            {/* Notes field moved to its own section */}
          </div>
        </fieldset>

        {/* Additional Products Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">Additional Products</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            {/* Left side: Available products */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Available Products</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto border p-2 rounded-md">
                {oneTimeProducts.map(product => (
                  <div key={product.id} className="flex justify-between items-center p-2 hover:bg-gray-50">
                    <div>
                      <p>{product.name}</p>
                      <p className="text-sm text-gray-500">{new Intl.NumberFormat(undefined, { style: 'currency', currency: academy.currency || 'USD' }).format(product.price)}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedProducts([...selectedProducts, { productId: product.id, status: 'unpaid' }])} className="bg-blue-100 text-blue-800 text-xs font-bold py-1 px-3 rounded-md">Add</button>
                  </div>
                ))}
              </div>
            </div>
            {/* Right side: Product History */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Product History</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto border p-2 rounded-md bg-gray-50">
                {[...(playerToEdit?.oneTimeProducts || []), ...selectedProducts].filter(p => !p.paymentFor).length > 0 ? (
                  [...(playerToEdit?.oneTimeProducts || []), ...selectedProducts].filter(p => !p.paymentFor).map((p, index) => {
                    const productDetails = oneTimeProducts.find(op => op.id === p.productId);
                    return (
                      <div key={`history-${p.productId}-${index}`} className="flex justify-between items-center p-2 rounded-md">
                        <div>
                          <p className="font-medium">{productDetails?.name || 'Product not found'}</p>
                          {p.status === 'paid' && p.paidAt && (
                            <p className="text-xs text-gray-500">Paid on {new Date(p.paidAt.seconds * 1000).toLocaleDateString()}</p>
                          )}
                        </div>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{p.status}</span>
                      </div>
                    );
                  })
                ) : <p className="text-sm text-gray-500 p-2">No products assigned yet.</p>}
              </div>
            </div>
          </div>
        </fieldset>

        {/* Notes Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">Notes</legend>
          <div className="mt-4">
            <label htmlFor="notes" className="sr-only">Notes</label> {/* Hidden label for accessibility */}
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"></textarea>
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
