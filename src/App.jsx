import { useEffect, useState, useRef, useCallback } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut, getRedirectResult } from "firebase/auth"; // Import getRedirectResult
import { auth, db, authReady } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where, collectionGroup, updateDoc } from "firebase/firestore";
import GoogleSignIn from "./components/GoogleSignIn.jsx";
import LandingPage from "./components/LandingPage.jsx";
import PlayerDetailPage from "./components/PlayerDetailPage.jsx";
import EditPlayerPage from "./components/EditPlayerPage.jsx";
import PlayersSection from "./components/PlayersSection.jsx";
import PlansOffersSection from "./components/PlansOffersSection.jsx";
import NewPlayerPage from "./components/NewPlayerPage.jsx"; // Import the new page
import GroupsAndClassesSection from "./components/GroupsAndClassesSection.jsx";
import AdminSection from "./components/AdminSection.jsx";
import FinancesSection from "./components/FinancesSection.jsx";
import Dashboard from "./components/Dashboard.jsx";
import GroupDetailPage from "./components/GroupDetailPage.jsx";
import { Toaster } from "react-hot-toast";
import { LogOut, Home, Users, Layers, Tags, CreditCard, Settings, Menu, X, ChevronsUpDown, Loader2 } from "lucide-react";
import loginIllustration from "./assets/login-ilustration.svg";
import { isValidAcademyId, getValidatedLocalStorage } from "./utils/validators";
import logoKivee from "./assets/logo-kivee.svg";
import Sidebar from "./components/Sidebar.jsx";
import InviteTeammateModal from "./components/InviteTeammateModal.jsx";
import AcademySelector from "./components/AcademySelector.jsx";
import UserMenu from "./components/UserMenu.jsx";
import { AcademyProvider } from "./contexts/AcademyContext.jsx";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [academy, setAcademy] = useState(null);
  const [availableAcademies, setAvailableAcademies] = useState([]); // Nuevo: todas las academias disponibles
  const [membership, setMembership] = useState(null); // Nuevo estado para el rol
  const [loading, setLoading] = useState(true);
  const [loadingAcademies, setLoadingAcademies] = useState(false); // Nuevo: loading para academias
  const [creatingAcademy, setCreatingAcademy] = useState(false);
  const [error, setError] = useState(null);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [refreshTeamData, setRefreshTeamData] = useState(null);
  const studentLabelSingular = academy?.studentLabelSingular || 'Student';
  const studentLabelPlural = academy?.studentLabelPlural || 'Students';

  const loadAcademyById = useCallback(async (academyId) => {
    const ref = doc(db, "academies", academyId);
    const memberRef = doc(db, `academies/${academyId}/members`, auth.currentUser.uid);
    try {
      const [academySnap, memberSnap] = await Promise.all([getDoc(ref), getDoc(memberRef)]);
      if (!academySnap.exists()) return null;
      const academyData = { id: ref.id, ...academySnap.data() };
      if (memberSnap.exists()) setMembership(memberSnap.data());
      setAcademy(academyData);
      return academyData;
    } catch (err) {
      if (err?.code === 'permission-denied') {
        return null;
      }
      throw err;
    }
  }, []);

  // Nueva función para cargar todas las academias disponibles
  const loadAllAcademies = useCallback(async (userId) => {
    const academies = [];

    try {
      // 1. Cargar academia propia (como owner)
      try {
        const ownerRef = doc(db, "academies", userId);
        const ownerSnap = await getDoc(ownerRef);
        if (ownerSnap.exists()) {
          academies.push({
            id: ownerRef.id,
            ...ownerSnap.data(),
            userRole: 'owner'
          });
        }
      } catch (err) {
        if (err?.code !== 'permission-denied') {
          console.error('Error loading owner academy:', err);
        }
      }

      // 2. Cargar academias donde es miembro
      try {
        const membershipsRef = collection(db, "users", userId, "memberships");
        const membershipsSnap = await getDocs(membershipsRef);

        for (const membershipDoc of membershipsSnap.docs) {
          const membershipData = membershipDoc.data();
          if (membershipData.status === 'active' && membershipData.academyId) {
            try {
              const academyRef = doc(db, "academies", membershipData.academyId);
              const academySnap = await getDoc(academyRef);
              if (academySnap.exists()) {
                // Evitar duplicados si ya se cargó como owner
                if (!academies.find(a => a.id === membershipData.academyId)) {
                  academies.push({
                    id: academySnap.id,
                    ...academySnap.data(),
                    userRole: membershipData.role || 'admin'
                  });
                }
              }
            } catch (err) {
              console.error(`Error loading academy ${membershipData.academyId}:`, err);
            }
          }
        }
      } catch (err) {
        if (err?.code !== 'permission-denied') {
          console.error('Error loading memberships:', err);
        }
      }

      setAvailableAcademies(academies);
      return academies;
    } catch (err) {
      console.error('Error in loadAllAcademies:', err);
      return [];
    }
  }, []);

  const handleAcademyUpdated = useCallback(async (academyId) => {
    try {
      const snap = await getDoc(doc(db, "academies", academyId));
      if (snap.exists()) {
        const updated = { id: snap.id, ...snap.data() };
        setAcademy(updated);
        setAvailableAcademies(prev => {
          if (!prev || prev.length === 0) return prev;
          const next = prev.map(a => a.id === academyId ? { ...a, ...updated } : a);
          return next;
        });
      }
    } catch (err) {
      console.error('Error refreshing academy after update:', err);
    }
  }, [db]);

  // Función para cambiar de academia
  const switchAcademy = useCallback(async (academyId) => {
    if (!user) return;

    // Validate academyId format
    if (!isValidAcademyId(academyId)) {
      console.error('Invalid academy ID format');
      return;
    }

    // Verify user has access to this academy
    const hasAccess = availableAcademies.some(a => a.id === academyId);
    if (!hasAccess) {
      console.error('User does not have access to this academy');
      return;
    }

    // Mostrar loading visual
    setLoadingAcademies(true);

    // Guardar en localStorage
    try {
      localStorage.setItem(`lastAcademy_${user.uid}`, academyId);
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }

    // Pequeño delay para feedback visual
    await new Promise(resolve => setTimeout(resolve, 300));

    // Cargar la academia seleccionada
    await loadAcademyById(academyId);

    setLoadingAcademies(false);
  }, [user, loadAcademyById, availableAcademies]);

  const ensureOwnerMembership = useCallback(async (academyId, currentUser) => {
    const memberRef = doc(db, `academies/${academyId}/members`, currentUser.uid);
    const membershipRef = doc(db, `users/${currentUser.uid}/memberships`, academyId);
    const [memberSnap, userMembershipSnap] = await Promise.all([getDoc(memberRef), getDoc(membershipRef)]);
    if (!memberSnap.exists()) {
      setMembership({ role: 'owner', status: 'active' }); // Actualiza el estado del rol
      await setDoc(memberRef, {
        userId: currentUser.uid,
        email: currentUser.email,
        role: 'owner',
        status: 'active',
        joinedAt: serverTimestamp(),
      });
    } else {
      setMembership(memberSnap.data());
    }
    if (!userMembershipSnap.exists()) {
      await setDoc(membershipRef, {
        academyId,
        role: 'owner',
        status: 'active',
        ownerId: academyId,
        joinedAt: serverTimestamp(),
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.debugInvites = async (emailOverride) => {
        const targetEmail = (emailOverride || auth.currentUser?.email || '').toLowerCase();
        const q = query(collectionGroup(db, "invites"), where("email", "==", targetEmail));
        try {
          const snap = await getDocs(q);
          const invites = snap.docs.map(d => ({
            id: d.id,
            academyId: d.ref.parent.parent.id,
            ...d.data(),
          }));
          console.log('[debugInvites] email:', targetEmail, 'invites:', invites);
          setPendingInvites(invites.filter(inv => inv.status === 'pending'));
          return invites;
        } catch (err) {
          console.error('[debugInvites] error', err);
          throw err;
        }
      };
    }
  }, []);

  // Refetch invites proactively (including for users who already have an academy)
  useEffect(() => {
    const fetchInvitesOnly = async () => {
      if (!user) return;
      try {
        const targetEmail = (user.email || '').toLowerCase();
        const q = query(collectionGroup(db, "invites"), where("email", "==", targetEmail));
        const snap = await getDocs(q);
        const invites = snap.docs
          .map(d => ({
            id: d.id,
            academyId: d.ref.parent.parent.id,
            ...d.data(),
          }))
          .filter(inv => inv.status === 'pending');
        setPendingInvites(invites);
      } catch (err) {
        console.error("[fetchInvitesOnly] error", err);
      }
    };
    fetchInvitesOnly();
  }, [user, db]);

  useEffect(() => {
    // Esta función unificada maneja todos los casos de autenticación.
    const handleAuthFlow = async (nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        setAcademy(null);
        setAvailableAcademies([]);
        setMembership(null);
        setLoading(false);
        setLoadingAcademies(false);
        setPendingInvites([]);
        return;
      }

      try {
        setLoadingAcademies(true); // Activar loading de academias
        // 1) Cargar TODAS las academias disponibles
        const allAcademies = await loadAllAcademies(nextUser.uid);

        // 2) Verificar si hay invitaciones aceptadas y crear memberships si es necesario
        try {
          const invitesQuery = query(
            collectionGroup(db, "invites"),
            where("email", "==", (nextUser.email || "").toLowerCase())
          );
          const invitesSnap = await getDocs(invitesQuery);
          const invites = invitesSnap.docs.map(d => ({
            id: d.id,
            academyId: d.ref.parent.parent.id,
            ...d.data(),
          }));

          const acceptedInvite = invites.find(inv => inv.status === 'accepted');
          if (acceptedInvite) {
            // Asegura membership y carga la academia
            try {
              const memberRef = doc(db, `academies/${acceptedInvite.academyId}/members`, nextUser.uid);
              const membershipRef = doc(db, `users/${nextUser.uid}/memberships`, acceptedInvite.academyId);
              const [memberSnap, userMembershipSnap] = await Promise.all([getDoc(memberRef), getDoc(membershipRef)]);
              if (!memberSnap.exists()) {
                await setDoc(memberRef, {
                  userId: nextUser.uid,
                  email: nextUser.email,
                  role: acceptedInvite.role || 'admin',
                  status: 'active',
                  joinedAt: serverTimestamp(),
                  invitedBy: acceptedInvite.invitedBy || null,
                });
              }
              if (!userMembershipSnap.exists()) {
                await setDoc(membershipRef, {
                  academyId: acceptedInvite.academyId,
                  role: acceptedInvite.role || 'admin',
                  status: 'active',
                  ownerId: acceptedInvite.academyId,
                  joinedAt: serverTimestamp(),
                });
              }
              // Recargar academias para incluir la nueva
              await loadAllAcademies(nextUser.uid);
            } catch (accErr) {
              console.error("Error auto-joining from accepted invite:", accErr);
            }
          }

          setPendingInvites(invites.filter(inv => inv.status === 'pending'));
        } catch (invErr) {
          if (invErr?.code !== 'permission-denied') {
            throw invErr;
          }
          setPendingInvites([]);
        }

        // 3) Determinar qué academia cargar
        if (allAcademies.length > 0) {
          // Intentar cargar la última academia usada desde localStorage (con validación)
          const lastAcademyId = getValidatedLocalStorage(
            `lastAcademy_${nextUser.uid}`,
            (id) => isValidAcademyId(id) && allAcademies.some(a => a.id === id)
          );
          let academyToLoad = allAcademies.find(a => a.id === lastAcademyId);

          // Si no hay última academia o no existe, cargar la primera disponible
          if (!academyToLoad) {
            academyToLoad = allAcademies[0];
          }

          // Asegurar membership si es owner
          if (academyToLoad.userRole === 'owner') {
            await ensureOwnerMembership(academyToLoad.id, nextUser);
          }

          await loadAcademyById(academyToLoad.id);
        }

      } catch (e) {
        console.error("Firestore error", e);
        setError("Failed to fetch academy data");
      } finally {
        setLoadingAcademies(false); // Desactivar loading de academias
      }

      setLoading(false);
    };

    let unsubscribe;

    const initAuth = async () => {
      try {
        await authReady;
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          await handleAuthFlow(redirectResult.user);
        }
      } catch (err) {
        console.error("Redirect Error:", err);
      }

      // Luego, onAuthStateChanged se convierte en la única fuente de verdad.
      // Se ejecutará con el usuario de la redirección o el de una sesión existente.
      unsubscribe = onAuthStateChanged(auth, handleAuthFlow);
    };

    initAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [loadAcademyById, loadAllAcademies, ensureOwnerMembership]);
         // La lógica de carga de la academia se maneja dentro del listener.

  useEffect(() => {
    // Si estamos en la pantalla de creación de academia, enfoca el input.
    if (user && !academy && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [user, academy]); // Se ejecuta cuando user o academy cambian.

  const createAcademy = async e => {
    e.preventDefault();
    if (!user || creatingAcademy) return;
    setCreatingAcademy(true); // Disable the button and show "Creating..."
    setError(null); // Clear any previous errors
    try {
      const ref = doc(db, "academies", user.uid);
      const data = { name: nameInput, ownerId: user.uid, createdAt: serverTimestamp(), studentLabelSingular: 'Student', studentLabelPlural: 'Students' };
      await setDoc(ref, data); // Escribe la academia en Firestore
      await ensureOwnerMembership(ref.id, user);

      // Optimistically update academy state
      setAcademy({ id: ref.id, ...data });
      setError(null);
      setNameInput("");

    } catch (err) {
      setError("Error al crear la academia: " + err.message);
    } finally {
      setCreatingAcademy(false);
    }
  };

  const handleAcceptInvite = async (inviteId) => {
    if (!user) return;
    const invite = pendingInvites.find(i => i.id === inviteId);
    if (!invite) return;
    setIsAcceptingInvite(true);
    setError(null);
    try {
      const inviteRef = doc(db, `academies/${invite.academyId}/invites`, invite.id);
      const memberRef = doc(db, `academies/${invite.academyId}/members`, user.uid);
      const membershipRef = doc(db, `users/${user.uid}/memberships`, invite.academyId);

      await Promise.all([
        updateDoc(inviteRef, { status: 'accepted', acceptedAt: serverTimestamp(), acceptedBy: user.uid }),
        setDoc(memberRef, {
          userId: user.uid,
          email: user.email,
          role: invite.role || 'admin',
          status: 'active',
          joinedAt: serverTimestamp(),
          invitedBy: invite.invitedBy || null,
        }),
        setDoc(membershipRef, {
          academyId: invite.academyId,
          role: invite.role || 'admin',
          status: 'active',
          ownerId: invite.academyId,
          joinedAt: serverTimestamp(),
        }),
      ]);

      // Reload all academies to include the new one
      await loadAllAcademies(user.uid);
      await loadAcademyById(invite.academyId);
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (err) {
      console.error("Error accepting invite:", err);
      setError("Error al aceptar la invitación: " + err.message);
    } finally {
      setIsAcceptingInvite(false);
    }
  };

  const handleDeclineInvite = async (inviteId) => {
    if (!user) return;
    const invite = pendingInvites.find(i => i.id === inviteId);
    if (!invite) return;
    try {
      const inviteRef = doc(db, `academies/${invite.academyId}/invites`, invite.id);
      await updateDoc(inviteRef, { status: 'declined', declinedAt: serverTimestamp(), declinedBy: user.uid });
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (err) {
      console.error("Error declining invite:", err);
      setError("No se pudo rechazar la invitación: " + err.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth); // The onAuthStateChanged listener will handle navigation
      setMembership(null);
      // After signing out, the onAuthStateChanged listener will update the user state
    } catch (error) {
      setError("Failed to sign out: " + error.message);
    }
  };

  // Conditional rendering based on app state
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
          <p className="text-lg font-medium text-gray-800">Loading...</p>
        </div>
      </div>
    );
  }
  // If no user, show the login component
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in" element={<GoogleSignIn />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Show loading while checking for academies (skip for first-time users to show onboarding immediately)
  if (user && loadingAcademies) {
    // Only show simple spinner if we're switching academies or refreshing with existing data
    // For first-time users (no academy, no availableAcademies), skip to show the create academy form
    const hasExistingData = academy || availableAcademies.length > 0;
    if (hasExistingData) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-white">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
            <p className="text-lg font-medium text-gray-800">Loading...</p>
          </div>
        </div>
      );
    }
    // For first-time users, fall through to create academy screen
  }

  if (user && !academy) {
    // Show creating academy loading screen
    if (creatingAcademy) {
      return (
        <div className="flex h-screen w-screen font-sans">
          {/* Left Side - Creating */}
          <div className="w-1/2 bg-section flex flex-col justify-center items-center p-12 relative">
            <div className="absolute top-8 left-8 right-8 flex justify-between items-center h-[58px]">
              <img src={logoKivee} alt="Kivee Logo" className="h-5 w-auto" />
            </div>
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
              <p className="text-lg font-medium text-gray-800">Creating...</p>
            </div>
          </div>
          {/* Right Side - Illustration */}
          <div className="w-1/2 flex justify-center items-center p-12" style={{ background: 'var(--sidebar-bg)' }}>
            <div className="w-full max-w-xl">
              <img src={loginIllustration} alt="Kivee Illustration" className="w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen w-screen font-sans">
        {/* Left Side */}
        <div className="w-1/2 bg-section flex flex-col justify-center items-center p-12 relative">
          <div className="absolute top-8 left-8 right-8 flex justify-between items-center h-[58px]">
            <img src={logoKivee} alt="Kivee Logo" className="h-5 w-auto"  />
            <UserMenu user={user} onSignOut={handleSignOut} isSidebar={true} dropdownUp={false} />
          </div>
          <div className="w-full max-w-[376px]">
            <div className="space-y-1">
              <h1 className="auth-heading-primary">Hi, {user.displayName}</h1>
              <h2 className="auth-heading-secondary">
                {pendingInvites.length > 0
                  ? "You've been invited to join an existing Academy"
                  : "Let's create your Academy"}
              </h2>
            </div>
            {pendingInvites.length > 0 && (
              <>
                <div className="mt-12 space-y-3">
                  {pendingInvites.map(invite => (
                    <div key={invite.id} className="border border-gray-200 rounded-lg p-4 bg-section">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-semibold text-lg">
                            {invite.academyName?.charAt(0)?.toUpperCase() || 'A'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{invite.academyName || invite.academyId}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeclineInvite(invite.id)}
                          className="flex-1 text-gray-600 hover:text-gray-800 h-12 px-4 rounded-md border border-gray-200 font-medium"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAcceptInvite(invite.id)}
                          disabled={isAcceptingInvite}
                          className="flex-1 bg-primary hover:bg-primary-hover text-white h-12 px-4 rounded-md disabled:opacity-50 font-medium"
                        >
                          {isAcceptingInvite ? 'Joining...' : 'Accept'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* OR Divider */}
                <div className="mt-4 flex items-center">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <span className="px-4 text-sm font-medium text-gray-500">OR</span>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>

                {/* Create New Academy Button */}
                <button
                  type="button"
                  onClick={() => setPendingInvites([])}
                  className="w-full h-12 px-4 rounded-md border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 mt-4"
                >
                  Create new Academy
                </button>
              </>
            )}
            <form onSubmit={createAcademy} className={pendingInvites.length > 0 ? "hidden" : "mt-12"}>
              <input
                ref={nameInputRef}
                type="text"
                placeholder="Give it a name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required={true}
                minLength={3}
                maxLength={50}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-base"
              />
              <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-medium h-12 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary mt-4 text-base" disabled={creatingAcademy || !nameInput.trim()}>
                {creatingAcademy ? "Creating..." : "Continue"}
              </button>
              {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
            </form>
          </div>
        </div>
        {/* Right Side */}
        <div className="w-1/2 flex justify-center items-center p-12" style={{ background: 'var(--sidebar-bg)' }}>
          <div className="w-full max-w-xl">
            <img src={loginIllustration} alt="Kivee Illustration" className="w-full h-auto object-contain" />
          </div>
        </div>
      </div>
    );
  }

  // Safety check: if we got here but academy is still null, show loading
  if (!academy) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
          <p className="text-lg font-medium text-gray-800">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-app font-sans relative overflow-x-hidden">
      <AcademyProvider user={user} db={db}>
        {/* Desktop Sidebar */}
        <div className="text-gray-800 w-64 border-r border-gray-border hidden md:flex md:flex-col md:h-full">
          <Sidebar
            academy={academy}
            availableAcademies={availableAcademies}
            onSwitchAcademy={switchAcademy}
            studentLabelPlural={studentLabelPlural}
            pendingInvites={pendingInvites}
            onNavigate={() => setIsMobileMenuOpen(false)}
            onOpenInviteModal={() => setShowInviteModal(true)}
            userMenu={<UserMenu user={user} onSignOut={handleSignOut} isSidebar={true} />}
          />
        </div>

      {/* Mobile full-screen menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-section p-6 overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center">
                {academy.logoUrl ? (
                  <img src={academy.logoUrl} alt="Academy logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-600 font-semibold uppercase text-sm">{academy.name?.charAt(0) || '?'}</span>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Academy</p>
                <p className="text-lg font-semibold">{academy.name}</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <Sidebar
            academy={academy}
            availableAcademies={availableAcademies}
            onSwitchAcademy={(id) => { switchAcademy(id); setIsMobileMenuOpen(false); }}
            studentLabelPlural={studentLabelPlural}
            pendingInvites={pendingInvites}
            onNavigate={() => setIsMobileMenuOpen(false)}
            onOpenInviteModal={() => setShowInviteModal(true)}
            showHeader={false}
            className="flex-1"
            userMenu={<UserMenu user={user} onSignOut={handleSignOut} isSidebar={true} />}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-grow flex flex-col min-w-0">
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-section border-b border-gray-border">
          <div className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-full border border-gray-200 overflow-hidden flex items-center justify-center">
              {academy.logoUrl ? (
                <img src={academy.logoUrl} alt="Academy logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-600 font-semibold uppercase text-sm">{academy.name?.charAt(0) || '?'}</span>
              )}
            </div>
            {availableAcademies.length <= 1 ? (
              <span className="text-base font-semibold">{academy.name}</span>
            ) : (
              <AcademySelector
                availableAcademies={availableAcademies}
                currentAcademy={academy}
                onSwitch={switchAcademy}
              />
            )}
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        <div className="flex-grow p-0 md:p-8 overflow-auto min-w-0"> {/* Added overflow-auto for scrollable content */}
          <Routes>
            <Route path="/sign-in" element={<Navigate to="/" replace />} />
            <Route path="/students/new" element={<NewPlayerPage user={user} academy={academy} db={db} membership={membership} />} />
            <Route path="/students" element={<PlayersSection user={user} db={db} />} />
            <Route path="/students/:playerId" element={<PlayerDetailPage user={user} academy={academy} db={db} membership={membership} />} />
            <Route path="/students/:playerId/edit" element={<EditPlayerPage user={user} academy={academy} db={db} membership={membership} />} />
            <Route path="/plans" element={<PlansOffersSection user={user} db={db} />} />
            <Route path="/finances" element={<FinancesSection user={user} db={db} />} />
            <Route path="/groups" element={<GroupsAndClassesSection user={user} db={db} />} />
            <Route path="/groups/:groupId" element={<GroupDetailPage user={user} db={db} />} />
            <Route path="/settings" element={<AdminSection
              user={user}
              db={db}
              pendingInvites={pendingInvites}
              onAcceptInvite={handleAcceptInvite}
              onDeclineInvite={handleDeclineInvite}
              isAcceptingInvite={isAcceptingInvite}
              onOpenInviteModal={() => setShowInviteModal(true)}
              onRegisterRefreshTeamData={setRefreshTeamData}
              onAcademyUpdate={async () => {
                if (academy?.id) {
                  await handleAcademyUpdated(academy.id);
                  // refrescar lista de academias disponibles para dropdown
                  await loadAllAcademies(user.uid);
                }
              }}
            />} />
            <Route path="/" element={<Dashboard
              user={user}
              db={db}
              pendingInvites={pendingInvites}
              onAcceptInvite={handleAcceptInvite}
              onDeclineInvite={handleDeclineInvite}
              isAcceptingInvite={isAcceptingInvite}
            />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>

      {/* Invite Teammate Modal */}
      <InviteTeammateModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        user={user}
        academy={academy}
        db={db}
        membership={membership}
        onInviteSent={() => {
          if (refreshTeamData) {
            refreshTeamData();
          }
        }}
      />
      </AcademyProvider>
    </div>
  );
}
