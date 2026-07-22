import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, UserPlus, Download } from "lucide-react";
import { marketingAPI } from "../services/api";
import Modal from "../components/Modal";

const emptyCandidate = {
  candidateName: "",
  jobTitle: "",
  experienceYears: "",
  experienceMonths: "",
};

const emptyForm = {
  teamLeaderName: "",
  employeeName: "",
  candidates: [{ ...emptyCandidate }],
  longApplicationsSubmitted: 0,
  easyApplicationsSubmitted: 0,
  assessmentsReceived: 0,
  screeningCallsCompleted: 0,
  totalInterviews: 0,
  interviewStages: [
    { stage: "Round 1", scheduled: 0, completed: 0 },
    { stage: "Round 2", scheduled: 0, completed: 0 },
    { stage: "Round 3", scheduled: 0, completed: 0 },
  ],
  entryDate: new Date().toISOString().split("T")[0],
  notes: "",
};

export default function Marketing() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterDate, setFilterDate] = useState("");
  const [searchName, setSearchName] = useState("");

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

  useEffect(() => {
    fetchRecords();
  }, [filterDate, searchName]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingId(record._id);
    setForm({
      teamLeaderName: record.teamLeaderName,
      employeeName: record.employeeName,
      candidates: record.candidates?.length
        ? record.candidates
        : [{ ...emptyCandidate }],
      longApplicationsSubmitted: record.longApplicationsSubmitted,
      easyApplicationsSubmitted: record.easyApplicationsSubmitted,
      assessmentsReceived: record.assessmentsReceived,
      screeningCallsCompleted: record.screeningCallsCompleted,
      totalInterviews: record.totalInterviews,
      interviewStages: record.interviewStages?.length
        ? record.interviewStages
        : emptyForm.interviewStages,
      entryDate: record.entryDate?.split("T")[0] || "",
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

  const updateCandidate = (index, field, value) => {
    const updated = [...form.candidates];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, candidates: updated });
  };

  const removeCandidate = (index) => {
    setForm({
      ...form,
      candidates: form.candidates.filter((_, i) => i !== index),
    });
  };

  const updateInterviewStage = (index, field, value) => {
    const updated = [...form.interviewStages];
    updated[index] = { ...updated[index], [field]: +value };
    setForm({ ...form, interviewStages: updated });
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

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing Team</h1>
          <p className="text-slate-500">
            Track applications, screening, assessments & interviews
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="btn-secondary">
            <Download size={16} className="mr-2" />
            Export
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} className="mr-2" />
            Add Entry
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="input-field pl-9"
              placeholder="Search by recruiter name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
          <input
            type="date"
            className="input-field sm:w-48"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
          </div>
        ) : records.length === 0 ? (
          <p className="py-12 text-center text-slate-500">No records found</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  TL / Recruiter
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Candidates
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Applications
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Screening
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Interviews
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.employeeName}</p>
                    <p className="text-xs text-slate-500">
                      TL: {r.teamLeaderName}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(r.entryDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{r.candidates?.length || 0}</td>
                  <td className="px-4 py-3">
                    {r.totalApplications}
                    <span className="ml-1 text-xs text-slate-500">
                      (L:{r.longApplicationsSubmitted} E:
                      {r.easyApplicationsSubmitted})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    Assess: {r.assessmentsReceived} | Screen:{" "}
                    {r.screeningCallsCompleted}
                  </td>
                  <td className="px-4 py-3">{r.totalInterviews}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(r)}
                      className="mr-2 text-brand-600 hover:text-brand-800"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(r._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Marketing Entry" : "New Marketing Entry"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Team Leader Name *</label>
              <input
                className="input-field"
                value={form.teamLeaderName}
                onChange={(e) =>
                  setForm({ ...form, teamLeaderName: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="label">Recruiter Name *</label>
              <input
                className="input-field"
                value={form.employeeName}
                onChange={(e) =>
                  setForm({ ...form, employeeName: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="label">Entry Date</label>
              <input
                type="date"
                className="input-field"
                value={form.entryDate}
                onChange={(e) =>
                  setForm({ ...form, entryDate: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="label mb-0">Candidate Details</label>
              <button
                type="button"
                onClick={addCandidate}
                className="btn-secondary text-xs"
              >
                <UserPlus size={14} className="mr-1" />
                Add Candidate
              </button>
            </div>
            <div className="space-y-3">
              {form.candidates.map((c, i) => (
                <div
                  key={i}
                  className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-5"
                >
                  <input
                    className="input-field"
                    placeholder="Candidate Name"
                    value={c.candidateName}
                    onChange={(e) =>
                      updateCandidate(i, "candidateName", e.target.value)
                    }
                  />
                  <input
                    className="input-field"
                    placeholder="Job Title"
                    value={c.jobTitle}
                    onChange={(e) =>
                      updateCandidate(i, "jobTitle", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    placeholder="Years"
                    value={c.experienceYears}
                    onChange={(e) =>
                      updateCandidate(i, "experienceYears", e.target.value === '' ? '' : +e.target.value)
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    max="11"
                    className="input-field"
                    placeholder="Months"
                    value={c.experienceMonths}
                    onChange={(e) =>
                      updateCandidate(i, "experienceMonths", e.target.value === '' ? '' : +e.target.value)
                    }
                  />
                  {form.candidates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCandidate(i)}
                      className="btn-danger text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Application Metrics</label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-slate-500">
                  Long Applications Submitted
                </label>
                <input
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
                <label className="text-xs text-slate-500">
                  Easy Applications Submitted
                </label>
                <input
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

          <div>
            <label className="label">Screening & Assessment</label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-slate-500">
                  Assessments Received
                </label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={form.assessmentsReceived}
                  onChange={(e) =>
                    setForm({ ...form, assessmentsReceived: +e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">
                  Screening Calls Completed
                </label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={form.screeningCallsCompleted}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      screeningCallsCompleted: +e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Interview Tracking (Round 1, 2, 3)</label>
            <div className="space-y-2">
              {form.interviewStages.map((stage, i) => (
                <div
                  key={stage.stage}
                  className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3"
                >
                  <span className="flex items-center text-sm font-medium">
                    {stage.stage}
                  </span>
                  <div>
                    <label className="text-xs text-slate-500">Scheduled</label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      value={stage.scheduled}
                      onChange={(e) =>
                        updateInterviewStage(i, "scheduled", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Completed</label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      value={stage.completed}
                      onChange={(e) =>
                        updateInterviewStage(i, "completed", e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
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
              {editingId ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
