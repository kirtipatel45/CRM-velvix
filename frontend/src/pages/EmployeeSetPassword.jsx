import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Lock, Check, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import BenchTrixLogo from '../components/BenchTrixLogo';

export default function EmployeeSetPassword() {
  const navigate = useNavigate();
  const { completeLogin } = useAuth();

  const [resetToken, setResetToken] = useState(() => sessionStorage.getItem('employeeResetToken'));
  const [employeeUser, setEmployeeUser] = useState(() => {
    const raw = sessionStorage.getItem('employeeResetUser');
    return raw ? JSON.parse(raw) : null;
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!resetToken) {
    return <Navigate to="/login" replace />;
  }

  const hasLength = password.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const matchesConfirm = password.length > 0 && password === confirmPassword;

  const isFormValid = hasLength && matchesConfirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isFormValid) {
      setErrorMessage('Please ensure your password is at least 6 characters and both fields match.');
      return;
    }

    setLoading(true);

    try {
      const res = await authAPI.setPassword({ newPassword: password }, resetToken);

      if (res.data.success) {
        completeLogin(res.data.data);
        navigate('/', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update password. Your reset session may have expired.';
      setErrorMessage(msg);
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
            <BenchTrixLogo variant="white" size="text-5xl" subtitle="Staffing & CRM Platform" />
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 mb-6">
            <ShieldCheck size={14} className="text-blue-300" />
            <span>Employee Security Setup</span>
          </div>
          <h1 className="mb-6 text-4xl sm:text-5xl font-semibold tracking-tight text-white leading-tight">Configure Your Permanent Password</h1>
          <p className="text-lg leading-relaxed text-slate-300 font-normal">
            Welcome to the BenchTrix CRM Platform. Since this is your initial login with temporary credentials, please configure your new permanent password to secure your staff account.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2 bg-[#F7F8FA]">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="mb-8">
            <div className="lg:hidden mb-4">
              <BenchTrixLogo variant="default" size="text-2xl" subtitle="Staffing & CRM Platform" />
            </div>
            <h2 className="text-2xl font-semibold text-[#111827]">Set New Password</h2>
            <p className="mt-1.5 text-sm text-[#667085] font-normal">
              Welcome, <span className="font-semibold text-[#111827]">{employeeUser?.name || 'Staff Member'}</span> (
              <span className="text-[#475467]">{employeeUser?.email}</span>)
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
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="input-field pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="label">
                Confirm New Password *
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="input-field"
                autoComplete="new-password"
              />
            </div>

            {/* Password Requirements List */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
              <p className="font-semibold text-slate-700 mb-1">Security Checklist:</p>
              <div className={`flex items-center gap-2 ${hasLength ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                <Check size={14} className={hasLength ? 'text-emerald-600' : 'text-slate-300'} />
                <span>At least 6 characters long</span>
              </div>
              <div className={`flex items-center gap-2 ${matchesConfirm ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                <Check size={14} className={matchesConfirm ? 'text-emerald-600' : 'text-slate-300'} />
                <span>Passwords match</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="btn-primary w-full py-2.5 text-base"
            >
              {loading ? 'Saving Password...' : 'Save Password & Access Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
