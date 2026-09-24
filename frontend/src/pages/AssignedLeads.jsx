import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { leadGenAPI } from "../services/api";
import {
  Briefcase,
  Search,
  Tag,
  User,
  Calendar,
  Linkedin,
  Mail,
  Phone,
  ExternalLink,
  Clock,
  CheckCircle2,
  RefreshCw,
  UserPlus,
  Send,
  MessageSquare,
  ArrowRight,
  FileText,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  Voicemail,
  History,
  LayoutGrid,
  List,
  Columns,
  Sparkles,
  RotateCcw,
  Users,
} from "lucide-react";
import Modal from "../components/Modal";
import StartCallModal from "../components/StartCallModal";
import { toast } from "react-hot-toast";

const LEAD_SOURCES = [
  "LinkedIn",
  "Dice",
  "CareerBuilder",
  "Monster",
  "Indeed",
  "Referral",
  "Cold Outreach",
  "Email Campaign",
  "Other",
];

// Helper to determine if a specific profile or lead has already been converted to a candidate
export const isProfileConverted = (profile, lead) => {
  if (!profile) return false;
  if (profile.convertedToCandidateId) return true;
  if (profile.interestStatus === 'Converted') return true;
  if (profile.isConverted === true) return true;

  const profileEmail = profile.email ? profile.email.trim().toLowerCase() : '';
  if (profileEmail) {
    if (lead?.convertedCandidateIds?.some((c) => {
      const cEmail = typeof c === 'object' ? c?.email : null;
      return cEmail && cEmail.trim().toLowerCase() === profileEmail;
    })) {
      return true;
    }
    if (lead?.convertedToCandidateId) {
      const cEmail = typeof lead.convertedToCandidateId === 'object' ? lead.convertedToCandidateId?.email : null;
      if (cEmail && cEmail.trim().toLowerCase() === profileEmail) {
        return true;
      }
    }
  }

  if (lead?.convertedToCandidateId) {
    const profiles = Array.isArray(lead.linkedInProfiles) ? lead.linkedInProfiles : [];
    if (profiles.length <= 1) {
      return true;
    }
  }

  return false;
};

// Helper to extract only unconverted candidate profiles from a lead
export const getUnconvertedProfiles = (lead) => {
  if (!lead) return [];
  const profiles =
    Array.isArray(lead.linkedInProfiles) && lead.linkedInProfiles.length > 0
      ? lead.linkedInProfiles
      : lead.linkedInProfileNames
      ? [{ profileName: lead.linkedInProfileNames, email: "", phone: "", convertedToCandidateId: lead.convertedToCandidateId }]
      : [];

  return profiles.filter((p) => !isProfileConverted(p, lead));
};

const emptyConvertForm = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  jobTitle: "",
  experience: "",
  assignedTo: "",
  profileId: "",
  profileName: "",
};

