import { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { Activity, Shield, Search, RefreshCw, Calendar, Clock, Filter } from 'lucide-react';
import { SkeletonTable } from '../components/skeleton';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await userAPI.getAuditLogs();
      setLogs(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.adminName || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.targetEmployeeName || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(search.toLowerCase());

    const matchesAction =
      filterAction === 'ALL' || (log.action || '').toUpperCase().includes(filterAction);

    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-page-title text-[#111827]">Activity Logs</h1>
          <p className="text-page-subtitle mt-0.5">
            System audit trail, employee management actions, and security events
          </p>
        </div>
        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          className="btn-secondary text-xs h-9 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
          <input
            type="text"
            placeholder="Search by admin, employee, action, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="input-field text-xs h-9 w-40"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="PASSWORD">Password</option>
            <option value="LOGIN">Auth/Login</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={8} columns={5} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Activity}
              title="No activity logs found"
              description="No security or management activity records match your current filter criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <tr>
                  <th className="py-3 px-4 text-table-header">Timestamp</th>
                  <th className="py-3 px-4 text-table-header">Actor</th>
                  <th className="py-3 px-4 text-table-header">Action</th>
                  <th className="py-3 px-4 text-table-header">Target Employee</th>
                  <th className="py-3 px-4 text-table-header">Details</th>
                  <th className="py-3 px-4 text-table-header">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3 px-4 text-[#667085] whitespace-nowrap">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#111827]">
                      {log.adminName || 'System'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          log.action?.includes('DELETE')
                            ? 'danger'
                            : log.action?.includes('CREATE')
                            ? 'success'
                            : log.action?.includes('PASSWORD')
                            ? 'warning'
                            : 'info'
                        }
                        size="sm"
                      >
                        {log.action || 'ACTION'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-[#344054]">
                      {log.targetEmployeeName || '—'}
                    </td>
                    <td className="py-3 px-4 text-[#667085] max-w-xs truncate" title={log.details}>
                      {log.details || '—'}
                    </td>
                    <td className="py-3 px-4 text-[#98A2B3] font-mono text-[11px]">
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
