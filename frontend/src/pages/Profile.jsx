import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { User, Mail, Shield, Key, Phone, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Password changed successfully. Please log in with your new password.',
      });
      setSuccessMessage('Password successfully changed! Logging out in 2 seconds...');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">My Profile</h1>
      
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        {/* User Info Card */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <User className="text-brand-600" size={20} />
            Account Details
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <User size={16} /> Name
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">{user?.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Mail size={16} /> Email Address
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">{user?.email}</p>
            </div>
            {user?.mobileNumber && (
              <div>
                <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <Phone size={16} /> Mobile Number
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">{user?.mobileNumber}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Shield size={16} /> Role
              </p>
              <p className="mt-1 inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-brand-800">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <CheckCircle2 size={16} /> Status
              </p>
              <p className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                {user?.status || 'Active'}
              </p>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Key className="text-brand-600" size={20} />
            Change Password
          </h2>
          
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100" role="alert">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600 border border-green-100" role="status">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="curr-pass" className="label">Current Password</label>
              <input
                id="curr-pass"
                type="password"
                className="input-field"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="new-pass" className="label">New Password</label>
              <input
                id="new-pass"
                type="password"
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="conf-pass" className="label">Confirm New Password</label>
              <input
                id="conf-pass"
                type="password"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="btn-primary w-full py-2"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
