import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";
import toast from 'react-hot-toast';
import loginIllustration from '../assets/login-ilustration.svg';
import logoKivee from '../assets/logo-kivee.svg';

export default function GoogleSignIn() {
  const onClick = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex h-screen w-screen font-sans">
      {/* Left Side */}
      <div className="w-1/2 bg-white flex flex-col justify-center items-center p-12 relative">
        <img src={logoKivee} alt="Kivee Logo" className="absolute top-8 left-8 h-5 w-auto" />
        <div className="w-full max-w-sm text-center">
          <h1 className="text-4xl font-bold text-black mb-8">Welcome to Kivee</h1>
          <button 
            onClick={onClick} 
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-md flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.356-11.303-8H4.388v6.35C7.723,40.223,15.251,44,24,44z"></path>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.021,35.596,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>

      {/* Right Side */}
      <div className="w-1/2 bg-gray-light flex justify-center items-center p-12">
        <div className="w-full max-w-md">
          {/* Vuelve a colocar aquí el código SVG de tu ilustración si lo tienes, 
              o usa este marcador de posición mientras tanto. */}
          <img src={loginIllustration} alt="Kivee Illustration" className="w-full h-auto" />
        </div>
      </div>
    </div>
  );
}