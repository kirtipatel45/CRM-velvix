import { useState, useEffect, useRef } from "react";
import {
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  Voicemail,
  Play,
  Pause,
  RotateCcw,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Clock4,
  ExternalLink,
  Mail,
  Linkedin,
  Phone,
  MessageSquare,
  AlertCircle,
  Save,
} from "lucide-react";
import Modal from "./Modal";
import { leadGenAPI } from "../services/api";
import { toast } from "react-hot-toast";

export default function StartCallModal({
  isOpen,
  onClose,
  lead,
  profile,
  onCallLogged,
}) {
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [durationMode, setDurationMode] = useState("timer"); // 'timer' | 'manual'
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualSeconds, setManualSeconds] = useState("");

  const [outcome, setOutcome] = useState(""); // 'picked_up' | 'call_cut' | 'voicemail' | 'not_answered'
  const [interestStatus, setInterestStatus] = useState("Interested"); // 'Interested' | 'Not Interested' | 'Call Back Later' | 'Pending'
  const [hasFollowUp, setHasFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const timerRef = useRef(null);

  // Initialize/Reset state when modal opens or target changes
  useEffect(() => {
    if (isOpen) {
      setTimerRunning(false);
      setTimerSeconds(0);
      setDurationMode("timer");
      setManualMinutes("");
      setManualSeconds("");
      setOutcome("");
      setInterestStatus("Interested");
      setHasFollowUp(false);
      setFollowUpDate("");
      setNotes("");
      setErrorMsg("");
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen, lead, profile]);

  // Stopwatch timer interval
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  if (!isOpen || !lead) return null;

  // Resolve target profile details
  const targetProfile =
    profile ||
    (lead.linkedInProfiles && lead.linkedInProfiles.length > 0
      ? lead.linkedInProfiles[0]
      : null);

  const contactName =
    targetProfile?.profileName || lead.employeeName || "Lead Contact";
  const contactPhone = targetProfile?.phone || "";
  const contactEmail = targetProfile?.email || "";
  const contactLinkedIn = targetProfile?.url || "";

  const formatTimerDisplay = (sec) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(
        2,
        "0"
      )}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleStartTimer = () => {
    setTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setTimerRunning(false);
  };

  const handleResetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(0);
  };

  // Quick preset follow up dates
  const setQuickFollowUp = (offsetHours) => {
    setHasFollowUp(true);
    const d = new Date();
    d.setHours(d.getHours() + offsetHours);
    d.setMinutes(0, 0, 0);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    setFollowUpDate(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const setTomorrowMorning = () => {
    setHasFollowUp(true);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setFollowUpDate(`${year}-${month}-${day}T10:00`);
  };

  const handleOutcomeSelect = (selectedOutcome) => {
    setOutcome(selectedOutcome);
    setErrorMsg("");

    // If picked up, automatically suggest interest check
    if (selectedOutcome === "picked_up") {
      setInterestStatus("Interested");
    } else if (selectedOutcome === "voicemail" || selectedOutcome === "call_cut") {
      // Suggest follow-up for disconnected/voicemail
      setHasFollowUp(true);
      if (!followUpDate) {
        setTomorrowMorning();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!outcome) {
      setErrorMsg("Please select a call outcome (Picked Up, Call Cut, Voicemail, or Not Answered)");
      return;
    }

    if (hasFollowUp && !followUpDate) {
      setErrorMsg("Please select a date and time for the follow-up call");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      // Calculate call duration
      let finalSeconds = 0;
      let finalDurationStr = "00:00";

      if (durationMode === "timer") {
        finalSeconds = timerSeconds;
        finalDurationStr = formatTimerDisplay(timerSeconds);
      } else {
        const m = parseInt(manualMinutes, 10) || 0;
        const s = parseInt(manualSeconds, 10) || 0;
        finalSeconds = m * 60 + s;
        finalDurationStr = `${m}m ${s}s`;
      }

      const payload = {
        profileId: targetProfile?._id || null,
        profileName: contactName,
        phone: contactPhone,
        callDuration: finalDurationStr,
        callDurationSeconds: finalSeconds,
        outcome,
        isInterested: outcome === "picked_up" && interestStatus === "Interested",
        interestStatus: outcome === "picked_up" ? interestStatus : "N/A",
        followUpDate: hasFollowUp && followUpDate ? new Date(followUpDate).toISOString() : null,
        notes,
      };

      const res = await leadGenAPI.logCall(lead._id, payload);
      toast.success(res.data.message || "Call logged successfully!");

      if (onCallLogged) {
        onCallLogged(res.data.data);
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to log call";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start a Call / Call Logger"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Contact Header Card */}
        <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-white p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                Calling Lead
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                {contactName}
              </h3>
              <p className="text-xs text-slate-500">
                Source: {lead.leadSource || "LinkedIn"} • Sourced By: {lead.employeeName}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {contactPhone ? (
                <a
                  href={`tel:${contactPhone}`}
                  onClick={() => {
                    if (!timerRunning && timerSeconds === 0) handleStartTimer();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  title="Click to dial on system/phone"
                >
                  <PhoneCall size={14} />
                  <span>Call {contactPhone}</span>
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                  <Phone size={12} /> No phone provided
                </span>
              )}

              {contactLinkedIn && (
                <a
                  href={contactLinkedIn.startsWith("http") ? contactLinkedIn : `https://${contactLinkedIn}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                  title="Open LinkedIn Profile"
                >
                  <Linkedin size={13} />
                  <span>Profile</span>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Live Call Duration / Stopwatch Section */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Call Duration
                </span>
                {timerRunning && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 border border-red-200 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    LIVE CALL ACTIVE
                  </span>
                )}
              </div>

              {durationMode === "timer" ? (
                <div className="mt-1 font-mono text-3xl font-bold tracking-wider text-slate-900">
                  {formatTimerDisplay(timerSeconds)}
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="300"
                      placeholder="0"
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(e.target.value)}
                      className="w-16 rounded-lg bg-white border border-slate-300 px-2.5 py-1 text-center text-sm font-bold text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="0"
                      value={manualSeconds}
                      onChange={(e) => setManualSeconds(e.target.value)}
                      className="w-16 rounded-lg bg-white border border-slate-300 px-2.5 py-1 text-center text-sm font-bold text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">sec</span>
                  </div>
                </div>
              )}
            </div>

            {/* Timer Controls & Mode Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              {durationMode === "timer" && (
                <>
                  {!timerRunning ? (
                    <button
                      type="button"
                      onClick={handleStartTimer}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
                    >
                      <Play size={13} />
                      <span>{timerSeconds > 0 ? "Resume Timer" : "Start Timer"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePauseTimer}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition shadow-xs"
                    >
                      <Pause size={13} />
                      <span>Pause Timer</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleResetTimer}
                    disabled={timerSeconds === 0}
                    className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-40 shadow-xs"
                    title="Reset timer"
                  >
                    <RotateCcw size={12} />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() =>
                  setDurationMode(durationMode === "timer" ? "manual" : "timer")
                }
                className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 hover:underline transition ml-1"
              >
                {durationMode === "timer"
                  ? "Enter Manually"
                  : "Use Live Stopwatch"}
              </button>
            </div>
          </div>
        </div>

        {/* Call Outcome Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Call Outcome *
          </label>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {/* Picked Up */}
            <button
              type="button"
              onClick={() => handleOutcomeSelect("picked_up")}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition ${
                outcome === "picked_up"
                  ? "border-emerald-500 bg-emerald-50/90 text-emerald-800 ring-2 ring-emerald-500/20 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/30"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  outcome === "picked_up"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-100 text-emerald-600"
                }`}
              >
                <PhoneCall size={16} />
              </div>
              <span className="text-xs font-bold">Call Picked Up</span>
              <span className="text-[10px] text-slate-500">Connected & spoke</span>
            </button>

            {/* Call Cut */}
            <button
              type="button"
              onClick={() => handleOutcomeSelect("call_cut")}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition ${
                outcome === "call_cut"
                  ? "border-rose-500 bg-rose-50/90 text-rose-800 ring-2 ring-rose-500/20 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50/30"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  outcome === "call_cut"
                    ? "bg-rose-600 text-white"
                    : "bg-rose-100 text-rose-600"
                }`}
              >
                <PhoneOff size={16} />
              </div>
              <span className="text-xs font-bold">Call Cut</span>
              <span className="text-[10px] text-slate-500">Disconnected/Hung up</span>
            </button>

            {/* Voicemail */}
            <button
              type="button"
              onClick={() => handleOutcomeSelect("voicemail")}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition ${
                outcome === "voicemail"
                  ? "border-amber-500 bg-amber-50/90 text-amber-800 ring-2 ring-amber-500/20 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/30"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  outcome === "voicemail"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-100 text-amber-600"
                }`}
              >
                <Voicemail size={16} />
              </div>
              <span className="text-xs font-bold">Voicemail</span>
              <span className="text-[10px] text-slate-500">Left message/IVR</span>
            </button>

            {/* Not Answered */}
            <button
              type="button"
              onClick={() => handleOutcomeSelect("not_answered")}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition ${
                outcome === "not_answered"
                  ? "border-slate-500 bg-slate-100 text-slate-800 ring-2 ring-slate-400/30 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  outcome === "not_answered"
                    ? "bg-slate-700 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                <PhoneMissed size={16} />
              </div>
              <span className="text-xs font-bold">Not Answered</span>
              <span className="text-[10px] text-slate-500">No response/Busy</span>
            </button>
          </div>
        </div>

        {/* If Call Picked Up: Candidate Interest & Reaction */}
        {outcome === "picked_up" && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600" />
                Candidate Interest Level
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">
                Mark response from conversation
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setInterestStatus("Interested");
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold border transition ${
                  interestStatus === "Interested"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-100/50"
                }`}
              >
                <span>🌟 Marked as Interested</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInterestStatus("Call Back Later");
                  setHasFollowUp(true);
                  if (!followUpDate) setTomorrowMorning();
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold border transition ${
                  interestStatus === "Call Back Later"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-indigo-800 border-indigo-200 hover:bg-indigo-100/50"
                }`}
              >
                <Clock4 size={13} />
                <span>Call Back Later</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInterestStatus("Not Interested");
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold border transition ${
                  interestStatus === "Not Interested"
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : "bg-white text-rose-800 border-rose-200 hover:bg-rose-100/50"
                }`}
              >
                <XCircle size={13} />
                <span>Not Interested</span>
              </button>
            </div>
          </div>
        )}

        {/* Follow-up Call Scheduler */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="toggle-follow-up"
              className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800"
            >
              <input
                id="toggle-follow-up"
                type="checkbox"
                checked={hasFollowUp}
                onChange={(e) => {
                  setHasFollowUp(e.target.checked);
                  if (e.target.checked && !followUpDate) {
                    setTomorrowMorning();
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-600" />
                Schedule Follow-up Call
              </span>
            </label>

            {hasFollowUp && (
              <span className="text-[11px] font-medium text-indigo-600">
                Reminder notification will be created
              </span>
            )}
          </div>

          {hasFollowUp && (
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Follow-up Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required={hasFollowUp}
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="input-field text-sm"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 mr-1">Quick Select:</span>
                <button
                  type="button"
                  onClick={() => setQuickFollowUp(1)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                >
                  +1 Hour
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFollowUp(3)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                >
                  +3 Hours
                </button>
                <button
                  type="button"
                  onClick={setTomorrowMorning}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                >
                  Tomorrow 10 AM
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFollowUp(48)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                >
                  In 2 Days
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Call Notes & Discussion Points */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Call Notes & Discussion Summary (Optional)
          </label>
          <textarea
            rows="3"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record key conversation points, candidate availability, visa/salary expectations, or reason for disconnect..."
            className="input-field text-xs resize-none"
          />
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle size={15} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary inline-flex items-center gap-2 text-xs font-bold"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Save size={14} />
                <span>Save & Log Call</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
