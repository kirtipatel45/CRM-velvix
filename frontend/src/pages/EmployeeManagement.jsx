import { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/Modal';
import {
  UserPlus,
  Search,
  Filter,
  Shield,
  Key,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  Users,
  RefreshCw,
  Briefcase,
  UserCheck,
  Megaphone,
  Check,
  Sparkles,
  AlertTriangle,
  Activity,
  PhoneCall,
  Phone,
  Send,
  TrendingUp,
  Clock,
  Calendar,
  Zap,
  Globe,
  BarChart3,
  Flame,
  ArrowRight,
  Eye,
  Sliders,
  ChevronDown,
  Layers,
  Target,
} from 'lucide-react';

const SYSTEM_MODULES = [
  {
    id: 'lead_generation',
    label: 'Lead Generation',
    shortLabel: 'Lead Gen',
    description: 'Source prospective candidate leads & data entry',
    icon: Users,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
  },
  {
    id: 'leads',
    label: 'Leads',
    shortLabel: 'Leads',
    description: 'Assigned leads, call logger, follow-ups & convert to candidate',
    icon: Briefcase,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'candidates',
    label: 'Candidates',
    shortLabel: 'Candidates',
    description: 'Onboarded candidates, portal credentials & ATS resumes',
    icon: UserCheck,
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dotColor: 'bg-indigo-500',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    shortLabel: 'Marketing',
    description: 'Client job submissions, screening calls & interview pipeline',
    icon: Megaphone,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
];

const PRESETS = [
  {
    name: 'Lead Gen Specialist',
    designation: 'Lead Generation Specialist',
    modules: ['lead_generation', 'leads'],
  },
  {
    name: 'Outreach Specialist',
    designation: 'Outreach & Calling Specialist',
    modules: ['leads'],
  },
  {
    name: 'Technical Recruiter',
    designation: 'Technical Recruiter',
    modules: ['candidates', 'marketing'],
  },
  {
    name: 'All Modules',
    designation: 'Operations Manager',
    modules: ['lead_generation', 'leads', 'candidates', 'marketing'],
  },
];

export default function EmployeeManagement() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'user-activity' | 'audit-logs'
  const [employees, setEmployees] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // User Activity & Performance Tracking State
  const [activityPeriod, setActivityPeriod] = useState('all'); // 'all' | 'today' | 'week' | 'month' | 'custom'
  const [activityStartDate, setActivityStartDate] = useState('');
  const [activityEndDate, setActivityEndDate] = useState('');
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [activityRoleFilter, setActivityRoleFilter] = useState('all');
  const [activitySummary, setActivitySummary] = useState({ totals: {}, data: [] });
  const [activityLoading, setActivityLoading] = useState(false);
  const [selectedUserForActivity, setSelectedUserForActivity] = useState(null);
  const [userActivityDetails, setUserActivityDetails] = useState(null);
  const [userActivityDetailsLoading, setUserActivityDetailsLoading] = useState(false);
  const [showLiveStream, setShowLiveStream] = useState(false);
  const [liveStream, setLiveStream] = useState([]);
  const [liveStreamLoading, setLiveStreamLoading] = useState(false);

  const { addNotification } = useNotification();

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobileNumber: '',
    designation: '',
    role: 'employee',
    allowedModules: ['lead_generation', 'leads'],
    password: '',
    status: 'Active',
  });

  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (activeTab === 'user-activity') {
      fetchActivitySummary();
    } else {
      fetchData();
    }
  }, [
    searchTerm,
    moduleFilter,
    statusFilter,
    activeTab,
    activityPeriod,
    activityStartDate,
    activityEndDate,
    activityRoleFilter,
    activitySearchTerm,
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'employees') {
        const res = await userAPI.getAll({
          search: searchTerm,
          status: statusFilter,
        });
        setEmployees(res.data.data || []);
      } else if (activeTab === 'audit-logs') {
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

  const fetchActivitySummary = async () => {
    setActivityLoading(true);
    try {
      const params = {
        period: activityPeriod,
        role: activityRoleFilter,
        search: activitySearchTerm,
      };
      if (activityPeriod === 'custom') {
        params.startDate = activityStartDate;
        params.endDate = activityEndDate;
      }
      const res = await userAPI.getActivitySummary(params);
      setActivitySummary(res.data || { totals: {}, data: [] });
    } catch (err) {
      console.error('Failed to load activity summary:', err);
      addNotification({
        type: 'error',
        title: 'Activity Load Error',
        message: err.response?.data?.message || 'Failed to load user activity data',
      });
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchUserActivityDetails = async (userObj) => {
    setSelectedUserForActivity(userObj);
    setUserActivityDetailsLoading(true);
    try {
      const params = {
        period: activityPeriod,
      };
      if (activityPeriod === 'custom') {
        params.startDate = activityStartDate;
        params.endDate = activityEndDate;
      }
      const res = await userAPI.getUserActivityLogs(userObj._id, params);
      setUserActivityDetails(res.data || null);
    } catch (err) {
      console.error('Failed to load user activity details:', err);
    } finally {
      setUserActivityDetailsLoading(false);
    }
  };

  const fetchLiveStream = async () => {
    setLiveStreamLoading(true);
    setShowLiveStream(true);
    try {
      const res = await userAPI.getLiveActivityStream({ limit: 60 });
      setLiveStream(res.data.data || []);
    } catch (err) {
      console.error('Failed to load live stream:', err);
    } finally {
      setLiveStreamLoading(false);
    }
  };

  const toggleModuleInForm = (moduleId) => {
    setFormData((prev) => {
      const current = prev.allowedModules || [];
      if (current.includes(moduleId)) {
        if (current.length === 1) return prev;
        return { ...prev, allowedModules: current.filter((m) => m !== moduleId) };
      } else {
        return { ...prev, allowedModules: [...current, moduleId] };
      }
    });
  };

  const applyPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      role: 'employee',
      designation: prev.designation || preset.designation,
      allowedModules: [...preset.modules],
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.email || !formData.password) {
      setFormError('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters long');
      return;
    }

    if (formData.role !== 'admin' && (!formData.allowedModules || formData.allowedModules.length === 0)) {
      setFormError('Please select at least one module permission for this user');
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

    if (formData.role !== 'admin' && (!formData.allowedModules || formData.allowedModules.length === 0)) {
      setFormError('Please select at least one module permission for this user');
      return;
    }

    setFormLoading(true);
    try {
      await userAPI.update(selectedUser._id, {
        name: formData.name,
        email: formData.email,
        mobileNumber: formData.mobileNumber,
        designation: formData.designation,
        role: formData.role,
        allowedModules: formData.role === 'admin' ? ['lead_generation', 'leads', 'candidates', 'marketing'] : formData.allowedModules,
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

  const handleDeleteEmployee = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      await userAPI.delete(userToDelete._id);
      addNotification({
        type: 'success',
        title: 'Employee Deleted',
        message: `Employee "${userToDelete.name}" has been permanently removed`,
      });
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchData();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Failed to delete employee',
      });
    } finally {
      setDeleteLoading(false);
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

  const getUserModules = (user) => {
    if (user.role === 'admin') {
      return ['lead_generation', 'leads', 'candidates', 'marketing'];
    }
    if (user.allowedModules && user.allowedModules.length > 0) {
      return user.allowedModules;
    }
    if (user.role === 'lead_gen') return ['lead_generation', 'leads'];
    if (user.role === 'sales') return ['leads'];
    if (user.role === 'marketing') return ['candidates', 'marketing'];
    return ['lead_generation', 'leads'];
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      mobileNumber: user.mobileNumber || '',
      designation: user.designation || '',
      role: user.role === 'admin' ? 'admin' : 'employee',
      allowedModules: getUserModules(user),
      password: '',
      status: user.status || 'Active',
    });
    setFormError('');
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
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
      designation: '',
      role: 'employee',
      allowedModules: ['lead_generation', 'leads'],
      password: '',
      status: 'Active',
    });
    setFormError('');
  };

  // Filter employees by module if requested
  const filteredEmployees = employees.filter((emp) => {
    if (moduleFilter === 'all') return true;
    if (moduleFilter === 'admin') return emp.role === 'admin';
    const mods = getUserModules(emp);
    return mods.includes(moduleFilter);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Management</h1>
          <p className="text-sm text-slate-500">
            Create employee profiles, define designations, and configure granular module permissions.
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
          onClick={() => setActiveTab('user-activity')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'user-activity'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity size={18} className="text-amber-500" />
          <span>User Activity & Performance</span>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
            Live Tracking
          </span>
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
                  placeholder="Search by name, designation, email, mobile..."
                  className="input-field pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="emp-module-filter" className="flex items-center gap-1.5 text-xs text-slate-500 mb-1 font-medium">
                <Filter size={14} /> Module Access
              </label>
              <select
                id="emp-module-filter"
                className="input-field"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
              >
                <option value="all">All Modules</option>
                <option value="lead_generation">Lead Generation</option>
                <option value="leads">Leads & Calling</option>
                <option value="candidates">Candidates</option>
                <option value="marketing">Marketing</option>
                <option value="admin">Administrator Role</option>
              </select>
            </div>

            <div>
              <label htmlFor="emp-status-filter" className="flex items-center gap-1.5 text-xs text-slate-500 mb-1 font-medium">
                <Shield size={14} /> Account Status
              </label>
              <select
                id="emp-status-filter"
                className="input-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Employee Table */}
          <div className="card overflow-hidden p-0">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Users size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="font-semibold text-slate-700 text-base">No employees found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or create a new employee.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Employee</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Designation & Role</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Allowed Modules</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Status</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Created Date</th>
                      <th scope="col" className="px-6 py-3.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.map((emp) => {
                      const modules = getUserModules(emp);
                      const isSelf = emp._id === currentUser?._id;
                      return (
                        <tr key={emp._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs flex-shrink-0">
                                {emp.name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-slate-900 flex items-center gap-1.5">
                                  <span>{emp.name}</span>
                                  {isSelf && (
                                    <span className="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded font-bold border border-brand-200">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 truncate">{emp.email}</div>
                                {emp.mobileNumber && (
                                  <div className="text-[11px] text-slate-400">{emp.mobileNumber}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <span className="font-semibold text-slate-800 text-xs block">
                                {emp.designation || 'Staff Employee'}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                  emp.role === 'admin'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {emp.role === 'admin' ? 'Administrator' : 'Employee'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {emp.role === 'admin' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                  Full System Access (All Modules)
                                </span>
                              ) : modules.length === 0 ? (
                                <span className="text-xs text-slate-400 italic">No modules assigned</span>
                              ) : (
                                modules.map((modId) => {
                                  const modDef = SYSTEM_MODULES.find((m) => m.id === modId);
                                  return (
                                    <span
                                      key={modId}
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                                        modDef?.badgeClass || 'bg-slate-100 text-slate-700 border-slate-200'
                                      }`}
                                    >
                                      {modDef?.shortLabel || modId}
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => !isSelf && toggleStatus(emp)}
                              disabled={isSelf}
                              title={isSelf ? 'Cannot toggle your own status' : 'Click to toggle status'}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                                isSelf ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                              } ${
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
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditModal(emp)}
                                className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition"
                                title="Edit Employee & Designation"
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
                              {!isSelf && (
                                <button
                                  onClick={() => openDeleteModal(emp)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Delete Employee"
                                  aria-label={`Delete ${emp.name}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : activeTab === 'user-activity' ? (
        /* ================= USER ACTIVITY & PERFORMANCE VIEW ================= */
        <div className="space-y-6">
          {/* Controls & Filter Toolbar */}
          <div className="card border border-slate-200 p-4 space-y-4 bg-white shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Period Quick Select Pills */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
                  Tracking Timeframe:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'All Time', icon: Zap },
                    { id: 'today', label: 'Today', icon: Clock },
                    { id: 'week', label: 'This Week', icon: Calendar },
                    { id: 'month', label: 'This Month', icon: BarChart3 },
                    { id: 'custom', label: 'Custom Range', icon: Sliders },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = activityPeriod === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setActivityPeriod(p.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-brand-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Icon size={13} />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={fetchLiveStream}
                  className="btn-secondary text-xs px-3.5 py-2 inline-flex items-center gap-1.5 border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                >
                  <Activity size={14} className="text-amber-600 animate-pulse" />
                  <span>Global Real-Time Feed</span>
                </button>
                <button
                  type="button"
                  onClick={fetchActivitySummary}
                  className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-1.5"
                  title="Refresh activity metrics"
                >
                  <RefreshCw size={14} className={activityLoading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Custom Date Range Row (if selected) */}
            {activityPeriod === 'custom' && (
              <div className="grid gap-3 sm:grid-cols-2 max-w-md pt-2 border-t border-slate-100 animate-fadeIn">
                <div>
                  <label htmlFor="act-start-date" className="text-xs text-slate-500 block mb-1">Start Date</label>
                  <input
                    id="act-start-date"
                    type="date"
                    className="input-field text-xs py-1.5"
                    value={activityStartDate}
                    onChange={(e) => setActivityStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="act-end-date" className="text-xs text-slate-500 block mb-1">End Date</label>
                  <input
                    id="act-end-date"
                    type="date"
                    className="input-field text-xs py-1.5"
                    value={activityEndDate}
                    onChange={(e) => setActivityEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Search and Role Filter */}
            <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t border-slate-100">
              <div className="sm:col-span-2">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    className="input-field pl-9 text-xs py-2"
                    placeholder="Search by user name, email, designation..."
                    value={activitySearchTerm}
                    onChange={(e) => setActivitySearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <select
                  className="input-field text-xs py-2"
                  value={activityRoleFilter}
                  onChange={(e) => setActivityRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles & Teams</option>
                  <option value="lead_gen">Lead Generation Team</option>
                  <option value="sales">Sales & Outreach Team</option>
                  <option value="marketing">Marketing Team</option>
                  <option value="admin">Administrators</option>
                  <option value="employee">Employees</option>
                </select>
              </div>
            </div>
          </div>

          {/* Org-Wide Aggregated KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Total Leads Generated */}
            <div className="card border border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-blue-50/30 p-4 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Leads Generated
                </span>
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Users size={16} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-blue-950">
                {activitySummary.totals?.totalLeads || 0}
              </div>
              <p className="text-[11px] text-blue-700/80 font-medium">
                Profiles sourced across LinkedIn, Dice, Monster, etc.
              </p>
            </div>

            {/* 2. Sales Calls Made */}
            <div className="card border border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-4 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Outreach Calls Made
                </span>
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <PhoneCall size={16} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-amber-950">
                  {activitySummary.totals?.totalCalls || 0}
                </span>
                <span className="text-xs text-amber-700 font-semibold font-mono">
                  ({Math.floor((activitySummary.totals?.totalCallMinutes || 0) / 60)}h {(activitySummary.totals?.totalCallMinutes || 0) % 60}m)
                </span>
              </div>
              <p className="text-[11px] text-amber-700/80 font-medium">
                Live dials, phone conversations & follow-ups
              </p>
            </div>

            {/* 3. Applications Submitted */}
            <div className="card border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/30 p-4 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  Client Applications
                </span>
                <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Send size={16} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-indigo-950">
                  {activitySummary.totals?.totalApps || 0}
                </span>
                <span className="text-[11px] text-indigo-700 font-semibold">
                  (Long: {activitySummary.totals?.totalLongApps || 0} • Easy: {activitySummary.totals?.totalEasyApps || 0})
                </span>
              </div>
              <p className="text-[11px] text-indigo-700/80 font-medium">
                Enterprise & fast-track job portal submissions
              </p>
            </div>

            {/* 4. Candidates Converted */}
            <div className="card border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 p-4 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Candidates Converted
                </span>
                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserCheck size={16} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-emerald-950">
                  {activitySummary.totals?.totalConversions || 0}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {activitySummary.totals?.totalLeads > 0
                    ? `${(((activitySummary.totals?.totalConversions || 0) / activitySummary.totals.totalLeads) * 100).toFixed(1)}% conv.`
                    : '0% conv.'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700/80 font-medium">
                Prospective leads successfully onboarded
              </p>
            </div>
          </div>

          {/* User Activity & Performance Leaderboard Table */}
          <div className="card overflow-hidden p-0 bg-white border border-slate-200 shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="font-bold text-slate-800 text-sm">
                  Employee Performance & Activity Leaderboard
                </h2>
                <p className="text-xs text-slate-500">
                  Detailed tracking of leads, calls, applications, and conversions for every user
                </p>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {activitySummary.data?.length || 0} employees tracked
              </span>
            </div>

            {activityLoading ? (
              <div className="flex justify-center items-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
              </div>
            ) : !activitySummary.data || activitySummary.data.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Activity size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">No user activity recorded for this timeframe</p>
                <p className="text-xs text-slate-400 mt-1">Try selecting "All Time" or adjusting your search filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-5 py-3.5 font-semibold">Employee</th>
                      <th scope="col" className="px-4 py-3.5 font-semibold">Leads Generated</th>
                      <th scope="col" className="px-4 py-3.5 font-semibold">Sales Calls Made</th>
                      <th scope="col" className="px-4 py-3.5 font-semibold">Applications (Long/Easy)</th>
                      <th scope="col" className="px-4 py-3.5 font-semibold">Candidate Conversions</th>
                      <th scope="col" className="px-4 py-3.5 font-semibold">Last Active</th>
                      <th scope="col" className="px-4 py-3.5 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activitySummary.data.map((item) => {
                      const u = item.user;
                      const m = item.metrics;
                      const hasLeads = m.totalLeadsGenerated > 0;
                      const hasCalls = m.totalCallsMade > 0;
                      const hasApps = m.totalApplications > 0;
                      const hasConversions = m.candidatesConverted > 0;

                      return (
                        <tr key={u._id} className="hover:bg-slate-50/90 transition-colors">
                          {/* Employee Info */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs flex-shrink-0">
                                {u.name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 text-xs truncate">
                                  {u.name}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.2 rounded border border-brand-200">
                                    {u.designation || u.role}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 1. Leads Generated & Sources */}
                          <td className="px-4 py-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-extrabold text-sm ${hasLeads ? 'text-blue-700' : 'text-slate-400'}`}>
                                  {m.totalLeadsGenerated}
                                </span>
                                <span className="text-[11px] text-slate-400">leads</span>
                              </div>

                              {/* Lead Sources Pills */}
                              {hasLeads && m.leadSourcesBreakdown && (
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {Object.entries(m.leadSourcesBreakdown)
                                    .filter(([_, count]) => count > 0)
                                    .map(([source, count]) => (
                                      <span
                                        key={source}
                                        className="inline-flex items-center gap-1 rounded bg-blue-50 text-blue-800 px-1.5 py-0.2 text-[10px] font-semibold border border-blue-200"
                                        title={`${count} sourced from ${source}`}
                                      >
                                        <span>{source}:</span>
                                        <strong>{count}</strong>
                                      </span>
                                    ))}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 2. Sales Calls Made */}
                          <td className="px-4 py-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-extrabold text-sm ${hasCalls ? 'text-amber-700' : 'text-slate-400'}`}>
                                  {m.totalCallsMade}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  ({m.callDurationFormatted})
                                </span>
                              </div>

                              {hasCalls && (
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-semibold border border-emerald-200" title="Calls Picked Up">
                                    Picked: {m.callsPickedUp}
                                  </span>
                                  <span className="bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded font-semibold border border-amber-200" title="Voicemail">
                                    VM: {m.callsVoicemail}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 3. Applications (Long / Easy) */}
                          <td className="px-4 py-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-extrabold text-sm ${hasApps ? 'text-indigo-700' : 'text-slate-400'}`}>
                                  {m.totalApplications}
                                </span>
                                <span className="text-[11px] text-slate-400">apps</span>
                              </div>

                              {hasApps && (
                                <div className="flex items-center gap-1 text-[10px]">
                                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-medium border border-blue-200">
                                    Long: {m.totalLongApplications}
                                  </span>
                                  <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-medium border border-indigo-200">
                                    Easy: {m.totalEasyApplications}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 4. Candidate Conversions */}
                          <td className="px-4 py-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-extrabold text-sm ${hasConversions ? 'text-emerald-700' : 'text-slate-400'}`}>
                                  {m.candidatesConverted}
                                </span>
                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  {m.conversionRate}%
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block">
                                Sourced &gt; Onboarded
                              </span>
                            </div>
                          </td>

                          {/* Last Active */}
                          <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                            {m.lastActive ? (
                              <div className="space-y-0.5">
                                <span className="font-medium text-slate-700 block">
                                  {new Date(m.lastActive).toLocaleDateString()}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {new Date(m.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No activity</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => fetchUserActivityDetails(u)}
                              className="btn-secondary text-xs px-2.5 py-1.5 inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-900 hover:bg-brand-50 border-brand-200 shadow-2xs"
                              title="View detailed activity logs"
                            >
                              <Eye size={13} />
                              <span>View Activity</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= AUDIT LOGS VIEW ================= */
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

      {/* ================= USER ACTIVITY DEEP-DIVE TIMELINE MODAL ================= */}
      {selectedUserForActivity && (
        <Modal
          isOpen={Boolean(selectedUserForActivity)}
          onClose={() => {
            setSelectedUserForActivity(null);
            setUserActivityDetails(null);
          }}
          title={`Activity History — ${selectedUserForActivity.name}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* User Profile Header in Modal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-xs flex-shrink-0">
                  {selectedUserForActivity.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {selectedUserForActivity.name}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedUserForActivity.email}</p>
                  <p className="text-xs font-semibold text-brand-700 mt-0.5">
                    {selectedUserForActivity.designation || selectedUserForActivity.role}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {getUserModules(selectedUserForActivity).map((modId) => {
                  const modDef = SYSTEM_MODULES.find((m) => m.id === modId);
                  return (
                    <span
                      key={modId}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        modDef?.badgeClass || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {modDef?.shortLabel || modId}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Quick Metrics Summary inside Modal */}
            {userActivityDetailsLoading ? (
              <div className="flex justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
              </div>
            ) : userActivityDetails ? (
              <div className="space-y-5">
                {/* 4 Summary Stat Chips */}
                <div className="grid gap-3 sm:grid-cols-4 text-xs">
                  <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/40 space-y-1">
                    <span className="text-slate-500 font-medium block">Leads Sourced</span>
                    <span className="font-extrabold text-blue-900 text-lg">
                      {userActivityDetails.counts?.leads || 0}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/40 space-y-1">
                    <span className="text-slate-500 font-medium block">Activity Logs</span>
                    <span className="font-extrabold text-amber-900 text-lg">
                      {userActivityDetails.counts?.logs || 0}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-1">
                    <span className="text-slate-500 font-medium block">Marketing Logs</span>
                    <span className="font-extrabold text-indigo-900 text-lg">
                      {userActivityDetails.counts?.marketingEntries || 0}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-1">
                    <span className="text-slate-500 font-medium block">Candidates Converted</span>
                    <span className="font-extrabold text-emerald-900 text-lg">
                      {userActivityDetails.counts?.candidatesConverted || 0}
                    </span>
                  </div>
                </div>

                {/* Chronological Event Feed */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-400" />
                      <span>Activity Timeline Log</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {userActivityDetails.activityLogs?.length || 0} event records
                    </span>
                  </div>

                  {userActivityDetails.activityLogs?.length > 0 ? (
                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                      {userActivityDetails.activityLogs.map((log) => {
                        const isCall = log.actionType === 'call_logged';
                        const isLead = log.actionType === 'lead_created';
                        const isCand = log.actionType === 'candidate_converted';
                        const isMktg = log.actionType === 'marketing_submitted';

                        return (
                          <div
                            key={log._id}
                            className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 text-xs transition"
                          >
                            <div
                              className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isCall
                                  ? 'bg-amber-100 text-amber-700'
                                  : isLead
                                  ? 'bg-blue-100 text-blue-700'
                                  : isCand
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : isMktg
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {isCall ? (
                                <PhoneCall size={15} />
                              ) : isLead ? (
                                <Users size={15} />
                              ) : isCand ? (
                                <UserCheck size={15} />
                              ) : isMktg ? (
                                <Send size={15} />
                              ) : (
                                <Activity size={15} />
                              )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span className="font-bold text-slate-900 text-xs">{log.title}</span>
                                <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                                  {new Date(log.timestamp || log.createdAt).toLocaleString()}
                                </span>
                              </div>

                              {log.description && (
                                <p className="text-slate-600 text-[11px]">{log.description}</p>
                              )}

                              {/* Metadata chips */}
                              {log.metadata && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {log.metadata.leadSource && (
                                    <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-semibold text-[10px] border border-blue-200">
                                      Source: {log.metadata.leadSource}
                                    </span>
                                  )}
                                  {log.metadata.callOutcome && (
                                    <span className="bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded font-semibold text-[10px] border border-amber-200">
                                      Outcome: {log.metadata.callOutcome} ({log.metadata.callDuration || '00:00'})
                                    </span>
                                  )}
                                  {log.metadata.totalApplications > 0 && (
                                    <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-semibold text-[10px] border border-indigo-200">
                                      Apps: Long {log.metadata.longApplications || 0} / Easy {log.metadata.easyApplications || 0}
                                    </span>
                                  )}
                                  {log.metadata.candidateEmail && (
                                    <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-semibold text-[10px] border border-emerald-200">
                                      {log.metadata.candidateEmail}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      No activity logs recorded yet for this employee.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedUserForActivity(null);
                  setUserActivityDetails(null);
                }}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= GLOBAL REAL-TIME ACTIVITY STREAM MODAL ================= */}
      {showLiveStream && (
        <Modal
          isOpen={showLiveStream}
          onClose={() => setShowLiveStream(false)}
          title="Global Live Activity Stream"
          size="xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <p className="text-xs text-slate-500">
                Real-time chronological activity feed across all employees and CRM modules
              </p>
              <button
                type="button"
                onClick={fetchLiveStream}
                className="btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1 font-semibold"
              >
                <RefreshCw size={12} className={liveStreamLoading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            {liveStreamLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
              </div>
            ) : liveStream.length === 0 ? (
              <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No live activity logs recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {liveStream.map((log) => (
                  <div
                    key={log._id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/80 hover:bg-slate-50 text-xs transition"
                  >
                    <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      {log.userName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <strong className="text-slate-900">{log.userName}</strong>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                            {log.module}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                          {new Date(log.timestamp || log.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <p className="font-semibold text-slate-800 text-xs">{log.title}</p>
                      {log.description && (
                        <p className="text-slate-500 text-[11px]">{log.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLiveStream(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Employee Modal */}
      {showCreateModal && (
        <Modal isOpen={showCreateModal} title="Create New Employee" onClose={() => setShowCreateModal(false)} size="lg">
          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100" role="alert">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
                <label htmlFor="create-designation" className="label">Employee Designation / Job Title *</label>
                <input
                  id="create-designation"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Senior Lead Generator, Technical Recruiter"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="create-password" className="label">Initial Password *</label>
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
                <label htmlFor="create-account-type" className="label">Account Role</label>
                <select
                  id="create-account-type"
                  className="input-field"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="employee">Standard Employee (Custom Modules)</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>
            </div>

            {/* Dynamic Module Permissions Section */}
            {formData.role === 'admin' ? (
              <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4">
                <div className="flex items-center gap-2 text-purple-900 font-semibold text-sm">
                  <Shield size={18} className="text-purple-600" />
                  <span>Full Administrator Access</span>
                </div>
                <p className="text-xs text-purple-700 mt-1">
                  Administrators automatically have complete access across all 4 system modules plus employee management.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Select Allowed Modules *
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
                      <Sparkles size={12} className="text-brand-500" /> Quick Presets:
                    </span>
                    {PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="rounded-md bg-slate-100 hover:bg-brand-50 hover:text-brand-700 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 transition"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {SYSTEM_MODULES.map((m) => {
                    const isChecked = (formData.allowedModules || []).includes(m.id);
                    const IconComponent = m.icon;

                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleModuleInForm(m.id)}
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition select-none ${
                          isChecked
                            ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/30'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                            isChecked
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check size={13} strokeWidth={3} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <IconComponent size={14} className={isChecked ? 'text-brand-600' : 'text-slate-500'} />
                            <span className="text-sm font-bold text-slate-900">{m.label}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
        <Modal isOpen={showEditModal} title="Edit Employee & Permissions" onClose={() => setShowEditModal(false)} size="lg">
          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100" role="alert">
              {formError}
            </div>
          )}

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
                <label htmlFor="edit-designation" className="label">Employee Designation / Job Title</label>
                <input
                  id="edit-designation"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Senior Lead Generator, Technical Recruiter"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-account-type" className="label">Account Role</label>
                <select
                  id="edit-account-type"
                  className="input-field"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="employee">Standard Employee (Custom Modules)</option>
                  <option value="admin">Administrator (Full Access)</option>
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
            </div>

            {/* Dynamic Module Permissions Section in Edit */}
            {formData.role === 'admin' ? (
              <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4">
                <div className="flex items-center gap-2 text-purple-900 font-semibold text-sm">
                  <Shield size={18} className="text-purple-600" />
                  <span>Full Administrator Access</span>
                </div>
                <p className="text-xs text-purple-700 mt-1">
                  Administrators automatically have complete access across all 4 system modules plus employee management.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Module Access Permissions *
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
                      <Sparkles size={12} className="text-brand-500" /> Presets:
                    </span>
                    {PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="rounded-md bg-slate-100 hover:bg-brand-50 hover:text-brand-700 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 transition"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {SYSTEM_MODULES.map((m) => {
                    const isChecked = (formData.allowedModules || []).includes(m.id);
                    const IconComponent = m.icon;

                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleModuleInForm(m.id)}
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition select-none ${
                          isChecked
                            ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/30'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                            isChecked
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check size={13} strokeWidth={3} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <IconComponent size={14} className={isChecked ? 'text-brand-600' : 'text-slate-500'} />
                            <span className="text-sm font-bold text-slate-900">{m.label}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <Modal isOpen={showDeleteModal} title="Confirm Employee Deletion" onClose={() => setShowDeleteModal(false)} size="md">
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-800">
              <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-red-900 text-sm">Warning: Permanent Action</p>
                <p className="mt-1 text-red-700">
                  Are you sure you want to permanently delete employee <strong>{userToDelete.name}</strong> ({userToDelete.email})?
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
              <p><strong>Employee:</strong> {userToDelete.name}</p>
              <p><strong>Designation:</strong> {userToDelete.designation || 'N/A'}</p>
              <p><strong>Email:</strong> {userToDelete.email}</p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEmployee}
                disabled={deleteLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-xs disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>{deleteLoading ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
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
