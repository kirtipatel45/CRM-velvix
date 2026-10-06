import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { candidateAuthAPI } from "../../services/api";
import { useCandidateAuth } from "../../context/CandidateAuthContext";
import { Lock, Check, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import BenchTrixLogo from "../../components/BenchTrixLogo";

export default function CandidateSetPassword() {
  const navigate = useNavigate();
  const { resetToken, completePasswordReset, candidate } = useCandidateAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!resetToken) {
    return <Navigate to="/candidate/first-login" replace />;
  }

  const hasLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const matchesConfirm = password.length > 0 && password === confirmPassword;

  const isFormValid = hasLength && hasLetter && hasNumber && matchesConfirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!isFormValid) {
      setErrorMessage("Please fulfill all password requirements before proceeding.");
      return;
    }

    setLoading(true);

    try {
      const res = await candidateAuthAPI.setPassword({ newPassword: password }, resetToken);

      if (res.data.success) {
        toast.success("Password configured successfully! Welcome to your portal.");
        completePasswordReset(res.data.token, res.data.candidate);
        navigate("/candidate/portal", { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to set password. Your session may have expired.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-white">
      {/* Left side - Branding */}
      <div className="hidden w-1/2 flex-col justify-center p-12 text-white lg:flex relative overflow-hidden bg-navy-950">
        <div className="relative z-10 mx-auto max-w-lg">
          <div className="mb-6">
            <BenchTrixLogo variant="white" size="text-5xl" subtitle="Candidate Portal" />
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 mb-6">
            <Lock size={14} className="text-blue-300" />
            <span>Secure Password Setup</span>
          </div>
          <h1 className="mb-6 text-4xl sm:text-5xl font-semibold tracking-tight text-white leading-tight">Set Your Permanent Password</h1>
          <p className="text-lg leading-relaxed text-slate-300 font-normal">
            Create a secure password to finalize your account activation and access your talent portal.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2 bg-[#F7F8FA]">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="mb-8">
            <div className="lg:hidden mb-4">
              <BenchTrixLogo variant="default" size="text-2xl" subtitle="Candidate Portal" />
            </div>
            <h2 className="text-2xl font-semibold text-[#111827]">Configure Password</h2>
            <p className="mt-1.5 text-sm text-[#667085] font-normal">
              Account: <span className="font-semibold text-[#111827]">{candidate?.email}</span>
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100" role="alert">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="new-password" className="label">
                New Permanent Password *
              </label>
              <input
                id="new-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="label">
                Confirm New Password *
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="input-field"
              />
            </div>

            {/* Password Requirements List */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
              <p className="font-semibold text-slate-700 mb-1">Password Requirements:</p>
              <div className={`flex items-center gap-2 ${hasLength ? "text-emerald-600 font-medium" : "text-slate-500"}`}>
                <Check size={14} className={hasLength ? "text-emerald-600" : "text-slate-300"} />
                <span>At least 8 characters long</span>
              </div>
              <div className={`flex items-center gap-2 ${hasLetter ? "text-emerald-600 font-medium" : "text-slate-500"}`}>
                <Check size={14} className={hasLetter ? "text-emerald-600" : "text-slate-300"} />
                <span>Contains at least one letter</span>
              </div>
              <div className={`flex items-center gap-2 ${hasNumber ? "text-emerald-600 font-medium" : "text-slate-500"}`}>
                <Check size={14} className={hasNumber ? "text-emerald-600" : "text-slate-300"} />
                <span>Contains at least one number</span>
              </div>
              <div className={`flex items-center gap-2 ${matchesConfirm ? "text-emerald-600 font-medium" : "text-slate-500"}`}>
                <Check size={14} className={matchesConfirm ? "text-emerald-600" : "text-slate-300"} />
                <span>Passwords match</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="btn-primary w-full py-2.5 text-base"
            >
              {loading ? "Saving Password..." : "Save Password & Enter Portal"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

