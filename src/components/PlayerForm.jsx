import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { collection, addDoc, updateDoc, doc, getDocs, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import toast from 'react-hot-toast';
import Select from 'react-select'; // Import Select for country codes
import { Upload } from 'lucide-react'; // Import Upload icon
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeNotes, sanitizeFilename, validateFileType } from '../utils/validators';
import { parsePhoneNumberWithError, isValidPhoneNumber, getCountries, getCountryCallingCode } from 'libphonenumber-js';
import { getName, registerLocale } from 'i18n-nationality';
import en from 'i18n-nationality/langs/en.json';
import { getLocations } from '../services/firestore';
import { formatAcademyCurrency } from '../utils/formatters';

// Register English locale for nationality adjectives
registerLocale(en);

const removeUndefinedFields = (value) => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => removeUndefinedFields(item));
  }

  if (value && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, removeUndefinedFields(item)])
    );
  }

  return value;
};

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
  const fileInputRef = useRef(null); // Ref for hidden file input
  const scrollPositionRef = useRef(0); // Store scroll position
  const [uploadProgress, setUploadProgress] = useState(0);
  const [playerEmail, setPlayerEmail] = useState('');
  const [playerPhoneCountry, setPlayerPhoneCountry] = useState('US');
  const [playerContactPhone, setPlayerContactPhone] = useState('');
  const [playerPhoneValid, setPlayerPhoneValid] = useState(true);
  const [playerStatus, setPlayerStatus] = useState('active');
  const [groupId, setGroupId] = useState('');
  const [documentType, setDocumentType] = useState('passport');
  const [documentNumber, setDocumentNumber] = useState('');
  const [nationality, setNationality] = useState('');
  const [locationId, setLocationId] = useState('');

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
  const [selectedPriceVariant, setSelectedPriceVariant] = useState(null); // Selected price variant for the tier
  const [planStartDate, setPlanStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productCart, setProductCart] = useState([]); // Cart: [{ productId, quantity }]
  const [notes, setNotes] = useState('');

  // Component State
  const [tiers, setTiers] = useState([]);
  const [oneTimeProducts, setOneTimeProducts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [trials, setTrials] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countryCodes, setCountryCodes] = useState([]);
  const [nationalities, setNationalities] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
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

    const fetchLocationsData = async () => {
      if (!academy?.id || !db) return;
      try {
        const locationsData = await getLocations(db, academy.id);
        setLocations(locationsData);
      } catch (err) {
        console.error('Error fetching locations:', err);
      }
    };

    fetchTiers();
    fetchTrials();
    fetchGroups();
    fetchProducts();
    fetchLocationsData();
  }, [user, academy, db, membership]);

  // Build country codes for phone prefixes using libphonenumber-js
  useEffect(() => {
    const buildCountryCodes = async () => {
      try {
        // Use REST Countries API - force English by requesting only needed fields
        // The name.common field is always in English in the v3.1 API
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2', {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9'
          }
        });
        const data = await response.json();
        // Extract English names from the API response
        const countryMap = new Map(data.map(c => [c.cca2, c.name.common || c.cca2]));

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

        // Build nationalities list (nationality adjectives, not country names)
        const nationalitiesList = countries
          .map(countryCode => {
            // Use i18n-nationality to get the nationality adjective (e.g., "Chinese" not "China")
            const nationality = getName(countryCode, 'en');

            // Only use if getName returned a valid nationality (not undefined)
            // Skip countries that don't have a proper nationality adjective
            if (!nationality) {
              return null;
            }

            return {
              value: nationality,
              label: nationality
            };
          })
          .filter(n => n !== null) // Remove entries where getName failed
          .sort((a, b) => a.label.localeCompare(b.label));

        setNationalities(nationalitiesList);

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

  // Filter groups by selected location
  const filteredGroups = useMemo(() => {
    if (!locationId) return [];
    return groups.filter(g => g.status === 'active' && g.locationId === locationId);
  }, [groups, locationId]);

  // Filter tiers by selected location
  const filteredTiers = useMemo(() => {
    if (!locationId) return [];
    const filtered = tiers.filter(t => {
      if (t.status !== 'active') return false;

      // Check if tier has prices for the selected location
      if (t.differentPricesByLocation && t.priceVariantsByLocation) {
        // Check if the location has any valid price variants
        const locationVariants = t.priceVariantsByLocation[locationId];
        if (!locationVariants || !Array.isArray(locationVariants)) return false;
        const hasValidVariants = locationVariants.some(v => v.billingPeriod && v.price);
        return hasValidVariants;
      } else if (t.defaultPriceVariants && t.defaultPriceVariants.length > 0) {
        // Tier uses default prices for all locations
        const hasValidVariants = t.defaultPriceVariants.some(v => v.billingPeriod && v.price);
        return hasValidVariants;
      }
      // Legacy structure - locationPrices
      else if (t.locationPrices && Object.keys(t.locationPrices).length > 0) {
        // Check if this location has a valid price in the legacy structure
        const price = t.locationPrices[locationId];
        if (price && Number(price) > 0) {
          return true;
        }
      }
      // Legacy structure - global price
      else if (t.price && Number(t.price) > 0) {
        // Legacy tier with global pricing
        return true;
      }

      return false;
    });

    // Sort by creation date (newest first)
    return filtered.sort((a, b) => {
      const dateA = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(0);
      const dateB = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(0);
      return dateB - dateA; // Descending order (newest first)
    });
  }, [tiers, locationId]);

  // Filter products by selected location
  const filteredProducts = useMemo(() => {
    if (!locationId) return [];
    return oneTimeProducts;
  }, [oneTimeProducts, locationId]);

  // Helper function to generate price variant label
  const getPriceVariantLabel = (variant) => {
    let periodLabel = '';

    if (variant.billingPeriod === 'monthly') {
      periodLabel = 'Monthly';
    } else if (variant.billingPeriod === 'semi-annual') {
      periodLabel = 'Semi-Annual';
    } else if (variant.billingPeriod === 'annual') {
      periodLabel = 'Annual';
    } else if (variant.billingPeriod === 'custom-term') {
      periodLabel = variant.customTermName || 'Custom Term';
    } else if (variant.billingPeriod === 'custom-duration') {
      const amount = Number(variant.durationAmount);
      let unit = variant.durationUnit || 'period';
      if (Number.isFinite(amount) && amount === 1 && unit.endsWith('s')) {
        unit = unit.slice(0, -1);
      } else if (Number.isFinite(amount) && amount !== 1 && !unit.endsWith('s')) {
        unit = `${unit}s`;
      }
      periodLabel = `${variant.durationAmount} ${unit}`;
    } else {
      periodLabel = 'Custom';
    }

    const price = formatAcademyCurrency(variant.price, academy);
    return `${periodLabel} ${price}`;
  };

  // Get price variant options for the selected tier
  const priceVariantOptions = useMemo(() => {
    if (!selectedPlan || !selectedPlan.value.startsWith('tier-')) return [];

    const tierId = selectedPlan.value.split('-')[1];
    const tier = tiers.find(t => t.id === tierId);
    if (!tier) return [];

    const options = [];

    // Check if tier uses new price variants structure
    if (tier.differentPricesByLocation && tier.priceVariantsByLocation) {
      // Get variants for the selected location
      const locationVariants = tier.priceVariantsByLocation[locationId] || [];
      locationVariants.forEach((variant, index) => {
        if (variant.billingPeriod && variant.price !== undefined && variant.price !== null && variant.price !== '') {
          const label = getPriceVariantLabel(variant);
          options.push({
            value: `location-${locationId}-${index}`,
            label: label,
            variant: variant
          });
        }
      });
    } else if (tier.defaultPriceVariants && tier.defaultPriceVariants.length > 0) {
      // Use default price variants
      tier.defaultPriceVariants.forEach((variant, index) => {
        if (variant.billingPeriod && variant.price !== undefined && variant.price !== null && variant.price !== '') {
          const label = getPriceVariantLabel(variant);
          options.push({
            value: `default-${index}`,
            label: label,
            variant: variant
          });
        }
      });
    }

    return options;
  }, [selectedPlan, tiers, locationId, academy]);

  // Populate form if editing a player
  useEffect(() => {
    if (playerToEdit) {
      // Player Info
      setName(playerToEdit.name || '');
      setLastName(playerToEdit.lastName || '');
      setDocumentType(playerToEdit.documentType || 'passport');
      setDocumentNumber(playerToEdit.documentNumber || '');
      setNationality(playerToEdit.nationality || '');
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
      setLocationId(playerToEdit.locationId || '');

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

          // If it's a tier, try to load the selected price variant from payment data
          if (playerToEdit.plan.type === 'tier' && playerToEdit.oneTimeProducts) {
            const tierPayment = playerToEdit.oneTimeProducts.find(
              item => item.paymentFor === 'tier' && item.itemId === playerToEdit.plan.id
            );
            if (tierPayment && tierPayment.priceVariant) {
              // Reconstruct the price variant option
              const label = getPriceVariantLabel(tierPayment.priceVariant);
              setSelectedPriceVariant({
                value: `saved-variant`,
                label: label,
                variant: tierPayment.priceVariant
              });
            }
          }
        }
        setPlanStartDate(playerToEdit.plan.startDate || new Date().toISOString().split('T')[0]);
      } else { // For backward compatibility with old data structure
        if (playerToEdit.tierId && tiers.length > 0) {
            const tierToSet = tiers.find(t => t.id === playerToEdit.tierId);
            if (tierToSet) {
                setSelectedPlan({ value: `tier-${tierToSet.id}`, label: tierToSet.name });
            }
        }
        // When editing, start with empty cart (user can add new products during this session)
        setProductCart([]);
      }
      setNotes(playerToEdit.notes || '');
    }
  }, [playerToEdit, tiers, trials, oneTimeProducts, academy.currency]); // academy.currency is a dependency

  // Preserve scroll position before and after re-renders
  useLayoutEffect(() => {
    const drawer = document.getElementById('player-form-drawer');
    if (!drawer) return;

    // Always restore scroll position after any re-render
    if (scrollPositionRef.current > 0) {
      drawer.scrollTop = scrollPositionRef.current;
    }
  });

  // Save scroll position before modal state changes
  useLayoutEffect(() => {
    const drawer = document.getElementById('player-form-drawer');
    if (!drawer) return;

    // Save scroll position whenever it changes
    const handleScroll = () => {
      scrollPositionRef.current = drawer.scrollTop;
    };

    drawer.addEventListener('scroll', handleScroll);
    return () => drawer.removeEventListener('scroll', handleScroll);
  }, []);

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

    if (!locationId) {
      toast.error('Please select a location first.');
      return;
    }

    if (creatingGroup) return; // Prevent double-click

    try {
      setCreatingGroup(true);

      const groupData = {
        name: sanitizeText(newGroupName, 50),
        status: 'active',
        academyId: academy.id,
        locationId: locationId, // Add the locationId
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
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlanName.trim()) {
      toast.error('Plan name is required.');
      return;
    }

    if (creatingPlan) return; // Prevent double-click

    setCreatingPlan(true);

    try {
      let planRef;
      let newPlan;

      if (newPlanType === 'tier') {
        if (!newPlanPrice || parseFloat(newPlanPrice) < 0) {
          toast.error('Valid price is required for membership tier.');
          setCreatingPlan(false);
          return;
        }

        const tierData = {
          name: sanitizeText(newPlanName, 50),
          price: parseFloat(newPlanPrice),
          locationPricing: 'global', // Default to global pricing
          locationPrices: null,
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
          setCreatingPlan(false);
          return;
        }

        const trialData = {
          name: sanitizeText(newPlanName, 50),
          durationInDays: parseInt(newPlanDuration),
          price: 0, // Default price
          locationPricing: 'global', // Default to global pricing
          locationPrices: null,
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
    } finally {
      setCreatingPlan(false);
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
    const sanitizedNationality = sanitizeText(nationality, 50);
    const sanitizedPlayerEmail = sanitizeEmail(playerEmail);
    const sanitizedTutorName = sanitizeText(tutorName, 50);
    const sanitizedTutorLastName = sanitizeText(tutorLastName, 50);
    const sanitizedTutorEmail = sanitizeEmail(tutorEmail);
    const sanitizedNotes = sanitizeNotes(notes, 5000);

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

    // Validate price variant selection for tiers with multiple options
    if (selectedPlan && selectedPlan.value.startsWith('tier-') && priceVariantOptions.length > 0 && !selectedPriceVariant) {
      toast.error("Please select a billing period and price for the tier.");
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

    // Combine existing products with newly added ones from cart.
    const existingProducts = playerToEdit?.oneTimeProducts || [];

    // Convert cart items to individual product entries (expand by quantity)
    const newProducts = productCart.flatMap(cartItem => {
      const product = filteredProducts.find(p => p.id === cartItem.productId);
      const productPrice = locationId && product?.locationPrices?.[locationId]
        ? product.locationPrices[locationId]
        : 0;

      return Array(cartItem.quantity).fill(null).map(() => ({
        productId: cartItem.productId,
        productName: product?.name || 'Unknown Product',
        amount: productPrice,
        locationId: locationId,
        status: 'unpaid'
      }));
    });

    const combinedProducts = [...existingProducts, ...newProducts];

    // This is the key fix for the "Product not found" bug.
    // We process and clean each payment item according to its type.
    let finalProductsData = combinedProducts.map(item => {
      if (item.paymentFor === 'tier') {
        // This is a subscription payment, keep its structure.
        return item;
      }
      // This is a one-time product.
      return {
        productId: item.productId,
        productName: item.productName,
        amount: item.amount,
        locationId: item.locationId,
        status: item.status,
        paidAt: item.paidAt || null,
        paymentMethod: item.paymentMethod || null,
        receiptUrl: item.receiptUrl || null,
        receiptPath: item.receiptPath || null,
        receiptName: item.receiptName || null,
      };
    });

    // If a new tier is being assigned, create its first payment record.
    // This logic assumes we are not editing an existing plan, just assigning a new one.
    if (selectedPlan && selectedPlan.value.startsWith('tier-') && !playerToEdit?.plan) {
        const [type, id] = selectedPlan.value.split('-');
        const tierDetails = tiers.find(t => t.id === id);

        // Get price from selected variant, or fallback to legacy price
        let amount = 0;
        let billingPeriod = 'monthly'; // default
        let priceVariantData = null;

        if (selectedPriceVariant && selectedPriceVariant.variant) {
          // New structure with price variants
          amount = selectedPriceVariant.variant.price;
          billingPeriod = selectedPriceVariant.variant.billingPeriod;
          // Store the complete variant data for future reference
          priceVariantData = {
            billingPeriod: selectedPriceVariant.variant.billingPeriod,
            price: selectedPriceVariant.variant.price,
            customTermName: selectedPriceVariant.variant.customTermName,
            termStartDate: selectedPriceVariant.variant.termStartDate,
            termEndDate: selectedPriceVariant.variant.termEndDate,
            durationUnit: selectedPriceVariant.variant.durationUnit,
            durationAmount: selectedPriceVariant.variant.durationAmount,
          };
        } else {
          // Legacy structure - fallback to tier's price
          // Check if tier has location-specific pricing
          if (tierDetails.locationPrices && locationId && tierDetails.locationPrices[locationId]) {
            amount = tierDetails.locationPrices[locationId];
          } else if (tierDetails.price) {
            // Global price
            amount = tierDetails.price;
          }

          // Use legacy pricingModel if available
          if (tierDetails.pricingModel) {
            billingPeriod = tierDetails.pricingModel;
          }
        }

        const firstPayment = {
            paymentFor: 'tier',
            itemId: id,
            itemName: tierDetails.name,
            amount: amount,
            billingPeriod: billingPeriod,
            priceVariant: priceVariantData,
            dueDate: planStartDate,
            status: 'unpaid',
        };
        finalProductsData.push(firstPayment); // We'll rename oneTimeProducts to payments later
    }

    // If editing an existing player with a tier plan, update the start date of unpaid tier payments
    if (playerToEdit?.plan && playerToEdit.plan.type === 'tier') {
        finalProductsData = finalProductsData.map(item => {
            if (item.paymentFor === 'tier' && item.status === 'unpaid') {
                return {
                    ...item,
                    dueDate: planStartDate
                };
            }
            return item;
        });
    }

    const playerData = {
      name: sanitizedName,
      lastName: sanitizedLastName,
      documentType: documentType || null,
      documentNumber: sanitizedDocumentNumber || null,
      nationality: sanitizedNationality || null,
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
      locationId: locationId || null,
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
      let playerId;

      if (playerToEdit) {
        playerId = playerToEdit.id;
        const playerDocRef = doc(db, `academies/${academyId}/players`, playerId);
        await updateDoc(playerDocRef, removeUndefinedFields(playerData));

        // Sync group membership: handle group changes
        const oldGroupId = playerToEdit.groupId;
        const newGroupId = groupId || null;

        // If group changed, update the members subcollection
        if (oldGroupId !== newGroupId) {
          // Remove from old group if it existed
          if (oldGroupId) {
            const oldMemberRef = doc(db, `academies/${academyId}/groups/${oldGroupId}/members`, playerId);
            await deleteDoc(oldMemberRef);
          }

          // Add to new group if it exists
          if (newGroupId) {
            const newMemberRef = doc(db, `academies/${academyId}/groups/${newGroupId}/members`, playerId);
            await setDoc(newMemberRef, { playerId });
          }
        }

        toast.success("Player updated successfully.");
      } else {
        const playersCollectionRef = collection(db, `academies/${academyId}/players`);
        const docRef = await addDoc(playersCollectionRef, removeUndefinedFields(playerData));
        playerId = docRef.id;

        // Sync group membership: add to group if assigned
        if (groupId) {
          const memberRef = doc(db, `academies/${academyId}/groups/${groupId}/members`, playerId);
          await setDoc(memberRef, { playerId });
        }

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
        {/* Student Information Section (includes photo) */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">{studentLabelSingular} Information</legend>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div><label htmlFor="name" className="block text-sm font-medium text-gray-700">First Name</label><input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div><label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label><input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div>
              <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">Nationality</label>
              <Select
                id="nationality"
                value={nationality ? { value: nationality, label: nationality } : null}
                onChange={(option) => setNationality(option?.value || '')}
                options={nationalities}
                isClearable
                isSearchable
                placeholder="Select nationality"
                className="mt-1"
                styles={{
                  menu: (base) => ({ ...base, zIndex: 20 })
                }}
              />
            </div>
            <div><label htmlFor="birthday" className="block text-sm font-medium text-gray-700">Date of Birth</label><input type="date" id="birthday" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
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
          </div>
        </fieldset>

        {/* Contact Information Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">{studentLabelSingular} Contact Information</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div><label htmlFor="playerEmail" className="block text-sm font-medium text-gray-700">Email</label><input type="email" id="playerEmail" value={playerEmail} onChange={(e) => setPlayerEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
            <div className="md:col-span-2">
              <label htmlFor="playerContactPhone" className="block text-sm font-medium text-gray-700">Phone</label>
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
              <div><label htmlFor="tutorName" className="block text-sm font-medium text-gray-700">Tutor First Name</label><input type="text" id="tutorName" value={tutorName} onChange={(e) => setTutorName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
              <div><label htmlFor="tutorLastName" className="block text-sm font-medium text-gray-700">Tutor Last Name</label><input type="text" id="tutorLastName" value={tutorLastName} onChange={(e) => setTutorLastName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
              <div className="md:col-span-2"><label htmlFor="tutorEmail" className="block text-sm font-medium text-gray-700">Tutor Email</label><input type="email" id="tutorEmail" value={tutorEmail} onChange={(e) => setTutorEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500" /></div>
              <div className="md:col-span-2">
                <label htmlFor="tutorContactPhone" className="block text-sm font-medium text-gray-700">Tutor Phone</label>
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
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
              <Select
                id="location"
                value={locationId ? locations.find(loc => loc.id === locationId) ? { value: locationId, label: locations.find(loc => loc.id === locationId).name } : null : null}
                onChange={(option) => {
                  setLocationId(option?.value || '');
                  // Clear group and plan when location changes
                  setGroupId('');
                  setSelectedPlan(null);
                }}
                options={locations.filter(loc => loc.status === 'active').map(location => ({
                  value: location.id,
                  label: location.name
                }))}
                isClearable={false}
                isSearchable
                placeholder="Select a location"
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
                value={groupId ? filteredGroups.find(g => g.id === groupId) ? { value: groupId, label: filteredGroups.find(g => g.id === groupId).name } : null : null}
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
                    options: filteredGroups.map(group => ({
                      value: group.id,
                      label: group.name
                    }))
                  }
                ]}
                isClearable
                placeholder={locationId ? "Select a group" : "Select a location first"}
                isDisabled={!locationId}
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
            {playerToEdit?.plan ? (
              <>
                {(() => {
                  // Check if plan is unpaid by looking at payment records
                  const tierPayments = (playerToEdit.oneTimeProducts || []).filter(p => p.paymentFor === 'tier');
                  const hasUnpaidPayment = tierPayments.some(p => p.status === 'unpaid');

                  if (hasUnpaidPayment) {
                    // Allow editing plan, billing type, and start date if plan is unpaid
                    return (
                      <>
                        <div className="md:col-span-2 space-y-2">
                          <label htmlFor="planType" className="block text-sm font-medium text-gray-700">Assigned Plan</label>
                          <Select
                            id="planType"
                            value={selectedPlan}
                            onChange={(option) => {
                              if (option?.value === '__create_new__') {
                                setShowCreatePlan(true);
                              } else {
                                setSelectedPlan(option);
                                setSelectedPriceVariant(null); // Reset price variant when plan changes
                              }
                            }}
                            isClearable
                            isSearchable
                            placeholder={locationId ? "Select a plan..." : "Select a location first"}
                            isDisabled={!locationId}
                            className="mt-1"
                            options={[
                              {
                                label: 'Actions',
                                options: [{ value: '__create_new__', label: '+ Create New Plan' }]
                              },
                              {
                                label: 'Membership Tiers',
                                options: filteredTiers.map(t => ({ value: `tier-${t.id}`, label: t.name }))
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
                          <p className="text-xs text-gray-500 mt-1">Editable while plan is unpaid</p>
                        </div>

                        {selectedPlan?.value.startsWith('tier-') && priceVariantOptions.length > 0 && (
                          <div>
                            <label htmlFor="priceVariant" className="block text-sm font-medium text-gray-700">Billing Type</label>
                            <Select
                              id="priceVariant"
                              value={selectedPriceVariant}
                              onChange={(option) => setSelectedPriceVariant(option)}
                              isClearable
                              isSearchable
                              placeholder="Select a billing type..."
                              className="mt-1"
                              options={priceVariantOptions}
                            />
                            <p className="text-xs text-gray-500 mt-1">Editable while plan is unpaid</p>
                          </div>
                        )}

                        <div>
                          <label htmlFor="planStartDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                          <input
                            type="date"
                            id="planStartDate"
                            value={planStartDate}
                            onChange={(e) => setPlanStartDate(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">Editable while plan is unpaid</p>
                        </div>
                      </>
                    );
                  } else {
                    // Show read-only plan info if plan is paid
                    return (
                      <>
                        <div className="md:col-span-2 space-y-2">
                          <p className="text-sm font-medium text-gray-700">Assigned Plan</p>
                          <p className="text-gray-900 font-semibold">{selectedPlan?.label || 'Unknown plan'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-700">Start date: <span className="font-semibold">{formatDate(existingPlanStartDate)}</span></p>
                        </div>
                      </>
                    );
                  }
                })()}
              </>
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
                        setSelectedPriceVariant(null); // Reset price variant when plan changes
                      }
                    }}
                    isClearable
                    isSearchable
                    placeholder={locationId ? "Select a plan..." : "Select a location first"}
                    isDisabled={!locationId}
                    className="mt-1"
                    options={[
                      {
                        label: 'Actions',
                        options: [{ value: '__create_new__', label: '+ Create New Plan' }]
                      },
                      {
                        label: 'Membership Tiers',
                        options: filteredTiers.map(t => ({ value: `tier-${t.id}`, label: t.name }))
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

                {selectedPlan?.value.startsWith('tier-') && priceVariantOptions.length > 0 && (
                  <div>
                    <label htmlFor="priceVariant" className="block text-sm font-medium text-gray-700">Billing Type</label>
                    <Select
                      id="priceVariant"
                      value={selectedPriceVariant}
                      onChange={(option) => setSelectedPriceVariant(option)}
                      isClearable
                      isSearchable
                      placeholder="Select a billing type..."
                      className="mt-1"
                      options={priceVariantOptions}
                    />
                  </div>
                )}

                {selectedPlan?.value.startsWith('tier-') && (
                  <>
                    <div><label htmlFor="planStartDate" className="block text-sm font-medium text-gray-700">Start Date</label><input type="date" id="planStartDate" value={planStartDate} onChange={(e) => setPlanStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
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
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Available Products</h4>
            <div className="space-y-2 max-h-80 overflow-y-auto border p-3 rounded-md">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => {
                  const cartItem = productCart.find(item => item.productId === product.id);
                  const quantity = cartItem?.quantity || 0;

                  // Get price for the selected location
                  const productPrice = locationId && product.locationPrices?.[locationId]
                    ? product.locationPrices[locationId]
                    : 0;

                  return (
                    <div key={product.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-md border border-gray-200">
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-500">
                          {new Intl.NumberFormat(undefined, { style: 'currency', currency: academy.currency || 'USD' }).format(productPrice)} each
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {quantity > 0 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (quantity === 1) {
                                  setProductCart(productCart.filter(item => item.productId !== product.id));
                                } else {
                                  setProductCart(productCart.map(item =>
                                    item.productId === product.id
                                      ? { ...item, quantity: item.quantity - 1 }
                                      : item
                                  ));
                                }
                              }}
                              className="bg-gray-200 text-gray-700 w-8 h-8 rounded-md hover:bg-gray-300 font-bold"
                            >
                              -
                            </button>
                            <span className="w-12 text-center font-semibold">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setProductCart(productCart.map(item =>
                                  item.productId === product.id
                                    ? { ...item, quantity: item.quantity + 1 }
                                    : item
                                ));
                              }}
                              className="bg-gray-200 text-gray-700 w-8 h-8 rounded-md hover:bg-gray-300 font-bold"
                            >
                              +
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setProductCart([...productCart, { productId: product.id, quantity: 1 }]);
                            }}
                            className="bg-blue-100 text-blue-800 text-xs font-bold py-2 px-4 rounded-md hover:bg-blue-200"
                          >
                            Add Item
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 p-2">
                  {locationId ? 'No products available for this location.' : 'Select a location to view products.'}
                </p>
              )}
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
        {showCreateGroup && ReactDOM.createPortal(
          <div className="fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
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
                  disabled={creatingGroup}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  disabled={creatingGroup}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Create Plan Modal */}
        {showCreatePlan && ReactDOM.createPortal(
          <div className="fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
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
                  disabled={creatingPlan}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreatePlan}
                  disabled={creatingPlan}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingPlan ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
