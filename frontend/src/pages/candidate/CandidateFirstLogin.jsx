import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { candidateAuthAPI } from "../../services/api";
import { useCandidateAuth } from "../../context/CandidateAuthContext";
import { KeyRound, ShieldCheck, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function CandidateFirstLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setResetSession } = useCandidateAuth();

  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const urlEmail = searchParams.get("email");
    const urlToken = searchParams.get("token");
    if (urlEmail) setEmail(urlEmail);
    if (urlToken) setToken(urlToken);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsExpired(false);
    setLoading(true);

    try {
      const res = await candidateAuthAPI.firstLogin({
        email: email.trim(),
        tempPassword: tempPassword.trim(),
        token: token || undefined,
      });

      if (res.data.success) {
        toast.success("Temporary credentials verified! Please set your new password.");
        setResetSession(res.data.resetToken, res.data.candidate);
        navigate("/candidate/set-password");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid temporary credentials or link.";
      const code = err.response?.data?.code;
      setErrorMessage(msg);
      if (code === "INVITE_EXPIRED") {
        setIsExpired(true);
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-white">
      {/* Left side - Branding */}
      <div className="hidden w-1/2 flex-col justify-center p-12 text-white lg:flex relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/95 via-brand-900/80 to-brand-900/50" />
        <div className="relative z-10 mx-auto max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 border border-white/15 mb-6 backdrop-blur-sm">
            <KeyRound size={14} className="text-brand-300" />
            <span>Portal Activation</span>
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight">Activate Your Talent Portal</h1>
          <p className="text-lg leading-relaxed text-brand-100">
            Welcome to Velvix. Verify your account with the temporary credentials sent to your email to configure your permanent password.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2 bg-slate-50/50">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
                <KeyRound size={18} />
              </div>
              <span className="text-xl font-bold text-slate-900">Velvix Portal</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Account Activation</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Enter the temporary password sent to your email.
            </p>
          </div>

          {errorMessage && (
            <div
              className={`mb-6 rounded-lg p-4 text-sm border ${
                isExpired
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-red-50 text-red-600 border-red-100"
              }`}
              role="alert"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{isExpired ? "Invite Expired" : "Verification Failed"}</p>
                  <p className="mt-1 text-xs opacity-90">{errorMessage}</p>
                  {isExpired && (
                    <p className="mt-2 text-xs font-medium text-amber-900">
                      💡 Please reach out to your recruiter to resend a fresh 72-hour invite link.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="first-login-email" className="label">
                Candidate Email *
              </label>
              <input
                id="first-login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="first-login-temp-pass" className="label">
                Temporary Password *
              </label>
              <input
                id="first-login-temp-pass"
                type="password"
                required
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="Enter temporary password from email"
                className="input-field"
              />
            </div>

            {token && (
              <div className="rounded-lg border border-brand-200 bg-brand-50/70 p-3 text-xs text-brand-800 flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand-600 flex-shrink-0" />
                <span>Security token verified from invitation link</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-base"
            >
              {loading ? "Verifying..." : "Verify & Set Password"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already activated your permanent password?{" "}
              <Link
                to="/candidate/login"
                className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-4"
              >
                Sign in normally
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

