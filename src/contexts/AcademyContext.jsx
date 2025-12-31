import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { COLLECTIONS } from '../config/constants';

/**
 * Academy Context
 * Provides academy-related data and functions throughout the app
 * Eliminates prop drilling and centralizes academy state management
 */

const AcademyContext = createContext(null);

/**
 * Hook to use Academy Context
 * @returns {Object} Academy context value
 * @throws {Error} If used outside AcademyProvider
 */
export const useAcademy = () => {
  const context = useContext(AcademyContext);
  if (!context) {
    throw new Error('useAcademy must be used within AcademyProvider');
  }
  return context;
};

/**
 * Academy Provider Component
 * Wraps the app and provides academy-related state and functions
 *
 * @param {Object} props
 * @param {Object} props.children - Child components
 * @param {Object} props.user - Firebase user object
 * @param {Object} props.db - Firestore database instance
 */
export const AcademyProvider = ({ children, user, db }) => {
  // Core state
  const [academy, setAcademy] = useState(null);
  const [membership, setMembership] = useState(null);
  const [allAcademies, setAllAcademies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Load all academies for the current user
   */
  const loadUserAcademies = useCallback(async () => {
    if (!user || !db) {
      setAllAcademies([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user's memberships
      const membershipsRef = collection(db, `${COLLECTIONS.USERS}/${user.uid}/${COLLECTIONS.MEMBERSHIPS}`);
      const membershipsSnap = await getDocs(membershipsRef);

      if (membershipsSnap.empty) {
        setAllAcademies([]);
        setAcademy(null);
        setMembership(null);
        setLoading(false);
        return;
      }

      // Fetch all academies in parallel
      const academyPromises = membershipsSnap.docs.map(async (memberDoc) => {
        try {
          const academyId = memberDoc.id;
          const academyDocRef = doc(db, COLLECTIONS.ACADEMIES, academyId);
          const academyDoc = await getDoc(academyDocRef);

          if (academyDoc.exists()) {
            return {
              id: academyDoc.id,
              ...academyDoc.data(),
              membership: memberDoc.data(),
              userRole: memberDoc.data().role
            };
          }
          return null;
        } catch (err) {
          console.error('Error fetching academy:', err);
          return null;
        }
      });

      const academies = (await Promise.all(academyPromises)).filter(Boolean);
      setAllAcademies(academies);

      // If no current academy is set, select the first one
      if (!academy && academies.length > 0) {
        await selectAcademy(academies[0].id);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading user academies:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [user, db, academy]);

  /**
   * Select an academy by ID
   * @param {string} academyId - Academy ID to select
   */
  const selectAcademy = useCallback(async (academyId) => {
    if (!user || !db || !academyId) return;

    try {
      setLoading(true);
      setError(null);

      // Get academy data
      const academyDocRef = doc(db, COLLECTIONS.ACADEMIES, academyId);
      const academyDoc = await getDoc(academyDocRef);

      if (!academyDoc.exists()) {
        throw new Error('Academy not found');
      }

      // Get membership data
      const membershipDocRef = doc(db, `${COLLECTIONS.USERS}/${user.uid}/${COLLECTIONS.MEMBERSHIPS}`, academyId);
      const membershipDoc = await getDoc(membershipDocRef);

      if (!membershipDoc.exists()) {
        throw new Error('You do not have access to this academy');
      }

      const academyData = {
        id: academyDoc.id,
        ...academyDoc.data()
      };

      const membershipData = membershipDoc.data();

      setAcademy(academyData);
      setMembership(membershipData);

      // Store in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem(`lastAcademy_${user.uid}`, academyId);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error selecting academy:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [user, db]);

  /**
   * Refresh current academy data
   */
  const refreshAcademy = useCallback(async () => {
    if (!academy?.id) return;
    await selectAcademy(academy.id);
  }, [academy?.id, selectAcademy]);

  /**
   * Switch to a different academy
   * @param {string} academyId - Academy ID to switch to
   */
  const switchAcademy = useCallback(async (academyId) => {
    if (academy?.id === academyId) return; // Already on this academy
    await selectAcademy(academyId);
  }, [academy?.id, selectAcademy]);

  // Load academies when user changes
  useEffect(() => {
    if (user && db) {
      loadUserAcademies();
    } else {
      setAcademy(null);
      setMembership(null);
      setAllAcademies([]);
      setLoading(false);
    }
  }, [user?.uid, db]);

  // Subscribe to current academy changes for real-time updates
  useEffect(() => {
    if (!academy?.id || !db) return;

    const academyRef = doc(db, COLLECTIONS.ACADEMIES, academy.id);
    const unsubscribe = onSnapshot(
      academyRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setAcademy((prev) => ({
            ...prev,
            ...snapshot.data(),
            id: snapshot.id
          }));
        }
      },
      (err) => {
        console.error('Error in academy subscription:', err);
      }
    );

    return () => unsubscribe();
  }, [academy?.id, db]);

  // Restore last selected academy from localStorage
  useEffect(() => {
    if (!user || !db || academy || allAcademies.length === 0) return;

    const lastAcademyId = localStorage.getItem(`lastAcademy_${user.uid}`);
    if (lastAcademyId) {
      const academyExists = allAcademies.some((a) => a.id === lastAcademyId);
      if (academyExists) {
        selectAcademy(lastAcademyId);
      } else {
        // Last academy no longer accessible, select first available
        selectAcademy(allAcademies[0].id);
      }
    } else if (allAcademies.length > 0) {
      // No last academy stored, select first one
      selectAcademy(allAcademies[0].id);
    }
  }, [user, db, academy, allAcademies, selectAcademy]);

  // Context value
  const value = {
    // State
    academy,
    membership,
    allAcademies,
    loading,
    error,

    // Functions
    selectAcademy,
    switchAcademy,
    refreshAcademy,
    loadUserAcademies,

    // Computed values
    isOwner: membership?.role === 'owner',
    isAdmin: membership?.role === 'admin',
    isMember: membership?.role === 'member',

    // Labels (with fallbacks)
    studentLabelSingular: academy?.studentLabelSingular || 'Student',
    studentLabelPlural: academy?.studentLabelPlural || 'Students',
    tutorLabelSingular: academy?.tutorLabelSingular || 'Tutor',
    tutorLabelPlural: academy?.tutorLabelPlural || 'Tutors',
    groupLabelSingular: academy?.groupLabelSingular || 'Group',
    groupLabelPlural: academy?.groupLabelPlural || 'Groups',
    classLabelSingular: academy?.classLabelSingular || 'Class',
    classLabelPlural: academy?.classLabelPlural || 'Classes',
    locationLabelSingular: academy?.locationLabelSingular || 'Location',
    locationLabelPlural: academy?.locationLabelPlural || 'Locations',
    facilityLabelSingular: academy?.facilityLabelSingular || 'Facility',
    facilityLabelPlural: academy?.facilityLabelPlural || 'Facilities'
  };

  return (
    <AcademyContext.Provider value={value}>
      {/* Only render children when academy is loaded or when explicitly loading */}
      {!loading || academy ? children : null}
    </AcademyContext.Provider>
  );
};

export default AcademyContext;