export default function AssignedLeads() {
  const { user } = useAuth();
  const [assignedLeads, setAssignedLeads] = useState([]);
  const [marketingTeam, setMarketingTeam] = useState([]);
  const [salesTeam, setSalesTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterAssignedTo, setFilterAssignedTo] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [viewMode, setViewMode] = useState("kanban"); // 'kanban' | 'cards' | 'table'

  // Details Modal State
  const [selectedLead, setSelectedLead] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Start Call Modal State
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [activeCallLead, setActiveCallLead] = useState(null);
  const [activeCallProfile, setActiveCallProfile] = useState(null);

  // Convert to Candidate Modal State
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertingRecord, setConvertingRecord] = useState(null);
  const [convertForm, setConvertForm] = useState(emptyConvertForm);
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertError, setConvertError] = useState("");
  const [resendingId, setResendingId] = useState(null);

  const fetchAssignedLeads = async () => {
    setLoading(true);
    try {
      const res = await leadGenAPI.getMyAssignedLeads();
      const data = res.data.data || [];
      setAssignedLeads(data);

      if (selectedLead) {
        const updated = data.find((l) => l._id === selectedLead._id);
        if (updated) setSelectedLead(updated);
      }
    } catch (err) {
      console.error("Failed to load assigned leads:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketingTeam = async () => {
    try {
      const res = await leadGenAPI.getMarketingTeam();
      setMarketingTeam(res.data.data || []);
    } catch (err) {
      console.error("Failed to load marketing team:", err);
    }
  };

  const fetchSalesTeam = async () => {
    try {
      const res = await leadGenAPI.getSalesTeam();
      setSalesTeam(res.data.data || []);
    } catch (err) {
      console.error("Failed to load sales team:", err);
    }
  };

  useEffect(() => {
    fetchAssignedLeads();
    fetchMarketingTeam();
    if (user?.role === 'admin' || user?.role === 'manager') {
      fetchSalesTeam();
    }
  }, [user?.role]);

  const openLeadDetails = (lead) => {
    setSelectedLead(lead);
    setDetailsModalOpen(true);
  };

  const openConvertModal = (record, targetProfile = null) => {
    setConvertingRecord(record);
    setConvertError("");

    const unconverted = getUnconvertedProfiles(record);
    const profileToUse = targetProfile || unconverted[0] || record.linkedInProfiles?.[0];
    let fName = "";
    let lName = "";
    let emailPrefill = "";
    let phonePrefill = "";

    if (profileToUse) {
      emailPrefill = profileToUse.email || "";
      phonePrefill = profileToUse.phone || "";
      if (profileToUse.profileName) {
        const parts = profileToUse.profileName.trim().split(" ");
        fName = parts[0] || "";
        lName = parts.slice(1).join(" ") || "";
      }
    }

    if (!fName && record.employeeName) {
      const parts = record.employeeName.trim().split(" ");
      fName = parts[0] || "";
      lName = parts.slice(1).join(" ") || "";
    }

    setConvertForm({
      email: emailPrefill,
      firstName: fName,
      lastName: lName,
      phone: phonePrefill,
      assignedTo: record.assignedTo?._id || record.assignedTo || "",
      profileId: profileToUse?._id || "",
      profileName: profileToUse?.profileName || "",
    });
    setConvertModalOpen(true);
  };

  const selectProfileForConversion = (profile) => {
    let fName = "";
    let lName = "";
    if (profile.profileName) {
      const parts = profile.profileName.trim().split(" ");
      fName = parts[0] || "";
      lName = parts.slice(1).join(" ") || "";
    }
    setConvertForm((prev) => ({
      ...prev,
      email: profile.email || "",
      firstName: fName,
      lastName: lName,
      phone: profile.phone || "",
      profileId: profile._id || "",
      profileName: profile.profileName || "",
    }));
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!convertingRecord) return;
    setConvertError("");
    setConvertLoading(true);

    try {
      const payload = {
        ...convertForm,
        jobExperiences:
          convertForm.jobTitle?.trim() || convertForm.experience?.trim()
            ? [
                {
                  jobTitle: convertForm.jobTitle?.trim() || "",
                  experience: convertForm.experience?.trim() || "",
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
      const msg = err.response?.data?.message || "Failed to convert lead to candidate";
      setConvertError(msg);
      toast.error(msg);
    } finally {
      setConvertLoading(false);
    }
  };

  const handleResendInvite = async (record, specificCandidate = null) => {
    const candidateToUse = specificCandidate || record.convertedToCandidateId;
    if (!confirm(`Resend portal invite to ${candidateToUse?.email || 'the candidate'}?`)) return;
    const trackingId = candidateToUse?._id || record._id;
    setResendingId(trackingId);

    try {
      const res = await leadGenAPI.resendCandidateInvite(record._id, { candidateId: candidateToUse?._id });
      toast.success(res.data.message || "Invite email resent successfully!");
      fetchAssignedLeads();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to resend invite";
      toast.error(msg);
    } finally {
      setResendingId(null);
    }
  };

  const openStartCallModal = (lead, profile = null, e = null) => {
    if (e) e.stopPropagation();
    const unconverted = getUnconvertedProfiles(lead);
    const targetProfile = profile || unconverted[0] || null;
    setActiveCallLead(lead);
    setActiveCallProfile(targetProfile);
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
    const followUpDate = item?.followUpDate;

    if (!status || status === "not_called") {
      return (
        <span className="text-xs font-semibold text-slate-500">
          Not Called
        </span>
      );
    }

    if (status === "picked_up") {
      if (interestStatus === "Interested" || isInterested) {
        return (
          <span className="text-xs font-semibold text-emerald-600">
            Picked Up (Interested)
          </span>
        );
      }
      if (interestStatus === "Call Back Later") {
        return (
          <span className="text-xs font-semibold text-indigo-600">
            Call Back Later
          </span>
        );
      }
      return (
        <span className="text-xs font-semibold text-slate-700">
          Picked Up
        </span>
      );
    }

    if (status === "call_cut") {
      return (
        <span className="text-xs font-semibold text-rose-600">
          Call Cut
        </span>
      );
    }

    if (status === "voicemail") {
      return (
        <span className="text-xs font-semibold text-amber-600">
          Voicemail
        </span>
      );
    }

    if (status === "not_answered") {
      return (
        <span className="text-xs font-semibold text-slate-500">
          Not Answered
        </span>
      );
    }

    return null;
  };

  const filteredLeads = assignedLeads.filter((l) => {
    // If logged in as marketing employee, ONLY show converted candidates
    if (user?.role === 'marketing' && !l.convertedToCandidateId) return false;

    // For Leads outreach: Exclude leads where all candidate profiles are already converted
    const unconvertedProfiles = getUnconvertedProfiles(l);

    // If every profile in this lead is already converted to a candidate, hide this lead from Leads page
    if (unconvertedProfiles.length === 0) {
      return false;
    }

    if (filterAssignedTo && l.assignedTo?._id !== filterAssignedTo && l.assignedTo !== filterAssignedTo) {
      return false;
    }
    if (filterSource && l.leadSource !== filterSource) return false;
    if (filterDate) {
      const lDate = new Date(l.entryDate).toISOString().split("T")[0];
      if (lDate !== filterDate) return false;
    }
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    const generatorMatch = l.employeeName?.toLowerCase().includes(term);
    const sourceMatch = l.leadSource?.toLowerCase().includes(term);
    const assignedMatch = l.assignedTo?.name?.toLowerCase().includes(term);
    const profileMatch = unconvertedProfiles.some(
      (p) =>
        p.profileName?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term) ||
        p.phone?.toLowerCase().includes(term)
    );
    return generatorMatch || sourceMatch || assignedMatch || profileMatch;
  });

  // Extract individual unconverted candidate profiles for the 3-column Kanban view
  const kanbanData = useMemo(() => {
    const queueLeads = [];
    const interestedProfiles = [];
    const notInterestedProfiles = [];

    filteredLeads.forEach((lead) => {
      const unconvertedProfiles = getUnconvertedProfiles(lead);
      if (unconvertedProfiles.length === 0) return;

      // Check if lead has any uncalled profiles or pending status for the left queue
      const hasUncalledOrPending = unconvertedProfiles.some(
        (p) =>
          !p.lastCallStatus ||
          p.lastCallStatus === "not_called" ||
          p.interestStatus === "Pending" ||
          p.interestStatus === "Call Back Later" ||
          !p.interestStatus
      );

      if (hasUncalledOrPending) {
        queueLeads.push({
          ...lead,
          linkedInProfiles: unconvertedProfiles,
        });
      }

      // Check individual UNCONVERTED candidate profiles for Interested vs Not Interested
      unconvertedProfiles.forEach((profile) => {
        const isInterested =
          profile.interestStatus === "Interested" ||
          (profile.isInterested === true && profile.interestStatus !== "Not Interested" && profile.interestStatus !== "Converted");

        const isNotInterested = profile.interestStatus === "Not Interested";

        const profileLogs = (lead.callLogs || []).filter(
          (log) =>
            (profile._id && log.profileId?.toString() === profile._id.toString()) ||
            (profile.profileName && log.profileName === profile.profileName)
        );
        const latestLog = profileLogs[0] || null;

        if (isInterested) {
          interestedProfiles.push({
            lead,
            profile,
            latestLog,
          });
        } else if (isNotInterested) {
          notInterestedProfiles.push({
            lead,
            profile,
            latestLog,
          });
        }
      });
    });

    return {
      queueLeads,
      interestedProfiles,
      notInterestedProfiles,
    };
  }, [filteredLeads]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Briefcase className="text-indigo-600" size={26} />
            <span>
              {user?.role === 'marketing'
                ? 'Assigned Candidates'
                : user?.role === 'admin' || user?.role === 'manager'
                ? 'Assigned Leads (All Teams)'
                : 'Assigned Leads'}
            </span>
            <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
              {filteredLeads.length} {user?.role === 'marketing' ? (filteredLeads.length === 1 ? "Candidate" : "Candidates") : (filteredLeads.length === 1 ? "Lead" : "Leads")}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {user?.role === 'marketing'
              ? 'Converted candidates assigned to you for placement, marketing, and candidate follow-up'
              : user?.role === 'admin' || user?.role === 'manager'
              ? 'All leads currently assigned across sales executives for outreach and candidate onboarding'
              : 'Leads assigned to you from the Lead Generation team for outreach, calling, and candidate conversion'}
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === "kanban"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Columns size={14} />
            <span>Kanban</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === "cards"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid size={14} />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === "table"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List size={14} />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card shadow-sm border border-slate-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="input-field pl-9 text-sm"
              placeholder="Search by candidate name, email, phone, generator, or assigned rep..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search assigned leads"
            />
          </div>

          {(user?.role === 'admin' || user?.role === 'manager') && salesTeam.length > 0 && (
            <div className="sm:w-48">
              <select
                className="input-field text-sm"
                value={filterAssignedTo}
                onChange={(e) => setFilterAssignedTo(e.target.value)}
                aria-label="Filter by assigned representative"
              >
                <option value="">All Sales Reps</option>
                {salesTeam.map((rep) => (
                  <option key={rep._id} value={rep._id}>
                    {rep.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="sm:w-44">
            <select
              className="input-field text-sm"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              aria-label="Filter by source"
            >
              <option value="">All Sources</option>
              {LEAD_SOURCES.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          <input
            type="date"
            className="input-field sm:w-44 text-sm"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            aria-label="Filter by date"
          />
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="card text-center py-16 border border-slate-200 shadow-sm">
          <Briefcase size={40} className="mx-auto text-slate-300 mb-2" />
          <p className="text-base font-semibold text-slate-700">No assigned leads found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            When the Lead Generation team assigns leads to you, they will appear here automatically for outreach and calling.
          </p>
        </div>
      ) : viewMode === "kanban" ? (
        /* 3-Column Kanban View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Column 1 (Left): Assigned Leads Queue */}
          <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <h2 className="text-sm font-bold text-slate-800">Leads Queue</h2>
              </div>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                {kanbanData.queueLeads.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 mb-3">
              Uncalled & pending leads waiting for outreach
            </p>

            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
              {kanbanData.queueLeads.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 bg-white/60 rounded-xl border border-dashed border-slate-200">
                  No pending leads in queue
                </div>
              ) : (
                kanbanData.queueLeads.map((lead) => {
                  const profilesList =
                    lead.linkedInProfiles && lead.linkedInProfiles.length > 0
                      ? lead.linkedInProfiles
                      : lead.linkedInProfileNames
                      ? [{ profileName: lead.linkedInProfileNames }]
                      : [];
                  const primaryProfile = profilesList[0];
                  const hasMultipleProfiles = profilesList.length > 1;

                  if (hasMultipleProfiles) {
                    return (
                      <div
                        key={lead._id}
                        onClick={() => openLeadDetails(lead)}
                        className="group relative rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-2.5">
                          <span className="font-semibold text-slate-700">{lead.leadSource || "LinkedIn"}</span>
                          <span>·</span>
                          <span>{new Date(lead.entryDate).toLocaleDateString()}</span>
                        </div>

                        <div className="mb-3.5">
                          <p className="text-sm font-bold text-slate-900 leading-tight">
                            {profilesList.length} profiles waiting for outreach
                          </p>
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            Sourced by: <span className="font-semibold text-slate-700">{lead.employeeName}</span>
                          </p>
                        </div>

                        <div className="pt-2.5 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLeadDetails(lead);
                            }}
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-2 shadow-2xs transition border border-indigo-200/60"
                          >
                            <Users size={13} />
                            <span>View Profiles</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={lead._id}
                      className="group relative rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          <Tag size={10} className="text-slate-500" />
                          {lead.leadSource || "LinkedIn"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(lead.entryDate).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm font-bold text-slate-900 leading-tight">
                          {primaryProfile?.profileName || lead.employeeName || "Lead Contact"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          Sourced by: <span className="font-semibold text-slate-700">{lead.employeeName}</span>
                        </p>
                        {primaryProfile?.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium mt-1">
                            <Phone size={11} className="text-slate-400" />
                            <span>{primaryProfile.phone}</span>
                          </div>
                        )}
                        {primaryProfile?.email && (
                          <div className="flex items-center gap-1.5 text-xs text-indigo-600 truncate mt-0.5">
                            <Mail size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate">{primaryProfile.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => openConvertModal(lead, primaryProfile)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-1.5 shadow-xs transition"
                        >
                          <UserPlus size={13} />
                          <span>Convert to Candidate</span>
                        </button>
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => openStartCallModal(lead, primaryProfile)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-md transition"
                          >
                            <PhoneCall size={12} />
                            <span>Start Call</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openLeadDetails(lead)}
                            className="text-xs font-semibold text-slate-500 hover:text-indigo-600 px-2 py-1"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2 (Middle): Interested Candidates */}
          <div className="flex flex-col rounded-2xl border border-emerald-200/80 bg-emerald-50/30 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-200/70">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <h2 className="text-sm font-bold text-emerald-950">Interested Candidates</h2>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                {kanbanData.interestedProfiles.length}
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-1 mb-3">
              Prospects who picked up and expressed interest
            </p>

            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
              {kanbanData.interestedProfiles.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 bg-white/60 rounded-xl border border-dashed border-emerald-200 p-4">
                  No interested profiles yet.<br />
                  Start a call and mark <strong className="text-emerald-700">Interested</strong> when picked up.
                </div>
              ) : (
                kanbanData.interestedProfiles.map(({ lead, profile, latestLog }) => {
                  const isConverted = !!(profile.convertedToCandidateId || lead.convertedToCandidateId);
                  return (
                    <div
                      key={profile._id || profile.email || profile.profileName}
                      className="rounded-xl border border-emerald-200 bg-white p-4 shadow-xs hover:shadow-md hover:border-emerald-300 transition"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 border border-emerald-200">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          Interested
                        </span>
                        {profile.lastCallDuration && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                            <Clock size={10} />
                            {profile.lastCallDuration}
                          </span>
                        )}
                      </div>

                      <div className="mb-3">
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">
                          {profile.profileName || "Candidate Prospect"}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Source: <span className="font-medium text-slate-700">{lead.leadSource || "LinkedIn"}</span>
                        </p>
                        {profile.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold mt-1.5">
                            <Phone size={12} className="text-emerald-600" />
                            <span>{profile.phone}</span>
                          </div>
                        )}
                        {profile.email && (
                          <div className="flex items-center gap-1.5 text-xs text-indigo-600 truncate mt-0.5">
                            <Mail size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{profile.email}</span>
                          </div>
                        )}
                        {profile.url && (
                          <a
                            href={profile.url.startsWith("http") ? profile.url : `https://${profile.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-1"
                          >
                            <Linkedin size={11} />
                            <span>LinkedIn Profile</span>
                          </a>
                        )}
                      </div>

                      {/* Latest Notes */}
                      {latestLog?.notes && (
                        <div className="mb-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600 italic border border-slate-100">
                          "{latestLog.notes}"
                        </div>
                      )}

                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                        {isConverted ? (
                          <span className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 py-1.5 text-xs font-bold">
                            <CheckCircle2 size={13} />
                            <span>Converted to Candidate</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openConvertModal(lead, profile)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-1.5 shadow-xs transition"
                          >
                            <UserPlus size={13} />
                            <span>Convert to Candidate</span>
                          </button>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => openStartCallModal(lead, profile)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-md transition"
                          >
                            <PhoneCall size={12} />
                            <span>Call Again</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openLeadDetails(lead)}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1"
                          >
                            History
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 3 (Right): Not Interested (with Red / Rose Background) */}
          <div className="flex flex-col rounded-2xl border border-rose-200/90 bg-rose-50/75 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-rose-200">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <h2 className="text-sm font-bold text-rose-950">Not Interested</h2>
              </div>
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 border border-rose-200">
                {kanbanData.notInterestedProfiles.length}
              </span>
            </div>
            <p className="text-[11px] text-rose-700 font-medium mt-1 mb-3">
              Prospects who declined representation or not looking
            </p>

            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
              {kanbanData.notInterestedProfiles.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 bg-white/60 rounded-xl border border-dashed border-rose-200 p-4">
                  No disqualified profiles.<br />
                  Profiles marked <strong className="text-rose-700">Not Interested</strong> will appear here.
                </div>
              ) : (
                kanbanData.notInterestedProfiles.map(({ lead, profile, latestLog }) => (
                  <div
                    key={profile._id || profile.email || profile.profileName}
                    className="rounded-xl border border-rose-200 bg-white p-4 shadow-xs hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 border border-rose-200">
                        <PhoneOff size={10} className="text-rose-600" />
                        Not Interested
                      </span>
                      {profile.lastCallDuration && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                          <Clock size={10} />
                          {profile.lastCallDuration}
                        </span>
                      )}
                    </div>

                    <div className="mb-3">
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {profile.profileName || "Contact"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Source: <span className="font-medium text-slate-700">{lead.leadSource || "LinkedIn"}</span>
                      </p>
                      {profile.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium mt-1.5">
                          <Phone size={12} className="text-slate-400" />
                          <span>{profile.phone}</span>
                        </div>
                      )}
                      {profile.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate mt-0.5">
                          <Mail size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{profile.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Rejection / Call Notes */}
                    {latestLog?.notes ? (
                      <div className="mb-3 rounded-lg bg-rose-50/60 p-2 text-xs text-rose-800 italic border border-rose-100">
                        "{latestLog.notes}"
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => openConvertModal(lead, profile)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-1.5 shadow-xs transition"
                      >
                        <UserPlus size={13} />
                        <span>Convert to Candidate</span>
                      </button>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => openStartCallModal(lead, profile)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-md transition"
                          title="Re-call contact"
                        >
                          <RotateCcw size={12} />
                          <span>Re-engage Call</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openLeadDetails(lead)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1"
                        >
                          Logs
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : viewMode === "cards" ? (
        /* Leads Cards Grid View */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLeads.map((r) => {
            const profilesList = getUnconvertedProfiles(r);
            const primaryProfile = profilesList[0];
            const primaryPhone = primaryProfile?.phone || "";
            const primaryEmail = primaryProfile?.email || "";
            const lastCall = primaryProfile?.lastCallStatus || (r.callLogs && r.callLogs[0]?.outcome) || "not_called";
            const followUp = primaryProfile?.followUpDate || (r.callLogs && r.callLogs[0]?.followUpDate);
            const hasMultipleProfiles = profilesList.length > 1;

            if (hasMultipleProfiles) {
              return (
                <div
                  key={r._id}
                  onClick={() => openLeadDetails(r)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <span className="font-semibold text-slate-700">{r.leadSource || "LinkedIn"}</span>
                        <span>·</span>
                        <span>{new Date(r.entryDate).toLocaleDateString()}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-100">
                        {profilesList.length} Profiles
                      </span>
                    </div>

                    <div className="mt-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Users size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition">
                            {profilesList.length} profiles waiting for outreach
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Sourced by: <span className="font-semibold text-slate-700">{r.employeeName}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openLeadDetails(r);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-2.5 transition border border-indigo-200/60 shadow-2xs"
                    >
                      <Users size={14} />
                      <span>View Profiles</span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={r._id}
                onClick={() => openLeadDetails(r)}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div>
                  {/* Top Bar: Generator & Date */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition">
                        {r.employeeName ? r.employeeName.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block leading-tight">
                          {r.employeeName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(r.entryDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
                      <Tag size={10} className="text-slate-500" />
                      {r.leadSource || "LinkedIn"}
                    </span>
                  </div>

                  {/* Primary Profile / Candidate Contact */}
                  <div className="mt-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition truncate">
                        {primaryProfile?.profileName || "Lead Contact"}
                      </h3>
                      <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex-shrink-0">
                        {profilesList.length} {profilesList.length === 1 ? "Profile" : "Profiles"}
                      </span>
                    </div>

                    {/* Contact details */}
                    <div className="space-y-1 text-xs text-slate-600">
                      {primaryPhone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-slate-800">{primaryPhone}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 italic">
                          <Phone size={12} />
                          <span>No phone number</span>
                        </div>
                      )}

                      {primaryEmail ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="text-indigo-600 truncate">{primaryEmail}</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Status Badges */}
                    <div className="pt-2 flex flex-wrap items-center gap-1.5">
                      {renderCallBadge(primaryProfile || r)}

                      {followUp && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200">
                          <Calendar size={10} className="text-purple-600" />
                          Follow-up: {new Date(followUp).toLocaleDateString()} {new Date(followUp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Card Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {/* Start a Call Action Button */}
                  <button
                    type="button"
                    onClick={(e) => openStartCallModal(r, primaryProfile, e)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                    title="Start a call and record duration & outcome"
                  >
                    <PhoneCall size={13} />
                    <span>Start a Call</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openConvertModal(r, primaryProfile);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                      title="Convert to candidate"
                    >
                      <UserPlus size={12} />
                      <span>Convert</span>
                    </button>

                    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-slate-500 hover:text-indigo-600 px-2 py-1.5 transition">
                      <span>View</span>
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Leads Table View */
        <div className="card overflow-x-auto p-0 shadow-sm border border-slate-200">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Sourced By
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Lead Source
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Person Profiles
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Call Status
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Lead Status
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-400 w-44">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredLeads.map((r) => {
                const profilesList = getUnconvertedProfiles(r);
                const primaryProfile = profilesList[0];

                return (
                  <tr
                    key={r._id}
                    onClick={() => openLeadDetails(r)}
                    className="group cursor-pointer hover:bg-indigo-50/50 transition-all duration-150"
                  >
                    <td className="px-4 py-3.5 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-150">
                          {r.employeeName ? r.employeeName.charAt(0).toUpperCase() : "U"}
                        </div>
                        <span className="group-hover:text-indigo-600 font-semibold transition-colors duration-150">
                          {r.employeeName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap text-xs">
                      {new Date(r.entryDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold text-slate-700">
                        {r.leadSource || "LinkedIn"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-blue-700">
                          {profilesList.length} {profilesList.length === 1 ? "Profile" : "Profiles"}
                        </span>
                        {primaryProfile?.profileName && (
                          <span className="text-xs text-slate-600 truncate max-w-[140px]">
                            ({primaryProfile.profileName})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {renderCallBadge(primaryProfile || r)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-medium text-slate-500">
                        Available for Outreach
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => openStartCallModal(r, primaryProfile, e)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                          title="Start a Call"
                        >
                          <PhoneCall size={12} />
                          <span>Call</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openConvertModal(r, primaryProfile);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 text-xs font-semibold hover:bg-indigo-100 transition shadow-xs"
                          title="Convert to candidate"
                        >
                          <UserPlus size={12} />
                          <span>Convert</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                      {selectedLead.leadSource || "LinkedIn"}
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
            </div>

            {/* Person Profiles List */}
            <div className="space-y-2.5">
              {(() => {
                const profiles = getUnconvertedProfiles(selectedLead);
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Linkedin size={16} className="text-blue-600" />
                        Unconverted Person Profiles ({profiles.length})
                      </h3>
                    </div>

                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {profiles.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          All profiles in this lead have been converted to candidates and moved to the Candidates module.
                        </div>
                      ) : (
                        profiles.map((p, idx) => (
                          <div
                            key={p._id || idx}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-indigo-200 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-slate-100">
                              <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                                  {idx + 1}
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm">
                                  {p.profileName || "Unnamed Person"}
                                </h4>
                                {renderCallBadge(p)}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                                {/* Start a Call Action Button */}
                                <button
                                  type="button"
                                  onClick={() => openStartCallModal(selectedLead, p)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                                  title={`Start a phone call with ${p.profileName || "this contact"}`}
                                >
                                  <PhoneCall size={12} />
                                  <span>Start a Call</span>
                                </button>

                                {/* Message on LinkedIn Button */}
                                <a
                                  href={
                                    p.url
                                      ? (p.url.startsWith("http") ? p.url : `https://${p.url}`)
                                      : p.profileName
                                      ? `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(p.profileName)}`
                                      : "https://www.linkedin.com/messaging/"
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
                                  title={`Open LinkedIn to message ${p.profileName || "this person"}`}
                                >
                                  <MessageSquare size={12} />
                                  <span>LinkedIn</span>
                                </a>

                                {/* Convert to Candidate Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailsModalOpen(false);
                                    openConvertModal(selectedLead, p);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                                >
                                  <UserPlus size={13} />
                                  <span>Convert</span>
                                </button>
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
                        ))
                      )}
                    </div>
                  </>
                );
              })()}
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
                            {log.profileName || "Contact"}
                          </span>
                          {renderCallBadge({
                            lastCallStatus: log.outcome,
                            isInterested: log.isInterested,
                            interestStatus: log.interestStatus,
                          })}
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                            ⏱️ {log.callDuration || "00:00"}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(log.callDate || log.createdAt).toLocaleString()} by{" "}
                          <strong className="text-slate-700">{log.callerName || "Sales Rep"}</strong>
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

          {/* If lead has multiple unconverted profiles, show selectable chips */}
          {(() => {
            const unconvertedChips = getUnconvertedProfiles(convertingRecord);
            if (unconvertedChips.length <= 1) return null;
            return (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Select Profile to Pre-fill:
                </span>
                <div className="flex flex-wrap gap-2">
                  {unconvertedChips.map((prof, pIdx) => (
                    <button
                      key={prof._id || pIdx}
                      type="button"
                      onClick={() => selectProfileForConversion(prof)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition ${
                        (convertForm.profileId && convertForm.profileId === prof._id) ||
                        (convertForm.email === prof.email && prof.email)
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-300 hover:border-indigo-400"
                      }`}
                    >
                      {prof.profileName || `Profile #${pIdx + 1}`} {prof.email ? `(${prof.email})` : ""}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

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
