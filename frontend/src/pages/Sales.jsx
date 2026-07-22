import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Download } from "lucide-react";
import { salesAPI } from "../services/api";
import Modal from "../components/Modal";
import { AlertBadge } from "../components/TargetAlert";
import TargetNotMetModal from "../components/TargetNotMetModal";
import { toast } from "react-hot-toast";
import { useNotification } from "../context/NotificationContext";

const emptyForm = {
  salesExecutiveName: "",
  dailyAssignedLeadsCount: 0,
  extraSelfSourcedLeads: 0,
  dailyCallDuration: "2h 30m",
  dailyCallCount: 0,
  notAnsweredCalls: 0,
  notInterestedCalls: 0,
  voiceMailCount: 0,
  followUpsRequired: 0,
  followUpDate: "",
  interestedCandidates: 0,
  interestedStage: "New",
  entryDate: new Date().toISOString().split("T")[0],
  notes: "",
};

const STAGES = ["New", "Qualified", "Proposal", "Negotiation", "Closed"];

export default function Sales() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterDate, setFilterDate] = useState("");
  const [searchName, setSearchName] = useState("");
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [targetMessage, setTargetMessage] = useState("");
  const { addNotification } = useNotification();

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (searchName) params.salesExecutiveName = searchName;
      const res = await salesAPI.getAll(params);
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
      salesExecutiveName: record.salesExecutiveName,
      dailyAssignedLeadsCount: record.dailyAssignedLeadsCount,
      extraSelfSourcedLeads: record.extraSelfSourcedLeads,
      dailyCallDuration: record.dailyCallDuration,
      dailyCallCount: record.dailyCallCount,
      notAnsweredCalls: record.notAnsweredCalls,
      notInterestedCalls: record.notInterestedCalls,
      voiceMailCount: record.voiceMailCount,
      followUpsRequired: record.followUpsRequired,
      followUpDate: record.followUpDate?.split("T")[0] || "",
      interestedCandidates: record.interestedCandidates,
      interestedStage: record.interestedStage,
      entryDate: record.entryDate?.split("T")[0] || "",
      notes: record.notes || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let result;
      if (editingId) {
        result = await salesAPI.update(editingId, form);
      } else {
        result = await salesAPI.create(form);
      }
      setModalOpen(false);
      fetchRecords();

      const dateStr = form.entryDate ? new Date(form.entryDate).toLocaleDateString() : 'today';
      
      if (result?.data?.data?.targetsNotMet) {
        setTargetMessage(`You have not fulfilled your daily sales call targets for ${dateStr}.`);
        setTargetModalOpen(true);
        toast.error(`Not completed for ${dateStr}`);
        addNotification("Targets Not Met", `You did not meet your daily sales targets for ${dateStr}.`, "error");
      } else {
        toast.success(`Completed work for ${dateStr}`);
        addNotification("Targets Met", `Congratulations! You have completed your daily sales targets for ${dateStr}.`, "success");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error saving record");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    await salesAPI.delete(id);
    fetchRecords();
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (searchName) params.salesExecutiveName = searchName;
      const res = await salesAPI.export(params);

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sales.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Error exporting data');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Team</h1>
          <p className="text-slate-500">
            Track calls, talk time, dispositions & follow-ups
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
              placeholder="Search by executive name..."
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
        <p className="mt-3 text-xs text-slate-500">
          Targets: Min 100 calls & 2h 30m talk time daily. Rows in red = target
          not met.
        </p>
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
                  Executive
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Leads
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Calls
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Duration
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Dispositions
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Interested
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => (
                <tr
                  key={r._id}
                  className={
                    r.targetsNotMet ? "alert-row" : "hover:bg-slate-50"
                  }
                >
                  <td className="px-4 py-3 font-medium">
                    {r.salesExecutiveName}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(r.entryDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{r.totalAssignedLeads}</td>
                  <td
                    className={`px-4 py-3 ${r.targetAlerts?.callCount ? "font-bold text-red-600" : ""}`}
                  >
                    {r.dailyCallCount}
                  </td>
                  <td
                    className={`px-4 py-3 ${r.targetAlerts?.callDuration ? "font-bold text-red-600" : ""}`}
                  >
                    {r.dailyCallDuration}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    NA: {r.notAnsweredCalls} | NI: {r.notInterestedCalls} | VM:{" "}
                    {r.voiceMailCount}
                  </td>
                  <td className="px-4 py-3">
                    {r.interestedCandidates}
                    {r.interestedStage && (
                      <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
                        {r.interestedStage}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.targetsNotMet && <AlertBadge />}
                  </td>
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
        title={editingId ? "Edit Sales Entry" : "New Sales Entry"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">Sales Executive Name *</label>
              <input
                className="input-field"
                value={form.salesExecutiveName}
                onChange={(e) =>
                  setForm({ ...form, salesExecutiveName: e.target.value })
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
            <div>
              <label className="label">Daily Assigned Leads</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.dailyAssignedLeadsCount}
                onChange={(e) =>
                  setForm({ ...form, dailyAssignedLeadsCount: +e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Extra / Self-Sourced Leads</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.extraSelfSourcedLeads}
                onChange={(e) =>
                  setForm({ ...form, extraSelfSourcedLeads: +e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Daily Call Count (Min 100) *</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.dailyCallCount}
                onChange={(e) =>
                  setForm({ ...form, dailyCallCount: +e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="label">Daily Call Duration (Min 2h 30m)</label>
              <input
                className="input-field"
                placeholder="e.g. 2h 30m or 150"
                value={form.dailyCallDuration}
                onChange={(e) =>
                  setForm({ ...form, dailyCallDuration: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Not Answered Calls</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.notAnsweredCalls}
                onChange={(e) =>
                  setForm({ ...form, notAnsweredCalls: +e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Not Interested Calls</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.notInterestedCalls}
                onChange={(e) =>
                  setForm({ ...form, notInterestedCalls: +e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Voice Mail Count</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.voiceMailCount}
                onChange={(e) =>
                  setForm({ ...form, voiceMailCount: +e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Follow-ups Required</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.followUpsRequired}
                onChange={(e) =>
                  setForm({ ...form, followUpsRequired: +e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Follow-up Date</label>
              <input
                type="date"
                className="input-field"
                value={form.followUpDate}
                onChange={(e) =>
                  setForm({ ...form, followUpDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Interested Candidates</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.interestedCandidates}
                onChange={(e) =>
                  setForm({ ...form, interestedCandidates: +e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Interested Stage</label>
              <select
                className="input-field"
                value={form.interestedStage}
                onChange={(e) =>
                  setForm({ ...form, interestedStage: e.target.value })
                }
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
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

      <TargetNotMetModal
        isOpen={targetModalOpen}
        onClose={() => setTargetModalOpen(false)}
        message={targetMessage}
      />
    </div>
  );
}
