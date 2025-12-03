import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, browserPopupRedirectResolver } from "firebase/auth";
import { auth, authReady } from "../firebase";
import toast from 'react-hot-toast';
import loginIllustration from '../assets/login-ilustration.svg';
import logoKivee from '../assets/logo-kivee.svg';
import { Link, useNavigate } from "react-router-dom";

export default function GoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Detectar si es un dispositivo móvil para preferir la redirección
  const isMobile =
    typeof window !== "undefined" &&
    (navigator.userAgentData?.mobile ||
      navigator.maxTouchPoints > 1 ||
      window.matchMedia?.("(pointer:coarse)")?.matches ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

  // Este useEffect se encarga de manejar el resultado de un signInWithRedirect
  useEffect(() => {
    const checkRedirectResult = async () => {
      // No queremos mostrar 'loading' en la página de login si solo estamos
      // verificando un posible resultado de redirección en segundo plano.
      // Solo activamos 'loading' si realmente hay una operación en curso.
      try {
        await authReady;
        const result = await getRedirectResult(auth);
        if (result?.user) {
          toast.dismiss("google-login");
          toast.success("Sesión iniciada");
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.error("Redirect sign-in error", err);
        toast.dismiss("google-login");
        toast.error(err?.message || "No se pudo completar el inicio de sesión");
      }
    };

    checkRedirectResult();
  }, [navigate]);

  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await authReady;
      const provider = new GoogleAuthProvider();
      provider.addScope('profile'); // Solicita explícitamente el perfil del usuario
      provider.setCustomParameters({ prompt: "select_account" });

      // Usar redirección en móvil, popup en escritorio
      if (isMobile) {
        toast.loading("Redirigiendo a Google...", { id: "google-login" });
        await signInWithRedirect(auth, provider);
        // La navegación la manejará el useEffect al volver a la página
        return;
      }

      // Flujo de Popup para escritorio
      await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      navigate("/", { replace: true }); // Navega inmediatamente después del popup exitoso
      setLoading(false);
    } catch (err) {
      console.error("Sign in failed:", err);
      // Si el popup es bloqueado, intenta con redirección como fallback
      if (err?.code === "auth/popup-blocked" || err?.code === "auth/popup-closed-by-user") {
        toast.loading("Popup bloqueado. Redirigiendo...", { id: "google-login" });
        await signInWithRedirect(auth, new GoogleAuthProvider());
        return;
      }
      toast.error(err.message || "No se pudo iniciar sesión.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full font-sans bg-white">
      <div className="flex flex-col lg:flex-row w-full">
        {/* Left / Form */}
        <div className="w-full lg:w-1/2 flex flex-col px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
          <div className="flex items-center justify-between mb-10">
            <Link to="/" className="flex items-center gap-2">
              <img src={logoKivee} alt="Kivee Logo" className="h-6 w-auto" />
            </Link>
          </div>
          <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full gap-8">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-semibold text-black">Welcome to Kivee</h1>
              <h2 className="text-lg sm:text-xl font-medium text-gray-dark">Your academy management tool</h2>
            </div>
            <button
              onClick={onClick}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-md flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary text-base"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.356-11.303-8H4.388v6.35C7.723,40.223,15.251,44,24,44z"></path>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.021,35.596,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
              </svg>
              {loading ? "Redirecting..." : "Sign in with Google"}
            </button>
            <p className="text-sm sm:text-base text-gray-dark leading-relaxed">
              By signing up, you agree to the <a href="#" className="underline">Terms of use</a>, <a href="#" className="underline">Privacy Notice</a> and <a href="#" className="underline">Cookie Notice</a>
            </p>
          </div>
        </div>

        {/* Right / Illustration */}
        <div className="w-full lg:w-1/2 bg-gray-light flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14 lg:py-12">
          <div className="w-full max-w-xl">
            <img src={loginIllustration} alt="Kivee Illustration" className="w-full h-auto object-contain" />
          </div>
        </div>
      </div>
    </div>
  );
}
