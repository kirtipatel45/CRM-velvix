import { useEffect, useState, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  UserPlus,
  Download,
  Users,
  Mail,
  Phone,
  Calendar,
  Check,
  Copy,
  MapPin,
  Briefcase,
  Sparkles,
  ChevronDown,
  UserCheck,
  Eye,
  X,
} from "lucide-react";
import { marketingAPI } from "../services/api";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { SkeletonTable } from "../components/skeleton";

const emptyCandidate = {
  candidateId: null,
  candidateName: "",
  candidateEmail: "",
  jobTitle: "",
  experienceYears: "",
  experienceMonths: "",
};

const emptyForm = {
  teamLeaderName: "General",
  employeeName: "",
  candidates: [{ ...emptyCandidate }],
  longApplicationsSubmitted: 0,
  easyApplicationsSubmitted: 0,
  entryDate: new Date().toISOString().split("T")[0],
  notes: "",
};

export default function Marketing() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("candidates");
  const [records, setRecords] = useState([]);
  const [assignedCandidates, setAssignedCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterDate, setFilterDate] = useState("");
  const [searchName, setSearchName] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [hoveredCandidate, setHoveredCandidate] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [candDropdownOpen, setCandDropdownOpen] = useState(false);
  const [candDropdownSearch, setCandDropdownSearch] = useState("");

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (searchName) params.employeeName = searchName;
      const res = await marketingAPI.getAll(params);
      setRecords(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedCandidates = async () => {
    setCandidatesLoading(true);
    try {
      const res = await marketingAPI.getAssignedCandidates();
      setAssignedCandidates(res.data.data || []);
    } catch (err) {
      console.error("Failed to load assigned candidates:", err);
    } finally {
      setCandidatesLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchRecords();
    fetchAssignedCandidates();
  }, [filterDate, searchName]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      employeeName: user?.name || "",
      teamLeaderName: user?.teamLeader || "General",
      entryDate: new Date().toISOString().split("T")[0],
      candidates: [{ ...emptyCandidate }],
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingId(record._id);
    setForm({
      teamLeaderName: record.teamLeaderName || user?.teamLeader || "General",
      employeeName: record.employeeName || user?.name || "",
      candidates: record.candidates?.length
        ? record.candidates.map((c) => ({
            candidateId: c.candidateId || null,
            candidateName: c.candidateName || "",
            candidateEmail: c.candidateEmail || "",
            jobTitle: c.jobTitle || "",
            experienceYears: c.experienceYears !== undefined ? c.experienceYears : "",
            experienceMonths: c.experienceMonths !== undefined ? c.experienceMonths : "",
          }))
        : [{ ...emptyCandidate }],
      longApplicationsSubmitted: record.longApplicationsSubmitted || 0,
      easyApplicationsSubmitted: record.easyApplicationsSubmitted || 0,
      entryDate: record.entryDate?.split("T")[0] || new Date().toISOString().split("T")[0],
      notes: record.notes || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        candidates: form.candidates.filter((c) => c.candidateName.trim()),
      };
      if (editingId) {
        await marketingAPI.update(editingId, payload);
      } else {
        await marketingAPI.create(payload);
      }
      setModalOpen(false);
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.message || "Error saving record");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    await marketingAPI.delete(id);
    fetchRecords();
  };

  const addCandidate = () => {
    setForm({
      ...form,
      candidates: [...form.candidates, { ...emptyCandidate }],
    });
  };

  const updateCandidate = (index, fieldOrPatch, value) => {
    const updated = [...form.candidates];
    if (typeof fieldOrPatch === "object" && fieldOrPatch !== null) {
      updated[index] = { ...updated[index], ...fieldOrPatch };
    } else {
      updated[index] = { ...updated[index], [fieldOrPatch]: value };
    }
    setForm({ ...form, candidates: updated });
  };

  const removeCandidate = (index) => {
    setForm({
      ...form,
      candidates: form.candidates.filter((_, i) => i !== index),
    });
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (searchName) params.employeeName = searchName;
      const res = await marketingAPI.export(params);

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "marketing.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Error exporting data");
    }
  };

  const handleCopyEmail = (email, id) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    toast.success("Email copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredCandidates = assignedCandidates.filter((cand) => {
    if (!candidateSearch) return true;
    const q = candidateSearch.toLowerCase();
    const fullName = `${cand.firstName || ""} ${cand.lastName || ""}`.toLowerCase();
    const email = (cand.email || "").toLowerCase();
    const phone = (cand.phone || "").toLowerCase();
    return fullName.includes(q) || email.includes(q) || phone.includes(q);
  });

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-page-title text-[#111827]">Marketing</h1>
          <p className="text-page-subtitle mt-0.5">
            Track candidates, applications, screening, assessments & interviews
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "logs" && (
            <button onClick={openCreate} className="btn-primary text-xs h-9">
              <Plus size={16} />
              <span>Add Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB]">
        <button
          onClick={() => setActiveTab("candidates")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition ${
            activeTab === "candidates"
              ? "border-[#2563EB] text-[#2563EB] font-semibold"
              : "border-transparent text-[#667085] hover:text-[#111827]"
          }`}
        >
          <Users size={15} />
          <span>Assigned Candidates</span>
          <span className="text-[11px] rounded-full bg-[#EFF6FF] text-[#175CD3] px-2 py-0.5 font-medium border border-[#B2DDFF]">
            {assignedCandidates.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition ${
            activeTab === "logs"
              ? "border-[#2563EB] text-[#2563EB] font-semibold"
              : "border-transparent text-[#667085] hover:text-[#111827]"
          }`}
        >
          <Calendar size={15} />
          <span>Daily Marketing Logs</span>
          <span className="text-[11px] rounded-full bg-[#F9FAFB] text-[#667085] px-2 py-0.5 font-medium border border-[#E5E7EB]">
            {records.length}
          </span>
        </button>
      </div>

      {activeTab === "candidates" ? (
        <div className="space-y-4">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]"
            />
            <input
              id="cand-search"
              className="input-field pl-9 text-xs"
              placeholder="Search candidates by name, email, or phone..."
              value={candidateSearch}
              onChange={(e) => setCandidateSearch(e.target.value)}
              aria-label="Search candidates"
            />
          </div>

          <div className="card p-0 overflow-hidden">
            {candidatesLoading ? (
              <div className="p-6">
                <SkeletonTable
                  rows={6}
                  cardWrapper={false}
                  columns={[
                    { width: '22%', type: 'avatar-text' },
                    { width: '22%', type: 'text', twoLines: true },
                    { width: '16%', type: 'badge' },
                    { width: '16%', type: 'text' },
                    { width: '12%', type: 'badge' },
                    { width: '12%', type: 'actions' },
                  ]}
                />
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="py-12 text-center">
                <Users size={40} className="mx-auto text-[#98A2B3] mb-2" />
                <p className="text-empty-heading text-[#111827]">No assigned candidates found</p>
                <p className="text-empty-body text-[#667085] mt-1">
                  Candidates converted from leads and assigned to marketing recruiters will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <tr>
                      <th scope="col" className="text-table-header px-4 py-3">
                        Candidate
                      </th>
                      <th scope="col" className="text-table-header px-4 py-3">
                        Contact Details
                      </th>
                      <th scope="col" className="text-table-header px-4 py-3">
                        Assigned Marketing Recruiter
                      </th>
                      <th scope="col" className="text-table-header px-4 py-3">
                        Portal Status
                      </th>
                      <th scope="col" className="text-table-header px-4 py-3">
                        Converted Date
                      </th>
                      <th scope="col" className="text-table-header px-4 py-3 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {filteredCandidates.map((c) => (
                      <tr key={c._id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] border border-[#B2DDFF] text-[#175CD3] font-semibold text-xs shrink-0">
                              {c.firstName?.[0] || 'C'}{c.lastName?.[0] || ''}
                            </div>
                            <div>
                              <p className="font-semibold text-[#111827]">
                                {c.firstName} {c.lastName}
                              </p>
                              <p className="text-[11px] text-[#667085]">
                                ID: {c._id.slice(-6)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-[#344054]">
                              <Mail size={12} className="text-[#98A2B3]" />
                              <span>{c.email}</span>
                            </div>
                            {c.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-[#667085]">
                                <Phone size={12} className="text-[#98A2B3]" />
                                <span>{c.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {c.assignedTo ? (
                            <div>
                              <p className="font-medium text-[#111827]">
                                {c.assignedTo.name}
                              </p>
                              <p className="text-[11px] text-[#667085]">
                                {c.assignedTo.email}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-[#98A2B3] italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              c.accountStatus === 'active'
                                ? 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]'
                                : c.accountStatus === 'invited'
                                ? 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'
                                : 'bg-[#F2F4F7] text-[#667085] border-[#E5E7EB]'
                            }`}
                          >
                            {c.accountStatus === 'active' ? 'Active' : c.accountStatus === 'invited' ? 'Invited' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[#667085]">
                          {c.convertedAt ? new Date(c.convertedAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleCopyEmail(c.email, c._id)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs text-[#344054] shadow-2xs hover:bg-[#F9FAFB] transition"
                            title="Copy candidate email"
                          >
                            {copiedId === c._id ? (
                              <>
                                <Check size={12} className="text-[#12B76A]" />
                                <span className="text-[#027A48] font-medium">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} className="text-[#667085]" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]"
              />
              <input
                id="mktg-search"
                className="input-field pl-9 text-xs"
                placeholder="Search by recruiter name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                aria-label="Search by recruiter name"
              />
            </div>
            <input
              id="mktg-date-filter"
              type="date"
              className="input-field sm:w-48 text-xs h-9"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              aria-label="Filter by date"
            />
          </div>

          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="p-6">
                <SkeletonTable
                  rows={6}
                  cardWrapper={false}
                  columns={[
                    { width: '20%', type: 'avatar-text' },
                    { width: '15%', type: 'text' },
                    { width: '25%', type: 'text', twoLines: true },
                    { width: '20%', type: 'badge' },
                    { width: '10%', type: 'badge' },
                    { width: '10%', type: 'actions' },
                  ]}
                />
              </div>
            ) : records.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-empty-heading text-[#111827] mb-1">No records found</p>
                <p className="text-empty-body text-[#667085]">No daily marketing logs found matching your criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <tr>
                      <th scope="col" className="text-table-header px-4 py-3">
                        TL / Recruiter
                      </th>
                      <th scope="col" className="text-table-header px-4 py-3">
                        Date
                      </th>
                      <th scope="col" className="text-table-header px-4 py-3">
                        Candidate(s)
                      </th>
                      <th scope="col" className="text-table-header px-4 py-3">
                        Applications (Long / Easy)
                      </th>
                      <th scope="col" className="text-table-header px-4 py-3">
                        Notes
                      </th>
                      <th scope="col" className="text-table-header px-4 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {records.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((r) => (
                      <tr key={r._id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-[#111827]">{r.employeeName}</p>
                          <p className="text-[11px] text-[#667085]">
                            TL: {r.teamLeaderName}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[#667085] whitespace-nowrap">
                          {new Date(r.entryDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="space-y-1">
                            {r.candidates && r.candidates.length > 0 ? (
                              r.candidates.map((c, ci) => (
                                <div key={ci} className="text-xs">
                                  <span className="font-medium text-[#111827]">{c.candidateName}</span>
                                  {c.jobTitle && <span className="text-[#667085]"> • {c.jobTitle}</span>}
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-[#98A2B3] italic">No candidates</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#175CD3]">
                              {r.totalApplications || (r.longApplicationsSubmitted + r.easyApplicationsSubmitted)}
                            </span>
                            <span className="text-[11px] text-[#667085]">
                              (Long: {r.longApplicationsSubmitted || 0}, Easy: {r.easyApplicationsSubmitted || 0})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[#667085] max-w-xs truncate">
                          {r.notes || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {(user?.role === 'admin' || user?.role === 'manager' || user?._id === (r.createdBy?._id || r.createdBy)) && (
                              <button
                                onClick={() => openEdit(r)}
                                className="p-1 text-[#667085] hover:text-[#2563EB] rounded transition"
                                aria-label={`Edit marketing entry for ${r.employeeName}`}
                                title="Edit Entry"
                              >
                                <Pencil size={15} />
                              </button>
                            )}
                            {user?.role === 'admin' && (
                              <button
                                onClick={() => handleDelete(r._id)}
                                className="p-1 text-[#667085] hover:text-[#F04438] rounded transition"
                                aria-label={`Delete marketing entry for ${r.employeeName}`}
                                title="Delete Entry"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setCandDropdownOpen(false);
          setHoveredCandidate(null);
        }}
        title={editingId ? "Edit Marketing Entry" : "New Marketing Entry"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Candidate Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Candidate Information
            </h3>

            {/* Custom Hoverable Candidate Select Dropdown */}
            <div className="relative">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Select Candidate <span className="text-red-500">*</span>
              </label>

              <button
                type="button"
                onClick={() => setCandDropdownOpen(!candDropdownOpen)}
                className="w-full text-xs flex items-center justify-between text-left py-2.5 px-3 bg-white border border-slate-300 rounded-lg hover:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-2xs transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {form.candidates[0]?.candidateId ? (
                    (() => {
                      const selectedObj = assignedCandidates.find(
                        (c) => c._id === form.candidates[0].candidateId
                      );
                      return (
                        <div
                          className="flex items-center gap-2 min-w-0"
                          onMouseEnter={(e) => {
                            if (selectedObj) {
                              setHoveredCandidate(selectedObj);
                              setTooltipPos({ x: e.clientX + 16, y: e.clientY + 16 });
                            }
                          }}
                          onMouseMove={(e) => {
                            setTooltipPos({ x: e.clientX + 16, y: e.clientY + 16 });
                          }}
                          onMouseLeave={() => setHoveredCandidate(null)}
                        >
                          <div className="h-6 w-6 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {form.candidates[0].candidateName?.charAt(0) || "C"}
                          </div>
                          <span className="font-bold text-slate-900 truncate">
                            {form.candidates[0].candidateName}
                          </span>
                          {selectedObj?.visaStatus && (
                            <span className="text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.2 rounded-full flex-shrink-0">
                              {selectedObj.visaStatus}
                            </span>
                          )}
                          <span className="text-[11px] text-brand-600 font-medium ml-1">
                            (Hover for profile card)
                          </span>
                        </div>
                      );
                    })()
                  ) : form.candidates[0]?.candidateName ? (
                    <span className="font-semibold text-slate-800 truncate">
                      {form.candidates[0].candidateName} (Manual Entry)
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      -- Choose Assigned Candidate from list --
                    </span>
                  )}
                </div>

                <ChevronDown
                  size={15}
                  className={`text-slate-400 transition-transform flex-shrink-0 ${
                    candDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Floating Dropdown Menu with Hover Cards */}
              {candDropdownOpen && (
                <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-fadeIn">
                  {/* Search inside dropdown */}
                  <div className="p-2 border-b border-slate-100 bg-slate-50/80">
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        type="text"
                        placeholder="Search candidates by name, skill, visa..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                        value={candDropdownSearch}
                        onChange={(e) => setCandDropdownSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Candidate Options List */}
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {assignedCandidates
                      .filter((cand) => {
                        if (!candDropdownSearch) return true;
                        const q = candDropdownSearch.toLowerCase();
                        const fullName = `${cand.firstName || ""} ${cand.lastName || ""}`.toLowerCase();
                        const skill = (cand.primarySkill || "").toLowerCase();
                        const visa = (cand.visaStatus || "").toLowerCase();
                        return (
                          fullName.includes(q) ||
                          skill.includes(q) ||
                          visa.includes(q)
                        );
                      })
                      .map((cand) => {
                        const fullName = `${cand.firstName || ""} ${cand.lastName || ""}`.trim();
                        const isSelected =
                          form.candidates[0]?.candidateId === cand._id;

                        return (
                          <div
                            key={cand._id}
                            onMouseEnter={(e) => {
                              setHoveredCandidate(cand);
                              setTooltipPos({
                                x: e.clientX + 16,
                                y: e.clientY + 16,
                              });
                            }}
                            onMouseMove={(e) => {
                              setTooltipPos({
                                x: e.clientX + 16,
                                y: e.clientY + 16,
                              });
                            }}
                            onMouseLeave={() => setHoveredCandidate(null)}
                            onClick={() => {
                              updateCandidate(0, {
                                candidateId: cand._id,
                                candidateName: fullName,
                                candidateEmail: cand.email || "",
                                jobTitle:
                                  cand.primarySkill ||
                                  cand.preferredJobTitles?.[0] ||
                                  "",
                                experienceYears: cand.experienceYears || 0,
                                experienceMonths: 0,
                              });
                              setCandDropdownOpen(false);
                              setCandDropdownSearch("");
                              setHoveredCandidate(null);
                              toast.success(`Selected candidate ${fullName}`);
                            }}
                            className={`flex items-center justify-between p-2.5 hover:bg-brand-50/70 cursor-pointer transition text-xs ${
                              isSelected
                                ? "bg-brand-50 text-brand-900 font-semibold"
                                : "text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-7 w-7 rounded-lg bg-[#EFF6FF] border border-[#B2DDFF] text-[#175CD3] flex items-center justify-center font-semibold text-xs flex-shrink-0">
                                {cand.firstName?.charAt(0) || "C"}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                                  <span>{fullName}</span>
                                  <span className="text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.2 rounded-full">
                                    {cand.visaStatus || "Candidate"}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {cand.primarySkill ||
                                    cand.preferredJobTitles?.[0] ||
                                    "Candidate"}{" "}
                                  • {cand.experienceYears || 0} yrs exp • {cand.currentCity || "US"}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0 pl-2">
                              {isSelected ? (
                                <span className="text-xs font-bold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
                                  Selected
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Hover for info
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {assignedCandidates.length === 0 && (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No assigned candidates found
                      </div>
                    )}

                    {/* Manual / Custom Candidate Option */}
                    <div
                      onClick={() => {
                        updateCandidate(0, {
                          candidateId: null,
                          candidateName: "",
                          candidateEmail: "",
                          jobTitle: "",
                          experienceYears: "",
                          experienceMonths: "",
                        });
                        setCandDropdownOpen(false);
                        setCandDropdownSearch("");
                        setHoveredCandidate(null);
                      }}
                      className="p-2.5 hover:bg-slate-100 cursor-pointer transition text-xs text-slate-700 flex items-center gap-2 bg-slate-50/80 font-medium border-t border-slate-100"
                    >
                      <Pencil size={13} className="text-slate-500" />
                      <span>✍️ Custom Candidate (Enter Manually)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Candidate Form Fields */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="mktg-cand-name" className="text-xs font-semibold text-slate-600 block mb-1">
                  Candidate Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="mktg-cand-name"
                  className="input-field text-xs"
                  placeholder="e.g. Alex Johnson"
                  value={form.candidates[0]?.candidateName || ""}
                  onChange={(e) =>
                    updateCandidate(0, "candidateName", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label htmlFor="mktg-cand-title" className="text-xs text-slate-500 block mb-1">
                  Job Title / Position
                </label>
                <input
                  id="mktg-cand-title"
                  className="input-field text-xs"
                  placeholder="e.g. Java Full Stack Developer"
                  value={form.candidates[0]?.jobTitle || ""}
                  onChange={(e) =>
                    updateCandidate(0, "jobTitle", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="mktg-cand-years" className="text-xs text-slate-500 block mb-1">
                  Experience (Years)
                </label>
                <input
                  id="mktg-cand-years"
                  type="number"
                  min="0"
                  className="input-field text-xs"
                  placeholder="e.g. 5"
                  value={form.candidates[0]?.experienceYears ?? ""}
                  onChange={(e) =>
                    updateCandidate(
                      0,
                      "experienceYears",
                      e.target.value === "" ? "" : +e.target.value
                    )
                  }
                />
              </div>

              <div>
                <label htmlFor="mktg-cand-months" className="text-xs text-slate-500 block mb-1">
                  Experience (Months)
                </label>
                <input
                  id="mktg-cand-months"
                  type="number"
                  min="0"
                  max="11"
                  className="input-field text-xs"
                  placeholder="e.g. 6"
                  value={form.candidates[0]?.experienceMonths ?? ""}
                  onChange={(e) =>
                    updateCandidate(
                      0,
                      "experienceMonths",
                      e.target.value === "" ? "" : +e.target.value
                    )
                  }
                />
              </div>
            </div>
          </div>

          {/* Application Metrics */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Application Metrics
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="mktg-long-apps" className="text-xs text-slate-600 font-semibold block mb-1">
                  Long Applications Submitted
                </label>
                <input
                  id="mktg-long-apps"
                  type="number"
                  min="0"
                  className="input-field"
                  value={form.longApplicationsSubmitted}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      longApplicationsSubmitted: +e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label htmlFor="mktg-easy-apps" className="text-xs text-slate-600 font-semibold block mb-1">
                  Easy Applications Submitted
                </label>
                <input
                  id="mktg-easy-apps"
                  type="number"
                  min="0"
                  className="input-field"
                  value={form.easyApplicationsSubmitted}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      easyApplicationsSubmitted: +e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="mktg-notes" className="label">Notes / Additional Context</label>
            <textarea
              id="mktg-notes"
              className="input-field"
              rows={2}
              placeholder="e.g. Applied to 15 tier-1 enterprise openings in Dallas & Austin..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setCandDropdownOpen(false);
                setHoveredCandidate(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingId ? "Update Entry" : "Save Marketing Entry"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Floating Hover Info Card beside Cursor */}
      {hoveredCandidate && (
        <div
          className="fixed z-[9999] w-72 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md pointer-events-none text-xs space-y-2.5 animate-fadeIn transition-all"
          style={{
            top: Math.min(tooltipPos.y, window.innerHeight - 280),
            left: Math.min(tooltipPos.x, window.innerWidth - 300),
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="min-w-0 pr-2">
              <h4 className="font-bold text-slate-800 text-sm truncate">
                {hoveredCandidate.firstName} {hoveredCandidate.lastName}
              </h4>
              <p className="text-[11px] text-brand-600 font-medium truncate">
                {hoveredCandidate.primarySkill || hoveredCandidate.preferredJobTitles?.[0] || 'Candidate'}
              </p>
            </div>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 border border-brand-200 flex-shrink-0">
              {hoveredCandidate.visaStatus || 'Candidate'}
            </span>
          </div>

          <div className="space-y-1.5 text-slate-600">
            <div className="flex items-center gap-2">
              <Mail size={13} className="text-slate-400 flex-shrink-0" />
              <span className="truncate">{hoveredCandidate.email || 'No email provided'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={13} className="text-slate-400 flex-shrink-0" />
              <span>{hoveredCandidate.phone || 'No phone provided'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={13} className="text-slate-400 flex-shrink-0" />
              <span className="truncate">{hoveredCandidate.currentCity || 'Location not specified'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase size={13} className="text-slate-400 flex-shrink-0" />
              <span>Experience: <strong className="text-slate-800">{hoveredCandidate.experienceYears || 0} yrs</strong></span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">ATS Resume:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-md ${
                hoveredCandidate.hasAtsResume || hoveredCandidate.atsResume?.filename
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {hoveredCandidate.hasAtsResume || hoveredCandidate.atsResume?.filename ? 'ATS Ready' : 'Pending'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
