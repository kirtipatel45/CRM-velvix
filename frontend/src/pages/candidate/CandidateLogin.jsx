import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCandidateAuth } from "../../context/CandidateAuthContext";
import { Briefcase, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { isValidEmail, EMAIL_ERROR_MSG } from "../../utils/validation";
import BenchTrixLogo from "../../components/BenchTrixLogo";

export default function CandidateLogin() {
  const navigate = useNavigate();
  const { loginCandidate } = useCandidateAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!isValidEmail(email)) {
      setErrorMessage(EMAIL_ERROR_MSG);
      toast.error(EMAIL_ERROR_MSG);
      return;
    }

    setLoading(true);

    try {
      const data = await loginCandidate(email.trim(), password);
      if (data.mustResetPassword) {
        toast.success(data.message || "Please set your permanent password to continue.");
        navigate("/candidate/set-password", { replace: true });
        return;
      }
      toast.success("Welcome back!");
      navigate("/candidate/portal", { replace: true });
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || "Invalid email or password";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen relative overflow-hidden font-sans">
      {/* Full-screen Light Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/login-bg.jpg" 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      <div className="relative z-10 flex w-full max-w-5xl mx-auto flex-col lg:flex-row min-h-screen items-center justify-between lg:gap-12">
        
        {/* Left side - Marketing Copy */}
        <div className="flex-1 flex flex-col justify-center p-8 lg:py-16 lg:pr-8 h-full">
          <div className="mb-12 lg:mb-auto lg:mt-8">
            <BenchTrixLogo variant="default" size="text-5xl" subtitle="Talent Portal" />
          </div>

          <div className="mt-auto mb-16 lg:mb-32 max-w-xl">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-800 leading-[1.1] mb-6">
              Your gateway to <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">career opportunities.</span>
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed font-medium">
              Access your talent profile, track applications, review interview schedules, and communicate directly with your dedicated recruiters.
            </p>
          </div>
        </div>

        {/* Right side - Light Glassmorphism Form Card */}
        <div className="w-full lg:w-[460px] flex items-center justify-center p-6 sm:p-10 shrink-0">
          <div className="w-full max-w-[420px] bg-white/70 backdrop-blur-2xl border border-white/80 rounded-2xl p-8 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] relative overflow-hidden">
            {/* Top glare edge */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white to-transparent"></div>
            
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-slate-900 mb-1.5">Candidate Sign In</h2>
              <p className="text-slate-500 font-medium text-sm">Sign in to manage your talent profile and applications.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="rounded-xl bg-red-50 p-3.5 border border-red-200 flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Email address</label>
                  <input
                    id="email"
                    type="email"
                    className="block w-full rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 hover:border-brand-300 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Password</label>
                  <input
                    id="password"
                    type="password"
                    className="block w-full rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 hover:border-brand-300 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="mt-4 flex w-full items-center justify-center rounded-lg bg-brand-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/25 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed" 
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 font-medium">
                First time here with a temporary password?{" "}
                <Link
                  to="/candidate/first-login"
                  className="font-semibold text-brand-600 hover:text-brand-700 transition"
                >
                  Activate your account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

