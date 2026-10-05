import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { marketingAPI } from "../services/api";
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  Copy,
  Check,
  UserCheck,
  ArrowRight,
  ShieldCheck,
  Send,
  MapPin,
  Compass,
  Download,
  FileText,
  FileCheck,
  Award,
  Briefcase,
  AlertCircle,
  UploadCloud,
  Trash2,
} from "lucide-react";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import { toast } from "react-hot-toast";
import { SkeletonTable } from "../components/skeleton";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";

export default function Candidates() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVisa, setFilterVisa] = useState("all");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadingAtsId, setDownloadingAtsId] = useState(null);
  const [uploadingAtsId, setUploadingAtsId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await marketingAPI.getAssignedCandidates();
      const data = res.data.data || [];
      setCandidates(data);

      if (selectedCandidate) {
        const updated = data.find((c) => c._id === selectedCandidate._id);
        if (updated) setSelectedCandidate(updated);
      }
    } catch (err) {
      console.error("Failed to load assigned candidates:", err);
      toast.error("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteCandidate = async (candidateId, e = null) => {
    if (e) e.stopPropagation();
    const candidate = candidates.find((c) => c._id === candidateId) || selectedCandidate;
    const name = candidate ? `${candidate.firstName} ${candidate.lastName}` : "this candidate";
    if (!confirm(`Are you sure you want to permanently delete candidate ${name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await marketingAPI.deleteCandidate(candidateId);
      toast.success("Candidate permanently deleted successfully");
      setDetailsModalOpen(false);
      setSelectedCandidate(null);
      fetchCandidates();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete candidate");
    }
  };

  const handleResendInvite = async (candidate) => {
    if (!confirm(`Resend portal invitation email to ${candidate.email}?`)) return;
    setResendingId(candidate._id);

    try {
      const res = await marketingAPI.resendCandidateInvite(candidate._id);
      toast.success(res.data.message || "Invite email resent successfully!");
      fetchCandidates();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to resend invite";
      toast.error(msg);
    } finally {
      setResendingId(null);
    }
  };

  const handleDownloadResume = async (candidate) => {
    if (!candidate?.resume?.filename && !candidate?.resume?.path) {
      toast.error("Candidate has not uploaded a raw resume yet.");
      return;
    }

    setDownloadingId(candidate._id);
    try {
      const res = await marketingAPI.downloadCandidateResume(candidate._id);
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", candidate.resume.originalName || `${candidate.firstName}_${candidate.lastName}_Resume.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download candidate resume:", err);
      toast.error("Failed to download resume document");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAtsResume = async (candidate) => {
    if (!candidate?.atsResume?.filename) {
      toast.error("Recruiter has not uploaded an ATS-friendly resume for this candidate yet.");
      return;
    }

    setDownloadingAtsId(candidate._id);
    try {
      const res = await marketingAPI.downloadCandidateAtsResume(candidate._id);
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", candidate.atsResume.originalName || `${candidate.firstName}_${candidate.lastName}_ATS_Resume.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download ATS resume:", err);
      toast.error("Failed to download ATS resume document");
    } finally {
      setDownloadingAtsId(null);
    }
  };

  const handleUploadAtsResume = async (candidateId, file) => {
    if (!file) return;

    const allowed = [".pdf", ".doc", ".docx"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error("Only PDF, DOC, and DOCX files are permitted for ATS resumes.");
      return;
    }

    setUploadingAtsId(candidateId);
    try {
      const formData = new FormData();
      formData.append("atsResume", file);

      const res = await marketingAPI.uploadCandidateAtsResume(candidateId, formData);
      toast.success(res.data.message || "ATS resume uploaded successfully!");

      const updatedAtsResume = res.data.atsResume;
      setCandidates((prev) =>
        prev.map((c) =>
          c._id === candidateId ? { ...c, atsResume: updatedAtsResume } : c
        )
      );

      if (selectedCandidate && selectedCandidate._id === candidateId) {
        setSelectedCandidate((prev) => ({ ...prev, atsResume: updatedAtsResume }));
      }
    } catch (err) {
      console.error("Failed to upload ATS resume:", err);
      toast.error(err.response?.data?.message || "Failed to upload ATS resume");
    } finally {
      setUploadingAtsId(null);
    }
  };

  const openCandidateDetails = (candidate) => {
    setSelectedCandidate(candidate);
    setDetailsModalOpen(true);
  };

  const filteredCandidates = candidates.filter((c) => {
    if (filterStatus !== "all") {
      if (filterStatus === "active" && c.accountStatus !== "active") return false;
      if (filterStatus === "invited" && c.accountStatus === "active") return false;
      if (filterStatus === "onboarded" && !c.isOnboarded) return false;
      if (filterStatus === "pending_onboarding" && c.isOnboarded) return false;
    }

    if (filterVisa !== "all" && c.visaStatus !== filterVisa) {
      return false;
    }

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const fullName = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
    const email = (c.email || "").toLowerCase();
    const phone = (c.phone || "").toLowerCase();
    const currentCity = (c.currentCity || "").toLowerCase();
    const visa = (c.visaStatus || "").toLowerCase();
    const primarySkill = (c.primarySkill || "").toLowerCase();
    const prefCities = (c.preferredJobCities || []).join(" ").toLowerCase();
    const prefTitles = (c.preferredJobTitles || []).join(" ").toLowerCase();
    const experiences = (c.jobExperiences || [])
      .map((e) => `${e.jobTitle || ""} ${e.experience || ""}`)
      .join(" ")
      .toLowerCase();
    const converter = (c.convertedBy?.name || "").toLowerCase();
    const leadGen = (c.sourceLeadId?.employeeName || "").toLowerCase();

    return (
      fullName.includes(q) ||
      email.includes(q) ||
      phone.includes(q) ||
      currentCity.includes(q) ||
      visa.includes(q) ||
      primarySkill.includes(q) ||
      prefCities.includes(q) ||
      prefTitles.includes(q) ||
      experiences.includes(q) ||
      converter.includes(q) ||
      leadGen.includes(q)
    );
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterVisa]);

  const activeCount = candidates.filter((c) => c.accountStatus === "active").length;
  const onboardedCount = candidates.filter((c) => c.isOnboarded).length;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-page-title text-[#111827]">Candidates</h1>
            <span className="text-xs font-semibold text-[#667085] bg-[#F9FAFB] border border-[#E5E7EB] px-2.5 py-0.5 rounded-full">
              {candidates.length} total
            </span>
          </div>
          <p className="text-page-subtitle mt-0.5">
            Candidates assigned to you for placement, marketing, job applications, and client outreach
          </p>
        </div>

        {/* Operational Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success" size="md">
            {onboardedCount} Onboarded
          </Badge>
          <Badge variant="info" size="md">
            {activeCount} Active Portals
          </Badge>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]"
          />
          <input
            id="candidate-search"
            className="input-field pl-9 text-xs"
            placeholder="Search by name, email, living city, preferred cities, visa, skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search candidates"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            id="candidate-status-filter"
            className="input-field text-xs h-9 w-40"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="onboarded">Onboarded</option>
            <option value="pending_onboarding">Pending Onboarding</option>
            <option value="active">Active Portal</option>
            <option value="invited">Pending Invite</option>
          </select>

          <select
            id="candidate-visa-filter"
            className="input-field text-xs h-9 w-48"
            value={filterVisa}
            onChange={(e) => setFilterVisa(e.target.value)}
            aria-label="Filter by visa status"
          >
            <option value="all">All Visa Types</option>
            <optgroup label="F-1 Student Visa">
              <option value="On-Campus Employment">On-Campus Employment</option>
              <option value="Curricular Practical Training (CPT)">CPT</option>
              <option value="Pre-Completion Optional Practical Training (OPT)">Pre-Completion OPT</option>
              <option value="Post-Completion Optional Practical Training (OPT)">Post-Completion OPT</option>
              <option value="STEM OPT Extension">STEM OPT Extension</option>
              <option value="Severe Economic Hardship Authorization">Severe Economic Hardship</option>
            </optgroup>
            <optgroup label="H-1B Professional Visa">
              <option value="Cap-Subject H-1B">Cap-Subject H-1B</option>
              <option value="Cap-Exempt H-1B">Cap-Exempt H-1B</option>
              <option value="H-4 EAD (Spousal Employment Authorization)">H-4 EAD</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* Candidates List Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonTable
              rows={7}
              cardWrapper={false}
              columns={[
                { width: '25%', type: 'avatar-text' },
                { width: '15%', type: 'badge' },
                { width: '22%', type: 'text', twoLines: true },
                { width: '15%', type: 'text' },
                { width: '12%', type: 'badge' },
                { width: '11%', type: 'actions' },
              ]}
            />
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Users}
              title="No candidates found"
              description="When sales employees convert leads into candidates and assign them to you, they will appear here along with their profile, preferences, visa, and resume."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <tr>
                  <th scope="col" className="text-table-header px-4 py-3">
                    Candidate & Location
                  </th>
                  <th scope="col" className="text-table-header px-4 py-3">
                    Visa Status
                  </th>
                  <th scope="col" className="text-table-header px-4 py-3">
                    Job Experience & Roles
                  </th>
                  <th scope="col" className="text-table-header px-4 py-3">
                    Target Cities
                  </th>
                  <th scope="col" className="text-table-header px-4 py-3">
                    Onboarding
                  </th>
                  <th scope="col" className="text-table-header px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredCandidates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((c) => {
                  return (
                    <tr
                      key={c._id}
                      onClick={() => openCandidateDetails(c)}
                      className="group cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                    >
                      {/* Candidate Name & Current City */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] border border-[#B2DDFF] text-[#175CD3] font-semibold text-xs shrink-0">
                            {c.firstName?.[0] || "C"}
                            {c.lastName?.[0] || ""}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#111827] group-hover:text-[#2563EB] transition-colors">
                              {c.firstName} {c.lastName}
                            </p>
                            <p className="text-[11px] text-[#667085] truncate max-w-[180px]">
                              {c.email}
                            </p>
                            {c.currentCity && (
                              <p className="text-[11px] text-[#667085] flex items-center gap-1 mt-0.5">
                                <MapPin size={10} className="text-[#98A2B3]" />
                                <span>{c.currentCity}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Visa Status */}
                      <td className="px-4 py-3.5 text-[#344054] font-medium">
                        {c.visaStatus || <span className="text-[#98A2B3] italic">Not set</span>}
                      </td>

                      {/* Job Experience & Titles */}
                      <td className="px-4 py-3.5">
                        {c.jobExperiences && c.jobExperiences.length > 0 ? (
                          <div className="space-y-0.5 max-w-[220px]">
                            {c.jobExperiences.slice(0, 2).map((exp, eIdx) => (
                              <div key={eIdx} className="text-[#111827]">
                                <span className="font-medium">{exp.jobTitle || "Role"}</span>
                                {exp.experience && (
                                  <span className="text-[#667085] text-[11px] ml-1">
                                    ({exp.experience})
                                  </span>
                                )}
                              </div>
                            ))}
                            {c.jobExperiences.length > 2 && (
                              <span className="text-[11px] text-[#2563EB] font-medium block">
                                +{c.jobExperiences.length - 2} more roles
                              </span>
                            )}
                          </div>
                        ) : c.preferredJobTitles && c.preferredJobTitles.length > 0 ? (
                          <div className="text-[#344054] font-medium max-w-[220px]">
                            {c.preferredJobTitles.slice(0, 2).join(', ')}
                            {c.preferredJobTitles.length > 2 && (
                              <span className="text-[#2563EB] text-[11px] ml-1 font-medium">
                                +{c.preferredJobTitles.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#98A2B3] italic">None specified</span>
                        )}
                      </td>

                      {/* Job City Preferences */}
                      <td className="px-4 py-3.5 text-[#667085]">
                        {c.preferredJobCities && c.preferredJobCities.length > 0 ? (
                          <div className="max-w-[200px] truncate" title={c.preferredJobCities.join(', ')}>
                            {c.preferredJobCities.slice(0, 2).join(', ')}
                            {c.preferredJobCities.length > 2 && (
                              <span className="text-[#2563EB] text-[11px] ml-1">
                                +{c.preferredJobCities.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#98A2B3] italic">None selected</span>
                        )}
                      </td>

                      {/* Onboarding Status */}
                      <td className="px-4 py-3.5">
                        <Badge variant={c.isOnboarded ? "success" : "warning"} size="sm" dot>
                          {c.isOnboarded ? "Onboarded" : "Pending"}
                        </Badge>
                      </td>

                      {/* Row Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          {user?.role === 'admin' && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCandidate(c._id, e)}
                              className="p-1 text-[#98A2B3] hover:text-[#F04438] rounded transition"
                              title="Delete Candidate"
                              aria-label={`Delete candidate ${c.firstName} ${c.lastName}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <span className="text-xs font-medium text-[#2563EB] group-hover:underline inline-flex items-center gap-0.5">
                            View <ArrowRight size={12} />
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
        {!loading && filteredCandidates.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredCandidates.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Candidate Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Candidate Profile"
        subtitle="Complete candidate record, onboarding details, and resumes"
        size="lg"
      >
        {selectedCandidate && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#EFF6FF] border border-[#B2DDFF] text-[#175CD3] font-semibold text-sm shrink-0">
                  {selectedCandidate.firstName?.[0] || "C"}
                  {selectedCandidate.lastName?.[0] || ""}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#111827]">
                    {selectedCandidate.firstName} {selectedCandidate.lastName}
                  </h3>
                  <p className="text-xs text-[#667085] flex items-center gap-2 mt-0.5">
                    <span>{selectedCandidate.email}</span>
                    {selectedCandidate.phone && <span>· {selectedCandidate.phone}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedCandidate.isOnboarded ? "success" : "warning"} size="sm" dot>
                  {selectedCandidate.isOnboarded ? "Onboarded" : "Pending"}
                </Badge>
                <Badge variant={selectedCandidate.accountStatus === "active" ? "info" : "neutral"} size="sm">
                  {selectedCandidate.accountStatus === "active" ? "Portal Active" : "Invite Sent"}
                </Badge>
              </div>
            </div>

            {/* Core Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="p-3.5 rounded-lg border border-[#E5E7EB] bg-white space-y-1">
                <span className="text-[#667085] font-medium block">Current Living City</span>
                <p className="font-semibold text-[#111827] text-sm">
                  {selectedCandidate.currentCity || "Not specified"}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-[#E5E7EB] bg-white space-y-1">
                <span className="text-[#667085] font-medium block">Visa Work Authorization</span>
                <p className="font-semibold text-[#111827] text-sm">
                  {selectedCandidate.visaStatus || "Not specified"}
                </p>
              </div>
            </div>

            {/* Experiences */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[#111827] uppercase tracking-wide">
                Work Experiences
              </h4>
              {selectedCandidate.jobExperiences && selectedCandidate.jobExperiences.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedCandidate.jobExperiences.map((exp, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-[#E5E7EB] bg-white text-xs"
                    >
                      <p className="font-semibold text-[#111827] truncate">
                        {exp.jobTitle || "Role / Position"}
                      </p>
                      <p className="text-[11px] text-[#667085] mt-0.5">
                        Experience: {exp.experience || "Not specified"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#667085] italic">No prior experience listed.</p>
              )}
            </div>

            {/* Target Titles & Cities */}
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="p-3.5 rounded-lg border border-[#E5E7EB] bg-white space-y-2">
                <span className="text-[#667085] font-medium block">Target Job Titles</span>
                <div className="flex flex-wrap gap-1">
                  {selectedCandidate.preferredJobTitles && selectedCandidate.preferredJobTitles.length > 0 ? (
                    selectedCandidate.preferredJobTitles.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded bg-[#F9FAFB] border border-[#E5E7EB] text-[#344054]">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#667085] italic">None specified</span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-[#E5E7EB] bg-white space-y-2">
                <span className="text-[#667085] font-medium block">Preferred Cities</span>
                <div className="flex flex-wrap gap-1">
                  {selectedCandidate.preferredJobCities && selectedCandidate.preferredJobCities.length > 0 ? (
                    selectedCandidate.preferredJobCities.map((city) => (
                      <span key={city} className="px-2 py-0.5 rounded bg-[#F9FAFB] border border-[#E5E7EB] text-[#344054]">
                        {city}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#667085] italic">None specified</span>
                  )}
                </div>
              </div>
            </div>

            {/* Resume Documents Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Original Resume */}
              <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <FileText size={18} className="text-[#667085]" />
                    <h4 className="text-xs font-semibold text-[#111827]">Original Resume</h4>
                  </div>
                  <p className="text-[11px] text-[#667085] truncate">
                    {selectedCandidate.resume?.originalName ||
                      (selectedCandidate.resume?.filename
                        ? "Candidate document on file"
                        : "No resume uploaded")}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#E5E7EB]">
                  {(selectedCandidate.resume?.filename || selectedCandidate.resume?.path) ? (
                    <button
                      type="button"
                      onClick={() => handleDownloadResume(selectedCandidate)}
                      disabled={downloadingId === selectedCandidate._id}
                      className="btn-secondary text-xs h-8 w-full"
                    >
                      <Download size={13} />
                      <span>{downloadingId === selectedCandidate._id ? "Downloading..." : "Download Original"}</span>
                    </button>
                  ) : (
                    <span className="text-xs text-[#98A2B3] italic block text-center">Pending Upload</span>
                  )}
                </div>
              </div>

              {/* ATS Resume */}
              <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <FileCheck size={18} className="text-[#2563EB]" />
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-[#111827]">ATS-Formatted Resume</h4>
                      <Badge variant="info" size="sm">Recruiter</Badge>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#667085] truncate">
                    {selectedCandidate.atsResume?.originalName || "Not prepared yet"}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#E5E7EB] flex items-center gap-2">
                  {selectedCandidate.atsResume?.filename && (
                    <button
                      type="button"
                      onClick={() => handleDownloadAtsResume(selectedCandidate)}
                      disabled={downloadingAtsId === selectedCandidate._id}
                      className="btn-secondary text-xs h-8 flex-1"
                    >
                      <Download size={13} />
                      <span>Download</span>
                    </button>
                  )}

                  <label className="btn-primary text-xs h-8 flex-1 cursor-pointer">
                    <UploadCloud size={13} />
                    <span>
                      {uploadingAtsId === selectedCandidate._id
                        ? "Uploading..."
                        : selectedCandidate.atsResume?.filename
                        ? "Replace"
                        : "Upload ATS"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      disabled={uploadingAtsId === selectedCandidate._id}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadAtsResume(selectedCandidate._id, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Conversion Details */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-3">
              <span className="font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-200 pb-1.5">
                Lead Source & Conversion Audit
              </span>
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Lead Generated By */}
                <div className="rounded-lg bg-white border border-slate-100 p-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Lead Generated By</span>
                  <span className="font-semibold text-slate-800 block">
                    {selectedCandidate.sourceLeadId?.createdBy?.name
                      || selectedCandidate.sourceLeadId?.employeeName
                      || "N/A"}
                  </span>
                  {selectedCandidate.sourceLeadId?.createdBy?.role && (
                    <span className="text-[10px] text-indigo-600 font-medium capitalize">
                      {selectedCandidate.sourceLeadId.createdBy.role}
                    </span>
                  )}
                  {selectedCandidate.sourceLeadId?.leadSource && (
                    <span className="text-[10px] text-slate-400 block">
                      Source: {selectedCandidate.sourceLeadId.leadSource}
                    </span>
                  )}
                </div>

                {/* Converted By (Sales) */}
                <div className="rounded-lg bg-white border border-slate-100 p-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Converted By (Sales)</span>
                  <span className="font-semibold text-slate-800 block">
                    {selectedCandidate.convertedBy?.name || "System"}
                  </span>
                  <span className="text-[10px] text-amber-600 font-medium capitalize">
                    {selectedCandidate.convertedBy?.role || "sales"}
                  </span>
                  {selectedCandidate.convertedBy?.email && (
                    <span className="text-[10px] text-slate-400 block truncate" title={selectedCandidate.convertedBy.email}>
                      {selectedCandidate.convertedBy.email}
                    </span>
                  )}
                </div>

                {/* Assigned To (Marketing) */}
                <div className="rounded-lg bg-white border border-slate-100 p-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Assigned To (Marketing)</span>
                  <span className="font-semibold text-slate-800 block">
                    {selectedCandidate.assignedTo?.name || "Unassigned"}
                  </span>
                  {selectedCandidate.assignedTo?.role && (
                    <span className="text-[10px] text-emerald-600 font-medium capitalize">
                      {selectedCandidate.assignedTo.role}
                    </span>
                  )}
                  {selectedCandidate.assignedTo?.email && (
                    <span className="text-[10px] text-slate-400 block truncate" title={selectedCandidate.assignedTo.email}>
                      {selectedCandidate.assignedTo.email}
                    </span>
                  )}
                </div>

                {/* Converted Date */}
                <div className="rounded-lg bg-white border border-slate-100 p-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Converted Date</span>
                  <span className="font-semibold text-slate-800 block">
                    {selectedCandidate.convertedAt
                      ? new Date(selectedCandidate.convertedAt).toLocaleString()
                      : "N/A"}
                  </span>
                  {selectedCandidate.sourceLeadId?.entryDate && (
                    <span className="text-[10px] text-slate-400 block">
                      Lead Date: {new Date(selectedCandidate.sourceLeadId.entryDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
              {user?.role === 'admin' ? (
                <button
                  type="button"
                  onClick={() => handleDeleteCandidate(selectedCandidate._id)}
                  className="btn-danger text-xs h-8 px-3"
                >
                  <Trash2 size={13} />
                  <span>Delete Candidate</span>
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                className="btn-secondary text-xs h-8 px-4"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
