import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Download } from "lucide-react";
import { salesAPI } from "../services/api";
import Modal from "../components/Modal";
import { AlertBadge } from "../components/TargetAlert";
import TargetNotMetModal from "../components/TargetNotMetModal";
import { toast } from "react-hot-toast";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import Pagination from "../components/Pagination";
import { SkeletonTable } from "../components/skeleton";

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
  const { user } = useAuth();
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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
    setCurrentPage(1);
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
          <h1 className="text-page-title text-slate-800">Sales Team</h1>
          <p className="text-page-subtitle">
            Track calls, talk time, dispositions & follow-ups
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openCreate} className="btn-primary text-button">
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
              id="sales-search"
              className="input-field pl-9 text-body"
              placeholder="Search by executive name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              aria-label="Search by executive name"
            />
          </div>
          <input
            id="sales-date-filter"
            type="date"
            className="input-field sm:w-48 text-body"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            aria-label="Filter by date"
          />
        </div>
        <p className="mt-3 text-meta">
          Targets: Min 100 calls & 2h 30m talk time daily. Rows in red = target
          not met.
        </p>
      </div>

      <div className="card overflow-x-auto p-0 shadow-sm border border-slate-200">
        {loading ? (
          <SkeletonTable
            rows={7}
            cardWrapper={false}
            columns={[
              { width: '20%', type: 'avatar-text' },
              { width: '12%', type: 'text' },
              { width: '12%', type: 'text' },
              { width: '12%', type: 'text' },
              { width: '14%', type: 'badge' },
              { width: '14%', type: 'badge' },
              { width: '16%', type: 'actions' },
            ]}
          />
        ) : records.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-empty-heading text-slate-700 mb-1">No records found</p>
            <p className="text-empty-body">No sales entries match your filter criteria.</p>
          </div>
        ) : (
          <table className="w-full text-body">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th scope="col" className="text-table-header px-4 py-3 text-left">
                  Executive
                </th>
                <th scope="col" className="text-table-header px-4 py-3 text-left">
                  Date
                </th>
                <th scope="col" className="text-table-header px-4 py-3 text-left">
                  Leads
                </th>
                <th scope="col" className="text-table-header px-4 py-3 text-left">
                  Calls
                </th>
                <th scope="col" className="text-table-header px-4 py-3 text-left">
                  Duration
                </th>
                <th scope="col" className="text-table-header px-4 py-3 text-left">
                  Dispositions
                </th>
                <th scope="col" className="text-table-header px-4 py-3 text-left">
                  Interested
                </th>
                <th scope="col" className="text-table-header px-4 py-3 text-left">
                  Status
                </th>
                <th scope="col" className="text-table-header px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((r) => (
                <tr
                  key={r._id}
                  className={
                    r.targetsNotMet ? "alert-row" : "hover:bg-slate-50"
                  }
                >
                  <td className="px-4 py-3 text-body font-medium text-slate-800">
                    {r.salesExecutiveName}
                  </td>
                  <td className="px-4 py-3 text-meta">
                    {new Date(r.entryDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-body">{r.totalAssignedLeads}</td>
                  <td
                    className={`px-4 py-3 text-body ${r.targetAlerts?.callCount ? "font-bold text-red-600" : ""}`}
                  >
                    {r.dailyCallCount}
                  </td>
                  <td
                    className={`px-4 py-3 text-body ${r.targetAlerts?.callDuration ? "font-bold text-red-600" : ""}`}
                  >
                    {r.dailyCallDuration}
                  </td>
                  <td className="px-4 py-3 text-meta">
                    NA: {r.notAnsweredCalls} | NI: {r.notInterestedCalls} | VM:{" "}
                    {r.voiceMailCount}
                  </td>
                  <td className="px-4 py-3 text-body">
                    {r.interestedCandidates}
                    {r.interestedStage && (
                      <span className="ml-1 text-badge text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        ({r.interestedStage})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.targetsNotMet && <AlertBadge />}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(user?.role === 'admin' || user?.role === 'manager' || user?._id === (r.createdBy?._id || r.createdBy)) && (
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1 text-brand-600 hover:text-brand-800 rounded transition"
                          aria-label={`Edit sales entry for ${r.salesExecutiveName}`}
                          title="Edit Entry"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDelete(r._id)}
                          className="p-1 text-red-500 hover:text-red-700 rounded transition"
                          aria-label={`Delete sales entry for ${r.salesExecutiveName}`}
                          title="Delete Entry"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && records.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={records.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
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
              <label htmlFor="sales-exec-name" className="label">Sales Executive Name *</label>
              <input
                id="sales-exec-name"
                className="input-field"
                value={form.salesExecutiveName}
                onChange={(e) =>
                  setForm({ ...form, salesExecutiveName: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label htmlFor="sales-entry-date" className="label">Entry Date</label>
              <input
                id="sales-entry-date"
                type="date"
                className="input-field"
                value={form.entryDate}
                onChange={(e) =>
                  setForm({ ...form, entryDate: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="sales-assigned-leads" className="label">Daily Assigned Leads</label>
              <input
                id="sales-assigned-leads"
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
              <label htmlFor="sales-extra-leads" className="label">Extra / Self-Sourced Leads</label>
              <input
                id="sales-extra-leads"
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
              <label htmlFor="sales-call-count" className="label">Daily Call Count (Min 100) *</label>
              <input
                id="sales-call-count"
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
              <label htmlFor="sales-call-duration" className="label">Daily Call Duration (Min 2h 30m)</label>
              <input
                id="sales-call-duration"
                className="input-field"
                placeholder="e.g. 2h 30m or 150"
                value={form.dailyCallDuration}
                onChange={(e) =>
                  setForm({ ...form, dailyCallDuration: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="sales-unanswered-calls" className="label">Not Answered Calls</label>
              <input
                id="sales-unanswered-calls"
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
              <label htmlFor="sales-not-interested" className="label">Not Interested Calls</label>
              <input
                id="sales-not-interested"
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
              <label htmlFor="sales-voicemail" className="label">Voice Mail Count</label>
              <input
                id="sales-voicemail"
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
              <label htmlFor="sales-followups-req" className="label">Follow-ups Required</label>
              <input
                id="sales-followups-req"
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
              <label htmlFor="sales-followup-date" className="label">Follow-up Date</label>
              <input
                id="sales-followup-date"
                type="date"
                className="input-field"
                value={form.followUpDate}
                onChange={(e) =>
                  setForm({ ...form, followUpDate: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="sales-interested-cand" className="label">Interested Candidates</label>
              <input
                id="sales-interested-cand"
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
              <label htmlFor="sales-interested-stage" className="label">Interested Stage</label>
              <select
                id="sales-interested-stage"
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
            <label htmlFor="sales-notes" className="label">Notes</label>
            <textarea
              id="sales-notes"
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
