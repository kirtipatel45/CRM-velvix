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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <h1 className="text-3xl font-bold">CRM Velvix</h1>
          <p className="mt-2 text-brand-100">Lead Generation • Sales • Marketing</p>
        </div>

        <form onSubmit={handleSubmit} className="card">
          <h2 className="mb-6 text-xl font-semibold">Sign In</h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          <div className="mb-4">
            <label className="label">Email</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label className="label">Password</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="mt-4 text-center text-sm text-slate-500">
            Don't have an account? <Link to="/register" className="text-brand-600 hover:underline">Sign up</Link>
          </p>

          <p className="mt-4 text-center text-xs text-slate-500">
            Demo: admin@velvix.com / admin123
          </p>
        </form>
      </div>
    </div>
  );
}
