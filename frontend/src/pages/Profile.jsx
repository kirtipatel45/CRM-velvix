import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, leadGenAPI } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import {
  User,
  Mail,
  Shield,
  Key,
  Lock,
  AlertCircle,
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
import { isValidEmail, isValidPhoneNumber, EMAIL_ERROR_MSG, PHONE_ERROR_MSG } from '../utils/validation';
import { SkeletonTable } from '../components/skeleton';

const emptyConvertForm = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  assignedTo: '',
  profileId: '',
  profileName: '',
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
      profileId: profileToUse?._id || '',
      profileName: profileToUse?.profileName || '',
    });
    setConvertModalOpen(true);
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!convertingRecord) return;
    setConvertError('');

    if (!isValidEmail(convertForm.email)) {
      setConvertError(EMAIL_ERROR_MSG);
      toast.error(EMAIL_ERROR_MSG);
      return;
    }

    if (convertForm.phone && !isValidPhoneNumber(convertForm.phone)) {
      setConvertError(PHONE_ERROR_MSG);
      toast.error(PHONE_ERROR_MSG);
      return;
    }

    setConvertLoading(true);

    try {
      const payload = {
        email: convertForm.email,
        firstName: convertForm.firstName,
        lastName: convertForm.lastName,
        phone: convertForm.phone,
        assignedTo: convertForm.assignedTo,
        profileId: convertForm.profileId,
        profileName: convertForm.profileName,
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
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-200">
            <Clock size={10} className="text-brand-600" />
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
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-page-title text-[#111827]">My Profile</h1>
          <p className="text-page-subtitle mt-0.5">
            Manage your personal account credentials and view candidates/sales leads assigned to you
          </p>
        </div>
      </div>

      {/* Account Details & Password Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info Card */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-section-heading text-[#111827] border-b border-[#E5E7EB] pb-3">
            <User className="text-[#2563EB]" size={18} />
            <span>Account Details</span>
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} className="text-[#98A2B3]" /> Name
              </p>
              <p className="mt-1 text-base font-semibold text-[#111827]">{user?.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider flex items-center gap-1.5">
                <Mail size={14} className="text-[#98A2B3]" /> Email Address
              </p>
              <p className="mt-1 text-sm font-medium text-[#344054]">{user?.email}</p>
            </div>
            {user?.mobileNumber && (
              <div>
                <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider flex items-center gap-1.5">
                  <Phone size={14} className="text-[#98A2B3]" /> Mobile Number
                </p>
                <p className="mt-1 text-sm font-medium text-[#344054]">{user?.mobileNumber}</p>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
              <div>
                <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={14} className="text-[#98A2B3]" /> Role
                </p>
                <span className="mt-1 inline-flex items-center rounded-md bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-semibold capitalize text-[#175CD3] border border-[#B2DDFF]">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-[#98A2B3]" /> Status
                </p>
                <span className="mt-1 inline-flex items-center rounded-full bg-[#ECFDF3] px-2.5 py-0.5 text-xs font-semibold text-[#027A48] border border-[#A6F4C5]">
                  {user?.status || 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-section-heading text-[#111827] border-b border-[#E5E7EB] pb-3">
            <Lock className="text-[#2563EB]" size={18} />
            <span>Change Password</span>
          </h2>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-[#FEF3F2] p-3 text-xs font-medium text-[#B42318] border border-[#FECDCA] flex items-center gap-2">
                <AlertCircle size={16} className="text-[#F04438] shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="rounded-lg bg-[#ECFDF3] p-3 text-xs font-medium text-[#027A48] border border-[#A6F4C5] flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#12B76A] shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <div>
              <label htmlFor="profile-current-password" className="label text-xs font-medium text-[#344054] mb-1 block">
                Current Password *
              </label>
              <input
                id="profile-current-password"
                type="password"
                required
                className="input-field text-xs h-9"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="profile-new-password" className="label text-xs font-medium text-[#344054] mb-1 block">
                New Password *
              </label>
              <input
                id="profile-new-password"
                type="password"
                required
                className="input-field text-xs h-9"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="profile-confirm-password" className="label text-xs font-medium text-[#344054] mb-1 block">
                Confirm New Password *
              </label>
              <input
                id="profile-confirm-password"
                type="password"
                required
                className="input-field text-xs h-9"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="btn-primary w-full h-9 text-xs font-semibold"
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
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5E7EB] pb-4">
            <div>
              <h2 className="text-section-heading text-[#111827] flex items-center gap-2">
                {isMarketing ? <UserCheck className="text-[#2563EB]" size={18} /> : <Briefcase className="text-[#2563EB]" size={18} />}
                <span>{isMarketing ? 'My Assigned Candidates' : 'Sales Team - My Assigned Leads'}</span>
                <span className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-semibold text-[#175CD3] border border-[#B2DDFF]">
                  {filteredAssignedLeads.length} {isMarketing ? (filteredAssignedLeads.length === 1 ? 'Candidate' : 'Candidates') : (filteredAssignedLeads.length === 1 ? 'Lead' : 'Leads')}
                </span>
              </h2>
              <p className="text-page-subtitle text-xs mt-0.5">
                {isMarketing
                  ? 'Converted candidates assigned to you by sales employees for placement, marketing, and client outreach'
                  : 'Leads from the Lead Generation team assigned to you for client engagement and candidate conversion'}
              </p>
            </div>

            <div className="relative sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
              <input
                type="text"
                className="input-field pl-9 py-1.5 text-xs h-9"
                placeholder={isMarketing ? "Search assigned candidates..." : "Search assigned leads..."}
                value={leadsSearch}
                onChange={(e) => setLeadsSearch(e.target.value)}
                aria-label={isMarketing ? "Search assigned candidates" : "Search assigned leads"}
              />
            </div>
          </div>

          {leadsLoading ? (
            <SkeletonTable
              rows={5}
              cardWrapper={false}
              columns={[
                { width: '22%', type: 'avatar-text' },
                { width: '22%', type: 'text', twoLines: true },
                { width: '15%', type: 'badge' },
                { width: '18%', type: 'text' },
                { width: '11%', type: 'badge' },
                { width: '12%', type: 'actions' },
              ]}
            />
          ) : filteredAssignedLeads.length === 0 ? (
            <div className="py-10 text-center rounded-xl bg-[#F9FAFB] border border-dashed border-[#E5E7EB]">
              <Briefcase size={32} className="mx-auto text-[#98A2B3] mb-2" />
              <p className="text-sm font-semibold text-[#111827]">No leads currently assigned</p>
              <p className="text-xs text-[#667085] mt-1 max-w-sm mx-auto">
                When the Lead Generation team assigns candidate leads to you, they will appear right here with full contact profiles.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-[#667085] text-xs uppercase tracking-wider">
                      {isMarketing ? 'Candidate' : 'Sourced By'}
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-[#667085] text-xs uppercase tracking-wider">
                      {isMarketing ? 'Contact Details' : 'Date'}
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-[#667085] text-xs uppercase tracking-wider">
                      {isMarketing ? 'Converted By' : 'Source'}
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-[#667085] text-xs uppercase tracking-wider">
                      {isMarketing ? 'Converted Date' : 'Person Profiles'}
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-[#667085] text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold text-[#667085] w-24">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
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
                        className="group cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-[#111827]">
                          {isMarketing && candidateObj ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#175CD3] border border-[#B2DDFF] font-semibold text-xs uppercase group-hover:bg-[#2563EB] group-hover:text-white transition-colors duration-150">
                                {candidateObj.firstName?.[0] || 'C'}{candidateObj.lastName?.[0] || ''}
                              </div>
                              <span className="group-hover:text-[#2563EB] font-semibold transition-colors duration-150">
                                {candidateObj.firstName} {candidateObj.lastName}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#175CD3] border border-[#B2DDFF] font-semibold text-xs group-hover:bg-[#2563EB] group-hover:text-white transition-colors duration-150">
                                {r.employeeName ? r.employeeName.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <span className="group-hover:text-[#2563EB] font-semibold transition-colors duration-150">
                                {r.employeeName}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#667085] whitespace-nowrap text-xs">
                          {isMarketing && candidateObj ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 font-medium text-[#344054]">
                                <Mail size={12} className="text-[#98A2B3]" />
                                <span>{candidateObj.email}</span>
                              </div>
                              {candidateObj.phone && (
                                <div className="flex items-center gap-1 text-[#667085]">
                                  <Phone size={12} className="text-[#98A2B3]" />
                                  <span>{candidateObj.phone}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            new Date(r.entryDate).toLocaleDateString()
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isMarketing ? (
                            <span className="text-xs font-semibold text-[#344054]">
                              {r.employeeName || 'Sales'}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-[#344054]">
                              {r.leadSource || 'LinkedIn'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isMarketing ? (
                            <span className="text-xs text-[#667085]">
                              {r.convertedAt ? new Date(r.convertedAt).toLocaleDateString() : new Date(r.entryDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-[#2563EB]">
                                {profilesList.length} {profilesList.length === 1 ? 'Profile' : 'Profiles'}
                              </span>
                              {primaryProfile?.profileName && (
                                <span className="text-xs text-[#667085] truncate max-w-[140px]">
                                  ({primaryProfile.profileName})
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isConverted ? (
                            <span
                              className={`text-xs font-semibold ${
                                isCandidateActive
                                  ? 'text-[#027A48]'
                                  : isInviteExpired
                                  ? 'text-[#B54708]'
                                  : 'text-[#175CD3]'
                              }`}
                            >
                              {isCandidateActive ? 'Active Candidate' : isInviteExpired ? 'Invite Expired' : 'Invite Sent'}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-[#667085]">
                              Lead Available
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            {!isMarketing && (
                              <button
                                type="button"
                                onClick={(e) => openStartCallModal(r, primaryProfile, e)}
                                className="inline-flex items-center gap-1 rounded-md bg-[#12B76A] px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-[#0E9355] transition"
                                title="Start a Call"
                              >
                                <PhoneCall size={11} />
                                <span>Call</span>
                              </button>
                            )}

                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] border border-[#B2DDFF] px-2.5 py-1 rounded-md hover:bg-[#DBEAFE] transition-colors">
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
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">
                    Lead Generator
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[#111827]">
                    <User size={15} className="text-[#2563EB]" />
                    <span>{selectedLead.employeeName}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">
                    Entry Date
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[#344054]">
                    <Calendar size={15} className="text-[#667085]" />
                    <span>{new Date(selectedLead.entryDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">
                    Lead Source
                  </span>
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-[#344054] border border-[#E5E7EB] shadow-2xs">
                      <Tag size={11} className="text-[#667085]" />
                      {selectedLead.leadSource || 'LinkedIn'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">
                    Assigned To
                  </span>
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF3] px-2 py-0.5 text-xs font-semibold text-[#027A48] border border-[#A6F4C5]">
                      You ({user?.name})
                    </span>
                  </div>
                </div>
              </div>

              {/* Portal Status Ribbon */}
              <div className="mt-3.5 pt-3 border-t border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#667085]">Candidate Portal:</span>
                  {selectedLead.convertedToCandidateId ? (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        selectedLead.convertedToCandidateId.accountStatus === 'active'
                          ? 'text-[#027A48]'
                          : selectedLead.convertedToCandidateId.tempCredential?.expiresAt &&
                            new Date(selectedLead.convertedToCandidateId.tempCredential.expiresAt) < new Date()
                          ? 'text-[#B54708]'
                          : 'text-[#175CD3]'
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
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#667085]">
                      Not Converted Yet
                    </span>
                  )}
                </div>

                {selectedLead.convertedToCandidateId?.email && (
                  <span className="text-xs text-[#667085] flex items-center gap-1">
                    <Mail size={12} className="text-[#98A2B3]" />
                    Invite sent to:{' '}
                    <strong className="text-[#111827]">{selectedLead.convertedToCandidateId.email}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Person Profiles List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#111827] flex items-center gap-1.5">
                  <Linkedin size={16} className="text-[#0077B5]" />
                  <span>
                    Person Profiles (
                    {selectedLead.linkedInProfiles && selectedLead.linkedInProfiles.length > 0
                      ? selectedLead.linkedInProfiles.length
                      : 1}
                    )
                  </span>
                </h3>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
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
                        className="rounded-xl border border-[#E5E7EB] bg-white p-4 hover:border-[#B2DDFF] transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-[#E5E7EB]">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EFF6FF] text-[#175CD3] font-semibold text-xs border border-[#B2DDFF]">
                              {idx + 1}
                            </div>
                            <h4 className="font-semibold text-[#111827] text-sm">
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
                                className="inline-flex items-center gap-1.5 rounded-md bg-[#12B76A] px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-[#0E9355] transition"
                                title={`Start a call with ${p.profileName || 'this contact'}`}
                              >
                                <PhoneCall size={12} />
                                <span>Start Call</span>
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
                              className="inline-flex items-center gap-1.5 rounded-md bg-[#2563EB] px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-[#1D4ED8] transition"
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
                                className="inline-flex items-center gap-1.5 rounded-md bg-[#2563EB] px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-[#1D4ED8] transition"
                              >
                                <UserPlus size={13} />
                                <span>Convert to Candidate</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                    candidateStatus === 'active'
                                      ? 'text-[#027A48]'
                                      : isInviteExpired
                                      ? 'text-[#B54708]'
                                      : 'text-[#175CD3]'
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
                                    className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5 text-xs font-medium text-[#344054] hover:bg-[#F2F4F7] transition disabled:opacity-50"
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

                        <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-[#344054]">
                          <div className="flex items-center gap-1.5">
                            <Mail size={13} className="text-[#98A2B3] flex-shrink-0" />
                            <span className="text-[#667085]">Email:</span>
                            {p.email ? (
                              <a
                                href={`mailto:${p.email}`}
                                className="font-medium text-[#2563EB] hover:underline"
                              >
                                {p.email}
                              </a>
                            ) : (
                              <span className="italic text-[#98A2B3]">Not provided</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Phone size={13} className="text-[#98A2B3] flex-shrink-0" />
                            <span className="text-[#667085]">Phone:</span>
                            {p.phone ? (
                              <a
                                href={`tel:${p.phone}`}
                                className="font-medium text-[#111827] hover:underline"
                              >
                                {p.phone}
                              </a>
                            ) : (
                              <span className="italic text-[#98A2B3]">Not provided</span>
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
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                    <History size={15} className="text-[#2563EB]" />
                    <span>Call Activity History ({selectedLead.callLogs.length})</span>
                  </span>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {selectedLead.callLogs.map((log, lIdx) => (
                    <div
                      key={lIdx}
                      className="rounded-lg border border-[#E5E7EB] bg-white p-3 text-xs shadow-2xs space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#111827]">
                            {log.profileName || 'Contact'}
                          </span>
                          {renderCallBadge({
                            lastCallStatus: log.outcome,
                            isInterested: log.isInterested,
                            interestStatus: log.interestStatus,
                          })}
                          <span className="rounded-md bg-[#F2F4F7] px-2 py-0.5 text-[10px] font-mono text-[#344054]">
                            ⏱️ {log.callDuration || '00:00'}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#667085]">
                          {new Date(log.callDate || log.createdAt).toLocaleString()} by{' '}
                          <strong className="text-[#111827]">{log.callerName || 'Sales Rep'}</strong>
                        </span>
                      </div>

                      {log.notes && (
                        <p className="text-[#344054] italic bg-[#F9FAFB] p-2 rounded-md border border-[#E5E7EB]">
                          "{log.notes}"
                        </p>
                      )}

                      {log.followUpDate && (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-[#2563EB]">
                          <Calendar size={12} className="text-[#2563EB]" />
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
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5">
                <span className="text-xs font-semibold text-[#111827] flex items-center gap-1.5 mb-1">
                  <FileText size={14} className="text-[#667085]" />
                  <span>Notes & Remarks</span>
                </span>
                <p className="text-xs text-[#344054] whitespace-pre-wrap leading-relaxed">
                  {selectedLead.notes}
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end pt-4 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                className="btn-secondary text-xs h-9"
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
          <p className="text-xs text-[#667085] leading-relaxed">
            Converting this lead will create a new <strong>Candidate</strong> record and dispatch a portal invite email with single-use temporary credentials expiring in 72 hours.
          </p>

          {convertError && (
            <div className="rounded-lg border border-[#FECDCA] bg-[#FEF3F2] p-3 text-xs text-[#B42318] flex items-center gap-2">
              <AlertCircle size={16} className="text-[#F04438] shrink-0" />
              <span>{convertError}</span>
            </div>
          )}

          <div>
            <label htmlFor="convert-email" className="label text-xs font-medium text-[#344054] mb-1 block">
              Candidate Email *
            </label>
            <input
              id="convert-email"
              type="email"
              required
              className="input-field text-xs h-9"
              placeholder="candidate@example.com"
              value={convertForm.email}
              onChange={(e) => setConvertForm({ ...convertForm, email: e.target.value })}
            />
            <p className="mt-1 text-[11px] text-[#667085]">
              The candidate portal access link and temporary password will be delivered here.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="convert-first-name" className="label text-xs font-medium text-[#344054] mb-1 block">
                First Name
              </label>
              <input
                id="convert-first-name"
                className="input-field text-xs h-9"
                value={convertForm.firstName}
                onChange={(e) => setConvertForm({ ...convertForm, firstName: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="convert-last-name" className="label text-xs font-medium text-[#344054] mb-1 block">
                Last Name
              </label>
              <input
                id="convert-last-name"
                className="input-field text-xs h-9"
                value={convertForm.lastName}
                onChange={(e) => setConvertForm({ ...convertForm, lastName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="convert-phone" className="label text-xs font-medium text-[#344054] mb-1 block">
              Phone (Optional)
            </label>
            <input
              id="convert-phone"
              type="tel"
              className="input-field text-xs h-9"
              placeholder="+1 (555) 000-0000"
              value={convertForm.phone}
              onChange={(e) => setConvertForm({ ...convertForm, phone: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="convert-assigned-to" className="label text-xs font-medium text-[#344054] mb-1 block">
              Assigned To (Marketing Recruiter)
            </label>
            <select
              id="convert-assigned-to"
              className="input-field text-xs h-9"
              value={convertForm.assignedTo}
              onChange={(e) => setConvertForm({ ...convertForm, assignedTo: e.target.value })}
            >
              <option value="">-- Select Marketing Employee --</option>
              {marketingTeam.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.designation || (emp.role === 'marketing' ? 'Marketing' : emp.role)}) - {emp.email}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[#667085]">
              The converted candidate will show up in this marketing team member's login and workspace.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => setConvertModalOpen(false)}
              className="btn-secondary text-xs h-9"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={convertLoading || !convertForm.assignedTo}
              className={`btn-primary text-xs h-9 inline-flex items-center gap-2 ${!convertForm.assignedTo ? 'opacity-50 cursor-not-allowed' : ''}`}
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
