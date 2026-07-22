import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password, role);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
            Join the platform that helps teams streamline Lead Generation, Sales, and Marketing into one unified workflow.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 lg:hidden mb-2">CRM Velvix</h2>
            <h3 className="text-2xl font-semibold text-slate-800">Create an account</h3>
            <p className="mt-2 text-slate-500">Create an account to access the company CRM portal.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100">{error}</div>
            )}

            <div>
              <label className="label">Full name</label>
              <input
                type="text"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="label">Role</label>
              <select
                className="input-field"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="admin">Admin</option>
                <option value="lead_gen">Lead Generation</option>
                <option value="sales">Sales</option>
                <option value="marketing">Marketing</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Create a strong password"
              />
            </div>

            <button type="submit" className="btn-primary w-full py-2.5 text-base mt-2" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <div className="flex items-center justify-center space-x-1 text-sm text-slate-500 pt-4">
              <span>Already have an account?</span>
              <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 transition">
                Log in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
