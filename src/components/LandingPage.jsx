import { Link } from "react-router-dom";
import logoKivee from "../assets/logo-kivee.svg";
import loginIllustration from "../assets/login-ilustration.svg";
import { CheckCircle } from "lucide-react";

const highlights = [
  { title: "Organized groups, Payment", description: "Keep classes, groups, and billing tidy and aligned." },
  { title: "Clear payment information", description: "See every student’s status without digging through spreadsheets." },
  { title: "Easy to use", description: "Simple flows so your team can jump in and work right away." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-section text-black flex flex-col">
      <header className="fixed inset-x-0 top-0 z-30 bg-section/80 backdrop-blur border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoKivee} alt="Kivee" className="h-6 w-auto" />
          </div>
          <div className="flex items-center gap-3">
            <Link to="/sign-in" className="text-sm font-medium text-gray-700 hover:text-black">Sign in</Link>
            <Link to="/sign-in" className="btn-primary text-sm px-4 py-2 transition-colors">Get started</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16 lg:pt-16">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-light via-white to-sky-50" aria-hidden="true" />
          <div className="absolute -left-24 -top-32 h-72 w-72 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />
          <div className="absolute -right-10 top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />

          <div className="relative mx-auto max-w-6xl px-6 py-16 lg:py-16 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full bg-[#564FA8] text-white px-3 py-1 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-section" aria-hidden="true" />
                Built for academies that are growing
              </p>
              <h1 className="text-4xl lg:text-5xl font-semibold leading-tight">
                Run your academy with clarity and without endless spreadsheets.
              </h1>
              <p className="text-base text-gray-700 max-w-xl">
                Kivee brings students, groups, plans, and finances into a simple dashboard. Less operational friction, more time to coach and grow your community.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/sign-in" className="btn-primary px-7 py-3.5 font-semibold shadow-sm transition-colors">
                  Get started now, it's free
                </Link>
              </div>
              
            </div>

            <div className="relative flex justify-center">
              <img src={loginIllustration} alt="Kivee preview" className="w-full h-auto max-w-xl" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="grid md:grid-cols-3 gap-6">
            {highlights.map((item) => (
              <div key={item.title} className="p-6 border border-gray-200 rounded-2xl bg-section shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-9 w-9 rounded-full bg-[#E4F3F3] flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-[#3B989A]" strokeWidth={2.5} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[#3B989A] mb-2">{item.title}</p>
                    <p className="text-base text-black">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-black text-white">
          <div className="mx-auto max-w-6xl px-6 py-14 flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1 space-y-3">
              <p className="text-sm font-semibold text-white/80">Checklist ready</p>
              <h2 className="text-3xl font-semibold">Set up your academy in minutes.</h2>
              <p className="text-sm text-white/80 max-w-xl">
                Invite your team, preconfigure groups and classes, set plans for your students, and keep finances on track without headaches.
              </p>
            </div>
            <div className="flex items-center">
              <Link to="/sign-in" className="inline-flex items-center justify-center px-7 py-3.5 bg-section text-black font-semibold rounded-md hover:bg-gray-100 transition-colors">
                Get started now, it's free
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between text-sm text-gray-600">
          <span>© {new Date().getFullYear()} Kivee. Built for growing academies.</span>
          <div className="flex gap-4">
            <a href="mailto:support@kivee.app" className="hover:text-black">Support</a>
            <a href="https://kivee.app/privacy" className="hover:text-black">Privacy</a>
            <Link to="/sign-in" className="hover:text-black">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
