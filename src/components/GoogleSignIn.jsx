import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";

export default function GoogleSignIn() {
  const onClick = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Si todo va bien, onAuthStateChanged en App.jsx detectará el usuario
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 bg-white rounded-lg shadow-md text-center">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Bienvenido a Kivee</h1>
      <button onClick={onClick} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
        Entrar con Google
      </button>
    </div>
  );
}