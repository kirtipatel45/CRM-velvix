import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { isValidEmail, EMAIL_ERROR_MSG } from '../utils/validation';
import BenchTrixLogo from '../components/BenchTrixLogo';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!isValidEmail(email)) {
      setError(EMAIL_ERROR_MSG);
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword({ email });
      setMessage(res.data.message || 'OTP sent to your email.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, otp, newPassword });
      setMessage('Password reset successfully. Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
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
            <BenchTrixLogo variant="default" size="text-5xl" subtitle="Staffing & CRM Platform" />
          </div>

          <div className="mt-auto mb-16 lg:mb-32 max-w-xl">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-800 leading-[1.1] mb-6">
              Empower your teams to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">close more deals.</span>
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed font-medium">
              A comprehensive, professional solution integrating Lead Generation, Sales Pipelines, and Marketing automation.
            </p>
          </div>
        </div>

        {/* Right side - Light Glassmorphism Form Card */}
        <div className="w-full lg:w-[460px] flex items-center justify-center p-6 sm:p-10 shrink-0">
          <div className="w-full max-w-[420px] bg-white/70 backdrop-blur-2xl border border-white/80 rounded-2xl p-8 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] relative overflow-hidden">
            {/* Top glare edge */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white to-transparent"></div>

            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-slate-900 mb-1.5">
                {step === 1 ? 'Forgot Password' : 'Reset Password'}
              </h2>
              <p className="text-slate-500 font-medium text-sm">
                {step === 1
                  ? 'Enter your email to receive a one-time password.'
                  : 'Enter the OTP and set your new password.'}
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl bg-red-50 p-3.5 border border-red-200 flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}
            {message && (
              <div className="mb-5 rounded-xl bg-green-50 p-3.5 border border-green-200 flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <svg className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-green-700 font-medium">{message}</p>
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleRequestOtp} className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Email</label>
                    <input
                      id="email"
                      type="email"
                      className="block w-full rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 hover:border-brand-300 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-4 flex w-full items-center justify-center rounded-lg bg-brand-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/25 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Sending OTP...</span>
                    </div>
                  ) : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="otp" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">OTP</label>
                    <input
                      id="otp"
                      type="text"
                      className="block w-full rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 hover:border-brand-300 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      placeholder="Enter 6-digit OTP"
                    />
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">New Password</label>
                    <input
                      id="newPassword"
                      type="password"
                      className="block w-full rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 hover:border-brand-300 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-4 flex w-full items-center justify-center rounded-lg bg-brand-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/25 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Resetting Password...</span>
                    </div>
                  ) : 'Reset Password'}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link to="/login" className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition">
                ← Back to Login
              </Link>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
