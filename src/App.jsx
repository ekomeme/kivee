import { useEffect, useState, useRef } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut, getRedirectResult } from "firebase/auth"; // Import getRedirectResult
import { auth, db, authReady } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import GoogleSignIn from "./components/GoogleSignIn.jsx";
import LandingPage from "./components/LandingPage.jsx";
import PlayerDetailPage from "./components/PlayerDetailPage.jsx";
import EditPlayerPage from "./components/EditPlayerPage.jsx";
import PlayersSection from "./components/PlayersSection.jsx";
import PlansOffersSection from "./components/PlansOffersSection.jsx";
import NewPlayerPage from "./components/NewPlayerPage.jsx"; // Import the new page
import GroupsAndClassesSection from "./components/GroupsAndClassesSection.jsx";
import AdminSection from "./components/AdminSection.jsx";
import PaymentsSection from "./components/PaymentsSection.jsx";
import Dashboard from "./components/Dashboard.jsx";
import GroupDetailPage from "./components/GroupDetailPage.jsx";
import { Toaster } from "react-hot-toast";
import { LogOut, Home, Users, Layers, Tags, CreditCard, Settings, Menu, X } from "lucide-react";
import loginIllustration from "./assets/login-ilustration.svg";
import logoKivee from "./assets/logo-kivee.svg";

