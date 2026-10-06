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
import { SkeletonTable } from "../components/skeleton";

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
  assignedTo: "",
  profileId: "",
  profileName: "",
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

  const handleDelete = async (id, e = null) => {
    if (e) e.stopPropagation();
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

  const openConvertModal = (record, targetProfile = null) => {
    setConvertingRecord(record);
    setConvertError("");

    const target = targetProfile || (record.linkedInProfiles && record.linkedInProfiles[0]) || null;
    let fName = "";
    let lName = "";
    let emailPrefill = target?.email || "";
    let phonePrefill = target?.phone || "";

    if (target?.profileName) {
      const parts = target.profileName.trim().split(" ");
      fName = parts[0] || "";
      lName = parts.slice(1).join(" ") || "";
    } else if (record.employeeName) {
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
      profileId: target?._id || "",
      profileName: target?.profileName || "",
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
    <div className="space-y-6 pb-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-page-title text-[#111827]">Lead Generation</h1>
          <p className="text-page-subtitle mt-0.5">
            Manage lead sources, candidate LinkedIn profiles, and sales assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openCreate} className="btn-primary text-xs h-9">
            <Plus size={16} />
            <span>Add Lead Entry</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]"
          />
          <input
            id="leadgen-search"
            className="input-field pl-9 text-xs"
            placeholder="Search by creator name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            aria-label="Search by creator name"
          />
        </div>

        <div className="sm:w-48">
          <select
            className="input-field text-xs h-9"
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
          className="input-field sm:w-44 text-xs h-9"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          aria-label="Filter by date"
        />
      </div>

      {/* Leads Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonTable
              rows={7}
              cardWrapper={false}
              columns={[
                { width: '15%', type: 'avatar-text' },
                { width: '10%', type: 'text' },
                { width: '12%', type: 'badge' },
                { width: '15%', type: 'text' },
                { width: '15%', type: 'text' },
                { width: '13%', type: 'text' },
                { width: '10%', type: 'badge' },
                { width: '10%', type: 'actions' },
              ]}
            />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-empty-heading text-slate-700 mb-1">No lead entries found</p>
            <p className="text-empty-body">No leads match your current search and filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <tr>
                  <th scope="col" className="text-table-header px-4 py-3">
                    Lead Generator
                  </th>
                  <th scope="col" className="text-table-header px-4 py-3">
                    Date
                  </th>
                  <th scope="col" className="text-table-header px-4 py-3">
                    Lead Source
                  </th>
                  <th scope="col" className="text-table-header px-4 py-3">
                    Assigned Sales Rep
                  </th>
                  <th scope="col" className="text-table-header px-4 py-3">
                    Candidate Profile
                  </th>
                  <th scope="col" className="text-table-header px-4 py-3">
                    Candidate Status
                  </th>
                  <th scope="col" className="text-table-header px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
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
                      className="group cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                    >
                      <td className="px-4 py-3.5 text-[#111827]">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF6FF] border border-[#B2DDFF] text-[#175CD3] font-semibold text-xs shrink-0">
                            {r.employeeName ? r.employeeName.charAt(0).toUpperCase() : "U"}
                          </div>
                          <span className="group-hover:text-[#2563EB] font-medium transition-colors">
                            {r.employeeName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[#667085] whitespace-nowrap">
                        {new Date(r.entryDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-[#344054]">
                        {r.leadSource || "LinkedIn"}
                      </td>
                      <td className="px-4 py-3.5">
                        {assignedPerson ? (
                          <span className="text-[#12B76A] font-medium">
                            {assignedPerson.name}
                          </span>
                        ) : (
                          <span className="text-[#98A2B3] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {profiles.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded bg-[#F9FAFB] border border-[#E5E7EB] px-2 py-0.5 text-[#344054]">
                            <Users size={12} className="text-[#667085]" />
                            {profiles.length} {profiles.length === 1 ? 'Profile' : 'Profiles'}
                          </span>
                        ) : (
                          <span className="text-[#98A2B3] italic">No Profile</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {isConverted ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                            isCandidateActive
                              ? "text-[#027A48]"
                              : isInviteExpired
                              ? "text-[#B54708]"
                              : "text-[#175CD3]"
                          }`}>
                            {isCandidateActive ? "Active Candidate" : isInviteExpired ? "Invite Expired" : "Invite Sent"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium text-[#667085]">
                            Lead Available
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          {user?.role === 'admin' && (
                            <button
                              type="button"
                              onClick={(e) => handleDelete(r._id, e)}
                              className="p-1 text-[#98A2B3] hover:text-[#F04438] rounded transition"
                              title="Delete Lead"
                              aria-label={`Delete lead for ${r.employeeName}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <span className="text-xs font-medium text-[#2563EB] group-hover:underline inline-flex items-center gap-0.5">
                            Open <ArrowRight size={12} />
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
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">Lead Generator</span>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[#111827]">
                    <User size={15} className="text-[#2563EB]" />
                    <span>{selectedLead.employeeName}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">Entry Date</span>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[#111827]">
                    <Calendar size={15} className="text-[#667085]" />
                    <span>{new Date(selectedLead.entryDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">Lead Source</span>
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#111827] ">
                      <Tag size={11} className="text-[#667085]" />
                      {selectedLead.leadSource || "LinkedIn"}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">Assigned Sales Rep</span>
                  <div className="mt-1">
                    {selectedLead.assignedTo ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF3] px-2 py-0.5 text-xs font-semibold text-[#027A48] border border-[#A6F4C5]">
                        <UserCheck size={12} className="text-[#12B76A]" />
                        {selectedLead.assignedTo.name}
                      </span>
                    ) : (
                      <span className="text-xs text-[#98A2B3] italic">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Portal Status Ribbon */}
              <div className="mt-3.5 pt-3 border-t border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#667085]">Candidate Portal:</span>
                  {selectedLead.convertedToCandidateId ? (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      selectedLead.convertedToCandidateId.accountStatus === 'active'
                        ? "text-[#027A48]"
                        : selectedLead.convertedToCandidateId.tempCredential?.expiresAt && new Date(selectedLead.convertedToCandidateId.tempCredential.expiresAt) < new Date()
                        ? "text-[#B54708]"
                        : "text-[#175CD3]"
                    }`}>
                      <CheckCircle2 size={12} />
                      {selectedLead.convertedToCandidateId.accountStatus === 'active'
                        ? "Active Candidate"
                        : selectedLead.convertedToCandidateId.tempCredential?.expiresAt && new Date(selectedLead.convertedToCandidateId.tempCredential.expiresAt) < new Date()
                        ? "Invite Expired"
                        : "Portal Invite Dispatched"}
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
                    Invite sent to: <strong className="text-[#111827]">{selectedLead.convertedToCandidateId.email}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Candidate Profile Details */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#111827] flex items-center gap-1.5">
                  <User size={16} className="text-[#2563EB]" />
                  Candidate Profile Details
                </h3>
              </div>

              {(selectedLead.linkedInProfiles && selectedLead.linkedInProfiles.length > 0 
                ? selectedLead.linkedInProfiles 
                : [{ profileName: selectedLead.linkedInProfileNames || "Candidate Profile" }]
              ).map((profile, idx) => (
                  <div key={idx} className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-2xs mb-3 last:mb-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-[#E5E7EB]">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#175CD3] font-semibold text-xs border border-[#B2DDFF]">
                          {profile.profileName ? profile.profileName.charAt(0).toUpperCase() : "C"}
                        </div>
                        <h4 className="font-semibold text-[#111827] text-sm">
                          {profile.profileName || "Unnamed Candidate"}
                        </h4>
                      </div>

                      {!selectedLead.convertedToCandidateId && !profile.convertedToCandidateId && (
                        <button
                          type="button"
                          onClick={() => {
                            setDetailsModalOpen(false);
                            openConvertModal(selectedLead, profile);
                          }}
                          className="btn-primary text-xs h-7 px-2.5 self-start sm:self-auto"
                        >
                          <UserPlus size={13} />
                          <span>Convert to Candidate</span>
                        </button>
                      )}
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs text-[#667085]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Mail size={13} className="text-[#98A2B3] flex-shrink-0" />
                        <span className="text-[#667085] flex-shrink-0">Email:</span>
                        {profile.email ? (
                          <a href={`mailto:${profile.email}`} className="font-medium text-[#2563EB] hover:underline truncate" title={profile.email}>
                            {profile.email}
                          </a>
                        ) : (
                          <span className="italic text-[#98A2B3]">Not provided</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 min-w-0">
                        <Phone size={13} className="text-[#98A2B3] flex-shrink-0" />
                        <span className="text-[#667085] flex-shrink-0">Phone:</span>
                        {profile.phone ? (
                          <a href={`tel:${profile.phone}`} className="font-medium text-[#111827] hover:underline truncate" title={profile.phone}>
                            {profile.phone}
                          </a>
                        ) : (
                          <span className="italic text-[#98A2B3]">Not provided</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Notes Section */}
            {selectedLead.notes && (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5">
                <span className="text-xs font-semibold text-[#111827] flex items-center gap-1.5 mb-1">
                  <FileText size={14} className="text-[#667085]" />
                  Notes & Remarks
                </span>
                <p className="text-xs text-[#344054] whitespace-pre-wrap leading-relaxed">
                  {selectedLead.notes}
                </p>
              </div>
            )}

            {/* Pop-up Action Buttons Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                {/* Edit Button */}
                {(user?.role === 'admin' || user?.role === 'manager' || user?._id === (selectedLead.createdBy?._id || selectedLead.createdBy)) && (
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
                )}

                {/* Admin-only Delete Button */}
                {user?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedLead._id)}
                    className="btn-danger text-xs h-8 px-3 inline-flex items-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    <span>Delete Lead</span>
                  </button>
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
              <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm font-medium text-[#111827]">
                <User size={16} className="text-[#667085] flex-shrink-0" />
                <span className="truncate">{form.employeeName || user?.name || "Staff User"}</span>
                <span className="ml-auto text-[10px] font-medium text-[#667085] ">
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
              <p className="mt-1 text-[11px] text-[#667085]">
                Select a Sales Executive to handle follow-up and outreach.
              </p>
            </div>
          </div>

          {/* Candidate Profile Details Section */}
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 space-y-3">
            <div className="pb-2 border-b border-[#E5E7EB] flex justify-between items-center">
              <div>
                <span className="text-sm font-semibold text-[#111827] flex items-center gap-1.5">
                  <Linkedin size={15} className="text-[#2563EB]" />
                  Candidate Profile Information
                </span>
                <p className="text-[11px] text-[#667085]">
                  Profile information associated with this lead.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary text-xs h-7 px-2.5 flex items-center gap-1"
                onClick={() => setForm({
                  ...form,
                  profiles: [...(form.profiles || []), { profileName: "", url: "", email: "", phone: "" }]
                })}
              >
                <Plus size={13} /> <span>Add Profile</span>
              </button>
            </div>

            {(form.profiles || []).map((profile, index) => (
              <div key={index} className="space-y-3 p-3 bg-white rounded-lg border border-[#E5E7EB] relative group shadow-2xs">
                {form.profiles.length > 1 && (
                  <button
                    type="button"
                    className="absolute top-2 right-2 text-[#98A2B3] hover:text-[#F04438] transition p-1"
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
                    <label className="text-[11px] font-semibold text-[#344054] mb-1 block">
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
                    <label className="text-[11px] font-semibold text-[#344054] mb-1 block">
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
                    <label className="text-[11px] font-semibold text-[#344054] mb-1 block">
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
                    <label className="text-[11px] font-semibold text-[#344054] mb-1 block">
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
          <p className="text-xs text-[#667085] leading-relaxed">
            Converting this lead will create a new <strong className="text-[#111827]">Candidate</strong> record and dispatch a portal invite email with single-use temporary credentials expiring in 72 hours.
          </p>

          {convertError && (
            <div className="rounded-lg border border-[#FECDCA] bg-[#FEF3F2] p-3 text-xs text-[#B42318]">
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
            <p className="mt-1 text-[11px] text-[#667085]">The candidate portal access link and temporary password will be delivered here.</p>
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
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={convertLoading || !convertForm.assignedTo}
              className={`btn-primary inline-flex items-center gap-2 ${!convertForm.assignedTo ? 'opacity-50 cursor-not-allowed' : ''}`}
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
