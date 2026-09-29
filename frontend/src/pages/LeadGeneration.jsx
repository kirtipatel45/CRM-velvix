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
  Users,
} from "lucide-react";
import { leadGenAPI } from "../services/api";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { isValidEmail, isValidPhoneNumber, EMAIL_ERROR_MSG, PHONE_ERROR_MSG } from "../utils/validation";

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

const emptyForm = {
  employeeName: "",
  leadSource: "LinkedIn",
  assignedTo: "",
  profiles: [{ profileName: "", url: "", email: "", phone: "" }],
  entryDate: new Date().toISOString().split("T")[0],
  notes: "",
};

const emptyConvertForm = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  jobTitle: "",
  experience: "",
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
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
    setCurrentPage(1);
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
      profiles: [{ profileName: "", url: "", email: "", phone: "" }],
      entryDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingId(record._id);

    let initialProfiles = record.linkedInProfiles && record.linkedInProfiles.length > 0
      ? record.linkedInProfiles
      : [{
          profileName: record.linkedInProfileNames ? record.linkedInProfileNames.split("\n")[0] || "" : "",
          url: "", email: "", phone: ""
        }];

    setForm({
      employeeName: record.employeeName || user?.name || "",
      leadSource: record.leadSource || "LinkedIn",
      assignedTo: record.assignedTo?._id || record.assignedTo || "",
      profiles: initialProfiles.map(p => ({
        profileName: p.profileName || "",
        url: p.url || "",
        email: p.email || "",
        phone: p.phone || ""
      })),
      entryDate: record.entryDate?.split("T")[0] || "",
      notes: record.notes || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.email && !isValidEmail(form.email)) {
      toast.error(EMAIL_ERROR_MSG);
      return;
    }

    if (form.phone && !isValidPhoneNumber(form.phone)) {
      toast.error(PHONE_ERROR_MSG);
      return;
    }

    try {
      const profilesData = form.profiles.map(p => ({
        profileName: p.profileName.trim(),
        url: p.url.trim(),
        email: p.email.trim(),
        phone: p.phone.trim(),
      }));

      const payload = {
        employeeName: form.employeeName || user?.name || "Staff User",
        leadSource: form.leadSource || "LinkedIn",
        assignedTo: form.assignedTo || null,
        linkedInAccountsCount: profilesData.length,
        linkedInProfiles: profilesData,
        linkedInProfileNames: profilesData.map(p => p.profileName).filter(Boolean).join(', '),
        entryDate: form.entryDate,
        notes: form.notes,
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
      toast.error(err.response?.data?.message || "Error saving record");
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

  const openConvertModal = (record) => {
    setConvertingRecord(record);
    setConvertError("");

    const targetProfile = record.linkedInProfiles?.[0];
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

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!convertingRecord) return;
    setConvertError("");

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

  const filteredRecords = records.filter((r) => {
    if (!filterSource) return true;
    return r.leadSource === filterSource;
  });

  return (
    <div>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-page-title text-slate-800">Lead Generation Team</h1>
          <p className="text-page-subtitle">
            Manage lead sources, candidate LinkedIn profiles, and sales assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openCreate} className="btn-primary text-button">
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
              className="input-field pl-9 text-body"
              placeholder="Search by creator name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              aria-label="Search by creator name"
            />
          </div>

          <div className="sm:w-48">
            <select
              className="input-field text-body"
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
            className="input-field sm:w-44 text-body"
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
          <div className="py-12 text-center">
            <p className="text-empty-heading text-slate-700 mb-1">No lead entries found</p>
            <p className="text-empty-body">No leads match your current search and filter criteria.</p>
          </div>
        ) : (
          <table className="w-full text-body">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th scope="col" className="text-table-header px-4 py-3 text-left">
                  Lead Generator
                </th>
                <th scope="col" className="text-table-header px-4 py-3 text-left">
                  Date
                </th>
                <th scope="col" className="text-table-header px-4 py-3 text-left">
                  Lead Source
                </th>
                <th scope="col" className="text-table-header px-4 py-3 text-left">
                  Assigned Sales Rep
                </th>
                <th scope="col" className="text-table-header px-4 py-3 text-left">
                  Candidate Profile
                </th>
                <th scope="col" className="text-table-header px-4 py-3 text-left">
                  Candidate Status
                </th>
                <th scope="col" className="text-table-header px-4 py-3 text-right w-24">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((r) => {
                const candidateObj = r.convertedToCandidateId;
                const isConverted = !!candidateObj;
                const isCandidateActive = candidateObj?.accountStatus === 'active';
                const isInviteExpired = candidateObj?.tempCredential?.expiresAt && new Date(candidateObj.tempCredential.expiresAt) < new Date();
                const profiles = r.linkedInProfiles && r.linkedInProfiles.length > 0
                  ? r.linkedInProfiles
                  : (r.linkedInProfileNames ? [{ profileName: r.linkedInProfileNames }] : []);
                const assignedPerson = r.assignedTo;

                return (
                  <tr
                    key={r._id}
                    onClick={() => openLeadDetails(r)}
                    className="group cursor-pointer hover:bg-indigo-50/50 transition-all duration-150"
                  >
                    <td className="px-4 py-3.5 text-body text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-150">
                          {r.employeeName ? r.employeeName.charAt(0).toUpperCase() : "U"}
                        </div>
                        <span className="group-hover:text-indigo-600 font-medium text-body transition-colors duration-150">
                          {r.employeeName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-body text-slate-600 whitespace-nowrap">
                      {new Date(r.entryDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-body text-slate-700">
                        {r.leadSource || "LinkedIn"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {assignedPerson ? (
                        <span className="text-body text-emerald-700 font-medium">
                          {assignedPerson.name}
                        </span>
                      ) : (
                        <span className="text-meta italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {profiles.length > 0 ? (
                        <span className="text-badge inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-blue-700 border border-blue-100">
                          <Users size={12} />
                          {profiles.length} {profiles.length === 1 ? 'Profile' : 'Profiles'}
                        </span>
                      ) : (
                        <span className="text-meta italic">No Profile</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {isConverted ? (
                        <span className={`text-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                          isCandidateActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isInviteExpired
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}>
                          {isCandidateActive ? "Active Candidate" : isInviteExpired ? "Invite Expired" : "Invite Sent"}
                        </span>
                      ) : (
                        <span className="text-badge text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          Lead Available
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end">
                        <span className="text-button inline-flex items-center gap-1 text-indigo-600 opacity-0 -translate-x-2 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:translate-x-0 bg-indigo-50/90 border border-indigo-200/80 px-2.5 py-1 rounded-lg shadow-xs">
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
        {!loading && filteredRecords.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredRecords.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
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

            {/* Candidate Profile Details */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <User size={16} className="text-indigo-600" />
                  Candidate Profile Details
                </h3>
              </div>

              {(selectedLead.linkedInProfiles && selectedLead.linkedInProfiles.length > 0 
                ? selectedLead.linkedInProfiles 
                : [{ profileName: selectedLead.linkedInProfileNames || "Candidate Profile" }]
              ).map((profile, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs mb-3 last:mb-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                          {profile.profileName ? profile.profileName.charAt(0).toUpperCase() : "C"}
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">
                          {profile.profileName || "Unnamed Candidate"}
                        </h4>
                      </div>

                      {!selectedLead.convertedToCandidateId && !profile.convertedToCandidateId && (
                        <button
                          type="button"
                          onClick={() => {
                            setDetailsModalOpen(false);
                            openConvertModal(selectedLead);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-2xs self-start sm:self-auto"
                        >
                          <UserPlus size={13} />
                          <span>Convert to Candidate</span>
                        </button>
                      )}
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Mail size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="text-slate-400 flex-shrink-0">Email:</span>
                        {profile.email ? (
                          <a href={`mailto:${profile.email}`} className="font-medium text-indigo-600 hover:underline truncate" title={profile.email}>
                            {profile.email}
                          </a>
                        ) : (
                          <span className="italic text-slate-400">Not provided</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 min-w-0">
                        <Phone size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="text-slate-400 flex-shrink-0">Phone:</span>
                        {profile.phone ? (
                          <a href={`tel:${profile.phone}`} className="font-medium text-slate-800 hover:underline truncate" title={profile.phone}>
                            {profile.phone}
                          </a>
                        ) : (
                          <span className="italic text-slate-400">Not provided</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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

          {/* Candidate Profile Details Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="pb-2 border-b border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Linkedin size={15} className="text-blue-600" />
                  Candidate Profile Information
                </span>
                <p className="text-[11px] text-slate-500">
                  Profile information associated with this lead.
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                onClick={() => setForm({
                  ...form,
                  profiles: [...(form.profiles || []), { profileName: "", url: "", email: "", phone: "" }]
                })}
              >
                <Plus size={14} /> Add Profile
              </button>
            </div>

            {(form.profiles || []).map((profile, index) => (
              <div key={index} className="space-y-3 p-3 bg-white rounded-lg border border-slate-200 relative group">
                {form.profiles.length > 1 && (
                  <button
                    type="button"
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition p-1"
                    onClick={() => setForm({
                      ...form,
                      profiles: form.profiles.filter((_, i) => i !== index)
                    })}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      Profile Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="input-field py-1.5 text-xs"
                      placeholder="e.g. John Doe"
                      value={profile.profileName}
                      onChange={(e) => {
                        const newProfiles = [...form.profiles];
                        newProfiles[index].profileName = e.target.value;
                        setForm({ ...form, profiles: newProfiles });
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      LinkedIn Profile URL
                    </label>
                    <input
                      type="text"
                      className="input-field py-1.5 text-xs"
                      placeholder="https://linkedin.com/in/username"
                      value={profile.url}
                      onChange={(e) => {
                        const newProfiles = [...form.profiles];
                        newProfiles[index].url = e.target.value;
                        setForm({ ...form, profiles: newProfiles });
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      Email ID
                    </label>
                    <input
                      type="email"
                      className="input-field py-1.5 text-xs"
                      placeholder="candidate@example.com"
                      value={profile.email}
                      onChange={(e) => {
                        const newProfiles = [...form.profiles];
                        newProfiles[index].email = e.target.value;
                        setForm({ ...form, profiles: newProfiles });
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      Phone No
                    </label>
                    <input
                      type="tel"
                      className="input-field py-1.5 text-xs"
                      placeholder="+1 (555) 000-0000"
                      value={profile.phone}
                      onChange={(e) => {
                        const newProfiles = [...form.profiles];
                        newProfiles[index].phone = e.target.value;
                        setForm({ ...form, profiles: newProfiles });
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="convert-job-title" className="label">Job Title (Optional)</label>
              <input
                id="convert-job-title"
                className="input-field"
                placeholder="e.g. Senior React Developer"
                value={convertForm.jobTitle}
                onChange={(e) => setConvertForm({ ...convertForm, jobTitle: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="convert-experience" className="label">Experience (Optional)</label>
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
