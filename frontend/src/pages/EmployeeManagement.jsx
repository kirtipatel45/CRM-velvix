import { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/Modal';
import {
  UserPlus,
  Search,
  Filter,
  Shield,
  Key,
  Edit2,
  CheckCircle2,
  XCircle,
  FileText,
  Users,
  RefreshCw,
} from 'lucide-react';

export default function EmployeeManagement() {
  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'audit-logs'
  const [employees, setEmployees] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const { addNotification } = useNotification();

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobileNumber: '',
    role: 'lead_gen',
    password: '',
    status: 'Active',
  });

  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchData();
  }, [searchTerm, roleFilter, statusFilter, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'employees') {
        const res = await userAPI.getAll({
          search: searchTerm,
          role: roleFilter,
          status: statusFilter,
        });
        setEmployees(res.data.data || []);
      } else {
        const res = await userAPI.getAuditLogs();
        setAuditLogs(res.data.data || []);
      }
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.message || 'Failed to fetch data',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      setFormError('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters long');
      return;
    }

    setFormLoading(true);
    try {
      await userAPI.create(formData);
      addNotification({
        type: 'success',
        title: 'Success',
        message: `Employee "${formData.name}" created successfully`,
      });
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create employee');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!selectedUser) return;

    setFormLoading(true);
    try {
      await userAPI.update(selectedUser._id, {
        name: formData.name,
        email: formData.email,
        mobileNumber: formData.mobileNumber,
        role: formData.role,
        status: formData.status,
      });
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Employee updated successfully',
      });
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update employee');
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!resetPasswordData.newPassword) {
      setFormError('New password is required');
      return;
    }

    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (resetPasswordData.newPassword.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    setFormLoading(true);
    try {
      await userAPI.resetPassword(selectedUser._id, {
        newPassword: resetPasswordData.newPassword,
      });
      addNotification({
        type: 'success',
        title: 'Success',
        message: `Password reset successfully for ${selectedUser.name}`,
      });
      setShowResetModal(false);
      setSelectedUser(null);
      setResetPasswordData({ newPassword: '', confirmPassword: '' });
      setFormError('');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleStatus = async (user) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await userAPI.update(user._id, { status: newStatus });
      addNotification({
        type: 'success',
        title: 'Status Updated',
        message: `Employee "${user.name}" status set to ${newStatus}`,
      });
      fetchData();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.message || 'Failed to toggle status',
      });
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      mobileNumber: user.mobileNumber || '',
      role: user.role || 'lead_gen',
      password: '',
      status: user.status || 'Active',
    });
    setFormError('');
    setShowEditModal(true);
  };

  const openResetModal = (user) => {
    setSelectedUser(user);
    setResetPasswordData({ newPassword: '', confirmPassword: '' });
    setFormError('');
    setShowResetModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      mobileNumber: '',
      role: 'lead_gen',
      password: '',
      status: 'Active',
    });
    setFormError('');
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'lead_gen':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sales':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'marketing':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'lead_gen':
        return 'Lead Generation';
      case 'sales':
        return 'Sales Executive';
      case 'marketing':
        return 'Marketing';
      case 'manager':
        return 'Manager';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Management</h1>
          <p className="text-sm text-slate-500">
            Create, manage, and audit employee accounts across all CRM modules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus size={18} />
            <span>Create Employee</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'employees'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={18} />
          Employees ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab('audit-logs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'audit-logs'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText size={18} />
          Audit Logs
        </button>
      </div>

      {activeTab === 'employees' ? (
        <>
          {/* Filters & Search */}
          <div className="card grid gap-4 md:grid-cols-4 items-end">
            <div className="md:col-span-2">
              <label htmlFor="emp-search" className="flex items-center gap-1.5 text-xs text-slate-500 mb-1 font-medium">
                <Search size={14} /> Search Employees
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  id="emp-search"
                  type="text"
                  placeholder="Search by name, email, mobile..."
                  className="input-field pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="emp-role-filter" className="flex items-center gap-1.5 text-xs text-slate-500 mb-1 font-medium">
                <Filter size={14} /> Filter by Role
              </label>
              <select
                id="emp-role-filter"
                className="input-field py-2"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="lead_gen">Lead Generation</option>
                <option value="sales">Sales Executive</option>
                <option value="marketing">Marketing</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div>
              <label htmlFor="emp-status-filter" className="flex items-center gap-1.5 text-xs text-slate-500 mb-1 font-medium">
                <Filter size={14} /> Filter by Status
              </label>
              <select
                id="emp-status-filter"
                className="input-field py-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Employees Table */}
          <div className="card overflow-hidden p-0">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
              </div>
            ) : employees.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No employees found matching your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Employee</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Mobile</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Role</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Status</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Created Date</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map((emp) => (
                      <tr key={emp._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                              {emp.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{emp.name}</p>
                              <p className="text-xs text-slate-500">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-mono text-xs">
                          {emp.mobileNumber || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadgeClass(
                              emp.role
                            )}`}
                          >
                            {getRoleLabel(emp.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleStatus(emp)}
                            title="Click to toggle status"
                            aria-label={`Toggle status for ${emp.name}`}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                              emp.status === 'Inactive' || emp.isActive === false
                                ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {emp.status === 'Inactive' || emp.isActive === false ? (
                              <>
                                <XCircle size={14} /> Inactive
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={14} /> Active
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {new Date(emp.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(emp)}
                              className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition"
                              title="Edit Employee"
                              aria-label={`Edit ${emp.name}`}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => openResetModal(emp)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition"
                              title="Reset Password"
                              aria-label={`Reset password for ${emp.name}`}
                            >
                              <Key size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Audit Logs View */
        <div className="card overflow-hidden p-0">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Activity Audit Trail</h2>
            <button
              onClick={fetchData}
              className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1 font-medium"
            >
              <RefreshCw size={14} /> Refresh Logs
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No audit logs recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 font-semibold">Date & Time</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">Admin</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">Action</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">Target Employee</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-3.5 text-xs text-slate-500 whitespace-nowrap font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                        {log.adminName}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                        {log.targetEmployeeName || '—'}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Employee Modal */}
      {showCreateModal && (
        <Modal isOpen={showCreateModal} title="Create New Employee" onClose={() => setShowCreateModal(false)}>
          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100" role="alert">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label htmlFor="create-name" className="label">Full Name *</label>
              <input
                id="create-name"
                type="text"
                className="input-field"
                placeholder="e.g. Jane Smith"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="create-email" className="label">Email Address *</label>
              <input
                id="create-email"
                type="email"
                className="input-field"
                placeholder="e.g. jane@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="create-mobile" className="label">Mobile Number (Optional)</label>
              <input
                id="create-mobile"
                type="text"
                className="input-field"
                placeholder="e.g. +1 555-0199"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="create-role" className="label">Role *</label>
              <select
                id="create-role"
                className="input-field"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="admin">Admin</option>
                <option value="lead_gen">Lead Generation</option>
                <option value="sales">Sales Executive</option>
                <option value="marketing">Marketing</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div>
              <label htmlFor="create-password" className="label">Password *</label>
              <input
                id="create-password"
                type="password"
                className="input-field"
                placeholder="Set initial password (min 6 chars)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="create-status" className="label">Account Status</label>
              <select
                id="create-status"
                className="input-field"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary py-2 px-4"
                disabled={formLoading}
              >
                {formLoading ? 'Creating...' : 'Save Employee'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && (
        <Modal isOpen={showEditModal} title="Edit Employee" onClose={() => setShowEditModal(false)}>
          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100" role="alert">
              {formError}
            </div>
          )}

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label htmlFor="edit-name" className="label">Full Name</label>
              <input
                id="edit-name"
                type="text"
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="edit-email" className="label">Email Address</label>
              <input
                id="edit-email"
                type="email"
                className="input-field"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="edit-mobile" className="label">Mobile Number</label>
              <input
                id="edit-mobile"
                type="text"
                className="input-field"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="edit-role" className="label">Role</label>
              <select
                id="edit-role"
                className="input-field"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="admin">Admin</option>
                <option value="lead_gen">Lead Generation</option>
                <option value="sales">Sales Executive</option>
                <option value="marketing">Marketing</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div>
              <label htmlFor="edit-status" className="label">Account Status</label>
              <select
                id="edit-status"
                className="input-field"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary py-2 px-4"
                disabled={formLoading}
              >
                {formLoading ? 'Saving...' : 'Update Employee'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedUser && (
        <Modal isOpen={showResetModal} title={`Reset Password for ${selectedUser.name}`} onClose={() => setShowResetModal(false)}>
          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100" role="alert">
              {formError}
            </div>
          )}

          <p className="text-sm text-slate-600 mb-4">
            Set a temporary password for <strong>{selectedUser.name}</strong> ({selectedUser.email}).
          </p>

          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-new-password" className="label">New Temporary Password *</label>
              <input
                id="reset-new-password"
                type="password"
                className="input-field"
                placeholder="Enter temporary password"
                value={resetPasswordData.newPassword}
                onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="reset-confirm-password" className="label">Confirm Temporary Password *</label>
              <input
                id="reset-confirm-password"
                type="password"
                className="input-field"
                placeholder="Confirm temporary password"
                value={resetPasswordData.confirmPassword}
                onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary py-2 px-4"
                disabled={formLoading}
              >
                {formLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
