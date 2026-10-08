import { useEffect, useState, useRef, useCallback } from "react";
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
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Building2,
  Clock,
  DollarSign,
  Zap,
  Filter,
  Loader2,
} from "lucide-react";
import { marketingAPI } from "../services/api";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { SkeletonTable } from "../components/skeleton";
import { ALL_SKILL_CATEGORIES } from "./Candidates";

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

  // Marketing Entry Candidate Skills State
  const [candidateSkills, setCandidateSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(false);

  // JSearch Job Recommendations State
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [jobDatePosted, setJobDatePosted] = useState("month");
  const [jobEmploymentType, setJobEmploymentType] = useState("FULLTIME");
  const [jobsExpanded, setJobsExpanded] = useState(true);
  const jobSearchTimerRef = useRef(null);

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

  const loadCandidateSkills = async (candidateId, existingSelectedSkills = null) => {
    if (!candidateId) {
      setCandidateSkills([]);
      if (!existingSelectedSkills) setSelectedSkills([]);
      setSkillsLoading(false);
      return;
    }

    setCandidateSkills([]);
    if (!existingSelectedSkills) setSelectedSkills([]);
    setSkillsLoading(true);

    try {
      const res = await marketingAPI.getCandidateSkills(candidateId);
      const skills = res.data.skills || [];
      setCandidateSkills(skills);
      if (existingSelectedSkills) {
        setSelectedSkills(existingSelectedSkills);
      }
    } catch (err) {
      console.error("Failed to load candidate skills for marketing entry:", err);
      setCandidateSkills([]);
      toast.error("Unable to load candidate skills. Please try again.");
    } finally {
      setSkillsLoading(false);
    }
  };

  const toggleSkillSelection = (skill) => {
    const skillId = skill.id || skill.skillId || skill._id;
    const isSelected = selectedSkills.some(
      (s) => (s.skillId || s.id || s._id) === skillId
    );

    if (isSelected) {
      setSelectedSkills((prev) =>
        prev.filter((s) => (s.skillId || s.id || s._id) !== skillId)
      );
    } else {
      setSelectedSkills((prev) => [
        ...prev,
        {
          skillId: skillId,
          id: skillId,
          name: skill.name,
          category: skill.category || "Other",
        },
      ]);
    }
  };

  const selectAllSkills = () => {
    setSelectedSkills(
      candidateSkills.map((s) => ({
        skillId: s.id,
        id: s.id,
        name: s.name,
        category: s.category || "Other",
      }))
    );
  };

  const clearAllSelectedSkills = () => {
    setSelectedSkills([]);
  };

  // ─── JSearch Job Recommendations (AND + OR search, merged & deduplicated) ───
  const fetchRecommendedJobs = useCallback(async (skills, datePosted, employmentType) => {
    if (!skills || skills.length === 0) {
      setRecommendedJobs([]);
      setJobsError("");
      return;
    }

    setJobsLoading(true);
    setJobsError("");

    // Helper to extract jobs array from a JSearch response
    const extractJobs = (res) => {
      const raw = res.data?.data;
      return raw?.data?.jobs || raw?.jobs || (Array.isArray(raw?.data) ? raw.data : []);
    };

    const sharedParams = {
      page: "1",
      num_pages: "5",
      date_posted: datePosted || "month",
      employment_types: employmentType || "FULLTIME",
    };

    try {
      // ── 1. AND query: all skills combined ──
      const skillNames = skills.slice(0, 5).map((s) => s.name).join(", ");
      const andQuery = `${skillNames} developer jobs`;
      const andPromise = marketingAPI.searchJobs({ ...sharedParams, query: andQuery });

      // ── 2. OR queries: one per individual skill (capped at top 3) ──
      const orSkills = skills.slice(0, 3);
      const orPromises = orSkills.length > 1
        ? orSkills.map((sk) =>
            marketingAPI
              .searchJobs({ ...sharedParams, query: `${sk.name} developer jobs` })
              .catch((err) => {
                console.warn(`JSearch OR query failed for "${sk.name}":`, err);
                return null; // Don't let one failure kill the whole batch
              })
          )
        : []; // Skip individual queries when only 1 skill is selected (AND already covers it)

      // Fire all requests in parallel
      const [andRes, ...orResults] = await Promise.all([andPromise, ...orPromises]);

      // ── 3. Merge & deduplicate ──
      const seenIds = new Set();
      const mergedJobs = [];

      const addJobs = (jobs) => {
        for (const job of jobs) {
          const id = job.job_id || `${job.employer_name}-${job.job_title}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            mergedJobs.push(job);
          }
        }
      };

      // Add AND results first
      addJobs(extractJobs(andRes));

      // Add each OR result set
      for (const orRes of orResults) {
        if (orRes) addJobs(extractJobs(orRes));
      }

      setRecommendedJobs(mergedJobs);

      if (mergedJobs.length === 0) {
        setJobsError("No matching jobs found for the selected skills. Try adjusting filters.");
      }
    } catch (err) {
      console.error("JSearch error:", err);
      const msg = err.response?.data?.message || "Failed to fetch job recommendations.";
      setJobsError(msg);
      setRecommendedJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  // Debounced auto-search when selectedSkills change
  useEffect(() => {
    if (jobSearchTimerRef.current) {
      clearTimeout(jobSearchTimerRef.current);
    }

    if (selectedSkills.length > 0 && modalOpen) {
      jobSearchTimerRef.current = setTimeout(() => {
        fetchRecommendedJobs(selectedSkills, jobDatePosted, jobEmploymentType);
      }, 800);
    } else {
      setRecommendedJobs([]);
      setJobsError("");
    }

    return () => {
      if (jobSearchTimerRef.current) clearTimeout(jobSearchTimerRef.current);
    };
  }, [selectedSkills, modalOpen, fetchRecommendedJobs]);

  const handleJobFilterChange = (datePosted, employmentType) => {
    setJobDatePosted(datePosted);
    setJobEmploymentType(employmentType);
    if (selectedSkills.length > 0) {
      fetchRecommendedJobs(selectedSkills, datePosted, employmentType);
    }
  };

  const formatJobDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return d.toLocaleDateString();
  };

  const formatSalary = (min, max, currency, period) => {
    if (!min && !max) return null;
    const fmt = (n) => {
      if (!n) return "";
      if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
      return n.toLocaleString();
    };
    const cur = currency || "USD";
    const per = period === "YEAR" ? "/yr" : period === "HOUR" ? "/hr" : "";
    if (min && max) return `${cur} ${fmt(min)} – ${fmt(max)}${per}`;
    if (min) return `${cur} ${fmt(min)}+${per}`;
    return `Up to ${cur} ${fmt(max)}${per}`;
  };

  const openCreate = () => {
    setEditingId(null);
    setCandidateSkills([]);
    setSelectedSkills([]);
    setSkillsLoading(false);
    setRecommendedJobs([]);
    setJobsError("");
    setJobsExpanded(true);
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
    const initialSelectedSkills =
      record.selectedSkills || record.candidates?.[0]?.selectedSkills || [];
    setSelectedSkills(initialSelectedSkills);

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
            selectedSkills: c.selectedSkills || [],
          }))
        : [{ ...emptyCandidate }],
      longApplicationsSubmitted: record.longApplicationsSubmitted || 0,
      easyApplicationsSubmitted: record.easyApplicationsSubmitted || 0,
      entryDate: record.entryDate?.split("T")[0] || new Date().toISOString().split("T")[0],
      notes: record.notes || "",
    });

    if (record.candidates?.[0]?.candidateId) {
      loadCandidateSkills(record.candidates[0].candidateId, initialSelectedSkills);
    } else {
      setCandidateSkills([]);
      setSkillsLoading(false);
    }

    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const candidatesPayload = form.candidates
        .filter((c) => c.candidateName.trim())
        .map((c, idx) => ({
          ...c,
          selectedSkills: idx === 0 ? selectedSkills : c.selectedSkills || [],
        }));

      const payload = {
        ...form,
        candidates: candidatesPayload,
        selectedSkills,
      };

      if (editingId) {
        await marketingAPI.update(editingId, payload);
        toast.success("Marketing entry updated successfully");
      } else {
        await marketingAPI.create(payload);
        toast.success("Marketing entry created successfully");
      }
      setModalOpen(false);
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving record");
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
          <span className="text-[11px] text-[#175CD3] font-medium ">
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
          <span className="text-[11px] text-[#667085] font-medium ">
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
                            className={`inline-flex items-center text-xs font-medium ${
                              c.accountStatus === 'active'
                                ? 'text-[#027A48]'
                                : c.accountStatus === 'invited'
                                ? 'text-[#B54708]'
                                : 'text-[#667085]'
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
                                  {/* Saved Selected Skills Badges */}
                                  {((c.selectedSkills && c.selectedSkills.length > 0) || (r.selectedSkills && r.selectedSkills.length > 0)) && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {(c.selectedSkills?.length ? c.selectedSkills : r.selectedSkills).slice(0, 3).map((sk, ski) => (
                                        <span key={ski} className="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.2 rounded border border-brand-200 font-medium">
                                          {sk.name}
                                        </span>
                                      ))}
                                      {(c.selectedSkills?.length ? c.selectedSkills : r.selectedSkills).length > 3 && (
                                        <span className="text-[10px] text-slate-400 font-medium">
                                          +{(c.selectedSkills?.length ? c.selectedSkills : r.selectedSkills).length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  )}
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
                            <span className="text-[10px] font-bold text-brand-700 flex-shrink-0">
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
                              loadCandidateSkills(cand._id);
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
                                  <span className="text-[10px] font-bold text-brand-700 ">
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
                                <span className="text-xs font-bold text-brand-600 ">
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
                        loadCandidateSkills(null);
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

            {/* Candidate Skills & Marketing Entry Skill Selection */}
            {form.candidates[0]?.candidateId ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-brand-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Candidate Skills
                    </span>
                    {candidateSkills.length > 0 && (
                      <span className="text-[11px] font-semibold text-brand-700 ">
                        {candidateSkills.length} extracted from resume
                      </span>
                    )}
                  </div>

                  {candidateSkills.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={selectAllSkills}
                        className="text-[11px] text-brand-600 hover:text-brand-700 font-semibold"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={clearAllSelectedSkills}
                        className="text-[11px] text-slate-500 hover:text-slate-700 font-semibold"
                      >
                        Clear Selection
                      </button>
                    </div>
                  )}
                </div>

                {/* Loading State */}
                {skillsLoading ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <RefreshCw size={14} className="animate-spin text-brand-600" />
                    <span>Loading candidate structured skills...</span>
                  </div>
                ) : candidateSkills.length > 0 ? (
                  <div className="space-y-3.5">
                    {/* Selected Marketing Skills preview bar */}
                    <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800">
                          Selected Marketing Skills ({selectedSkills.length} of {candidateSkills.length})
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          Click any skill chip to toggle selection
                        </span>
                      </div>

                      {selectedSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedSkills.map((s) => (
                            <span
                              key={s.skillId || s.id}
                              onClick={() => toggleSkillSelection(s)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 cursor-pointer hover: transition"
                              title="Click to deselect"
                            >
                              <Check size={11} className="stroke-[3]" />
                              <span>{s.name}</span>
                              <X size={11} className="ml-0.5 opacity-70 hover:opacity-100" />
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          No skills selected yet. Select the relevant skills for this marketing campaign below.
                        </p>
                      )}
                    </div>

                    {/* Available Skills categorized */}
                    <div className="space-y-3">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block">
                        Available Candidate Skills
                      </span>

                      {Array.from(
                        new Set([
                          ...ALL_SKILL_CATEGORIES.filter((cat) =>
                            candidateSkills.some(
                              (s) => (s.category || "Other").toLowerCase() === cat.toLowerCase()
                            )
                          ),
                          ...candidateSkills.map((s) => s.category || "Other"),
                        ])
                      ).map((cat) => {
                        const inCat = candidateSkills.filter(
                          (s) => (s.category || "Other").toLowerCase() === cat.toLowerCase()
                        );
                        if (inCat.length === 0) return null;

                        return (
                          <div key={cat} className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-slate-700 block">
                              {cat} ({inCat.length})
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {inCat.map((skill) => {
                                const skillId = skill.id || skill.candidateSkillId;
                                const isSelected = selectedSkills.some(
                                  (s) => (s.skillId || s.id || s._id) === skillId
                                );
                                return (
                                  <button
                                    type="button"
                                    key={skillId}
                                    onClick={() => toggleSkillSelection(skill)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                                      isSelected
                                        ? "bg-brand-50 border-brand-500 text-brand-900 font-semibold shadow-2xs ring-1 ring-brand-500"
                                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                                  >
                                    {isSelected ? (
                                      <span className="text-brand-600 font-bold text-xs">✓</span>
                                    ) : (
                                      <span className="text-slate-300 text-xs">+</span>
                                    )}
                                    <span>{skill.name}</span>
                                    {skill.source === "manual" && (
                                      <span className="text-[9px] px-1 rounded bg-amber-100 text-amber-800 font-semibold">
                                        Manual
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-lg border border-slate-200 text-center space-y-2">
                    <p className="text-xs text-slate-600 font-medium">
                      No skills have been extracted for this candidate yet.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Please upload or process the candidate's resume first.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setModalOpen(false);
                        setActiveTab("candidates");
                      }}
                      className="btn-secondary text-xs h-7 px-3 inline-flex items-center gap-1 mt-1"
                    >
                      <ArrowRight size={12} />
                      <span>Go to Candidate Profile</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* ─── JSearch Skill-Based Job Recommendations ─── */}
          {form.candidates[0]?.candidateId && selectedSkills.length > 0 && (
            <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 p-4 space-y-3 shadow-2xs overflow-hidden">
              {/* Header with collapse toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
                    <Zap size={14} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      Skill-Based Job Recommendations
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                        Powered by JSearch
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Auto-matched from <strong className="text-indigo-600">{selectedSkills.length}</strong> selected skill{selectedSkills.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!jobsLoading && recommendedJobs.length > 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {recommendedJobs.length} jobs found
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setJobsExpanded(!jobsExpanded)}
                    className="text-slate-400 hover:text-slate-700 transition p-1 rounded-lg hover:bg-white/80"
                    title={jobsExpanded ? "Collapse" : "Expand"}
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${jobsExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {jobsExpanded && (
                <div className="space-y-3 animate-fadeIn">
                  {/* Filter Controls Row */}
                  <div className="flex flex-wrap items-center gap-2 bg-white/70 rounded-lg p-2.5 border border-slate-100">
                    <Filter size={13} className="text-slate-400 flex-shrink-0" />
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] font-semibold text-slate-600">Posted:</label>
                      <select
                        value={jobDatePosted}
                        onChange={(e) => handleJobFilterChange(e.target.value, jobEmploymentType)}
                        className="text-[11px] border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-indigo-400 cursor-pointer"
                      >
                        <option value="today">Today</option>
                        <option value="3days">Last 3 Days</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="all">All Time</option>
                      </select>
                    </div>
                    <span className="text-slate-200">|</span>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] font-semibold text-slate-600">Type:</label>
                      <select
                        value={jobEmploymentType}
                        onChange={(e) => handleJobFilterChange(jobDatePosted, e.target.value)}
                        className="text-[11px] border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-indigo-400 cursor-pointer"
                      >
                        <option value="FULLTIME">Full-time</option>
                        <option value="PARTTIME">Part-time</option>
                        <option value="CONTRACTOR">Contract</option>
                        <option value="INTERN">Internship</option>
                      </select>
                    </div>
                    <span className="text-slate-200">|</span>
                    <button
                      type="button"
                      onClick={() => fetchRecommendedJobs(selectedSkills, jobDatePosted, jobEmploymentType)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
                      disabled={jobsLoading}
                    >
                      <RefreshCw size={11} className={jobsLoading ? "animate-spin" : ""} />
                      Refresh
                    </button>
                  </div>

                  {/* Loading State */}
                  {jobsLoading && (
                    <div className="space-y-2.5">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-xl border border-slate-100 p-3.5 animate-pulse">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-200 flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                              <div className="h-3 bg-slate-100 rounded w-1/2" />
                              <div className="flex gap-2 mt-1">
                                <div className="h-2.5 bg-slate-100 rounded w-16" />
                                <div className="h-2.5 bg-slate-100 rounded w-20" />
                                <div className="h-2.5 bg-slate-100 rounded w-12" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-center gap-2 py-2 text-xs text-indigo-500 font-medium">
                        <Loader2 size={14} className="animate-spin" />
                        <span>Searching JSearch for skill-matched jobs...</span>
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {!jobsLoading && jobsError && (
                    <div className="bg-white rounded-xl border border-amber-200 p-4 text-center space-y-1.5">
                      <AlertCircle size={20} className="mx-auto text-amber-500" />
                      <p className="text-xs text-slate-700 font-medium">{jobsError}</p>
                      <button
                        type="button"
                        onClick={() => fetchRecommendedJobs(selectedSkills, jobDatePosted, jobEmploymentType)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {/* Job Cards */}
                  {!jobsLoading && recommendedJobs.length > 0 && (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                      {recommendedJobs.map((job, idx) => {
                        const salary = formatSalary(
                          job.job_min_salary,
                          job.job_max_salary,
                          job.job_salary_currency,
                          job.job_salary_period
                        );

                        return (
                          <div
                            key={job.job_id || idx}
                            className="group bg-white rounded-xl border border-slate-100 hover:border-indigo-200 p-3.5 transition-all duration-200 hover:shadow-md hover:shadow-indigo-100/50 cursor-default"
                          >
                            <div className="flex items-start gap-3">
                              {/* Employer Logo */}
                              <div className="flex-shrink-0">
                                {job.employer_logo ? (
                                  <img
                                    src={job.employer_logo}
                                    alt={job.employer_name || "Company"}
                                    className="w-10 h-10 rounded-lg object-contain border border-slate-100 bg-white p-0.5"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      e.target.nextSibling.style.display = "flex";
                                    }}
                                  />
                                ) : null}
                                <div
                                  className={`w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200 items-center justify-center text-indigo-600 font-bold text-sm ${job.employer_logo ? "hidden" : "flex"}`}
                                >
                                  {(job.employer_name || "C").charAt(0)}
                                </div>
                              </div>

                              {/* Job Details */}
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
                                      {job.job_title}
                                    </h4>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <Building2 size={11} className="text-slate-400 flex-shrink-0" />
                                      <span className="text-[11px] text-slate-600 font-medium truncate">
                                        {job.employer_name || "Company"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Apply Button */}
                                  {job.job_apply_link && (
                                    <a
                                      href={job.job_apply_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink size={10} />
                                      Apply
                                    </a>
                                  )}
                                </div>

                                {/* Meta info row */}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                                  {(job.job_city || job.job_state || job.job_country) && (
                                    <span className="inline-flex items-center gap-1">
                                      <MapPin size={10} className="text-slate-400" />
                                      {[job.job_city, job.job_state, job.job_country].filter(Boolean).join(", ")}
                                    </span>
                                  )}
                                  {job.job_is_remote && (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      Remote
                                    </span>
                                  )}
                                  {salary && (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                      <DollarSign size={10} />
                                      {salary}
                                    </span>
                                  )}
                                  {job.job_posted_at_datetime_utc && (
                                    <span className="inline-flex items-center gap-1">
                                      <Clock size={10} className="text-slate-400" />
                                      {formatJobDate(job.job_posted_at_datetime_utc)}
                                    </span>
                                  )}
                                  {job.job_employment_type && (
                                    <span className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                      {job.job_employment_type}
                                    </span>
                                  )}
                                </div>

                                {/* Job description snippet */}
                                {job.job_description && (
                                  <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mt-1">
                                    {job.job_description.substring(0, 200)}...
                                  </p>
                                )}

                                {/* Matched skills highlight */}
                                {job.job_highlights?.Qualifications && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {selectedSkills
                                      .filter((sk) =>
                                        job.job_highlights.Qualifications.some(
                                          (q) => q.toLowerCase().includes(sk.name.toLowerCase())
                                        )
                                      )
                                      .slice(0, 4)
                                      .map((sk) => (
                                        <span
                                          key={sk.skillId || sk.id}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        >
                                          <CheckCircle2 size={9} />
                                          {sk.name}
                                        </span>
                                      ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Skills query info */}
                  {!jobsLoading && !jobsError && recommendedJobs.length === 0 && selectedSkills.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-100 p-4 text-center space-y-2">
                      <Sparkles size={20} className="mx-auto text-indigo-400" />
                      <p className="text-xs text-slate-600 font-medium">
                        Select skills above to automatically find matching job openings
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Jobs are fetched from JSearch API based on candidate's selected skills
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
            <span className=" text-[10px] font-bold text-brand-700 flex-shrink-0">
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
