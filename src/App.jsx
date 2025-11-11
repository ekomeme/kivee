import { useEffect, useState, useRef, useCallback } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth"; // Import signOut
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import GoogleSignIn from "./components/GoogleSignIn.jsx";
import PlayerDetailPage from "./components/PlayerDetailPage.jsx";
import EditPlayerPage from "./components/EditPlayerPage.jsx";
import PlayersSection from "./components/PlayersSection.jsx";
import PlansOffersSection from "./components/PlansOffersSection.jsx";
import NewPlayerPage from "./components/NewPlayerPage.jsx"; // Import the new page
import AdminSection from "./components/AdminSection.jsx";
import { Toaster } from "react-hot-toast";
import { LogOut } from "lucide-react";
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
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setUser(u);
      if (!u) {
        setAcademy(null);
        setLoading(false);
        return;
      }

      const fetchAcademy = async () => {
        const ref = doc(db, "academies", u.uid);
        try {
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setAcademy(snap.data());
          } else {
            setAcademy(null);
          }
        } catch (e) {
          console.error("Firestore error", e);
          setError("Failed to fetch academy data");
        }
      }

      await fetchAcademy();
      setLoading(false);
    });
    return () => unsub();
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

  // Conditional rendering based on app state
  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-100 text-gray-800"><p className="text-lg font-medium">Cargando...</p></div>;
  }
  // If no user, show the login component
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<GoogleSignIn />} />
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
    <div className="flex h-screen bg-gray-light font-sans">
      <Toaster position="top-center" reverseOrder={false} />
      {/* Sidebar */}
      <div
        className="bg-white text-gray-800 w-64 p-4 flex flex-col border-r border-gray-border"
      >
        <h2 className="text-2xl font-semibold mb-4">{academy.name}</h2>
        <nav className="flex-grow">
          <ul className="space-y-2">
            <li className="relative">
              <NavLink to="/students" className={({ isActive }) => `block w-full text-left py-2 px-4 rounded ${isActive ? "bg-gray-100 font-semibold" : "hover:bg-gray-100"} ${isActive ? 'border-l-[3px] border-black pl-[13px]' : 'pl-4'}`}>Students</NavLink>
            </li>
            <li className="relative">
              <NavLink to="/plans" className={({ isActive }) => `block w-full text-left py-2 px-4 rounded ${isActive ? "bg-gray-100 font-semibold" : "hover:bg-gray-100"} ${isActive ? 'border-l-[3px] border-black pl-[13px]' : 'pl-4'}`}>Plans & Offers</NavLink>
            </li>
            <li className="relative">
              <NavLink to="/settings" className={({ isActive }) => `block w-full text-left py-2 px-4 rounded ${isActive ? "bg-gray-100 font-semibold" : "hover:bg-gray-100"} ${isActive ? 'border-l-[3px] border-black pl-[13px]' : 'pl-4'}`}>Account & Preferences</NavLink>
            </li>
          </ul>
        </nav>

        <div className="mt-auto pt-4 border-t border-gray-border relative">
          <UserMenu user={user} onSignOut={handleSignOut} isSidebar={true} />
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-grow p-8 overflow-auto"> {/* Added overflow-auto for scrollable content */}
        <Routes>
          <Route path="/students" element={<PlayersSection user={user} academy={academy} db={db} />} />
          <Route path="/students/new" element={<NewPlayerPage user={user} academy={academy} db={db} />} />
          <Route path="/students/:playerId" element={<PlayerDetailPage user={user} academy={academy} db={db} />} />
          <Route path="/students/:playerId/edit" element={<EditPlayerPage user={user} academy={academy} db={db} />} />
          <Route path="/plans" element={<PlansOffersSection user={user} academy={academy} db={db} />} />
          <Route path="/settings" element={<AdminSection user={user} academy={academy} db={db} onAcademyUpdate={async () => setAcademy((await getDoc(doc(db, "academies", user.uid))).data())} />} />
          <Route path="/" element={<h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome to {academy.name}</h1>} />
        </Routes>
      </div>
    </div>
  );
}