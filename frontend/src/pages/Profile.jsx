import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, leadGenAPI } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import {
  User,
  Mail,
  Shield,
  Key,
  Phone,
  CheckCircle2,
  Linkedin,
  ExternalLink,
  Tag,
  Clock,
  ArrowRight,
  UserPlus,
  Send,
  MessageSquare,
  RefreshCw,
  Calendar,
  FileText,
  Search,
  Briefcase,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  Voicemail,
  History,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import StartCallModal from '../components/StartCallModal';
import { toast } from 'react-hot-toast';

const emptyConvertForm = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  jobTitle: '',
  experience: '',
  assignedTo: '',
};

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Assigned Leads State
  const [assignedLeads, setAssignedLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsSearch, setLeadsSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Start Call State
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [activeCallLead, setActiveCallLead] = useState(null);
  const [activeCallProfile, setActiveCallProfile] = useState(null);

  // Convert to Candidate State
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertingRecord, setConvertingRecord] = useState(null);
  const [convertForm, setConvertForm] = useState(emptyConvertForm);
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertError, setConvertError] = useState('');
  const [resendingId, setResendingId] = useState(null);
  const [marketingTeam, setMarketingTeam] = useState([]);

  const fetchAssignedLeads = async () => {
    setLeadsLoading(true);
    try {
      const res = await leadGenAPI.getMyAssignedLeads();
      const data = res.data.data || [];
      setAssignedLeads(data);

      if (selectedLead) {
        const updated = data.find((l) => l._id === selectedLead._id);
        if (updated) setSelectedLead(updated);
      }
    } catch (err) {
      console.error('Failed to fetch assigned leads:', err);
    } finally {
      setLeadsLoading(false);
    }
  };

  const fetchMarketingTeam = async () => {
    try {
      const res = await leadGenAPI.getMarketingTeam();
      setMarketingTeam(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch marketing team:', err);
    }
  };

  useEffect(() => {
    if (user?.role !== 'marketing') {
      fetchAssignedLeads();
      fetchMarketingTeam();
    }
  }, [user?.role]);

  const openLeadDetails = (lead) => {
    setSelectedLead(lead);
    setDetailsModalOpen(true);
  };

  const openConvertModal = (record, targetProfile = null) => {
    setConvertingRecord(record);
    setConvertError('');

    const profileToUse = targetProfile || record.linkedInProfiles?.[0];
    let fName = '';
    let lName = '';
    let emailPrefill = '';
    let phonePrefill = '';

    if (profileToUse) {
      emailPrefill = profileToUse.email || '';
      phonePrefill = profileToUse.phone || '';
      if (profileToUse.profileName) {
        const parts = profileToUse.profileName.trim().split(' ');
        fName = parts[0] || '';
        lName = parts.slice(1).join(' ') || '';
      }
    }

    if (!fName && record.employeeName) {
      const parts = record.employeeName.trim().split(' ');
      fName = parts[0] || '';
      lName = parts.slice(1).join(' ') || '';
    }

    setConvertForm({
      email: emailPrefill,
      firstName: fName,
      lastName: lName,
      phone: phonePrefill,
      assignedTo: record.assignedTo?._id || record.assignedTo || '',
    });
    setConvertModalOpen(true);
  };

  const selectProfileForConversion = (profile) => {
    let fName = '';
    let lName = '';
    if (profile.profileName) {
      const parts = profile.profileName.trim().split(' ');
      fName = parts[0] || '';
      lName = parts.slice(1).join(' ') || '';
    }
    setConvertForm({
      email: profile.email || '',
      firstName: fName,
      lastName: lName,
      phone: profile.phone || '',
    });
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!convertingRecord) return;
    setConvertError('');
    setConvertLoading(true);

    try {
      const payload = {
        ...convertForm,
        jobExperiences:
          convertForm.jobTitle?.trim() || convertForm.experience?.trim()
            ? [
                {
                  jobTitle: convertForm.jobTitle?.trim() || '',
                  experience: convertForm.experience?.trim() || '',
                },
              ]
            : [],
      };
      const res = await leadGenAPI.convertToCandidate(convertingRecord._id, payload);
      toast.success(res.data.message || `Candidate created! Invite sent to ${convertForm.email}`);
      setConvertModalOpen(false);
      setConvertingRecord(null);
      fetchAssignedLeads();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to convert lead to candidate';
      setConvertError(msg);
      toast.error(msg);
    } finally {
      setConvertLoading(false);
    }
  };

  const handleResendInvite = async (record) => {
    if (!confirm(`Resend portal invite to ${record.convertedToCandidateId?.email || 'the candidate'}?`)) return;
    setResendingId(record._id);

    try {
      const res = await leadGenAPI.resendCandidateInvite(record._id);
      toast.success(res.data.message || 'Invite email resent successfully!');
      fetchAssignedLeads();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend invite';
      toast.error(msg);
    } finally {
      setResendingId(null);
    }
  };

  const handlePasswordSubmit = async (e) => {
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

  const isMarketing = user?.role === 'marketing';

  const openStartCallModal = (lead, profile = null, e = null) => {
    if (e) e.stopPropagation();
    setActiveCallLead(lead);
    setActiveCallProfile(profile || lead.linkedInProfiles?.[0] || null);
    setCallModalOpen(true);
  };

  const handleCallLogged = (updatedLead) => {
    fetchAssignedLeads();
    if (selectedLead && updatedLead && selectedLead._id === updatedLead._id) {
      setSelectedLead(updatedLead);
    }
  };

  const renderCallBadge = (item) => {
    const status = item?.lastCallStatus;
    const isInterested = item?.isInterested;
    const interestStatus = item?.interestStatus;

    if (!status || status === 'not_called') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200">
          <Clock size={10} className="text-slate-400" />
          Not Called
        </span>
      );
    }

    if (status === 'picked_up') {
      if (interestStatus === 'Interested' || isInterested) {
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 shadow-xs">
            <PhoneCall size={10} className="text-emerald-600" />
            Interested
          </span>
        );
      }
      if (interestStatus === 'Call Back Later') {
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200 shadow-xs">
            <Clock size={10} className="text-indigo-600" />
            Call Back Later
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
          <PhoneCall size={10} className="text-slate-500" />
          Picked Up
        </span>
      );
    }

    if (status === 'call_cut') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200">
          <PhoneOff size={10} className="text-rose-500" />
          Call Cut
        </span>
      );
    }

    if (status === 'voicemail') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
          <Voicemail size={10} className="text-amber-600" />
          Voicemail
        </span>
      );
    }

    if (status === 'not_answered') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200">
          <PhoneMissed size={10} className="text-slate-400" />
          Not Answered
        </span>
      );
    }

    return null;
  };

  const filteredAssignedLeads = assignedLeads.filter((l) => {
    // For marketing users, ONLY show converted candidates
    if (isMarketing) {
      if (!l.convertedToCandidateId) return false;
    } else {
      // For non-marketing employees, ONLY show unconverted leads
      const profiles =
        Array.isArray(l.linkedInProfiles) && l.linkedInProfiles.length > 0
          ? l.linkedInProfiles
          : l.linkedInProfileNames
          ? [{ profileName: l.linkedInProfileNames, email: "", phone: "", convertedToCandidateId: l.convertedToCandidateId }]
          : [];
      const unconverted = profiles.filter((p) => !p.convertedToCandidateId && p.interestStatus !== 'Converted');
      if (unconverted.length === 0) return false;
    }
    if (!leadsSearch) return true;
    const term = leadsSearch.toLowerCase();
    const generatorMatch = l.employeeName?.toLowerCase().includes(term);
    const sourceMatch = l.leadSource?.toLowerCase().includes(term);
    const candidateName = l.convertedToCandidateId
      ? `${l.convertedToCandidateId.firstName} ${l.convertedToCandidateId.lastName}`.toLowerCase()
      : '';
    const candidateEmail = l.convertedToCandidateId?.email?.toLowerCase() || '';
    const profileMatch = l.linkedInProfiles?.some(
      (p) =>
        p.profileName?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term) ||
        p.phone?.toLowerCase().includes(term)
    );
    return (
      generatorMatch ||
      sourceMatch ||
      profileMatch ||
      candidateName.includes(term) ||
      candidateEmail.includes(term)
    );
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500">
          Manage your personal account credentials and view candidates/leads assigned to you
        </p>
      </div>

      {/* Account Details & Password Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info Card */}
        <div className="card shadow-sm border border-slate-200">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800 border-b border-slate-100 pb-3">
            <User className="text-indigo-600" size={20} />
            Account Details
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} className="text-slate-400" /> Name
              </p>
              <p className="mt-1 text-base font-bold text-slate-900">{user?.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail size={14} className="text-slate-400" /> Email Address
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">{user?.email}</p>
            </div>
            {user?.mobileNumber && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone size={14} className="text-slate-400" /> Mobile Number
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">{user?.mobileNumber}</p>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={14} className="text-slate-400" /> Role
                </p>
                <p className="mt-1 inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-indigo-700 border border-indigo-200">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-slate-400" /> Status
                </p>
                <p className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  {user?.status || 'Active'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card shadow-sm border border-slate-200">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800 border-b border-slate-100 pb-3">
            <Lock className="text-indigo-600" size={20} />
            Change Password
          </h2>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700 border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <div>
              <label htmlFor="profile-current-password" className="label">
                Current Password *
              </label>
              <input
                id="profile-current-password"
                type="password"
                required
                className="input-field"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="profile-new-password" className="label">
                New Password *
              </label>
              <input
                id="profile-new-password"
                type="password"
                required
                className="input-field"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="profile-confirm-password" className="label">
                Confirm New Password *
              </label>
              <input
                id="profile-confirm-password"
                type="password"
                required
                className="input-field"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="btn-primary w-full py-2 text-sm"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* My Assigned Leads Section (Hidden for marketing employees) */}
      {!isMarketing && (
        <div className="card shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {isMarketing ? <UserCheck className="text-indigo-600" size={20} /> : <Briefcase className="text-indigo-600" size={20} />}
              <span>{isMarketing ? 'My Assigned Candidates' : 'My Assigned Leads'}</span>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
                {filteredAssignedLeads.length} {isMarketing ? (filteredAssignedLeads.length === 1 ? 'Candidate' : 'Candidates') : (filteredAssignedLeads.length === 1 ? 'Lead' : 'Leads')}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isMarketing
                ? 'Converted candidates assigned to you by sales employees for placement, marketing, and client outreach'
                : 'Leads from the Lead Generation team assigned to you for client engagement and candidate conversion'}
            </p>
          </div>

          <div className="relative sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input-field pl-9 py-1.5 text-xs"
              placeholder={isMarketing ? "Search assigned candidates..." : "Search assigned leads..."}
              value={leadsSearch}
              onChange={(e) => setLeadsSearch(e.target.value)}
              aria-label={isMarketing ? "Search assigned candidates" : "Search assigned leads"}
            />
          </div>
        </div>

        {leadsLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : filteredAssignedLeads.length === 0 ? (
          <div className="py-10 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
            <Briefcase size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No leads currently assigned</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              When the Lead Generation team assigns candidate leads to you, they will appear right here with full contact profiles.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    {isMarketing ? 'Candidate' : 'Sourced By'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    {isMarketing ? 'Contact Details' : 'Date'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    {isMarketing ? 'Converted By' : 'Source'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    {isMarketing ? 'Converted Date' : 'Person Profiles'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-400 w-24">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredAssignedLeads.map((r) => {
                  const candidateObj = r.convertedToCandidateId;
                  const isConverted = !!candidateObj;
                  const isCandidateActive = candidateObj?.accountStatus === 'active';
                  const isInviteExpired =
                    candidateObj?.tempCredential?.expiresAt &&
                    new Date(candidateObj.tempCredential.expiresAt) < new Date();
                  const profilesList =
                    r.linkedInProfiles && r.linkedInProfiles.length > 0
                      ? r.linkedInProfiles
                      : r.linkedInProfileNames
                      ? [{ profileName: r.linkedInProfileNames }]
                      : [];
                  const primaryProfile = profilesList[0];

                  return (
                    <tr
                      key={r._id}
                      onClick={() => openLeadDetails(r)}
                      className="group cursor-pointer hover:bg-indigo-50/40 transition-all duration-150"
                    >
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        {isMarketing && candidateObj ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs uppercase group-hover:bg-brand-600 group-hover:text-white transition-colors duration-150">
                              {candidateObj.firstName?.[0] || 'C'}{candidateObj.lastName?.[0] || ''}
                            </div>
                            <span className="group-hover:text-brand-600 font-semibold transition-colors duration-150">
                              {candidateObj.firstName} {candidateObj.lastName}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-150">
                              {r.employeeName ? r.employeeName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span className="group-hover:text-indigo-600 font-semibold transition-colors duration-150">
                              {r.employeeName}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap text-xs">
                        {isMarketing && candidateObj ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-medium text-slate-700">
                              <Mail size={12} className="text-slate-400" />
                              <span>{candidateObj.email}</span>
                            </div>
                            {candidateObj.phone && (
                              <div className="flex items-center gap-1 text-slate-500">
                                <Phone size={12} className="text-slate-400" />
                                <span>{candidateObj.phone}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          new Date(r.entryDate).toLocaleDateString()
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {isMarketing ? (
                          <span className="text-xs font-semibold text-slate-700">
                            {r.employeeName || 'Sales'}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-700">
                            {r.leadSource || 'LinkedIn'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {isMarketing ? (
                          <span className="text-xs text-slate-600">
                            {r.convertedAt ? new Date(r.convertedAt).toLocaleDateString() : new Date(r.entryDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-blue-700">
                              {profilesList.length} {profilesList.length === 1 ? 'Profile' : 'Profiles'}
                            </span>
                            {primaryProfile?.profileName && (
                              <span className="text-xs text-slate-600 truncate max-w-[140px]">
                                ({primaryProfile.profileName})
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {isConverted ? (
                          <span
                            className={`text-xs font-semibold ${
                              isCandidateActive
                                ? 'text-emerald-600'
                                : isInviteExpired
                                ? 'text-amber-600'
                                : 'text-indigo-600'
                            }`}
                          >
                            {isCandidateActive ? 'Active Candidate' : isInviteExpired ? 'Invite Expired' : 'Invite Sent'}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-500">
                            Lead Available
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          {!isMarketing && (
                            <button
                              type="button"
                              onClick={(e) => openStartCallModal(r, primaryProfile, e)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                              title="Start a Call"
                            >
                              <PhoneCall size={11} />
                              <span>Call</span>
                            </button>
                          )}

                          <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg shadow-xs">
                            <span>Open</span>
                            <ArrowRight size={12} />
                          </span>
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
      )}

      {/* Lead Details Pop-up Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Assigned Lead Details"
        size="lg"
      >
        {selectedLead && (
          <div className="space-y-5">
            {/* Overview Banner Card */}
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Lead Generator
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                    <User size={15} className="text-indigo-600" />
                    <span>{selectedLead.employeeName}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Entry Date
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <Calendar size={15} className="text-slate-500" />
                    <span>{new Date(selectedLead.entryDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Lead Source
                  </span>
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200 shadow-xs">
                      <Tag size={11} className="text-slate-500" />
                      {selectedLead.leadSource || 'LinkedIn'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Assigned To
                  </span>
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      You ({user?.name})
                    </span>
                  </div>
                </div>
              </div>

              {/* Portal Status Ribbon */}
              <div className="mt-3.5 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Candidate Portal:</span>
                  {selectedLead.convertedToCandidateId ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        selectedLead.convertedToCandidateId.accountStatus === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : selectedLead.convertedToCandidateId.tempCredential?.expiresAt &&
                            new Date(selectedLead.convertedToCandidateId.tempCredential.expiresAt) < new Date()
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      <CheckCircle2 size={12} />
                      {selectedLead.convertedToCandidateId.accountStatus === 'active'
                        ? 'Active Candidate'
                        : selectedLead.convertedToCandidateId.tempCredential?.expiresAt &&
                          new Date(selectedLead.convertedToCandidateId.tempCredential.expiresAt) < new Date()
                        ? 'Invite Expired'
                        : 'Portal Invite Dispatched'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                      Not Converted Yet
                    </span>
                  )}
                </div>

                {selectedLead.convertedToCandidateId?.email && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Mail size={12} className="text-slate-400" />
                    Invite sent to:{' '}
                    <strong className="text-slate-700">{selectedLead.convertedToCandidateId.email}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Person Profiles List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Linkedin size={16} className="text-blue-600" />
                  Person Profiles (
                  {selectedLead.linkedInProfiles && selectedLead.linkedInProfiles.length > 0
                    ? selectedLead.linkedInProfiles.length
                    : 1}
                  )
                </h3>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {(() => {
                  const profiles =
                    selectedLead.linkedInProfiles && selectedLead.linkedInProfiles.length > 0
                      ? selectedLead.linkedInProfiles
                      : selectedLead.linkedInProfileNames
                      ? selectedLead.linkedInProfileNames.split('\n').filter(Boolean).map((n) => ({ profileName: n }))
                      : [{ profileName: 'Lead Person Profile' }];

                  return profiles.map((p, idx) => {
                    const isProfileConverted =
                      selectedLead.convertedToCandidateId &&
                      ((p.email &&
                        selectedLead.convertedToCandidateId.email?.toLowerCase() === p.email.toLowerCase()) ||
                        (!p.email && profiles.length === 1));
                    const candidateStatus = selectedLead.convertedToCandidateId?.accountStatus;
                    const isInviteExpired =
                      selectedLead.convertedToCandidateId?.tempCredential?.expiresAt &&
                      new Date(selectedLead.convertedToCandidateId.tempCredential.expiresAt) < new Date();

                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-indigo-200 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                              {idx + 1}
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm">
                              {p.profileName || 'Unnamed Person'}
                            </h4>
                            {renderCallBadge(p)}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                            {/* Start a Call Action Button */}
                            {!isMarketing && (
                              <button
                                type="button"
                                onClick={() => openStartCallModal(selectedLead, p)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                                title={`Start a call with ${p.profileName || 'this contact'}`}
                              >
                                <PhoneCall size={12} />
                                <span>Start a Call</span>
                              </button>
                            )}

                            {/* Message on LinkedIn Button */}
                            <a
                              href={
                                p.url
                                  ? (p.url.startsWith('http') ? p.url : `https://${p.url}`)
                                  : p.profileName
                                  ? `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(p.profileName)}`
                                  : 'https://www.linkedin.com/messaging/'
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
                              title={`Open LinkedIn to message ${p.profileName || 'this person'}`}
                            >
                              <MessageSquare size={12} />
                              <span>Message on LinkedIn</span>
                            </a>

                            {/* Convert to Candidate Button */}
                            {!isProfileConverted ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailsModalOpen(false);
                                  openConvertModal(selectedLead, p);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                              >
                                <UserPlus size={13} />
                                <span>Convert to Candidate</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                    candidateStatus === 'active'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : isInviteExpired
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  }`}
                                >
                                  <CheckCircle2 size={12} />
                                  {candidateStatus === 'active'
                                    ? 'Active Candidate'
                                    : isInviteExpired
                                    ? 'Invite Expired'
                                    : 'Portal Invite Sent'}
                                </span>
                                {candidateStatus !== 'active' && (
                                  <button
                                    type="button"
                                    onClick={() => handleResendInvite(selectedLead)}
                                    disabled={resendingId === selectedLead._id}
                                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                                    title="Resend 72-hour invite email"
                                  >
                                    <RefreshCw
                                      size={11}
                                      className={resendingId === selectedLead._id ? 'animate-spin' : ''}
                                    />
                                    <span>Resend</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Mail size={13} className="text-slate-400 flex-shrink-0" />
                            <span className="text-slate-400">Email:</span>
                            {p.email ? (
                              <a
                                href={`mailto:${p.email}`}
                                className="font-medium text-indigo-600 hover:underline"
                              >
                                {p.email}
                              </a>
                            ) : (
                              <span className="italic text-slate-400">Not provided</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Phone size={13} className="text-slate-400 flex-shrink-0" />
                            <span className="text-slate-400">Phone:</span>
                            {p.phone ? (
                              <a
                                href={`tel:${p.phone}`}
                                className="font-medium text-slate-800 hover:underline"
                              >
                                {p.phone}
                              </a>
                            ) : (
                              <span className="italic text-slate-400">Not provided</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Call History & Activity Log Timeline */}
            {selectedLead.callLogs && selectedLead.callLogs.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <History size={15} className="text-indigo-600" />
                    Call Activity History ({selectedLead.callLogs.length})
                  </span>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {selectedLead.callLogs.map((log, lIdx) => (
                    <div
                      key={lIdx}
                      className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-2xs space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {log.profileName || 'Contact'}
                          </span>
                          {renderCallBadge({
                            lastCallStatus: log.outcome,
                            isInterested: log.isInterested,
                            interestStatus: log.interestStatus,
                          })}
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                            ⏱️ {log.callDuration || '00:00'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(log.callDate || log.createdAt).toLocaleString()} by{' '}
                          <strong className="text-slate-700">{log.callerName || 'Sales Rep'}</strong>
                        </span>
                      </div>

                      {log.notes && (
                        <p className="text-slate-600 italic bg-slate-50 p-2 rounded-md border border-slate-100">
                          "{log.notes}"
                        </p>
                      )}

                      {log.followUpDate && (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-700">
                          <Calendar size={12} className="text-purple-600" />
                          <span>
                            Follow-up Scheduled: {new Date(log.followUpDate).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes Section */}
            {selectedLead.notes && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                  <FileText size={14} className="text-slate-500" />
                  Notes & Remarks
                </span>
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {selectedLead.notes}
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Start Call Modal */}
      <StartCallModal
        isOpen={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        lead={activeCallLead}
        profile={activeCallProfile}
        onCallLogged={handleCallLogged}
      />

      {/* Convert to Candidate Modal */}
      <Modal
        isOpen={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
        title="Convert Lead to Candidate"
        size="md"
      >
        <form onSubmit={handleConvertSubmit} className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Converting this lead will create a new <strong>Candidate</strong> record and dispatch a portal invite email with single-use temporary credentials expiring in 72 hours.
          </p>

          {/* If lead has multiple profiles, show selectable chips */}
          {convertingRecord?.linkedInProfiles && convertingRecord.linkedInProfiles.length > 1 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                Select Profile to Pre-fill:
              </span>
              <div className="flex flex-wrap gap-2">
                {convertingRecord.linkedInProfiles.map((prof, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => selectProfileForConversion(prof)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition ${
                      convertForm.email === prof.email && prof.email
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400'
                    }`}
                  >
                    {prof.profileName || `Profile #${pIdx + 1}`} {prof.email ? `(${prof.email})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {convertError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <strong>Error:</strong> {convertError}
            </div>
          )}

          <div>
            <label htmlFor="convert-email" className="label">
              Candidate Email *
            </label>
            <input
              id="convert-email"
              type="email"
              required
              className="input-field"
              placeholder="candidate@example.com"
              value={convertForm.email}
              onChange={(e) => setConvertForm({ ...convertForm, email: e.target.value })}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              The candidate portal access link and temporary password will be delivered here.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="convert-first-name" className="label">
                First Name
              </label>
              <input
                id="convert-first-name"
                className="input-field"
                value={convertForm.firstName}
                onChange={(e) => setConvertForm({ ...convertForm, firstName: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="convert-last-name" className="label">
                Last Name
              </label>
              <input
                id="convert-last-name"
                className="input-field"
                value={convertForm.lastName}
                onChange={(e) => setConvertForm({ ...convertForm, lastName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="convert-phone" className="label">
              Phone (Optional)
            </label>
            <input
              id="convert-phone"
              type="tel"
              className="input-field"
              placeholder="+1 (555) 000-0000"
              value={convertForm.phone}
              onChange={(e) => setConvertForm({ ...convertForm, phone: e.target.value })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="convert-job-title" className="label">
                Job Title (Optional)
              </label>
              <input
                id="convert-job-title"
                className="input-field"
                placeholder="e.g. Senior React Developer"
                value={convertForm.jobTitle}
                onChange={(e) => setConvertForm({ ...convertForm, jobTitle: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="convert-experience" className="label">
                Experience (Optional)
              </label>
              <input
                id="convert-experience"
                className="input-field"
                placeholder="e.g. 4 Years"
                value={convertForm.experience}
                onChange={(e) => setConvertForm({ ...convertForm, experience: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="convert-assigned-to" className="label">
              Assigned To (Marketing Recruiter)
            </label>
            <select
              id="convert-assigned-to"
              className="input-field"
              value={convertForm.assignedTo}
              onChange={(e) => setConvertForm({ ...convertForm, assignedTo: e.target.value })}
            >
              <option value="">-- Select Marketing Employee --</option>
              {marketingTeam.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.role === 'marketing' ? 'Marketing' : emp.role}) - {emp.email}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              The converted candidate will show up in this marketing team member's login and workspace.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setConvertModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={convertLoading}
              className="btn-primary inline-flex items-center gap-2"
            >
              {convertLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Send size={14} />
                  <span>Convert & Send Invite</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
