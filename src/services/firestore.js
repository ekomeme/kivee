/**
 * Firestore service layer
 * Centralizes all database operations to avoid duplication and improve maintainability
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { COLLECTIONS } from '../config/constants';

// ==================== PATH HELPERS ====================

/**
 * Get full path for academy subcollection
 * @param {string} academyId - Academy ID
 * @param {string} subcollection - Subcollection name
 * @returns {string}
 */
export const getAcademyPath = (academyId, subcollection) => {
  return `${COLLECTIONS.ACADEMIES}/${academyId}/${subcollection}`;
};

/**
 * Get collection reference for academy subcollection
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {string} subcollection - Subcollection name
 * @returns {Object} - Collection reference
 */
export const getAcademyCollection = (db, academyId, subcollection) => {
  return collection(db, getAcademyPath(academyId, subcollection));
};

// ==================== ACADEMY OPERATIONS ====================

/**
 * Get academy by ID
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @returns {Promise<Object|null>}
 */
export const getAcademy = async (db, academyId) => {
  try {
    const docRef = doc(db, COLLECTIONS.ACADEMIES, academyId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error('Error fetching academy:', error);
    throw error;
  }
};

/**
 * Get all academies for a user
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @returns {Promise<Array>}
 */
export const getUserAcademies = async (db, userId) => {
  try {
    // Get user's memberships
    const membershipsRef = collection(db, `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.MEMBERSHIPS}`);
    const membershipsSnap = await getDocs(membershipsRef);

    if (membershipsSnap.empty) {
      return [];
    }

    // Fetch all academies in parallel
    const academyPromises = membershipsSnap.docs.map(async (memberDoc) => {
      const academyId = memberDoc.id;
      const academyDoc = await getDoc(doc(db, COLLECTIONS.ACADEMIES, academyId));
      if (academyDoc.exists()) {
        return {
          id: academyDoc.id,
          ...academyDoc.data(),
          membership: memberDoc.data()
        };
      }
      return null;
    });

    const academies = await Promise.all(academyPromises);
    return academies.filter(Boolean);
  } catch (error) {
    console.error('Error fetching user academies:', error);
    throw error;
  }
};

/**
 * Update academy
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {Object} data - Data to update
 * @returns {Promise<void>}
 */
export const updateAcademy = async (db, academyId, data) => {
  try {
    const docRef = doc(db, COLLECTIONS.ACADEMIES, academyId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating academy:', error);
    throw error;
  }
};

// ==================== PLAYER OPERATIONS ====================

/**
 * Get all players for an academy
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @returns {Promise<Array>}
 */
export const getPlayers = async (db, academyId) => {
  try {
    const playersRef = getAcademyCollection(db, academyId, COLLECTIONS.PLAYERS);
    const snapshot = await getDocs(playersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching players:', error);
    throw error;
  }
};

/**
 * Get player by ID
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {string} playerId - Player ID
 * @returns {Promise<Object|null>}
 */
export const getPlayer = async (db, academyId, playerId) => {
  try {
    const docRef = doc(db, getAcademyPath(academyId, COLLECTIONS.PLAYERS), playerId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error('Error fetching player:', error);
    throw error;
  }
};

/**
 * Create player
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {Object} playerData - Player data
 * @returns {Promise<string>} - Created player ID
 */
export const createPlayer = async (db, academyId, playerData) => {
  try {
    const playersRef = getAcademyCollection(db, academyId, COLLECTIONS.PLAYERS);
    const newDocRef = doc(playersRef);
    await setDoc(newDocRef, {
      ...playerData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return newDocRef.id;
  } catch (error) {
    console.error('Error creating player:', error);
    throw error;
  }
};

/**
 * Update player
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {string} playerId - Player ID
 * @param {Object} data - Data to update
 * @returns {Promise<void>}
 */
export const updatePlayer = async (db, academyId, playerId, data) => {
  try {
    const docRef = doc(db, getAcademyPath(academyId, COLLECTIONS.PLAYERS), playerId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating player:', error);
    throw error;
  }
};

/**
 * Delete player
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {string} playerId - Player ID
 * @returns {Promise<void>}
 */
export const deletePlayer = async (db, academyId, playerId) => {
  try {
    const docRef = doc(db, getAcademyPath(academyId, COLLECTIONS.PLAYERS), playerId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting player:', error);
    throw error;
  }
};

// ==================== TUTOR OPERATIONS ====================

/**
 * Get all tutors for an academy
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @returns {Promise<Array>}
 */
export const getTutors = async (db, academyId) => {
  try {
    const tutorsRef = getAcademyCollection(db, academyId, COLLECTIONS.TUTORS);
    const snapshot = await getDocs(tutorsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching tutors:', error);
    throw error;
  }
};

/**
 * Get tutor by ID
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {string} tutorId - Tutor ID
 * @returns {Promise<Object|null>}
 */
export const getTutor = async (db, academyId, tutorId) => {
  try {
    const docRef = doc(db, getAcademyPath(academyId, COLLECTIONS.TUTORS), tutorId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error('Error fetching tutor:', error);
    throw error;
  }
};

// ==================== TIER OPERATIONS ====================

/**
 * Get all tiers for an academy
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @returns {Promise<Array>}
 */
export const getTiers = async (db, academyId) => {
  try {
    const tiersRef = getAcademyCollection(db, academyId, COLLECTIONS.TIERS);
    const snapshot = await getDocs(tiersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching tiers:', error);
    throw error;
  }
};

// ==================== GROUP OPERATIONS ====================

/**
 * Get all groups for an academy
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @returns {Promise<Array>}
 */
export const getGroups = async (db, academyId) => {
  try {
    const groupsRef = getAcademyCollection(db, academyId, COLLECTIONS.GROUPS);
    const snapshot = await getDocs(groupsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw error;
  }
};

// ==================== PRODUCT OPERATIONS ====================

/**
 * Get all products for an academy
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @returns {Promise<Array>}
 */
export const getProducts = async (db, academyId) => {
  try {
    const productsRef = getAcademyCollection(db, academyId, COLLECTIONS.PRODUCTS);
    const snapshot = await getDocs(productsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// ==================== TRIAL OPERATIONS ====================

/**
 * Get all trials for an academy
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @returns {Promise<Array>}
 */
export const getTrials = async (db, academyId) => {
  try {
    const trialsRef = getAcademyCollection(db, academyId, COLLECTIONS.TRIALS);
    const snapshot = await getDocs(trialsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching trials:', error);
    throw error;
  }
};

// ==================== LOCATION OPERATIONS ====================

/**
 * Get all locations for an academy
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @returns {Promise<Array>}
 */
export const getLocations = async (db, academyId) => {
  try {
    const locationsRef = getAcademyCollection(db, academyId, COLLECTIONS.LOCATIONS);
    const snapshot = await getDocs(locationsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }
};

/**
 * Get location by ID
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {string} locationId - Location ID
 * @returns {Promise<Object|null>}
 */
export const getLocation = async (db, academyId, locationId) => {
  try {
    const docRef = doc(db, getAcademyPath(academyId, COLLECTIONS.LOCATIONS), locationId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error('Error fetching location:', error);
    throw error;
  }
};

/**
 * Create location
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {Object} locationData - Location data
 * @returns {Promise<string>} - Created location ID
 */
export const createLocation = async (db, academyId, locationData) => {
  try {
    const locationsRef = getAcademyCollection(db, academyId, COLLECTIONS.LOCATIONS);
    const newDocRef = doc(locationsRef);
    await setDoc(newDocRef, {
      ...locationData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return newDocRef.id;
  } catch (error) {
    console.error('Error creating location:', error);
    throw error;
  }
};

/**
 * Update location
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {string} locationId - Location ID
 * @param {Object} data - Data to update
 * @returns {Promise<void>}
 */
export const updateLocation = async (db, academyId, locationId, data) => {
  try {
    const docRef = doc(db, getAcademyPath(academyId, COLLECTIONS.LOCATIONS), locationId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating location:', error);
    throw error;
  }
};

/**
 * Delete location
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {string} locationId - Location ID
 * @returns {Promise<void>}
 */
export const deleteLocation = async (db, academyId, locationId) => {
  try {
    const docRef = doc(db, getAcademyPath(academyId, COLLECTIONS.LOCATIONS), locationId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting location:', error);
    throw error;
  }
};

// ==================== FACILITY OPERATIONS ====================

/**
 * Get all facilities for a location
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {string} locationId - Location ID
 * @returns {Promise<Array>}
 */
export const getFacilities = async (db, academyId, locationId) => {
  try {
    const facilitiesRef = collection(db, `academies/${academyId}/locations/${locationId}/facilities`);
    const snapshot = await getDocs(facilitiesRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching facilities:', error);
    throw error;
  }
};

/**
 * Create a new facility
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {string} locationId - Location ID
 * @param {Object} facilityData - Facility data
 * @returns {Promise<string>} - Created facility ID
 */
export const createFacility = async (db, academyId, locationId, facilityData) => {
  try {
    const facilitiesRef = collection(db, `academies/${academyId}/locations/${locationId}/facilities`);
    const newDocRef = doc(facilitiesRef);

    const dataToSave = {
      ...facilityData,
      academyId,
      locationId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(newDocRef, dataToSave);
    return newDocRef.id;
  } catch (error) {
    console.error('Error creating facility:', error);
    throw error;
  }
};

/**
 * Update a facility
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {string} locationId - Location ID
 * @param {string} facilityId - Facility ID
 * @param {Object} data - Data to update
 * @returns {Promise<void>}
 */
export const updateFacility = async (db, academyId, locationId, facilityId, data) => {
  try {
    const docRef = doc(db, `academies/${academyId}/locations/${locationId}/facilities`, facilityId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating facility:', error);
    throw error;
  }
};

/**
 * Delete a facility
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {string} locationId - Location ID
 * @param {string} facilityId - Facility ID
 * @returns {Promise<void>}
 */
export const deleteFacility = async (db, academyId, locationId, facilityId) => {
  try {
    const docRef = doc(db, `academies/${academyId}/locations/${locationId}/facilities`, facilityId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting facility:', error);
    throw error;
  }
};

// ==================== MEMBER OPERATIONS ====================

/**
 * Get all team members for an academy
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @returns {Promise<Array>}
 */
export const getTeamMembers = async (db, academyId) => {
  try {
    const membersRef = getAcademyCollection(db, academyId, COLLECTIONS.MEMBERS);
    const snapshot = await getDocs(membersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching team members:', error);
    throw error;
  }
};

// ==================== INVITATION OPERATIONS ====================

/**
 * Get pending invitations for an academy
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @returns {Promise<Array>}
 */
export const getAcademyInvitations = async (db, academyId) => {
  try {
    const invitationsRef = collection(db, COLLECTIONS.INVITATIONS);
    const q = query(
      invitationsRef,
      where('academyId', '==', academyId),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching invitations:', error);
    throw error;
  }
};

// ==================== SUBSCRIPTION OPERATIONS ====================

/**
 * Get all subscriptions for an academy
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @returns {Promise<Array>}
 */
export const getSubscriptions = async (db, academyId) => {
  try {
    const subscriptionsRef = getAcademyCollection(db, academyId, COLLECTIONS.SUBSCRIPTIONS);
    const snapshot = await getDocs(subscriptionsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    throw error;
  }
};

// ==================== BATCH OPERATIONS ====================

/**
 * Get dashboard data (all necessary data in one call)
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @returns {Promise<Object>}
 */
export const getDashboardData = async (db, academyId) => {
  try {
    const [products, players, trials, tiers, subscriptions] = await Promise.all([
      getProducts(db, academyId),
      getPlayers(db, academyId),
      getTrials(db, academyId),
      getTiers(db, academyId),
      getSubscriptions(db, academyId)
    ]);

    return { products, players, trials, tiers, subscriptions };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
};

/**
 * Get all academy resources (for sections that need multiple resources)
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @returns {Promise<Object>}
 */
export const getAcademyResources = async (db, academyId) => {
  try {
    const [tiers, groups, tutors, products] = await Promise.all([
      getTiers(db, academyId),
      getGroups(db, academyId),
      getTutors(db, academyId),
      getProducts(db, academyId)
    ]);

    return { tiers, groups, tutors, products };
  } catch (error) {
    console.error('Error fetching academy resources:', error);
    throw error;
  }
};

// ==================== REAL-TIME LISTENERS ====================

/**
 * Subscribe to players changes
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {Function} callback - Callback function
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToPlayers = (db, academyId, callback) => {
  const playersRef = getAcademyCollection(db, academyId, COLLECTIONS.PLAYERS);
  return onSnapshot(playersRef, (snapshot) => {
    const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(players);
  }, (error) => {
    console.error('Error in players subscription:', error);
  });
};

/**
 * Subscribe to academy changes
 * @param {Object} db - Firestore instance
 * @param {string} academyId - Academy ID
 * @param {Function} callback - Callback function
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToAcademy = (db, academyId, callback) => {
  const academyRef = doc(db, COLLECTIONS.ACADEMIES, academyId);
  return onSnapshot(academyRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    }
  }, (error) => {
    console.error('Error in academy subscription:', error);
  });
};
