import { useEffect, useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Phone,
  Megaphone,
  AlertTriangle,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart2,
  Briefcase,
  UserCheck,
  Award,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ShieldAlert,
  Calendar,
  Layers,
  FileCheck2,
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const ExecutiveCard = memo(function ExecutiveCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  badge,
  badgeType = 'default',
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
          {subtitle && <p className="mt-1.5 text-xs text-slate-500 font-medium">{subtitle}</p>}
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr ${gradient} text-white shadow-md shadow-brand-500/15`}
        >
          <Icon size={22} />
        </div>
      </div>
      {badge && (
        <div className="mt-3 flex items-center gap-1.5 pt-3 border-t border-slate-100">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              badgeType === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : badgeType === 'warning'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-brand-50 text-brand-700'
            }`}
          >
            {badge}
          </span>
        </div>
      )}
    </div>
  );
});

export default function Dashboard() {
  const { user, hasModule } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('today'); // 'today' | 'all' | 'date'
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setLoading(true);
    let params = {};
    if (timeframe === 'all') {
      params = { timeframe: 'all' };
    } else if (timeframe === 'today') {
      params = { date: new Date().toISOString().split('T')[0] };
    } else {
      params = { date: filterDate };
    }

    dashboardAPI
      .getStats(params)
      .then((res) => setStats(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterDate, timeframe]);

  const isAdmin = user?.role === 'admin';
  const canLeadGen = isAdmin || hasModule('lead_generation');
  const canLeads = isAdmin || hasModule('leads');
  const canMarketing = isAdmin || hasModule('marketing') || hasModule('candidates');

  const executiveKpis = stats?.executiveKpis || {};
  const leadGenStats = stats?.leadGenStats || {};
  const callingStats = stats?.callingStats || {};
  const benchStats = stats?.benchStats || {};
  const marketingStats = stats?.marketingStats || {};
  const leaderboard = stats?.leaderboard || [];
  const alerts = stats?.alerts || [];

  // 1. Funnel Data
  const funnelData = useMemo(() => {
    return [
      {
        stage: '1. Sourced',
        count: executiveKpis.totalLeadsSourced || 0,
        fill: '#3b82f6',
      },
      {
        stage: '2. Calls Made',
        count: executiveKpis.totalCalls || 0,
        fill: '#10b981',
      },
      {
        stage: '3. Converted',
        count: executiveKpis.convertedCandidates || 0,
        fill: '#8b5cf6',
      },
    ];
  }, [executiveKpis]);

  // 2. Call Outcomes Data
  const callOutcomesData = useMemo(() => {
    const outcomes = callingStats.outcomes || {};
    return [
      { name: 'Picked Up', value: outcomes.pickedUp || 0, color: '#10b981' },
      { name: 'Voicemail', value: outcomes.voicemail || 0, color: '#f59e0b' },
      { name: 'Not Answered', value: outcomes.notAnswered || 0, color: '#ef4444' },
      { name: 'Call Cut', value: outcomes.callCut || 0, color: '#64748b' },
    ].filter((item) => item.value > 0);
  }, [callingStats]);

  // 3. Visa Breakdown Data
  const visaData = useMemo(() => {
    const breakdown = benchStats.visaBreakdown || {};
    const entries = Object.entries(breakdown);
    if (entries.length === 0) {
      return [{ name: 'No Data', count: 0, fill: '#94a3b8' }];
    }
    const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
    return entries.map(([visa, count], idx) => ({
      name: visa,
      count,
      fill: colors[idx % colors.length],
    }));
  }, [benchStats]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">Loading live analytics...</p>
        </div>
      </div>
    );
  }

  // Format talk time
  const talkHours = Math.floor((executiveKpis.totalTalkTimeMinutes || 0) / 60);
  const talkMins = (executiveKpis.totalTalkTimeMinutes || 0) % 60;
  const talkTimeFormatted = `${talkHours}h ${talkMins}m`;

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isAdmin ? 'Executive Command Dashboard' : 'Performance Dashboard'}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isAdmin
              ? 'Real-time pipeline analytics, conversion metrics, and employee activity'
              : `Operational workspace for ${user?.name || 'your role'}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs font-semibold">
            <button
              onClick={() => {
                setTimeframe('today');
                setFilterDate(new Date().toISOString().split('T')[0]);
              }}
              className={`rounded-lg px-3 py-1.5 transition ${
                timeframe === 'today'
                  ? 'bg-white text-brand-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeframe('all')}
              className={`rounded-lg px-3 py-1.5 transition ${
                timeframe === 'all'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeframe('date')}
              className={`rounded-lg px-3 py-1.5 transition ${
                timeframe === 'date'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Date
            </button>
          </div>

          {timeframe === 'date' && (
            <input
              id="dashboard-date-filter"
              type="date"
              className="rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs focus:border-brand-500 focus:outline-none"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              aria-label="Filter records by date"
            />
          )}
        </div>
      </div>

      {/* Health & Red Flag Alerts (If any) */}
      {alerts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alt) => (
            <div
              key={alt.id}
              className={`flex items-start gap-3 rounded-xl p-3.5 border ${
                alt.severity === 'warning'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-brand-50/70 border-brand-200 text-brand-900'
              }`}
            >
              <ShieldAlert
                size={18}
                className={alt.severity === 'warning' ? 'text-amber-600 shrink-0 mt-0.5' : 'text-brand-600 shrink-0 mt-0.5'}
              />
              <div className="text-xs">
                <p className="font-bold">{alt.title}</p>
                <p className="mt-0.5 opacity-90">{alt.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Row 1: Top 3 Executive Scorecards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ExecutiveCard
          title="Total Leads Sourced"
          value={executiveKpis.totalLeadsSourced || 0}
          subtitle={`${leadGenStats.resumeLeads || 0} Resume | ${leadGenStats.chatLeads || 0} Chat`}
          icon={Users}
          gradient="from-blue-600 to-indigo-600"
          badge={`${leadGenStats.accountsCount || 0} Active LinkedIn Accounts`}
          badgeType="default"
        />
        <ExecutiveCard
          title="Calls & Talk Time"
          value={executiveKpis.totalCalls || 0}
          subtitle={`Total Speaking: ${talkTimeFormatted}`}
          icon={Phone}
          gradient="from-emerald-600 to-teal-600"
          badge={`${callingStats.outcomes?.pickedUp || 0} Calls Picked Up`}
          badgeType="success"
        />
        <ExecutiveCard
          title="Lead ➔ Candidate Conv."
          value={`${executiveKpis.conversionRate || 0}%`}
          subtitle={`${executiveKpis.convertedCandidates || 0} Converted / ${executiveKpis.totalLeadsSourced || 0} Sourced`}
          icon={TrendingUp}
          gradient="from-purple-600 to-brand-600"
          badge={`${benchStats.total || 0} Candidates On Bench`}
          badgeType="default"
        />
      </div>

      {/* Row 2: Visual Charts & Analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* End-to-End Pipeline Funnel */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-brand-600" />
              <h2 className="text-sm font-bold text-slate-900">End-to-End Pipeline Velocity</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Sourced ➔ Converted</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`funnel-cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Call Outcomes & Reachability */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChartIcon size={18} className="text-brand-600" />
              <h2 className="text-sm font-bold text-slate-900">Call Outcomes Distribution</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Total Dials: {callingStats.totalCalls || 0}</span>
          </div>
          <div className="h-64 w-full">
            {callOutcomesData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No call logs recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={callOutcomesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {callOutcomesData.map((entry, index) => (
                      <Cell key={`outcome-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Candidate Bench & Visa Breakdown */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900">Candidate Bench & Visa Status</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              <FileCheck2 size={12} />
              {benchStats.atsResumeReady || 0} ATS Resumes Ready
            </span>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visaData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {visaData.map((entry, index) => (
                  <Cell key={`visa-cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 4: Admin Team Performance Leaderboard (Only shown for Admin) */}
      {isAdmin && (
        <div className="card overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-brand-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">Employee Performance Scorecard</h2>
                <p className="text-xs text-slate-500">Live activity metrics breakdown across team members</p>
              </div>
            </div>
            <Link
              to="/employees"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              Manage Employees <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {leaderboard.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No employee records found. Create employees in the Employee Management portal.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-y border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Modules Access</th>
                    <th className="py-3 px-4">Sourced Leads</th>
                    <th className="py-3 px-4">Calls Made</th>
                    <th className="py-3 px-4">Conversions</th>
                    <th className="py-3 px-4">Applications</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboard.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-[10px]">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{emp.name}</p>
                            <p className="text-[10px] text-slate-400">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">{emp.designation}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {emp.allowedModules.map((m) => (
                            <span
                              key={m}
                              className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 capitalize"
                            >
                              {m.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-blue-600">{emp.leadsSourced}</td>
                      <td className="py-3 px-4 font-bold text-emerald-600">{emp.callsMade}</td>
                      <td className="py-3 px-4 font-bold text-purple-600">{emp.conversions}</td>
                      <td className="py-3 px-4 font-bold text-amber-600">{emp.applications}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            emp.targetStatus === 'On Track'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          <CheckCircle2 size={10} />
                          {emp.targetStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Row 5: Quick Access Navigation */}
      <div className="card">
        <h2 className="mb-4 text-sm font-bold text-slate-900">Direct Module Navigation</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {canLeadGen && (
            <Link
              to="/lead-generation"
              className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3.5 transition hover:border-blue-300 hover:bg-blue-50/40"
            >
              <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                <Users size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Lead Generation</p>
                <p className="text-[11px] text-slate-500 font-medium">{stats?.totals?.leadGeneration || 0} Records</p>
              </div>
            </Link>
          )}

          {canLeads && (
            <Link
              to="/leads"
              className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3.5 transition hover:border-emerald-300 hover:bg-emerald-50/40"
            >
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                <Briefcase size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Leads Outreach</p>
                <p className="text-[11px] text-slate-500 font-medium">{callingStats.totalCalls || 0} Calls Made</p>
              </div>
            </Link>
          )}

          {canMarketing && (
            <Link
              to="/candidates"
              className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3.5 transition hover:border-purple-300 hover:bg-purple-50/40"
            >
              <div className="rounded-lg bg-purple-100 p-2 text-purple-600">
                <UserCheck size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Candidate Bench</p>
                <p className="text-[11px] text-slate-500 font-medium">{benchStats.total || 0} Profiles</p>
              </div>
            </Link>
          )}

          {canMarketing && (
            <Link
              to="/marketing"
              className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3.5 transition hover:border-amber-300 hover:bg-amber-50/40"
            >
              <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
                <Megaphone size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Marketing Team</p>
                <p className="text-[11px] text-slate-500 font-medium">{marketingStats.totalApplications || 0} Applications</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

