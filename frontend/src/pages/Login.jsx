import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('admin@velvix.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left side - Branding */}
      <div className="hidden w-1/2 flex-col justify-center p-12 text-white lg:flex relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-900/70 to-brand-900/40"></div>
        <div className="relative z-10 mx-auto max-w-lg">
          <h1 className="mb-6 text-5xl font-bold tracking-tight">CRM Velvix</h1>
          <p className="text-lg leading-relaxed text-brand-100">
            A comprehensive, professional solution for Lead Generation, Sales, and Marketing. 
            Empower your teams to close more deals faster.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 lg:hidden mb-2">CRM Velvix</h2>
            <h3 className="text-2xl font-semibold text-slate-800">Welcome back</h3>
            <p className="mt-2 text-slate-500">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100">{error}</div>
            )}

            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn-primary w-full py-2.5 text-base" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="flex items-center justify-center space-x-1 text-sm text-slate-500">
              <span>Don't have an account?</span>
              <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700 transition">
                Sign up
              </Link>
            </div>

            <p className="mt-8 text-center text-xs text-slate-400">
              Demo: admin@velvix.com / admin123
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
