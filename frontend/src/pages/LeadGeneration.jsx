import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  UserPlus,
  Send,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  User,
  Linkedin,
  Mail,
  Phone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Tag,
  Eye,
  Calendar,
  FileText,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { leadGenAPI } from "../services/api";
import Modal from "../components/Modal";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

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

const emptyProfile = {
  profileName: "",
  url: "",
  email: "",
  phone: "",
};

const emptyForm = {
  employeeName: "",
  leadSource: "LinkedIn",
  assignedTo: "",
  linkedInAccountsCount: 1,
  linkedInProfiles: [{ ...emptyProfile }],
  entryDate: new Date().toISOString().split("T")[0],
  notes: "",
};

const emptyConvertForm = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  assignedTo: "",
};

export default function LeadGeneration() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [salesTeam, setSalesTeam] = useState([]);
  const [marketingTeam, setMarketingTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterDate, setFilterDate] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [expandedProfiles, setExpandedProfiles] = useState({});

  // Lead Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // Convert to Candidate Modal State
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertingRecord, setConvertingRecord] = useState(null);
  const [convertForm, setConvertForm] = useState(emptyConvertForm);
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertError, setConvertError] = useState("");
  const [resendingId, setResendingId] = useState(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (searchName) params.employeeName = searchName;
      const res = await leadGenAPI.getAll(params);
      const data = res.data.data || [];
      setRecords(data);

      // Keep selectedLead updated if modal is currently open
      if (selectedLead) {
        const updated = data.find((r) => r._id === selectedLead._id);
        if (updated) setSelectedLead(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  const fetchMarketingTeam = async () => {
    try {
      const res = await leadGenAPI.getMarketingTeam();
      setMarketingTeam(res.data.data || []);
    } catch (err) {
      console.error("Failed to load marketing team:", err);
    }
  };

  useEffect(() => {
    fetchSalesTeam();
    fetchMarketingTeam();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [filterDate, searchName]);

  const openLeadDetails = (record) => {
    setSelectedLead(record);
    setDetailsModalOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      employeeName: user?.name || "",
      leadSource: "LinkedIn",
      assignedTo: "",
      linkedInProfiles: [{ ...emptyProfile }],
      linkedInAccountsCount: 1,
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingId(record._id);

    // Extract structured profiles or fallback
    let parsedProfiles = [{ ...emptyProfile }];
    if (record.linkedInProfiles && record.linkedInProfiles.length > 0) {
      parsedProfiles = record.linkedInProfiles.map((p) => ({
        profileName: p.profileName || "",
        url: p.url || "",
        email: p.email || "",
        phone: p.phone || "",
      }));
    } else if (record.linkedInProfileNames) {
      parsedProfiles = record.linkedInProfileNames
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => ({
          profileName: line.trim(),
          url: "",
          email: "",
          phone: "",
        }));
      if (parsedProfiles.length === 0) {
        parsedProfiles = [{ ...emptyProfile }];
      }
    }

    setForm({
      employeeName: record.employeeName || user?.name || "",
      leadSource: record.leadSource || "LinkedIn",
      assignedTo: record.assignedTo?._id || record.assignedTo || "",
      linkedInAccountsCount: record.linkedInAccountsCount || parsedProfiles.length,
      linkedInProfiles: parsedProfiles,
      entryDate: record.entryDate?.split("T")[0] || "",
      notes: record.notes || "",
    });
    setModalOpen(true);
  };

  // Multiple Profile Handlers
  const addProfileRow = () => {
    setForm((prev) => {
      const updated = [...prev.linkedInProfiles, { ...emptyProfile }];
      return {
        ...prev,
        linkedInProfiles: updated,
        linkedInAccountsCount: updated.length,
      };
    });
  };

  const removeProfileRow = (index) => {
    setForm((prev) => {
      const updated = prev.linkedInProfiles.filter((_, idx) => idx !== index);
      const finalProfiles = updated.length > 0 ? updated : [{ ...emptyProfile }];
      return {
        ...prev,
        linkedInProfiles: finalProfiles,
        linkedInAccountsCount: finalProfiles.length,
      };
    });
  };

  const updateProfileRow = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.linkedInProfiles];
      updated[index] = { ...updated[index], [field]: value };
      return {
        ...prev,
        linkedInProfiles: updated,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        employeeName: form.employeeName || user?.name || "Staff User",
        leadSource: form.leadSource || "LinkedIn",
        assignedTo: form.assignedTo || null,
        linkedInAccountsCount: form.linkedInProfiles.length || form.linkedInAccountsCount || 1,
      };

      if (editingId) {
        await leadGenAPI.update(editingId, payload);
        toast.success("Lead updated successfully!");
      } else {
        await leadGenAPI.create(payload);
        toast.success("Lead created successfully!");
      }

      setModalOpen(false);
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.message || "Error saving record");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this lead record? This action cannot be undone.")) return;
    try {
      await leadGenAPI.delete(id);
      toast.success("Lead deleted successfully");
      if (selectedLead?._id === id) {
        setDetailsModalOpen(false);
        setSelectedLead(null);
      }
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete record");
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (searchName) params.employeeName = searchName;
      const res = await leadGenAPI.export(params);

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'lead-generation.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Error exporting data');
    }
  };

  const openConvertModal = (record, specificProfile = null) => {
    setConvertingRecord(record);
    setConvertError("");

    const targetProfile = specificProfile || record.linkedInProfiles?.[0];
    let fName = "";
    let lName = "";
    let emailPrefill = "";
    let phonePrefill = "";

    if (targetProfile) {
      emailPrefill = targetProfile.email || "";
      phonePrefill = targetProfile.phone || "";
      if (targetProfile.profileName) {
        const parts = targetProfile.profileName.trim().split(" ");
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
    setConvertForm({
      email: profile.email || "",
      firstName: fName,
      lastName: lName,
      phone: profile.phone || "",
    });
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!convertingRecord) return;
    setConvertError("");
    setConvertLoading(true);

    try {
      const res = await leadGenAPI.convertToCandidate(convertingRecord._id, convertForm);
      toast.success(res.data.message || `Candidate created! Invite sent to ${convertForm.email}`);
      setConvertModalOpen(false);
      setConvertingRecord(null);
      fetchRecords();
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
      fetchRecords();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to resend invite";
      toast.error(msg);
    } finally {
      setResendingId(null);
    }
  };

  const toggleProfileExpand = (id) => {
    setExpandedProfiles((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredRecords = records.filter((r) => {
    if (!filterSource) return true;
    return r.leadSource === filterSource;
  });

  return (
    <div>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lead Generation Team</h1>
          <p className="text-slate-500 text-sm">
            Manage lead sources, candidate LinkedIn profiles, and sales assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} className="mr-2" />
            Add Lead Entry
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card mb-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="leadgen-search"
              className="input-field pl-9"
              placeholder="Search by creator name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              aria-label="Search by creator name"
            />
          </div>

          <div className="sm:w-48">
            <select
              className="input-field"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              aria-label="Filter by source"
            >
              <option value="">All Lead Sources</option>
              {LEAD_SOURCES.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          <input
            id="leadgen-date-filter"
            type="date"
            className="input-field sm:w-44"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            aria-label="Filter by date"
          />
        </div>
      </div>

      {/* Leads Table */}
      <div className="card overflow-x-auto p-0 shadow-sm border border-slate-200">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <p className="py-12 text-center text-slate-500">No lead entries found</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">
                  Lead Generator
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">
                  Lead Source
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">
                  Assigned Sales Rep
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">
                  LinkedIn Profiles
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">
                  Candidate Status
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-400 w-24">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((r) => {
                const candidateObj = r.convertedToCandidateId;
                const isConverted = !!candidateObj;
                const isCandidateActive = candidateObj?.accountStatus === 'active';
                const isInviteExpired = candidateObj?.tempCredential?.expiresAt && new Date(candidateObj.tempCredential.expiresAt) < new Date();
                const profilesList = r.linkedInProfiles && r.linkedInProfiles.length > 0
                  ? r.linkedInProfiles
                  : (r.linkedInProfileNames ? [{ profileName: r.linkedInProfileNames }] : []);
                const primaryProfile = profilesList[0];
                const assignedPerson = r.assignedTo;

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
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                      {new Date(r.entryDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200 shadow-xs">
                        <Tag size={11} className="text-slate-500" />
                        {r.leadSource || "LinkedIn"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {assignedPerson ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200 shadow-xs">
                          <UserCheck size={12} className="text-emerald-600" />
                          {assignedPerson.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200 shadow-xs">
                          <Linkedin size={12} className="text-blue-600" />
                          {profilesList.length} {profilesList.length === 1 ? "Profile" : "Profiles"}
                        </span>
                        {primaryProfile?.profileName && (
                          <span className="text-xs text-slate-600 truncate max-w-[140px]">
                            {primaryProfile.profileName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {isConverted ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-xs ${
                          isCandidateActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isInviteExpired
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        }`}>
                          <CheckCircle2 size={12} />
                          {isCandidateActive ? "Active Candidate" : isInviteExpired ? "Invite Expired" : "Invite Sent"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                          <Clock size={11} className="text-slate-400" />
                          Lead Available
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 opacity-0 -translate-x-2 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:translate-x-0 bg-indigo-50/90 border border-indigo-200/80 px-2.5 py-1 rounded-lg shadow-xs">
                          <span>Open</span>
                          <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Lead Details Pop-up Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Lead Details & Actions"
        size="lg"
      >
        {selectedLead && (
          <div className="space-y-5">
            {/* Overview Banner Card */}
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Lead Generator</span>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                    <User size={15} className="text-indigo-600" />
                    <span>{selectedLead.employeeName}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Entry Date</span>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <Calendar size={15} className="text-slate-500" />
                    <span>{new Date(selectedLead.entryDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Lead Source</span>
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200 shadow-xs">
                      <Tag size={11} className="text-slate-500" />
                      {selectedLead.leadSource || "LinkedIn"}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Assigned Sales Rep</span>
                  <div className="mt-1">
                    {selectedLead.assignedTo ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        <UserCheck size={12} className="text-emerald-600" />
                        {selectedLead.assignedTo.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Portal Status Ribbon */}
              <div className="mt-3.5 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Candidate Portal:</span>
                  {selectedLead.convertedToCandidateId ? (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      selectedLead.convertedToCandidateId.accountStatus === 'active'
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : selectedLead.convertedToCandidateId.tempCredential?.expiresAt && new Date(selectedLead.convertedToCandidateId.tempCredential.expiresAt) < new Date()
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200"
                    }`}>
                      <CheckCircle2 size={12} />
                      {selectedLead.convertedToCandidateId.accountStatus === 'active'
                        ? "Active Candidate"
                        : selectedLead.convertedToCandidateId.tempCredential?.expiresAt && new Date(selectedLead.convertedToCandidateId.tempCredential.expiresAt) < new Date()
                        ? "Invite Expired"
                        : "Portal Invite Dispatched"}
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
                    Invite sent to: <strong className="text-slate-700">{selectedLead.convertedToCandidateId.email}</strong>
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
                  {(selectedLead.linkedInProfiles && selectedLead.linkedInProfiles.length > 0)
                    ? selectedLead.linkedInProfiles.length
                    : 1}
                  )
                </h3>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {(() => {
                  const profiles = (selectedLead.linkedInProfiles && selectedLead.linkedInProfiles.length > 0)
                    ? selectedLead.linkedInProfiles
                    : (selectedLead.linkedInProfileNames
                        ? selectedLead.linkedInProfileNames.split("\n").filter(Boolean).map(n => ({ profileName: n }))
                        : [{ profileName: "Lead Person Profile" }]);

                  return profiles.map((p, idx) => {
                    const convertedObj =
                      (p.convertedToCandidateId && typeof p.convertedToCandidateId === 'object' ? p.convertedToCandidateId : null) ||
                      (selectedLead.convertedCandidateIds?.find((c) => c?.email && p.email && c.email.toLowerCase() === p.email.toLowerCase())) ||
                      (selectedLead.convertedToCandidateId?.email && p.email && selectedLead.convertedToCandidateId.email.toLowerCase() === p.email.toLowerCase()
                        ? selectedLead.convertedToCandidateId
                        : null);

                    const isProfileConverted = !!convertedObj;
                    const candidateStatus = convertedObj?.accountStatus;
                    const isInviteExpired =
                      convertedObj?.tempCredential?.expiresAt &&
                      new Date(convertedObj.tempCredential.expiresAt) < new Date();

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
                              {p.profileName || "Unnamed Person"}
                            </h4>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
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
                              <span>Message on LinkedIn</span>
                            </a>

                            {/* Convert to Candidate Button inside each person profile box */}
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
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                  candidateStatus === 'active'
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : isInviteExpired
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                }`}>
                                  <CheckCircle2 size={12} />
                                  {candidateStatus === 'active'
                                    ? "Active Candidate"
                                    : isInviteExpired
                                    ? "Invite Expired"
                                    : "Portal Invite Sent"}
                                </span>
                                {candidateStatus !== 'active' && (
                                  <button
                                    type="button"
                                    onClick={() => handleResendInvite(selectedLead, convertedObj)}
                                    disabled={resendingId === (convertedObj?._id || selectedLead._id)}
                                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                                    title="Resend 72-hour invite email"
                                  >
                                    <RefreshCw size={11} className={resendingId === (convertedObj?._id || selectedLead._id) ? "animate-spin" : ""} />
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
                              <a href={`mailto:${p.email}`} className="font-medium text-indigo-600 hover:underline">
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
                              <a href={`tel:${p.phone}`} className="font-medium text-slate-800 hover:underline">
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

            {/* Pop-up Action Buttons Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                {/* Edit Button */}
                {(user?.role === 'admin' || user?.role === 'manager' || user?._id === (selectedLead.createdBy?._id || selectedLead.createdBy)) && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailsModalOpen(false);
                        openEdit(selectedLead);
                      }}
                      className="btn-secondary inline-flex items-center gap-1.5"
                    >
                      <Pencil size={14} />
                      <span>Edit</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedLead._id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 hover:border-red-300 transition"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setDetailsModalOpen(false)}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit / Create Lead Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Lead Generation Entry" : "New Lead Generation Entry"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Employee Name - Auto-filled from Logged-in User */}
            <div>
              <label className="label">Employee Name</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100/90 px-3 py-2 text-sm font-medium text-slate-800 shadow-inner">
                <User size={16} className="text-indigo-600 flex-shrink-0" />
                <span className="truncate">{form.employeeName || user?.name || "Staff User"}</span>
                <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
                  Auto-filled
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="lg-entry-date" className="label">Entry Date</label>
              <input
                id="lg-entry-date"
                type="date"
                className="input-field"
                value={form.entryDate}
                onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
              />
            </div>

            {/* Lead Source Dropdown */}
            <div>
              <label htmlFor="lg-lead-source" className="label">Lead Source *</label>
              <select
                id="lg-lead-source"
                className="input-field"
                value={form.leadSource}
                onChange={(e) => setForm({ ...form, leadSource: e.target.value })}
                required
              >
                {LEAD_SOURCES.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned To Sales Department Dropdown */}
            <div>
              <label htmlFor="lg-assigned-to" className="label">
                Assigned To (Sales Department)
              </label>
              <select
                id="lg-assigned-to"
                className="input-field"
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              >
                <option value="">-- Unassigned --</option>
                {salesTeam.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.role?.toUpperCase()})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                Select a Sales Executive to handle follow-up and outreach.
              </p>
            </div>
          </div>

          {/* Multiple Person Profiles Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200">
              <div>
                <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Linkedin size={15} className="text-blue-600" />
                  Person Profiles
                </span>
                <p className="text-[11px] text-slate-500">
                  Add one or multiple persons' profiles for this lead.
                </p>
              </div>
              <button
                type="button"
                onClick={addProfileRow}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-sm self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>Add Profile</span>
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {form.linkedInProfiles.map((p, idx) => (
                <div
                  key={idx}
                  className="relative rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-sm transition hover:border-indigo-300"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                        {idx + 1}
                      </span>
                      Profile Information
                    </span>
                    {form.linkedInProfiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeProfileRow(idx)}
                        className="text-slate-400 hover:text-red-600 p-1 transition rounded hover:bg-red-50"
                        title="Remove profile"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Profile Name</label>
                      <input
                        type="text"
                        className="input-field py-1.5 text-xs"
                        placeholder="e.g. John Doe"
                        value={p.profileName}
                        onChange={(e) => updateProfileRow(idx, "profileName", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 mb-1 block">LinkedIn Profile URL</label>
                      <input
                        type="text"
                        className="input-field py-1.5 text-xs"
                        placeholder="https://linkedin.com/in/username"
                        value={p.url}
                        onChange={(e) => updateProfileRow(idx, "url", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Email ID</label>
                      <input
                        type="email"
                        className="input-field py-1.5 text-xs"
                        placeholder="candidate@example.com"
                        value={p.email}
                        onChange={(e) => updateProfileRow(idx, "email", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Phone No</label>
                      <input
                        type="tel"
                        className="input-field py-1.5 text-xs"
                        placeholder="+1 (555) 000-0000"
                        value={p.phone}
                        onChange={(e) => updateProfileRow(idx, "phone", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="lg-notes" className="label">Notes</label>
            <textarea
              id="lg-notes"
              className="input-field"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingId ? "Update Entry" : "Create Entry"}
            </button>
          </div>
        </form>
      </Modal>

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
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-300 hover:border-indigo-400"
                    }`}
                  >
                    {prof.profileName || `Profile #${pIdx + 1}`} {prof.email ? `(${prof.email})` : ""}
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
            <label htmlFor="convert-email" className="label">Candidate Email *</label>
            <input
              id="convert-email"
              type="email"
              required
              className="input-field"
              placeholder="candidate@example.com"
              value={convertForm.email}
              onChange={(e) => setConvertForm({ ...convertForm, email: e.target.value })}
            />
            <p className="mt-1 text-[11px] text-slate-400">The candidate portal access link and temporary password will be delivered here.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="convert-first-name" className="label">First Name</label>
              <input
                id="convert-first-name"
                className="input-field"
                value={convertForm.firstName}
                onChange={(e) => setConvertForm({ ...convertForm, firstName: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="convert-last-name" className="label">Last Name</label>
              <input
                id="convert-last-name"
                className="input-field"
                value={convertForm.lastName}
                onChange={(e) => setConvertForm({ ...convertForm, lastName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="convert-phone" className="label">Phone (Optional)</label>
            <input
              id="convert-phone"
              type="tel"
              className="input-field"
              placeholder="+1 (555) 000-0000"
              value={convertForm.phone}
              onChange={(e) => setConvertForm({ ...convertForm, phone: e.target.value })}
            />
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
