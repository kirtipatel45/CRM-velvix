import { useState, useRef, useEffect } from "react";
import { useCandidateAuth } from "../../context/CandidateAuthContext";
import { candidateAuthAPI } from "../../services/api";
import {
  CheckCircle2,
  FileText,
  ShieldCheck,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  Compass,
  UploadCloud,
  Download,
  Edit3,
  Plus,
  X,
  FileCheck,
  Sparkles,
  AlertCircle,
  Clock,
  Layers,
  Award,
  Briefcase,
  GraduationCap,
  Send,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../../components/Modal";

const POPULAR_CITIES = [
  "Dallas, TX",
  "Austin, TX",
  "San Jose, CA",
  "San Francisco, CA",
  "New York, NY",
  "Chicago, IL",
  "Atlanta, GA",
  "Seattle, WA",
  "Charlotte, NC",
  "Boston, MA",
  "Remote",
];

export const VISA_STATUS_GROUPS = [
  {
    category: "F-1 Student Visa",
    icon: "GraduationCap",
    options: [
      { id: "On-Campus Employment", label: "On-Campus Employment", desc: "Student employment on school campus" },
      { id: "Curricular Practical Training (CPT)", label: "Curricular Practical Training (CPT)", desc: "Off-campus authorization during studies" },
      { id: "Pre-Completion Optional Practical Training (OPT)", label: "Pre-Completion Optional Practical Training (OPT)", desc: "OPT prior to degree completion" },
      { id: "Post-Completion Optional Practical Training (OPT)", label: "Post-Completion Optional Practical Training (OPT)", desc: "Initial 12-month post-graduation OPT" },
      { id: "STEM OPT Extension", label: "STEM OPT Extension", desc: "24-month STEM extension authorization" },
      { id: "Severe Economic Hardship Authorization", label: "Severe Economic Hardship Authorization", desc: "Off-campus hardship employment" },
    ],
  },
  {
    category: "H-1B Professional Visa",
    icon: "Briefcase",
    options: [
      { id: "Cap-Subject H-1B", label: "Cap-Subject H-1B", desc: "Annual lottery quota H-1B specialty occupation" },
      { id: "Cap-Exempt H-1B", label: "Cap-Exempt H-1B", desc: "Higher education or non-profit research institution" },
      { id: "H-4 EAD (Spousal Employment Authorization)", label: "H-4 EAD (Spousal Employment Authorization)", desc: "Work authorization for qualifying H-4 spouses" },
    ],
  },
];

export default function CandidatePortalHome() {
  const { candidate, candidateToken, updateCandidate } = useCandidateAuth();

  // Onboarding Form State
  const [formData, setFormData] = useState({
    firstName: candidate?.firstName || "",
    lastName: candidate?.lastName || "",
    phone: candidate?.phone || "",
    currentCity: candidate?.currentCity || "",
    preferredJobCities: candidate?.preferredJobCities || [],
    preferredJobTitles: candidate?.preferredJobTitles || [],
    visaStatus: candidate?.visaStatus || "",
  });

  const [customCityInput, setCustomCityInput] = useState("");
  const [customTitleInput, setCustomTitleInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [downloadingAtsResume, setDownloadingAtsResume] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Application Metrics from Marketing Team
  const [appMetrics, setAppMetrics] = useState({
    totalLongApplications: 0,
    totalEasyApplications: 0,
    totalApplications: 0,
    submissionCount: 0,
    submissions: [],
  });
  const [metricsLoading, setMetricsLoading] = useState(false);

  const fileInputRef = useRef(null);

  const candidateFullName = candidate?.firstName
    ? `${candidate.firstName} ${candidate.lastName || ""}`.trim()
    : "Candidate";

  const fetchApplicationMetrics = async () => {
    if (!candidateToken) return;
    setMetricsLoading(true);
    try {
      const res = await candidateAuthAPI.getApplicationMetrics(candidateToken);
      if (res.data?.metrics) {
        setAppMetrics(res.data.metrics);
      }
    } catch (err) {
      console.error("Failed to load application metrics:", err);
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    if (candidate?.isOnboarded) {
      fetchApplicationMetrics();
    }
  }, [candidateToken, candidate?.isOnboarded]);

  const handleCityToggle = (city) => {
    setFormData((prev) => {
      const exists = prev.preferredJobCities.includes(city);
      if (exists) {
        return {
          ...prev,
          preferredJobCities: prev.preferredJobCities.filter((c) => c !== city),
        };
      } else {
        return {
          ...prev,
          preferredJobCities: [...prev.preferredJobCities, city],
        };
      }
    });
  };

  const handleAddCustomCity = (e) => {
    if (e) e.preventDefault();
    const trimmed = customCityInput.trim();
    if (!trimmed) return;
    if (!formData.preferredJobCities.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        preferredJobCities: [...prev.preferredJobCities, trimmed],
      }));
    }
    setCustomCityInput("");
  };

  const handleRemoveCity = (cityToRemove) => {
    setFormData((prev) => ({
      ...prev,
      preferredJobCities: prev.preferredJobCities.filter((c) => c !== cityToRemove),
    }));
  };

  const handleAddCustomTitle = (e) => {
    if (e) e.preventDefault();
    const trimmed = customTitleInput.trim();
    if (!trimmed) return;
    if (!formData.preferredJobTitles.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        preferredJobTitles: [...prev.preferredJobTitles, trimmed],
      }));
    }
    setCustomTitleInput("");
  };

  const handleRemoveTitle = (titleToRemove) => {
    setFormData((prev) => ({
      ...prev,
      preferredJobTitles: prev.preferredJobTitles.filter((t) => t !== titleToRemove),
    }));
  };

  const validateAndSetFile = (file) => {
    setFileError("");
    if (!file) return;

    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
      setFileError("Invalid file type. Please upload a PDF, DOC, or DOCX document.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError("File is too large. Maximum allowed resume size is 10 MB.");
      return;
    }

    setSelectedFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleSubmitOnboarding = async (e) => {
    e.preventDefault();

    if (!formData.firstName.trim()) {
      toast.error("Please enter your first name");
      return;
    }

    if (!formData.currentCity.trim()) {
      toast.error("Please enter the city you are currently living in");
      return;
    }

    if (!formData.visaStatus) {
      toast.error("Please select your current Visa Status");
      return;
    }

    if (formData.preferredJobCities.length === 0) {
      toast.error("Please select or add at least one preferred job city");
      return;
    }

    // If candidate has no existing resume and hasn't selected a new one
    if (!candidate?.hasResume && !selectedFile) {
      toast.error("Please upload your resume (PDF or Word document)");
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("firstName", formData.firstName);
      data.append("lastName", formData.lastName);
      data.append("phone", formData.phone);
      data.append("currentCity", formData.currentCity);
      data.append("visaStatus", formData.visaStatus);
      data.append("preferredJobCities", JSON.stringify(formData.preferredJobCities));
      data.append("preferredJobTitles", JSON.stringify(formData.preferredJobTitles));

      if (selectedFile) {
        data.append("resume", selectedFile);
      }

      const res = await candidateAuthAPI.submitOnboarding(data, candidateToken);
      toast.success(res.data.message || "Onboarding profile saved successfully!");
      if (res.data.candidate) {
        updateCandidate(res.data.candidate);
      }
      setSelectedFile(null);
      setEditModalOpen(false);
    } catch (err) {
      console.error("Onboarding submission failed:", err);
      const msg = err.response?.data?.message || "Failed to save onboarding details";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadResume = async () => {
    setDownloadingResume(true);
    try {
      const res = await candidateAuthAPI.downloadResume(candidateToken);
      const blob = new Blob([res.data], {
        type: res.headers["content-type"] || "application/pdf",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", candidate?.resumeName || "My_Resume.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download resume:", err);
      toast.error("Failed to download resume");
    } finally {
      setDownloadingResume(false);
    }
  };

  const handleDownloadAtsResume = async () => {
    setDownloadingAtsResume(true);
    try {
      const res = await candidateAuthAPI.downloadAtsResume(candidateToken);
      const blob = new Blob([res.data], {
        type: res.headers["content-type"] || "application/pdf",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", candidate?.atsResumeName || "My_ATS_Resume.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download ATS resume:", err);
      toast.error("Failed to download ATS resume");
    } finally {
      setDownloadingAtsResume(false);
    }
  };

  const openEditModal = () => {
    setFormData({
      firstName: candidate?.firstName || "",
      lastName: candidate?.lastName || "",
      phone: candidate?.phone || "",
      currentCity: candidate?.currentCity || "",
      preferredJobCities: candidate?.preferredJobCities || [],
      preferredJobTitles: candidate?.preferredJobTitles || [],
      visaStatus: candidate?.visaStatus || "",
    });
    setCustomCityInput("");
    setCustomTitleInput("");
    setSelectedFile(null);
    setFileError("");
    setEditModalOpen(true);
  };

  // If candidate is not yet onboarded, render the primary full-page onboarding form
  const showFullOnboardingForm = !candidate?.isOnboarded;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-950 p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {candidate?.isOnboarded ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 border border-emerald-500/40 shadow-xs">
                  <CheckCircle2 size={13} />
                  <span>Onboarding Completed</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200 border border-amber-500/40 shadow-xs animate-pulse">
                  <Clock size={13} />
                  <span>Onboarding Pending</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-brand-100 border border-white/20">
                <ShieldCheck size={13} />
                <span>Candidate Portal</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {candidate?.isOnboarded
                ? `Welcome back, ${candidateFullName}!`
                : `Welcome to CRM Velvix, ${candidateFullName}!`}
            </h1>
            <p className="mt-1 text-sm text-brand-100 max-w-2xl leading-relaxed">
              {candidate?.isOnboarded
                ? "Your candidate profile and preferences are active. Our dedicated marketing team is actively matching and submitting your profile for client job openings."
                : "Please fill out your onboarding details below so our marketing recruiters can align your profile with prime client job opportunities across the US."}
            </p>
          </div>

          {candidate?.isOnboarded && (
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={openEditModal}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-md px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition border border-white/20 shadow-xs"
              >
                <Edit3 size={15} />
                <span>Edit Profile</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RENDER ONBOARDING FORM IF NOT ONBOARDED */}
      {showFullOnboardingForm ? (
        <div className="card shadow-md border border-slate-200 p-6 sm:p-8 space-y-8 bg-white">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5 text-brand-600 font-bold text-lg">
              <Sparkles size={20} />
              <h2>Candidate Onboarding & Preferences Form</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Provide accurate location, visa status, preferred titles, and resume to expedite your marketing outreach.
            </p>
          </div>

          <form onSubmit={handleSubmitOnboarding} className="space-y-8">
            {/* Step 1: Personal & Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <UserCheck size={16} className="text-brand-600" />
                <span>1. Personal & Contact Information</span>
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="onboarding-first-name" className="label">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="onboarding-first-name"
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Alex"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label htmlFor="onboarding-last-name" className="label">
                    Last Name
                  </label>
                  <input
                    id="onboarding-last-name"
                    type="text"
                    className="input-field"
                    placeholder="e.g. Taylor"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label htmlFor="onboarding-email" className="label">
                    Email Address <span className="text-slate-400 font-normal">(Registered)</span>
                  </label>
                  <input
                    id="onboarding-email"
                    type="email"
                    disabled
                    className="input-field bg-slate-50 text-slate-500 cursor-not-allowed"
                    value={candidate?.email || ""}
                  />
                </div>

                <div>
                  <label htmlFor="onboarding-phone" className="label">
                    Phone Number
                  </label>
                  <input
                    id="onboarding-phone"
                    type="tel"
                    className="input-field"
                    placeholder="e.g. +1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Current Living Location & Visa Status */}
            <div className="space-y-5">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <MapPin size={16} className="text-brand-600" />
                <span>2. Location & Visa Work Authorization</span>
              </h3>

              {/* City living in */}
              <div>
                <label htmlFor="onboarding-current-city" className="label">
                  City You Are Living In <span className="text-red-500">*</span>
                </label>
                <div className="relative max-w-md">
                  <MapPin
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="onboarding-current-city"
                    type="text"
                    required
                    className="input-field pl-9"
                    placeholder="e.g. Dallas, TX or San Jose, CA"
                    value={formData.currentCity}
                    onChange={(e) =>
                      setFormData({ ...formData, currentCity: e.target.value })
                    }
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Your current residential city and US state
                </p>
              </div>

              {/* Visa Authorization Categorized Selection */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <label className="label mb-0">
                    Visa Work Authorization <span className="text-red-500">*</span>
                  </label>
                  {formData.visaStatus && (
                    <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
                      Selected: {formData.visaStatus}
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {VISA_STATUS_GROUPS.map((group) => (
                    <div key={group.category} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                        {group.category === "F-1 Student Visa" ? (
                          <GraduationCap size={16} className="text-brand-600" />
                        ) : (
                          <Briefcase size={16} className="text-indigo-600" />
                        )}
                        <span>{group.category}</span>
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {group.options.map((opt) => {
                          const isSelected = formData.visaStatus === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                setFormData({ ...formData, visaStatus: opt.id })
                              }
                              className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                                isSelected
                                  ? "border-brand-600 bg-brand-50/80 text-brand-900 font-bold shadow-xs ring-2 ring-brand-500/25"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 w-full mb-1">
                                <span className="text-xs font-semibold text-slate-900">{opt.label}</span>
                                <div
                                  className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 transition ${
                                    isSelected
                                      ? "border-brand-600 bg-brand-600 text-white"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {isSelected && <CheckCircle2 size={12} className="text-white" />}
                                </div>
                              </div>
                              <span className="text-[11px] text-slate-500 font-normal leading-tight">
                                {opt.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3: Preferred Job Titles */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Briefcase size={16} className="text-brand-600" />
                <span>3. Preferred Job Titles (Enter Multiple)</span>
              </h3>

              <div className="space-y-3">
                <label className="label">
                  Target Job Titles (Type manually and add)
                </label>

                {/* Selected Job Titles Badges */}
                <div className="flex flex-wrap items-center gap-2 min-h-[42px] p-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70">
                  {formData.preferredJobTitles.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">
                      Type your target job titles below and click "Add Title" or press Enter...
                    </span>
                  ) : (
                    formData.preferredJobTitles.map((title) => (
                      <span
                        key={title}
                        className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 text-white px-3 py-1 text-xs font-semibold shadow-xs animate-fadeIn"
                      >
                        <Briefcase size={11} />
                        <span>{title}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTitle(title)}
                          className="hover:bg-indigo-700 rounded-full p-0.5 transition"
                          title={`Remove ${title}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Input for adding manual job titles */}
                <div className="flex gap-2 max-w-lg">
                  <div className="relative flex-1">
                    <Briefcase
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      className="input-field pl-9 text-xs py-2"
                      placeholder="e.g. Full Stack Developer, Data Engineer, Cloud Architect"
                      value={customTitleInput}
                      onChange={(e) => setCustomTitleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomTitle(e);
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomTitle}
                    className="btn-secondary text-xs px-3.5 py-2 flex-shrink-0"
                  >
                    Add Title
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  You can enter multiple target roles and titles that align with your background.
                </p>
              </div>
            </div>

            {/* Step 4: Job Preferences & Preferred Cities */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Compass size={16} className="text-brand-600" />
                <span>4. City of Job Preference (Select Multiple)</span>
              </h3>

              <div className="space-y-3">
                <label className="label">
                  Preferred Job Locations / Cities <span className="text-red-500">*</span>
                </label>

                {/* Selected Cities Badges */}
                <div className="flex flex-wrap items-center gap-2 min-h-[38px] p-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70">
                  {formData.preferredJobCities.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">
                      Click below or type to add your target job cities...
                    </span>
                  ) : (
                    formData.preferredJobCities.map((city) => (
                      <span
                        key={city}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 text-white px-3 py-1 text-xs font-semibold shadow-xs animate-fadeIn"
                      >
                        <MapPin size={11} />
                        <span>{city}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCity(city)}
                          className="hover:bg-brand-700 rounded-full p-0.5 transition"
                          title={`Remove ${city}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Popular City Pills Quick Selector */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                    Popular US Tech Hubs (Click to toggle):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_CITIES.map((city) => {
                      const isSelected = formData.preferredJobCities.includes(city);
                      return (
                        <button
                          key={city}
                          type="button"
                          onClick={() => handleCityToggle(city)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                            isSelected
                              ? "bg-brand-100 text-brand-800 border border-brand-300 font-semibold"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {isSelected ? (
                            <CheckCircle2 size={12} className="text-brand-600" />
                          ) : (
                            <Plus size={12} className="text-slate-400" />
                          )}
                          <span>{city}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Add Custom City Input */}
                <div className="flex gap-2 max-w-md pt-1">
                  <input
                    type="text"
                    className="input-field text-xs py-2"
                    placeholder="Add other city (e.g. Denver, CO)"
                    value={customCityInput}
                    onChange={(e) => setCustomCityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomCity(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCity}
                    className="btn-secondary text-xs px-3 py-2 flex-shrink-0"
                  >
                    Add City
                  </button>
                </div>
              </div>
            </div>

            {/* Step 5: Resume File Upload */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <FileText size={16} className="text-brand-600" />
                <span>5. Resume Upload <span className="text-red-500">*</span></span>
              </h3>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                  isDragging
                    ? "border-brand-500 bg-brand-50/50 scale-[1.01]"
                    : selectedFile
                    ? "border-emerald-300 bg-emerald-50/30"
                    : "border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-brand-400"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <FileCheck size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to submit
                      </p>
                    </div>
                    <span className="text-xs text-brand-600 font-semibold hover:underline">
                      Click or drop to replace file
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <UploadCloud size={24} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">
                        Click to upload or drag & drop your resume
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Supported Formats: PDF, DOC, DOCX (Max: 10 MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {fileError && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}
            </div>

            {/* Submission Button */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary py-3 px-8 text-base shadow-md flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Saving Onboarding Profile...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Complete Onboarding & Submit Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* CANDIDATE PROFILE DASHBOARD (ONBOARDED) */
        <div className="space-y-6">
          {/* Top Quick Status Metric Cards */}
          <div className="grid gap-5 md:grid-cols-3">
            {/* Visa Status Badge Card */}
            <div className="card border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Work Authorization
              </span>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700 border border-brand-200">
                  <Award size={14} className="text-brand-600" />
                  <span>{candidate?.visaStatus || "Not Set"}</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">Verified</span>
              </div>
            </div>

            {/* Current City Card */}
            <div className="card border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Current Living City
              </span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                <MapPin size={16} className="text-red-500 flex-shrink-0" />
                <span className="truncate">{candidate?.currentCity || "Not Provided"}</span>
              </div>
            </div>

            {/* Resume Status Card */}
            <div className="card border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Active Resume
              </span>
              <div className="flex items-center justify-between">
                {candidate?.hasResume ? (
                  <button
                    type="button"
                    onClick={handleDownloadResume}
                    disabled={downloadingResume}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full hover:bg-emerald-100 transition"
                  >
                    <Download size={13} />
                    <span>{downloadingResume ? "Downloading..." : "Download"}</span>
                  </button>
                ) : (
                  <span className="text-xs text-amber-600">Pending Upload</span>
                )}
                <span className="text-[11px] text-slate-400">PDF/Doc</span>
              </div>
            </div>
          </div>

          {/* Main Content Layout */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column (2 Cols): Details & Job Preferences */}
            <div className="lg:col-span-2 space-y-6">
              {/* Client Applications & Marketing Outreach Card */}
              <div className="card shadow-xs border border-slate-200 space-y-5 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                      <Send size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        Client Applications & Marketing Outreach
                      </h3>
                      <p className="text-xs text-slate-500">
                        Live tracking of submissions made by your assigned marketing team
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200 self-start sm:self-auto">
                    <TrendingUp size={13} />
                    <span>{appMetrics.totalApplications} Total Submitted</span>
                  </span>
                </div>

                {/* Metrics Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Long Applications */}
                  <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-4 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900">Long Applications Submitted</span>
                      <span className="rounded-full bg-blue-100/80 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                        Enterprise Portals
                      </span>
                    </div>
                    <div className="text-2xl font-extrabold text-blue-950">
                      {appMetrics.totalLongApplications}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Detailed enterprise applications and direct vendor client submissions
                    </p>
                  </div>

                  {/* Easy Applications */}
                  <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-4 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900">Easy Applications Submitted</span>
                      <span className="rounded-full bg-indigo-100/80 px-2 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-200">
                        Fast-Track
                      </span>
                    </div>
                    <div className="text-2xl font-extrabold text-indigo-950">
                      {appMetrics.totalEasyApplications}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Fast-track 1-click job postings & direct recruiter applications
                    </p>
                  </div>
                </div>

                {/* Submissions Log Feed */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={13} className="text-slate-400" />
                      <span>Marketing Activity Feed</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {appMetrics.submissions.length} submission entries
                    </span>
                  </div>

                  {metricsLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                    </div>
                  ) : appMetrics.submissions.length > 0 ? (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {appMetrics.submissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/80 text-xs hover:bg-slate-100/80 transition"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 truncate">
                                {sub.jobTitle || candidate?.primarySkill || "Target Position"}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {new Date(sub.date).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-slate-500 text-[11px]">
                              Recruiter: <strong className="text-slate-700">{sub.recruiterName}</strong>
                              {sub.notes && <span className="italic ml-1.5 text-slate-600">"{sub.notes}"</span>}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="rounded-lg bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                              Long: {sub.longApplications}
                            </span>
                            <span className="rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
                              Easy: {sub.easyApplications}
                            </span>
                            <span className="rounded-lg bg-brand-600 text-white px-2 py-0.5 text-[11px] font-bold">
                              Total: {sub.totalApplications}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">No application submissions logged yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Your assigned marketing team is actively preparing and matching client job openings.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Preferred Job Titles Card */}
              <div className="card shadow-xs border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Briefcase size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        Target Job Titles
                      </h3>
                      <p className="text-xs text-slate-500">
                        Roles & Positions Targeted in Client Marketing
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <Edit3 size={13} />
                    <span>Edit Titles</span>
                  </button>
                </div>

                <div>
                  <div className="flex flex-wrap gap-2">
                    {candidate?.preferredJobTitles && candidate.preferredJobTitles.length > 0 ? (
                      candidate.preferredJobTitles.map((title) => (
                        <span
                          key={title}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 text-xs font-semibold text-indigo-900 shadow-2xs"
                        >
                          <Briefcase size={12} className="text-indigo-600" />
                          <span>{title}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        No target job titles specified yet.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Location Preferences Card */}
              <div className="card shadow-xs border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-100">
                      <Compass size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        Job Location Preferences
                      </h3>
                      <p className="text-xs text-slate-500">
                        Target US Cities for Client Deployments & Submissions
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <Edit3 size={13} />
                    <span>Update Cities</span>
                  </button>
                </div>

                <div>
                  <div className="flex flex-wrap gap-2">
                    {candidate?.preferredJobCities && candidate.preferredJobCities.length > 0 ? (
                      candidate.preferredJobCities.map((city) => (
                        <span
                          key={city}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs"
                        >
                          <MapPin size={12} className="text-brand-600" />
                          <span>{city}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        No preferred job cities selected.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Candidate Info Summary Card */}
              <div className="card shadow-xs border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <UserCheck size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        Personal Contact & Authorization
                      </h3>
                      <p className="text-xs text-slate-500">
                        Verified contact and credentials
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <Edit3 size={13} />
                    <span>Edit Profile</span>
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="space-y-1 p-3 rounded-lg bg-slate-50/70 border border-slate-100">
                    <span className="text-slate-400 font-medium block">Full Name</span>
                    <span className="font-bold text-slate-800 text-sm">{candidateFullName}</span>
                  </div>

                  <div className="space-y-1 p-3 rounded-lg bg-slate-50/70 border border-slate-100">
                    <span className="text-slate-400 font-medium block">Email Address</span>
                    <span className="font-bold text-slate-800 text-sm">{candidate?.email}</span>
                  </div>

                  <div className="space-y-1 p-3 rounded-lg bg-slate-50/70 border border-slate-100">
                    <span className="text-slate-400 font-medium block">Phone Number</span>
                    <span className="font-bold text-slate-800 text-sm">{candidate?.phone || "Not provided"}</span>
                  </div>

                  <div className="space-y-1 p-3 rounded-lg bg-slate-50/70 border border-slate-100">
                    <span className="text-slate-400 font-medium block">Current Living City</span>
                    <span className="font-bold text-slate-800 text-sm">{candidate?.currentCity || "Not set"}</span>
                  </div>

                  <div className="space-y-1 p-3 rounded-lg bg-slate-50/70 border border-slate-100 sm:col-span-2">
                    <span className="text-slate-400 font-medium block">Visa Work Authorization</span>
                    <span className="font-bold text-brand-700 text-sm">{candidate?.visaStatus || "Not set"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (1 Col): Resume & Marketing Status */}
            <div className="space-y-6">
              {/* Resume File Box (Original) */}
              <div className="card shadow-xs border border-slate-200 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Your Original Resume</h3>
                    <p className="text-xs text-slate-500">Shared with marketing team</p>
                  </div>
                </div>

                {candidate?.hasResume ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/40">
                      <FileCheck size={28} className="text-emerald-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-slate-800 truncate">
                          {candidate.resumeName || "Candidate_Resume.pdf"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Uploaded & Verified
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadResume}
                        disabled={downloadingResume}
                        className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
                      >
                        <Download size={13} />
                        <span>{downloadingResume ? "Downloading..." : "Download"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={openEditModal}
                        className="btn-secondary py-2 text-xs px-3"
                        title="Upload a revised resume version"
                      >
                        <UploadCloud size={13} />
                        <span>Replace</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-2">
                    <AlertCircle size={28} className="mx-auto text-amber-500" />
                    <p className="text-xs font-semibold text-slate-700">No resume on file</p>
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="btn-primary text-xs py-1.5 px-4 inline-flex items-center gap-1"
                    >
                      <UploadCloud size={13} />
                      <span>Upload Resume</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ATS-Optimized Resume (Prepared by Recruiter) */}
              <div className="card shadow-xs border border-purple-200 bg-gradient-to-b from-purple-50/30 to-white space-y-4">
                <div className="flex items-center gap-2.5 border-b border-purple-100 pb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 border border-purple-200">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-slate-800 text-sm">ATS-Formatted Resume</h3>
                      <span className="rounded-full bg-purple-100 px-2 py-0.2 text-[10px] font-bold text-purple-700 border border-purple-200">
                        Recruiter Provided
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Optimized for client submissions</p>
                  </div>
                </div>

                {candidate?.hasAtsResume ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-purple-200 bg-purple-50/40">
                      <FileCheck size={28} className="text-purple-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-slate-800 truncate" title={candidate.atsResumeName}>
                          {candidate.atsResumeName || "ATS_Resume.pdf"}
                        </p>
                        <p className="text-[11px] text-purple-700 font-medium">
                          Formatted & Ready for Submissions
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadAtsResume}
                      disabled={downloadingAtsResume}
                      className="btn-primary bg-purple-600 hover:bg-purple-700 border-purple-600 w-full py-2 text-xs flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Download size={13} />
                      <span>{downloadingAtsResume ? "Downloading ATS Resume..." : "Download ATS Resume"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-dashed border-purple-200 bg-purple-50/30 text-xs text-slate-600 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-purple-900">
                      <Clock size={13} className="text-purple-600" />
                      <span>In Preparation</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Your marketing team is currently formatting and optimizing your resume with ATS-friendly standards. It will appear here for you to download once finalized.
                    </p>
                  </div>
                )}
              </div>

              {/* Placement & Marketing Pipeline */}
              <div className="card shadow-xs border border-slate-200 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-100">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Placement Pipeline</h3>
                    <p className="text-xs text-slate-500">Active Marketing Status</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Pipeline Status</span>
                    <span className="font-bold text-emerald-600">Active In Marketing</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-500 h-2 rounded-full w-2/3 animate-pulse" />
                  </div>
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    Your assigned recruiter has received your onboarding profile, preferred titles, preferred cities, visa status, and resume. Your profile is being actively positioned with US enterprise clients.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Update Candidate Onboarding Profile"
        size="lg"
      >
        <form onSubmit={handleSubmitOnboarding} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-first-name" className="label">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-first-name"
                type="text"
                required
                className="input-field text-sm"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
              />
            </div>

            <div>
              <label htmlFor="edit-last-name" className="label">
                Last Name
              </label>
              <input
                id="edit-last-name"
                type="text"
                className="input-field text-sm"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
              />
            </div>

            <div>
              <label htmlFor="edit-phone" className="label">
                Phone Number
              </label>
              <input
                id="edit-phone"
                type="tel"
                className="input-field text-sm"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <div>
              <label htmlFor="edit-current-city" className="label">
                City You Are Living In <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-current-city"
                type="text"
                required
                className="input-field text-sm"
                placeholder="e.g. Dallas, TX"
                value={formData.currentCity}
                onChange={(e) =>
                  setFormData({ ...formData, currentCity: e.target.value })
                }
              />
            </div>
          </div>

          {/* Visa Status */}
          <div className="space-y-3">
            <label className="label mb-0">
              Visa Work Authorization <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {VISA_STATUS_GROUPS.map((group) => (
                <div key={group.category} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    {group.category === "F-1 Student Visa" ? (
                      <GraduationCap size={14} className="text-brand-600" />
                    ) : (
                      <Briefcase size={14} className="text-indigo-600" />
                    )}
                    <span>{group.category}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {group.options.map((opt) => {
                      const isSelected = formData.visaStatus === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, visaStatus: opt.id })
                          }
                          className={`text-left p-2 rounded-lg border text-xs transition ${
                            isSelected
                              ? "border-brand-600 bg-brand-50 text-brand-900 font-semibold ring-1 ring-brand-500/30"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">{opt.label}</span>
                            {isSelected && <CheckCircle2 size={13} className="text-brand-600 flex-shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preferred Job Titles */}
          <div className="space-y-2">
            <label className="label">
              Preferred Job Title(s) (Type manually and add)
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-slate-200 bg-slate-50 min-h-[40px]">
              {formData.preferredJobTitles.length === 0 ? (
                <span className="text-xs text-slate-400 italic">
                  No job titles added yet.
                </span>
              ) : (
                formData.preferredJobTitles.map((title) => (
                  <span
                    key={title}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-600 text-white px-2.5 py-0.5 text-xs font-semibold"
                  >
                    <span>{title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTitle(title)}
                      className="hover:bg-indigo-700 rounded-full p-0.5"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex gap-2 max-w-md pt-1">
              <input
                type="text"
                className="input-field text-xs py-2"
                placeholder="e.g. Lead Java Developer"
                value={customTitleInput}
                onChange={(e) => setCustomTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomTitle(e);
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomTitle}
                className="btn-secondary text-xs px-3 py-2 flex-shrink-0"
              >
                Add Title
              </button>
            </div>
          </div>

          {/* Preferred Cities */}
          <div className="space-y-2">
            <label className="label">
              Preferred Job Cities <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-slate-200 bg-slate-50 min-h-[40px]">
              {formData.preferredJobCities.map((city) => (
                <span
                  key={city}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-600 text-white px-2.5 py-0.5 text-xs font-semibold"
                >
                  <span>{city}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCity(city)}
                    className="hover:bg-brand-700 rounded-full p-0.5"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {POPULAR_CITIES.map((city) => {
                const isSelected = formData.preferredJobCities.includes(city);
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => handleCityToggle(city)}
                    className={`rounded-lg px-2 py-0.5 text-xs font-medium border transition ${
                      isSelected
                        ? "bg-brand-50 border-brand-300 text-brand-700 font-semibold"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Re-upload Resume */}
          <div className="space-y-2">
            <label className="label">
              Upload New Resume File (Optional - Leave blank to keep existing)
            </label>
            <div className="flex items-center gap-3">
              <label className="btn-secondary text-xs cursor-pointer inline-flex items-center gap-1.5 py-2 px-3">
                <UploadCloud size={14} />
                <span>Choose File (PDF/DOCX)</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {selectedFile ? (
                <span className="text-xs text-emerald-700 font-semibold truncate">
                  {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              ) : candidate?.hasResume ? (
                <span className="text-xs text-slate-500 truncate">
                  Current: {candidate.resumeName}
                </span>
              ) : null}
            </div>
            {fileError && (
              <p className="text-xs text-red-600">{fileError}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
