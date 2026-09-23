import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCandidateAuth } from "../../context/CandidateAuthContext";
import { Briefcase, KeyRound } from "lucide-react";
import toast from "react-hot-toast";

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
    <main className="flex min-h-screen bg-white">
      {/* Left side - Branding */}
      <div className="hidden w-1/2 flex-col justify-center p-12 text-white lg:flex relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/95 via-brand-900/80 to-brand-900/50" />
        <div className="relative z-10 mx-auto max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 border border-white/15 mb-6 backdrop-blur-sm">
            <Briefcase size={14} className="text-brand-300" />
            <span>Candidate Career Portal</span>
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight">Velvix Talent Portal</h1>
          <p className="text-lg leading-relaxed text-brand-100">
            Access your talent profile, track applications, review interview schedules, and communicate directly with your dedicated recruiters.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2 bg-slate-50/50">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
                <Briefcase size={18} />
              </div>
              <span className="text-xl font-bold text-slate-900">Velvix Portal</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Candidate Sign In</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Sign in to manage your talent profile and applications.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100" role="alert">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="candidate-email" className="label">
                Email address *
              </label>
              <input
                id="candidate-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="candidate-password" className="label">
                Password *
              </label>
              <input
                id="candidate-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-base"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              First time here with a temporary password?{" "}
              <Link
                to="/candidate/first-login"
                className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-4"
              >
                Activate your account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