const UserMenu = ({ user, onSignOut, isSidebar = false }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
 
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);
 
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center space-x-3 p-2 rounded-full hover:bg-gray-100"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="User Avatar" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-sm font-bold text-gray-600">
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : '?')}
            </span>
          </div>
        )}
        <span className="font-medium truncate hidden md:block">{user.displayName || user.email}</span>
      </button>
      {showMenu && (
        <div className={`absolute ${isSidebar ? 'bottom-full left-0 mb-2' : 'top-full right-0 mt-2'} w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4`}>
          <p className="text-sm font-bold truncate">{user.displayName}</p>
          <p className="text-xs text-gray-500 truncate mb-3">{user.email}</p>
          <hr className="my-2" />
          <button onClick={onSignOut} className="w-full text-left text-red-600 hover:bg-red-50 rounded-md px-3 py-2 flex items-center">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [academy, setAcademy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingAcademy, setCreatingAcademy] = useState(false);
  const [error, setError] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Esta función unificada maneja todos los casos de autenticación.
    const handleAuthFlow = async (user) => {
      setUser(user);
      if (!user) {
        // Si no hay usuario, no hay academia y terminamos de cargar.
        setAcademy(null);
        setLoading(false);
        return;
      }

      // Si hay un usuario, buscamos su academia.
      const ref = doc(db, "academies", user.uid);
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setAcademy(snap.data());
        } else {
          setAcademy(null); // El usuario existe pero aún no ha creado una academia.
        }
      } catch (e) {
        console.error("Firestore error", e);
        setError("Failed to fetch academy data");
      }
      // Terminamos de cargar solo después de verificar la academia.
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
  }, []);
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
      const data = { name: nameInput, ownerId: user.uid, createdAt: serverTimestamp() };
      await setDoc(ref, data); // Escribe la academia en Firestore

      // Optimistically update academy state
      setAcademy(data);
      setError(null);
      setNameInput("");

    } catch (err) {
      setError("Error al crear la academia: " + err.message);
    } finally {
      setCreatingAcademy(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth); // The onAuthStateChanged listener will handle navigation
      // After signing out, the onAuthStateChanged listener will update the user state
    } catch (error) {
      setError("Failed to sign out: " + error.message);
    }
  };

  const SidebarContent = ({ onNavigate, showHeader = true, className = "" }) => (
    <div className={`flex flex-col h-full ${className}`}>
      {showHeader && (
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-12 w-12 rounded-full border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center">
            {academy.logoUrl ? (
              <img src={academy.logoUrl} alt="Academy logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-600 font-semibold uppercase">{academy.name?.charAt(0) || '?'}</span>
            )}
          </div>
          <h2 className="text-xl font-semibold">{academy.name}</h2>
        </div>
      )}
      <nav className="flex-grow">
        <ul className="space-y-2">
          <li className="relative">
            <NavLink
              to="/"
              end
              onClick={onNavigate}
              className={({ isActive }) => `flex items-center gap-2 w-full text-left py-2 px-4 rounded ${isActive ? "bg-gray-100 font-semibold" : "hover:bg-gray-100"} ${isActive ? 'border-l-[3px] border-black pl-[13px]' : 'pl-4'}`}
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li className="relative">
            <NavLink
              to="/students"
              onClick={onNavigate}
              className={({ isActive }) => `flex items-center gap-2 w-full text-left py-2 px-4 rounded ${isActive ? "bg-gray-100 font-semibold" : "hover:bg-gray-100"} ${isActive ? 'border-l-[3px] border-black pl-[13px]' : 'pl-4'}`}
            >
              <Users className="h-4 w-4" />
              <span>Students</span>
            </NavLink>
          </li>
          <li className="relative">
            <NavLink
              to="/groups"
              onClick={onNavigate}
              className={({ isActive }) => `flex items-center gap-2 w-full text-left py-2 px-4 rounded ${isActive ? "bg-gray-100 font-semibold" : "hover:bg-gray-100"} ${isActive ? 'border-l-[3px] border-black pl-[13px]' : 'pl-4'}`}
            >
              <Layers className="h-4 w-4" />
              <span>Groups & Classes</span>
            </NavLink>
          </li>
          <li className="relative">
            <NavLink
              to="/plans"
              onClick={onNavigate}
              className={({ isActive }) => `flex items-center gap-2 w-full text-left py-2 px-4 rounded ${isActive ? "bg-gray-100 font-semibold" : "hover:bg-gray-100"} ${isActive ? 'border-l-[3px] border-black pl-[13px]' : 'pl-4'}`}
            >
              <Tags className="h-4 w-4" />
              <span>Plans & Offers</span>
            </NavLink>
          </li>
          <li className="relative">
            <NavLink
              to="/payments"
              onClick={onNavigate}
              className={({ isActive }) => `flex items-center gap-2 w-full text-left py-2 px-4 rounded ${isActive ? "bg-gray-100 font-semibold" : "hover:bg-gray-100"} ${isActive ? 'border-l-[3px] border-black pl-[13px]' : 'pl-4'}`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Payments</span>
            </NavLink>
          </li>
          <li className="relative">
            <NavLink
              to="/settings"
              onClick={onNavigate}
              className={({ isActive }) => `flex items-center gap-2 w-full text-left py-2 px-4 rounded ${isActive ? "bg-gray-100 font-semibold" : "hover:bg-gray-100"} ${isActive ? 'border-l-[3px] border-black pl-[13px]' : 'pl-4'}`}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-border relative">
        <UserMenu user={user} onSignOut={handleSignOut} isSidebar={true} />
      </div>
    </div>
  );

  // Conditional rendering based on app state
  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-100 text-gray-800"><p className="text-lg font-medium">Cargando...</p></div>;
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

  if (user && !academy) {
    return (
      <div className="flex h-screen w-screen font-sans">
        {/* Left Side */}
        <div className="w-1/2 bg-white flex flex-col justify-center items-center p-12 relative">
          <div className="absolute top-8 left-8 right-8 flex justify-between items-center">
            <img src={logoKivee} alt="Kivee Logo" className="h-5 w-auto"  />
            <UserMenu user={user} onSignOut={handleSignOut} />
          </div>
          <div className="w-full max-w-[360px]">
            <div className="text-left">
              <h1 className="text-[24px] font-semibold text-black">Hi, {user.displayName}</h1>
              <h2 className="text-[24px] font-medium text-gray-dark mt-1">Let’s create your Academy</h2>
            </div>
            <form onSubmit={createAcademy} className="mt-12">
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
              <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary mt-4 text-base" disabled={creatingAcademy || !nameInput.trim()}>
                {creatingAcademy ? "Creating..." : "Continue"}
              </button>
              {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
            </form>
          </div>
        </div>
        {/* Right Side */}
        <div className="w-1/2 bg-gray-light flex justify-center items-center p-12">
          <div className="w-full max-w-md">
            <img src={loginIllustration} alt="Kivee Illustration" className="w-full h-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-light font-sans relative overflow-x-hidden">
      {/* Desktop Sidebar */}
      <div className="bg-white text-gray-800 w-64 p-4 border-r border-gray-border hidden md:flex md:flex-col md:h-full">
        <SidebarContent />
      </div>

      {/* Mobile full-screen menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-white p-6 overflow-y-auto flex flex-col">
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
          <SidebarContent
            onNavigate={() => setIsMobileMenuOpen(false)}
            showHeader={false}
            className="flex-1"
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-grow flex flex-col min-w-0">
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-border">
          <div className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-full border border-gray-200 overflow-hidden flex items-center justify-center">
              {academy.logoUrl ? (
                <img src={academy.logoUrl} alt="Academy logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-600 font-semibold uppercase text-sm">{academy.name?.charAt(0) || '?'}</span>
              )}
            </div>
            <span className="text-base font-semibold">{academy.name}</span>
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
            <Route path="/students/new" element={<NewPlayerPage user={user} academy={academy} db={db} />} />
            <Route path="/students" element={<PlayersSection user={user} academy={academy} db={db} />} />
            <Route path="/students/:playerId" element={<PlayerDetailPage user={user} academy={academy} db={db} />} />
            <Route path="/students/:playerId/edit" element={<EditPlayerPage user={user} academy={academy} db={db} />} />
            <Route path="/plans" element={<PlansOffersSection user={user} academy={academy} db={db} />} />
            <Route path="/payments" element={<PaymentsSection user={user} academy={academy} db={db} />} />
            <Route path="/groups" element={<GroupsAndClassesSection user={user} academy={academy} db={db} />} />
            <Route path="/groups/:groupId" element={<GroupDetailPage user={user} academy={academy} db={db} />} />
            <Route path="/settings" element={<AdminSection user={user} academy={academy} db={db} onAcademyUpdate={async () => setAcademy((await getDoc(doc(db, "academies", user.uid))).data())} />} />
            <Route path="/" element={<Dashboard user={user} academy={academy} db={db} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
