import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth"; // Import signOut
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import GoogleSignIn from "./components/GoogleSignIn.jsx";
import PlayerDetailPage from "./components/PlayerDetailPage.jsx";
import EditPlayerPage from "./components/EditPlayerPage.jsx";
import PlayersSection from "./components/PlayersSection.jsx";
import NewPlayerPage from "./components/NewPlayerPage.jsx"; // Import the new page
import AdminSection from "./components/AdminSection.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [academy, setAcademy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingAcademy, setCreatingAcademy] = useState(false);
  const [error, setError] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [activeSection, setActiveSection] = useState("players");
  const [selectedPlayer, setSelectedPlayer] = useState(null);

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

  // Conditional rendering based on app state
  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-100 text-gray-800"><p className="text-lg font-medium">Cargando...</p></div>;
  }
  // If no user, show the login component
  if (!user) {
    return <GoogleSignIn />;
  }

  if (user && !academy) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Crea tu academia</h2>
        <form onSubmit={createAcademy} className="space-y-4">
          <input
            type="text"
            placeholder="Nombre de la academia"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            required={true}
            minLength={3}
            maxLength={50}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed" disabled={creatingAcademy}>
            {creatingAcademy ? "Creando academia..." : "Crear academia"}
          </button>
          {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>} {/* Display error message */}
        </form>
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // After signing out, the onAuthStateChanged listener will update the user state
    } catch (error) {
      setError("Failed to sign out: " + error.message);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case "players":
        return <PlayersSection user={user} academy={academy} db={db} setActiveSection={setActiveSection} setSelectedPlayer={setSelectedPlayer} />;
      case "newPlayer":
        return <NewPlayerPage user={user} academy={academy} db={db} setActiveSection={setActiveSection} />;
      case "playerDetail":
        return <PlayerDetailPage player={selectedPlayer} setActiveSection={setActiveSection} setSelectedPlayer={setSelectedPlayer} />;
      case "editPlayer":
        return <EditPlayerPage user={user} academy={academy} db={db} playerToEdit={selectedPlayer} setActiveSection={setActiveSection} />;
      case "admin": {
        // Pasamos una función para refrescar los datos de la academia cuando se actualice
        const refreshAcademy = async () => setAcademy((await getDoc(doc(db, "academies", user.uid))).data());
        return <AdminSection user={user} academy={academy} db={db} onAcademyUpdate={refreshAcademy} />;
      }
      default:
        return <h1 className="text-3xl font-bold text-gray-800 mb-4">Bienvenido a {academy.name}</h1>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className="bg-gray-800 text-white w-64 p-4 flex flex-col"
      >
        <h2 className="text-2xl font-semibold mb-4">{academy.name}</h2>
        <nav className="flex-grow">
          <ul className="space-y-2">
            <li>
              <button onClick={() => setActiveSection("players")} className={`block w-full text-left py-2 px-4 rounded ${activeSection === "players" ? "bg-gray-700" : "hover:bg-gray-700"}`}>Jugadores</button>
            </li>
            <li>
              <button onClick={() => setActiveSection("admin")} className={`block w-full text-left py-2 px-4 rounded ${activeSection === "admin" ? "bg-gray-700" : "hover:bg-gray-700"}`}>Admin</button>
            </li>
          </ul>
        </nav>
        <div className="mt-auto pt-4 border-t border-gray-700">
          <div className="flex items-center space-x-3 mb-2">
            {user.photoURL && <img src={user.photoURL} alt="User Avatar" className="w-8 h-8 rounded-full" />}
            <p className="text-sm font-medium">{user.displayName || user.email}</p>
          </div>
          <button onClick={handleSignOut} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md">
            Cerrar Sesión
          </button>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-grow p-8 overflow-auto"> {/* Added overflow-auto for scrollable content */}
        {renderSection()}
      </div>
    </div>
  );
}