import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import toast from 'react-hot-toast';
import Select from 'react-select'; // Import Select for country codes
import { Upload } from 'lucide-react'; // Import Upload icon
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeNotes, sanitizeFilename, validateFileType } from '../utils/validators';
import { parsePhoneNumberWithError, isValidPhoneNumber, getCountries, getCountryCallingCode } from 'libphonenumber-js';

export default function PlayerForm({ user, academy, db, membership, onComplete, playerToEdit }) {
  const studentLabelSingular = academy?.studentLabelSingular || 'Student';
  const studentLabelPlural = academy?.studentLabelPlural || 'Students';
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
  const [playerPhoneCountry, setPlayerPhoneCountry] = useState('US');
  const [playerContactPhone, setPlayerContactPhone] = useState('');
  const [playerPhoneValid, setPlayerPhoneValid] = useState(true);
  const [playerStatus, setPlayerStatus] = useState('active');
  const [groupId, setGroupId] = useState('');
  const [documentType, setDocumentType] = useState('passport');
  const [documentNumber, setDocumentNumber] = useState('');

  // Tutor Info
  const [hasTutor, setHasTutor] = useState(false);
  const [tutorName, setTutorName] = useState('');
  const [tutorLastName, setTutorLastName] = useState('');
  const [tutorEmail, setTutorEmail] = useState('');
  const [tutorPhoneCountry, setTutorPhoneCountry] = useState('US');
  const [tutorContactPhone, setTutorContactPhone] = useState('');
  const [tutorPhoneValid, setTutorPhoneValid] = useState(true);

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
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newPlanType, setNewPlanType] = useState('tier'); // 'tier' or 'trial'
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('');
  const [newPlanDuration, setNewPlanDuration] = useState('');

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const parsed = date?.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return parsed.toLocaleDateString();
  };
  useEffect(() => {
    const fetchTiers = async () => {
      if (!user || !academy || !membership) return;
      try {
        const tiersRef = collection(db, `academies/${academy.id}/tiers`);
        const querySnapshot = await getDocs(tiersRef);
        setTiers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching tiers:', err);
      }
    };

    const fetchTrials = async () => {
      if (!user || !academy || !membership) return;
      try {
        const trialsRef = collection(db, `academies/${academy.id}/trials`);
        const querySnapshot = await getDocs(trialsRef);
        setTrials(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching trials:', err);
      }
    };

    const fetchGroups = async () => {
      if (!user || !academy || !membership) return;
      try {
        const groupsRef = collection(db, `academies/${academy.id}/groups`);
        const querySnapshot = await getDocs(groupsRef);
        setGroups(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching groups:', err);
      }
    };

    const fetchProducts = async () => {
      if (!user || !academy || !membership) return;
      try {
        const productsRef = collection(db, `academies/${academy.id}/products`);
        const querySnapshot = await getDocs(productsRef);
        setOneTimeProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching products:', err);
      }
    };

    fetchTiers();
    fetchTrials();
    fetchGroups();
    fetchProducts();
  }, [user, academy, db, membership]);

  // Build country codes for phone prefixes using libphonenumber-js
  useEffect(() => {
    const buildCountryCodes = async () => {
      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
        const data = await response.json();
        const countryMap = new Map(data.map(c => [c.cca2, c.name.common]));

        const countries = getCountries();
        const codes = countries
          .map(countryCode => {
            const callingCode = getCountryCallingCode(countryCode);
            const countryName = countryMap.get(countryCode) || countryCode;
            return {
              value: countryCode,
              label: `${countryName} (+${callingCode})`,
              callingCode: `+${callingCode}`
            };
          })
          .sort((a, b) => a.label.localeCompare(b.label));

        setCountryCodes(codes);

        // Set default country based on academy country, only for new players
        if (!playerToEdit && academy.countryCode) {
          setPlayerPhoneCountry(academy.countryCode);
          setTutorPhoneCountry(academy.countryCode);
        }
      } catch (error) {
        console.error("Error building country codes:", error);
      }
    };
    buildCountryCodes();
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
      setDocumentType(playerToEdit.documentType || 'passport');
      setDocumentNumber(playerToEdit.documentNumber || '');
      setGender(playerToEdit.gender || '');
      setBirthday(playerToEdit.birthday || '');
      setPhotoURL(playerToEdit.photoURL || '');
      setPlayerEmail(playerToEdit.email || '');

      // Handle phone number parsing
      if (playerToEdit.contactPhone) {
        try {
          const phoneNumber = parsePhoneNumberWithError(playerToEdit.contactPhone);
          setPlayerPhoneCountry(phoneNumber.country || 'US');
          setPlayerContactPhone(phoneNumber.nationalNumber);
        } catch {
          setPlayerPhoneCountry(playerToEdit.phoneCountry || 'US');
          setPlayerContactPhone(playerToEdit.contactPhoneNumber || '');
        }
      } else {
        setPlayerPhoneCountry(playerToEdit.phoneCountry || 'US');
        setPlayerContactPhone(playerToEdit.contactPhoneNumber || '');
      }

      setGroupId(playerToEdit.groupId || '');
      setPlayerStatus(playerToEdit.status || 'active');

      // Tutor Info
      if (playerToEdit.tutorId && playerToEdit.tutor) {
        setHasTutor(true);
        setTutorName(playerToEdit.tutor.name || '');
        setTutorLastName(playerToEdit.tutor.lastName || '');
        setTutorEmail(playerToEdit.tutor.email || '');

        // Handle tutor phone number parsing
        if (playerToEdit.tutor.contactPhone) {
          try {
            const tutorPhoneNumber = parsePhoneNumberWithError(playerToEdit.tutor.contactPhone);
            setTutorPhoneCountry(tutorPhoneNumber.country || 'US');
            setTutorContactPhone(tutorPhoneNumber.nationalNumber);
          } catch {
            setTutorPhoneCountry(playerToEdit.tutor.phoneCountry || 'US');
            setTutorContactPhone(playerToEdit.tutor.contactPhoneNumber || '');
          }
        } else {
          setTutorPhoneCountry(playerToEdit.tutor.phoneCountry || 'US');
          setTutorContactPhone(playerToEdit.tutor.contactPhoneNumber || '');
        }
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

  // Validate phone number in real-time
  const validatePhone = (phoneNumber, country) => {
    if (!phoneNumber) return true; // Empty is valid (optional field)
    try {
      return isValidPhoneNumber(phoneNumber, country);
    } catch {
      return false;
    }
  };

  // Handle player phone change with validation
  const handlePlayerPhoneChange = (value) => {
    setPlayerContactPhone(value);
    if (value) {
      const isValid = validatePhone(value, playerPhoneCountry);
      setPlayerPhoneValid(isValid);
    } else {
      setPlayerPhoneValid(true);
    }
  };

  // Handle tutor phone change with validation
  const handleTutorPhoneChange = (value) => {
    setTutorContactPhone(value);
    if (value) {
      const isValid = validatePhone(value, tutorPhoneCountry);
      setTutorPhoneValid(isValid);
    } else {
      setTutorPhoneValid(true);
    }
  };

  // Handle country change for player
  const handlePlayerCountryChange = (country) => {
    setPlayerPhoneCountry(country);
    if (playerContactPhone) {
      const isValid = validatePhone(playerContactPhone, country);
      setPlayerPhoneValid(isValid);
    }
  };

  // Handle country change for tutor
  const handleTutorCountryChange = (country) => {
    setTutorPhoneCountry(country);
    if (tutorContactPhone) {
      const isValid = validatePhone(tutorContactPhone, country);
      setTutorPhoneValid(isValid);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Group name is required.');
      return;
    }

    try {
      const groupData = {
        name: sanitizeText(newGroupName, 50),
        status: 'active',
        academyId: academy.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const groupRef = await addDoc(collection(db, `academies/${academy.id}/groups`), groupData);
      const newGroup = { id: groupRef.id, ...groupData };
      setGroups([...groups, newGroup]);
      setGroupId(groupRef.id);
      setNewGroupName('');
      setShowCreateGroup(false);
      toast.success('Group created successfully.');
    } catch (err) {
      console.error('Error creating group:', err);
      toast.error('Error creating group.');
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlanName.trim()) {
      toast.error('Plan name is required.');
      return;
    }

    try {
      let planRef;
      let newPlan;

      if (newPlanType === 'tier') {
        if (!newPlanPrice || parseFloat(newPlanPrice) < 0) {
          toast.error('Valid price is required for membership tier.');
          return;
        }

        const tierData = {
          name: sanitizeText(newPlanName, 50),
          price: parseFloat(newPlanPrice),
          status: 'active',
          academyId: academy.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        planRef = await addDoc(collection(db, `academies/${academy.id}/tiers`), tierData);
        newPlan = { id: planRef.id, ...tierData };
        setTiers([...tiers, newPlan]);
        setSelectedPlan({ value: `tier-${planRef.id}`, label: newPlan.name });
      } else {
        // Trial
        if (!newPlanDuration || parseInt(newPlanDuration) < 1) {
          toast.error('Valid duration is required for trial.');
          return;
        }

        const trialData = {
          name: sanitizeText(newPlanName, 50),
          durationInDays: parseInt(newPlanDuration),
          status: 'active',
          academyId: academy.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        planRef = await addDoc(collection(db, `academies/${academy.id}/trials`), trialData);
        newPlan = { id: planRef.id, ...trialData };
        setTrials([...trials, newPlan]);
        setSelectedPlan({ value: `trial-${planRef.id}`, label: newPlan.name });
      }

      setNewPlanName('');
      setNewPlanPrice('');
      setNewPlanDuration('');
      setShowCreatePlan(false);
      toast.success(`${newPlanType === 'tier' ? 'Membership tier' : 'Trial'} created successfully.`);
    } catch (err) {
      console.error('Error creating plan:', err);
      toast.error('Error creating plan.');
    }
  };

  const handlePhotoFileChange = async (e) => {
    const file = e.target.files[0];
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
      toast.error("Photo must be smaller than 2MB.");
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
            toast.error("Photo is too small (min 100x100px).");
            resolve(false);
            return;
          }
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            toast.error("Photo is too large (max 3000px).");
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

    setPlayerPhotoFile(file);
    setPhotoURL(URL.createObjectURL(file)); // Preview
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || !academy || loading) return;

    // Sanitize all text inputs
    const sanitizedName = sanitizeText(name, 50);
    const sanitizedLastName = sanitizeText(lastName, 50);
    const sanitizedDocumentNumber = sanitizeText(documentNumber, 50);
    const sanitizedPlayerEmail = sanitizeEmail(playerEmail);
    const sanitizedTutorName = sanitizeText(tutorName, 50);
    const sanitizedTutorLastName = sanitizeText(tutorLastName, 50);
    const sanitizedTutorEmail = sanitizeEmail(tutorEmail);
    const sanitizedNotes = sanitizeNotes(notes, 5000);

    // Validate required fields
    if (!sanitizedName) {
      toast.error(`${studentLabelSingular}'s name is required.`);
      return;
    }

    // Validate emails if provided
    if (playerEmail && !sanitizedPlayerEmail) {
      toast.error(`${studentLabelSingular}'s email is invalid.`);
      return;
    }

    if (hasTutor && tutorEmail && !sanitizedTutorEmail) {
      toast.error("Tutor's email is invalid.");
      return;
    }

    // Validate phone numbers using libphonenumber-js
    if (playerContactPhone && !playerPhoneValid) {
      toast.error(`${studentLabelSingular}'s phone number is invalid.`);
      return;
    }

    if (hasTutor && tutorContactPhone && !tutorPhoneValid) {
      toast.error("Tutor's phone number is invalid.");
      return;
    }

    // Parse phone numbers to E.164 format
    let playerPhoneE164 = null;
    let playerPhoneData = null;
    if (playerContactPhone) {
      try {
        const phoneNumber = parsePhoneNumberWithError(playerContactPhone, playerPhoneCountry);
        playerPhoneE164 = phoneNumber.format('E.164');
        playerPhoneData = {
          e164: playerPhoneE164,
          country: playerPhoneCountry,
          nationalNumber: playerContactPhone,
          international: phoneNumber.formatInternational(),
        };
      } catch (err) {
        toast.error(`${studentLabelSingular}'s phone number is invalid.`);
        setLoading(false);
        return;
      }
    }

    let tutorPhoneE164 = null;
    let tutorPhoneData = null;
    if (hasTutor && tutorContactPhone) {
      try {
        const tutorPhoneNumber = parsePhoneNumberWithError(tutorContactPhone, tutorPhoneCountry);
        tutorPhoneE164 = tutorPhoneNumber.format('E.164');
        tutorPhoneData = {
          e164: tutorPhoneE164,
          country: tutorPhoneCountry,
          nationalNumber: tutorContactPhone,
          international: tutorPhoneNumber.formatInternational(),
        };
      } catch (err) {
        toast.error("Tutor's phone number is invalid.");
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    let finalPhotoURL = playerToEdit?.photoURL || photoURL;
    let finalPhotoPath = playerToEdit?.photoPath || null;
    const previousPhotoPath = playerToEdit?.photoPath || null;
    const academyId = academy.id;

    if (playerPhotoFile) {
      // Validate file type using magic bytes
      const buffer = await playerPhotoFile.arrayBuffer();
      const mimeType = playerPhotoFile.type;

      if (!['image/jpeg', 'image/png', 'image/gif'].includes(mimeType)) {
        toast.error("Solo se permiten imágenes (JPG, PNG, GIF).");
        setLoading(false);
        return;
      }

      if (!validateFileType(buffer, mimeType)) {
        toast.error("El archivo no coincide con el tipo de imagen declarado.");
        setLoading(false);
        return;
      }

      // Validate file size (max 5MB)
      if (playerPhotoFile.size > 5 * 1024 * 1024) {
        toast.error("La foto debe ser menor a 5MB.");
        setLoading(false);
        return;
      }

      const storage = getStorage();
      const sanitizedFilenameStr = sanitizeFilename(playerPhotoFile.name);
      const storagePath = `academies/${user.uid}/player_photos/${Date.now()}_${sanitizedFilenameStr}`;
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
              // Delete previous photo only after new upload succeeds
              if (previousPhotoPath && previousPhotoPath !== storagePath) {
                try {
                  await deleteObject(ref(storage, previousPhotoPath));
                } catch (deleteErr) {
                  console.warn("Failed to delete previous player photo", deleteErr);
                }
              }
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
        name: sanitizedTutorName,
        lastName: sanitizedTutorLastName,
        email: sanitizedTutorEmail || null,
        contactPhone: tutorPhoneE164 || null,
        phoneCountry: tutorPhoneData?.country || null,
        phoneInternational: tutorPhoneData?.international || null,
        phoneNational: tutorPhoneData?.nationalNumber || null,
        academyId: academyId,
        createdAt: playerToEdit?.tutor?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      try {
        if (playerToEdit?.tutor) { // If editing an existing tutor
          await updateDoc(doc(db, `academies/${academyId}/tutors`, playerToEdit.tutor.id), tutorData);
          linkedTutorId = playerToEdit.tutor.id;
        } else { // Create a new tutor
          const tutorRef = await addDoc(collection(db, `academies/${academyId}/tutors`), tutorData);
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
      name: sanitizedName,
      lastName: sanitizedLastName,
      documentType: documentType || null,
      documentNumber: sanitizedDocumentNumber || null,
      gender,
      birthday,
      photoURL: finalPhotoURL,
      email: sanitizedPlayerEmail || null,
      photoPath: finalPhotoPath || null,
      contactPhone: playerPhoneE164 || null,
      phoneCountry: playerPhoneData?.country || null,
      phoneInternational: playerPhoneData?.international || null,
      phoneNational: playerPhoneData?.nationalNumber || null,
      tutorId: hasTutor ? linkedTutorId : null,
      groupId: groupId || null,
      plan: planData,
      oneTimeProducts: finalProductsData,
      notes: sanitizedNotes,
      academyId: academyId,
      status: playerStatus || 'active',
      createdAt: playerToEdit ? playerToEdit.createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (playerToEdit) {
        const playerDocRef = doc(db, `academies/${academyId}/players`, playerToEdit.id);
        await updateDoc(playerDocRef, playerData);
        toast.success("Player updated successfully.");
      } else {
        const playersCollectionRef = collection(db, `academies/${academyId}/players`);
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
    <>
    <form onSubmit={handleSubmit} className="space-y-8">
        {/* Student Photo Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
      <legend className="text-xl font-semibold text-gray-900 px-2">{studentLabelSingular} Photo</legend>
      <div className="flex flex-col items-center justify-center mt-4">
        <input type="file" ref={fileInputRef} onChange={handlePhotoFileChange} accept="image/*" className="hidden" />
        <div
          className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden"
              onClick={() => fileInputRef.current.click()}
            >
              {photoURL ? (
                <img src={photoURL} alt={studentLabelSingular} className="w-full h-full object-cover" />
              ) : (
                <Upload className="h-8 w-8 text-gray-400" />
              )}
        </div>
        <p className="text-sm text-gray-600 mt-2">{studentLabelSingular} Photo</p>
        <p className="text-xs text-gray-500">Max 2MB · JPG/PNG/WEBP · 100–3000px</p>
        {uploadProgress > 0 && uploadProgress < 100 && <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-2"><div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div></div>}
      </div>
    </fieldset>

        {/* Student Information Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">{studentLabelSingular} Information</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div><label htmlFor="name" className="block text-sm font-medium text-gray-700">First Name</label><input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div><label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label><input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div>
              <label htmlFor="documentType" className="block text-sm font-medium text-gray-700">Document Type</label>
              <Select
                id="documentType"
                value={{ value: documentType, label: documentType === 'passport' ? 'Passport' : documentType === 'nationalId' ? 'National ID' : documentType === 'driversLicense' ? "Driver's License" : 'Other' }}
                onChange={(option) => setDocumentType(option.value)}
                options={[
                  { value: 'passport', label: 'Passport' },
                  { value: 'nationalId', label: 'National ID' },
                  { value: 'driversLicense', label: "Driver's License" },
                  { value: 'other', label: 'Other' }
                ]}
                className="mt-1"
                styles={{
                  menu: (base) => ({ ...base, zIndex: 20 })
                }}
              />
            </div>
            <div><label htmlFor="documentNumber" className="block text-sm font-medium text-gray-700">Document Number</label><input type="text" id="documentNumber" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="Enter document number" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div><label htmlFor="birthday" className="block text-sm font-medium text-gray-700">Date of Birth</label><input type="date" id="birthday" value={birthday} onChange={(e) => setBirthday(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
              <Select
                id="gender"
                value={gender ? { value: gender, label: gender } : null}
                onChange={(option) => setGender(option?.value || '')}
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' }
                ]}
                isClearable
                placeholder="Select gender"
                className="mt-1"
                styles={{
                  menu: (base) => ({ ...base, zIndex: 20 })
                }}
              />
            </div>
            <div>
              <label htmlFor="group" className="block text-sm font-medium text-gray-700">Group</label>
              <Select
                id="group"
                value={groupId ? groups.find(g => g.id === groupId) ? { value: groupId, label: groups.find(g => g.id === groupId).name } : null : null}
                onChange={(option) => {
                  if (option?.value === '__create_new__') {
                    setShowCreateGroup(true);
                  } else {
                    setGroupId(option?.value || '');
                  }
                }}
                options={[
                  {
                    label: 'Actions',
                    options: [{ value: '__create_new__', label: '+ Create New Group' }]
                  },
                  {
                    label: 'Groups',
                    options: groups.filter(g => g.status === 'active').map(group => ({
                      value: group.id,
                      label: group.name
                    }))
                  }
                ]}
                isClearable
                placeholder="Select a group"
                className="mt-1"
                styles={{
                  menu: (base) => ({ ...base, zIndex: 20 }),
                  option: (base, state) => ({
                    ...base,
                    fontWeight: state.data.value === '__create_new__' ? 600 : 400,
                    color: state.data.value === '__create_new__' ? '#2563eb' : base.color,
                  })
                }}
              />
            </div>
            <div><label htmlFor="playerEmail" className="block text-sm font-medium text-gray-700">Email (Optional)</label><input type="email" id="playerEmail" value={playerEmail} onChange={(e) => setPlayerEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div className="md:col-span-2">
              <label htmlFor="playerContactPhone" className="block text-sm font-medium text-gray-700">Phone (Optional)</label>
              <div className="mt-1 flex gap-2">
                <Select
                  options={countryCodes}
                  value={countryCodes.find(c => c.value === playerPhoneCountry)}
                  onChange={(option) => handlePlayerCountryChange(option.value)}
                  isSearchable
                  placeholder="Country"
                  className="w-64"
                  styles={{
                    menu: (base) => ({ ...base, zIndex: 20 })
                  }}
                />
                <div className="flex-1 relative">
                  <input
                    type="tel"
                    id="playerContactPhone"
                    value={playerContactPhone}
                    onChange={(e) => handlePlayerPhoneChange(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none ${
                      playerContactPhone && !playerPhoneValid
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Phone number"
                  />
                  {playerContactPhone && !playerPhoneValid && (
                    <p className="mt-1 text-xs text-red-600">Invalid phone number for selected country</p>
                  )}
                </div>
              </div>
            </div>
            {playerToEdit && (
              <div>
                <label htmlFor="playerStatus" className="block text-sm font-medium text-gray-700">Status</label>
                <Select
                  id="playerStatus"
                  value={{ value: playerStatus, label: playerStatus === 'active' ? 'Active' : 'Inactive' }}
                  onChange={(option) => setPlayerStatus(option.value)}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' }
                  ]}
                  className="mt-1"
                  styles={{
                    menu: (base) => ({ ...base, zIndex: 20 })
                  }}
                />
              </div>
            )}
          </div>
        </fieldset>

        {/* Tutor Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">Tutor / Guardian</legend>
          <div className="mt-4">
            <label htmlFor="hasTutor" className="block text-sm font-medium text-gray-700">Has tutor/guardian?</label>
            <Select
              id="hasTutor"
              value={{ value: hasTutor, label: hasTutor ? 'Yes' : 'No' }}
              onChange={(option) => setHasTutor(option.value)}
              options={[
                { value: false, label: 'No' },
                { value: true, label: 'Yes' }
              ]}
              className="mt-1 md:w-1/2"
              styles={{
                menu: (base) => ({ ...base, zIndex: 20 })
              }}
            />
          </div>
          {hasTutor && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div><label htmlFor="tutorName" className="block text-sm font-medium text-gray-700">Tutor First Name</label><input type="text" id="tutorName" value={tutorName} onChange={(e) => setTutorName(e.target.value)} required={hasTutor} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
              <div><label htmlFor="tutorLastName" className="block text-sm font-medium text-gray-700">Tutor Last Name</label><input type="text" id="tutorLastName" value={tutorLastName} onChange={(e) => setTutorLastName(e.target.value)} required={hasTutor} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
              <div className="md:col-span-2"><label htmlFor="tutorEmail" className="block text-sm font-medium text-gray-700">Tutor Email (Optional)</label><input type="email" id="tutorEmail" value={tutorEmail} onChange={(e) => setTutorEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
              <div className="md:col-span-2">
                <label htmlFor="tutorContactPhone" className="block text-sm font-medium text-gray-700">Tutor Phone (Optional)</label>
                <div className="mt-1 flex gap-2">
                  <Select
                    options={countryCodes}
                    value={countryCodes.find(c => c.value === tutorPhoneCountry)}
                    onChange={(option) => handleTutorCountryChange(option.value)}
                    isSearchable
                    placeholder="Country"
                    className="w-64"
                    styles={{
                      menu: (base) => ({ ...base, zIndex: 20 })
                    }}
                  />
                  <div className="flex-1 relative">
                    <input
                      type="tel"
                      id="tutorContactPhone"
                      value={tutorContactPhone}
                      onChange={(e) => handleTutorPhoneChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none ${
                        tutorContactPhone && !tutorPhoneValid
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="Phone number"
                    />
                    {tutorContactPhone && !tutorPhoneValid && (
                      <p className="mt-1 text-xs text-red-600">Invalid phone number for selected country</p>
                    )}
                  </div>
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
                    onChange={(option) => {
                      if (option?.value === '__create_new__') {
                        setShowCreatePlan(true);
                      } else {
                        setSelectedPlan(option);
                      }
                    }}
                    isClearable
                    isSearchable
                    placeholder="Select a plan..."
                    className="mt-1"
                    options={[
                      {
                        label: 'Actions',
                        options: [{ value: '__create_new__', label: '+ Create New Plan' }]
                      },
                      {
                        label: 'Membership Tiers',
                        options: tiers.filter(t => t.status === 'active').map(t => ({ value: `tier-${t.id}`, label: t.name }))
                      },
                      {
                        label: 'Free Trials',
                        options: trials.map(tr => ({ value: `trial-${tr.id}`, label: tr.name }))
                      }
                    ]}
                    styles={{
                      option: (base, state) => ({
                        ...base,
                        fontWeight: state.data.value === '__create_new__' ? 600 : 400,
                        color: state.data.value === '__create_new__' ? '#2563eb' : base.color,
                      })
                    }}
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
            {loading ? (uploadProgress > 0 ? `Uploading... ${uploadProgress.toFixed(0)}%` : 'Saving...') : (playerToEdit ? `Update ${studentLabelSingular}` : `Add ${studentLabelSingular}`)}
          </button>
        </div>
        </form>

        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Group</h3>
              <div className="mb-4">
                <label htmlFor="newGroupName" className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  id="newGroupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"
                  placeholder="Enter group name"
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroup(false);
                    setNewGroupName('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Plan Modal */}
        {showCreatePlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Plan</h3>

              <div className="mb-4">
                <label htmlFor="newPlanType" className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Type
                </label>
                <select
                  id="newPlanType"
                  value={newPlanType}
                  onChange={(e) => setNewPlanType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"
                >
                  <option value="tier">Membership Tier</option>
                  <option value="trial">Free Trial</option>
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="newPlanName" className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Name
                </label>
                <input
                  type="text"
                  id="newPlanName"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"
                  placeholder="Enter plan name"
                  autoFocus
                />
              </div>

              {newPlanType === 'tier' && (
                <div className="mb-4">
                  <label htmlFor="newPlanPrice" className="block text-sm font-medium text-gray-700 mb-2">
                    Price ({academy.currency || 'USD'})
                  </label>
                  <input
                    type="number"
                    id="newPlanPrice"
                    value={newPlanPrice}
                    onChange={(e) => setNewPlanPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}

              {newPlanType === 'trial' && (
                <div className="mb-4">
                  <label htmlFor="newPlanDuration" className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (days)
                  </label>
                  <input
                    type="number"
                    id="newPlanDuration"
                    value={newPlanDuration}
                    onChange={(e) => setNewPlanDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"
                    placeholder="7"
                    min="1"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreatePlan(false);
                    setNewPlanName('');
                    setNewPlanPrice('');
                    setNewPlanDuration('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreatePlan}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Create Plan
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
