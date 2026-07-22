import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Download } from "lucide-react";
import { leadGenAPI } from "../services/api";
import Modal from "../components/Modal";
import { AlertBadge } from "../components/TargetAlert";

const emptyForm = {
  employeeName: "",
  linkedInAccountsCount: 0,
  linkedInProfileNames: "",
  connectionsRange: [],
  dailyResumeLeads: 0,
  dailyChatLeads: 0,
  entryDate: new Date().toISOString().split("T")[0],
  notes: "",
};

export default function LeadGeneration() {
  const [records, setRecords] = useState([]);
  const [connectionRanges, setConnectionRanges] = useState([]);
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
      const res = await leadGenAPI.getAll(params);
      setRecords(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    leadGenAPI
      .getConnectionRanges()
      .then((res) => setConnectionRanges(res.data.data));
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
      employeeName: record.employeeName,
      linkedInAccountsCount: record.linkedInAccountsCount,
      linkedInProfileNames: record.linkedInProfileNames,
      connectionsRange: record.connectionsRange || [],
      dailyResumeLeads: record.dailyResumeLeads,
      dailyChatLeads: record.dailyChatLeads,
      entryDate: record.entryDate?.split("T")[0] || "",
      notes: record.notes || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await leadGenAPI.update(editingId, form);
      } else {
        await leadGenAPI.create(form);
      }
      setModalOpen(false);
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.message || "Error saving record");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    await leadGenAPI.delete(id);
    fetchRecords();
  };

  const toggleConnection = (range) => {
    setForm((prev) => ({
      ...prev,
      connectionsRange: prev.connectionsRange.includes(range)
        ? prev.connectionsRange.filter((r) => r !== range)
        : [...prev.connectionsRange, range],
    }));
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

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Generation Team</h1>
          <p className="text-slate-500">
            Track daily lead activities, LinkedIn usage & targets
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
              placeholder="Search by employee name..."
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
          Targets: Min 30 Resume Leads & 3 Chat Leads daily. Rows in red =
          target not met.
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
                  Employee
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  LinkedIn
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Resume
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Chat
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Total
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Ratios
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
                  <td className="px-4 py-3 font-medium">{r.employeeName}</td>
                  <td className="px-4 py-3">
                    {new Date(r.entryDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {r.linkedInAccountsCount} accounts
                  </td>
                  <td
                    className={`px-4 py-3 ${r.targetAlerts?.resumeLeads ? "font-bold text-red-600" : ""}`}
                  >
                    {r.dailyResumeLeads}
                  </td>
                  <td
                    className={`px-4 py-3 ${r.targetAlerts?.chatLeads ? "font-bold text-red-600" : ""}`}
                  >
                    {r.dailyChatLeads}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {r.totalLeadsGenerated}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    R: {r.resumeLeadRatio}% | C: {r.chatLeadRatio}%
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
        title={
          editingId ? "Edit Lead Generation Entry" : "New Lead Generation Entry"
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Employee Name *</label>
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
            <div>
              <label className="label">LinkedIn Accounts Count</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.linkedInAccountsCount}
                onChange={(e) =>
                  setForm({ ...form, linkedInAccountsCount: +e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Daily Resume Leads (Min 30) *</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.dailyResumeLeads}
                onChange={(e) =>
                  setForm({ ...form, dailyResumeLeads: +e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="label">Daily Chat Leads (Min 3) *</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.dailyChatLeads}
                onChange={(e) =>
                  setForm({ ...form, dailyChatLeads: +e.target.value })
                }
                required
              />
            </div>
          </div>

          <div>
            <label className="label">LinkedIn Profile Names / URLs</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="One profile per line"
              value={form.linkedInProfileNames}
              onChange={(e) =>
                setForm({ ...form, linkedInProfileNames: e.target.value })
              }
            />
          </div>

          <div>
            <label className="label">Connections Range</label>
            <div className="flex flex-wrap gap-3">
              {connectionRanges.map((range) => (
                <label key={range} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.connectionsRange.includes(range)}
                    onChange={() => toggleConnection(range)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  {range}
                </label>
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
