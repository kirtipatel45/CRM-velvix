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
  Sparkles,
} from "lucide-react";
import Modal from "../components/Modal";
import { toast } from "react-hot-toast";

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
      toast.error("No resume uploaded by this candidate yet.");
      return;
    }

    setDownloadingId(candidate._id);
    try {
      const res = await marketingAPI.downloadCandidateResume(candidate._id);
      const blob = new Blob([res.data], {
        type: res.headers["content-type"] || "application/pdf",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        candidate.resume?.originalName || `${candidate.firstName}_Resume.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download resume:", err);
      toast.error(err.response?.data?.message || "Failed to download resume");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAtsResume = async (candidate) => {
    if (!candidate?.atsResume?.filename && !candidate?.atsResume?.path) {
      toast.error("No ATS-friendly resume uploaded for this candidate yet.");
      return;
    }

    setDownloadingAtsId(candidate._id);
    try {
      const res = await marketingAPI.downloadCandidateAtsResume(candidate._id);
      const blob = new Blob([res.data], {
        type: res.headers["content-type"] || "application/pdf",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        candidate.atsResume?.originalName || `${candidate.firstName}_ATS_Resume.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download ATS resume:", err);
      toast.error(err.response?.data?.message || "Failed to download ATS resume");
    } finally {
      setDownloadingAtsId(null);
    }
  };

  const handleUploadAtsResume = async (candidateId, file) => {
    if (!file) return;

    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      toast.error("Invalid file type. Please upload a PDF, DOC, or DOCX document.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 10 MB.");
      return;
    }

    setUploadingAtsId(candidateId);
    try {
      const formData = new FormData();
      formData.append("atsResume", file);

      const res = await marketingAPI.uploadCandidateAtsResume(candidateId, formData);
      toast.success(res.data.message || "ATS-friendly resume uploaded successfully!");

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

  const activeCount = candidates.filter((c) => c.accountStatus === "active").length;
  const onboardedCount = candidates.filter((c) => c.isOnboarded).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <UserCheck className="text-brand-600" size={26} />
            <span>Assigned Candidates</span>
            <span className="rounded-full bg-brand-50 px-3 py-0.5 text-xs font-bold text-brand-700 border border-brand-200">
              {candidates.length} {candidates.length === 1 ? "Candidate" : "Candidates"}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Candidates assigned to you for placement, marketing, job applications, and client outreach
          </p>
        </div>

        {/* Quick Stats Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-xs">
            <CheckCircle2 size={14} />
            <span>{onboardedCount} Onboarded</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-xs">
            <ShieldCheck size={14} />
            <span>{activeCount} Active Portals</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="candidate-search"
              className="input-field pl-9 text-sm"
              placeholder="Search by name, email, city living in, preferred cities, visa, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search candidates"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-40">
              <select
                id="candidate-status-filter"
                className="input-field text-sm py-2"
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
            </div>

            <div className="w-52">
              <select
                id="candidate-visa-filter"
                className="input-field text-sm py-2"
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
        </div>
      </div>

      {/* Candidates List Table */}
      <div className="card overflow-x-auto p-0 shadow-sm border border-slate-200">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Users size={44} className="mx-auto text-slate-300 mb-2" />
            <h3 className="text-base font-semibold text-slate-700">No candidates found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              When sales employees convert leads into candidates and assign them to you, they will appear here along with their onboarding profile, living city, job city preferences, visa, and resume.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80">
              <tr>
                <th scope="col" className="px-5 py-3.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Candidate & Location
                </th>
                <th scope="col" className="px-5 py-3.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Visa Status
                </th>
                <th scope="col" className="px-5 py-3.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Job Experience & Titles
                </th>
                <th scope="col" className="px-5 py-3.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Job City Preferences
                </th>
                <th scope="col" className="px-5 py-3.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Onboarding
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredCandidates.map((c) => {
                return (
                  <tr
                    key={c._id}
                    onClick={() => openCandidateDetails(c)}
                    className="group cursor-pointer hover:bg-brand-50/30 transition-all duration-150"
                  >
                    {/* Candidate Name & Current City */}
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs uppercase shadow-xs group-hover:bg-brand-600 group-hover:text-white transition-colors duration-150 flex-shrink-0">
                          {c.firstName?.[0] || "C"}
                          {c.lastName?.[0] || ""}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 group-hover:text-brand-600 transition-colors">
                            {c.firstName} {c.lastName}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <Mail size={12} className="text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">{c.email}</span>
                          </div>
                          {c.currentCity && (
                            <div className="flex items-center gap-1 text-[11px] text-brand-700 font-medium mt-0.5">
                              <MapPin size={11} className="text-brand-500" />
                              <span>Living in: {c.currentCity}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Visa Status */}
                    <td className="px-5 py-4">
                      {c.visaStatus ? (
                        <span className="text-xs font-bold text-indigo-700">
                          {c.visaStatus}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Visa not set</span>
                      )}
                    </td>

                    {/* Job Experience & Titles */}
                    <td className="px-5 py-4">
                      {c.jobExperiences && c.jobExperiences.length > 0 ? (
                        <div className="space-y-0.5 max-w-[240px]">
                          {c.jobExperiences.slice(0, 2).map((exp, eIdx) => (
                            <div key={eIdx} className="text-xs">
                              <span className="font-semibold text-slate-800">{exp.jobTitle || "Role"}</span>
                              {exp.experience && (
                                <span className="font-medium text-brand-700 ml-1">
                                  ({exp.experience})
                                </span>
                              )}
                            </div>
                          ))}
                          {c.jobExperiences.length > 2 && (
                            <span className="text-[11px] font-semibold text-brand-600 block">
                              +{c.jobExperiences.length - 2} more roles
                            </span>
                          )}
                        </div>
                      ) : c.preferredJobTitles && c.preferredJobTitles.length > 0 ? (
                        <div className="text-xs font-medium text-indigo-800 max-w-[220px]">
                          {c.preferredJobTitles.slice(0, 2).join(', ')}
                          {c.preferredJobTitles.length > 2 && (
                            <span className="text-[11px] font-semibold text-indigo-600 ml-1">
                              +{c.preferredJobTitles.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None specified</span>
                      )}
                    </td>

                    {/* Job City Preferences */}
                    <td className="px-5 py-4">
                      {c.preferredJobCities && c.preferredJobCities.length > 0 ? (
                        <div className="text-xs font-medium text-slate-700 max-w-[220px]">
                          {c.preferredJobCities.slice(0, 2).join(', ')}
                          {c.preferredJobCities.length > 2 && (
                            <span className="text-[11px] font-semibold text-brand-600 ml-1">
                              +{c.preferredJobCities.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None selected</span>
                      )}
                    </td>

                    {/* Onboarding Status */}
                    <td className="px-5 py-4">
                      {c.isOnboarded ? (
                        <span className="text-xs font-semibold text-emerald-600">
                          Onboarded
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-amber-600">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Candidate Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Candidate Profile & Onboarding Details"
        size="lg"
      >
        {selectedCandidate && (
          <div className="space-y-6">
            {/* Avatar & Main Info Header */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 shadow-2xs">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-base sm:text-lg uppercase border border-brand-200 shadow-2xs flex-shrink-0">
                {selectedCandidate.firstName?.[0] || "C"}
                {selectedCandidate.lastName?.[0] || ""}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-slate-800 truncate mb-0.5">
                  {selectedCandidate.firstName} {selectedCandidate.lastName}
                </h3>
                <p className="text-xs text-slate-500 truncate flex items-center gap-2">
                  <span>{selectedCandidate.email}</span>
                  {selectedCandidate.phone && <span>• {selectedCandidate.phone}</span>}
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <span
                  className={`text-xs font-bold ${
                    selectedCandidate.isOnboarded
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {selectedCandidate.isOnboarded ? "Onboarded" : "Pending Onboarding"}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {selectedCandidate.accountStatus === "active" ? "Portal Active" : "Invite Sent"}
                </span>
              </div>
            </div>

            {/* Candidate Onboarding & Preferences Section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Award size={16} className="text-brand-600" />
                <span>Candidate Onboarding & Preferences</span>
              </h4>

              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                {/* Current Living City */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-medium block">City Living In</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                    <MapPin size={15} className="text-red-500 flex-shrink-0" />
                    <span>{selectedCandidate.currentCity || "Not specified"}</span>
                  </div>
                </div>

                {/* Visa Status */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-medium block">Visa Work Authorization</span>
                  <div className="flex items-center gap-1.5 font-bold text-indigo-700 text-sm">
                    <Award size={15} className="text-indigo-500 flex-shrink-0" />
                    <span>{selectedCandidate.visaStatus || "Not specified"}</span>
                  </div>
                </div>
              </div>

              {/* Work & Job Experiences List */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Briefcase size={14} className="text-brand-600" />
                  <span>Work & Job Experiences (Candidate Background):</span>
                </span>
                {selectedCandidate.jobExperiences && selectedCandidate.jobExperiences.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedCandidate.jobExperiences.map((exp, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/80 shadow-2xs"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700 font-bold text-xs flex-shrink-0 mt-0.5">
                          <Briefcase size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 text-xs truncate">
                            {exp.jobTitle || "Role / Position"}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-brand-700 mt-0.5">
                            <Clock size={11} className="text-brand-500" />
                            <span>Experience: {exp.experience || "Not specified"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-400 italic">
                    Candidate has not entered specific work experiences yet.
                  </div>
                )}
              </div>

              {/* Preferred Job Titles Pills */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Award size={14} className="text-indigo-600" />
                  <span>Target Job Title(s) / Preferred Roles:</span>
                </span>
                <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100 min-h-[44px]">
                  {selectedCandidate.preferredJobTitles &&
                  selectedCandidate.preferredJobTitles.length > 0 ? (
                    selectedCandidate.preferredJobTitles.map((title) => (
                      <span
                        key={title}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1 text-xs font-semibold shadow-2xs"
                      >
                        <Briefcase size={12} className="text-indigo-600" />
                        <span>{title}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      Candidate has not entered any target job titles yet.
                    </span>
                  )}
                </div>
              </div>

              {/* Preferred Job Cities Pills */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Compass size={14} className="text-brand-600" />
                  <span>Preferred Job Locations / Cities (Target Markets):</span>
                </span>
                <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100 min-h-[44px]">
                  {selectedCandidate.preferredJobCities &&
                  selectedCandidate.preferredJobCities.length > 0 ? (
                    selectedCandidate.preferredJobCities.map((city) => (
                      <span
                        key={city}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-50 border border-brand-200 text-brand-800 px-3 py-1 text-xs font-semibold shadow-2xs"
                      >
                        <Compass size={12} className="text-brand-600" />
                        <span>{city}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      Candidate has not selected any job location preferences yet.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Resume Section: Original & ATS-Friendly */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Original Candidate Resume Card */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 flex-shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800">Original Resume</h4>
                      <p className="text-[11px] text-slate-500 truncate" title={selectedCandidate.resume?.originalName || ""}>
                        {selectedCandidate.resume?.originalName ||
                          (selectedCandidate.resume?.filename
                            ? "Candidate document uploaded"
                            : "No resume document on file")}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    Uploaded by candidate during onboarding
                  </span>
                </div>

                <div className="pt-2 border-t border-emerald-100 flex items-center justify-between">
                  {(selectedCandidate.resume?.filename || selectedCandidate.resume?.path) ? (
                    <button
                      type="button"
                      onClick={() => handleDownloadResume(selectedCandidate)}
                      disabled={downloadingId === selectedCandidate._id}
                      className="btn-primary py-1.5 px-3 text-xs inline-flex items-center gap-1.5 shadow-xs w-full justify-center"
                    >
                      <Download size={13} />
                      <span>
                        {downloadingId === selectedCandidate._id
                          ? "Downloading..."
                          : "Download Original"}
                      </span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 text-amber-800 px-2.5 py-1 text-xs font-semibold w-full justify-center">
                      <AlertCircle size={13} />
                      <span>Pending Upload</span>
                    </span>
                  )}
                </div>
              </div>

              {/* ATS-Friendly Formatted Resume Card */}
              <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 flex-shrink-0">
                      <Sparkles size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-800">ATS-Friendly Resume</h4>
                        <span className="rounded-full bg-purple-200/60 px-1.5 py-0.2 text-[10px] font-bold text-purple-800">
                          Recruiter Formatted
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate" title={selectedCandidate.atsResume?.originalName || ""}>
                        {selectedCandidate.atsResume?.originalName || "Not prepared yet"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    {selectedCandidate.atsResume?.uploadedAt
                      ? `Uploaded: ${new Date(selectedCandidate.atsResume.uploadedAt).toLocaleDateString()}`
                      : "Visible to candidate once uploaded"}
                  </span>
                </div>

                <div className="pt-2 border-t border-purple-100 flex items-center gap-2">
                  {selectedCandidate.atsResume?.filename && (
                    <button
                      type="button"
                      onClick={() => handleDownloadAtsResume(selectedCandidate)}
                      disabled={downloadingAtsId === selectedCandidate._id}
                      className="btn-primary bg-purple-600 hover:bg-purple-700 border-purple-600 py-1.5 px-3 text-xs inline-flex items-center justify-center gap-1.5 shadow-xs flex-1"
                    >
                      <Download size={13} />
                      <span>
                        {downloadingAtsId === selectedCandidate._id ? "..." : "Download"}
                      </span>
                    </button>
                  )}

                  {/* Upload / Replace ATS Resume File Input Button */}
                  <label className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs flex-1">
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
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
              <span className="font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-200 pb-1.5">
                Lead Source & Conversion Audit
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-slate-400 block">Converted By:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCandidate.convertedBy?.name || "System"} ({selectedCandidate.convertedBy?.role || "sales"})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Converted Date:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCandidate.convertedAt
                      ? new Date(selectedCandidate.convertedAt).toLocaleString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
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
    </div>
  );
}
