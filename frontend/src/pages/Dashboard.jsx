import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Phone, Megaphone, AlertTriangle, TrendingUp, PieChart as PieChartIcon, BarChart2 } from 'lucide-react';
import { dashboardAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

function StatCard({ title, value, subtitle, icon: Icon, color, alert }) {
  return (
    <div className="card relative overflow-hidden">
      {alert > 0 && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          <AlertTriangle size={12} />
          {alert} alerts
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className={`rounded-lg p-3 ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setLoading(true);
    dashboardAPI
      .getStats({ date: filterDate })
      .then((res) => setStats(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterDate]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const today = stats?.today;
  const totals = stats?.totals;

  const pieData = totals ? [
    { name: 'Lead Gen', value: totals.leadGeneration, color: '#3b82f6' }, // blue-500
    { name: 'Sales', value: totals.sales, color: '#10b981' }, // emerald-500
    { name: 'Marketing', value: totals.marketing, color: '#8b5cf6' }, // violet-500
  ] : [];

  const barData = today ? [
    { name: 'Lead Gen', count: today.leadGeneration?.count || 0, fill: '#3b82f6' },
    { name: 'Sales', count: today.sales?.count || 0, fill: '#10b981' },
    { name: 'Marketing', count: today.marketing?.count || 0, fill: '#8b5cf6' },
  ] : [];

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Performance overview across all teams</p>
        </div>
        <input
          type="date"
          className="input-field sm:w-48"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Lead Generation"
          value={today?.leadGeneration?.totalLeads || 0}
          subtitle={`${today?.leadGeneration?.count || 0} entries`}
          icon={Users}
          color="bg-blue-500"
          alert={today?.leadGeneration?.alerts}
        />
        <StatCard
          title="Sales Calls"
          value={today?.sales?.totalCalls || 0}
          subtitle={`${today?.sales?.count || 0} entries`}
          icon={Phone}
          color="bg-emerald-500"
          alert={today?.sales?.alerts}
        />
        <StatCard
          title="Marketing Applications"
          value={today?.marketing?.totalApplications || 0}
          subtitle={`${today?.marketing?.totalInterviews || 0} interviews`}
          icon={Megaphone}
          color="bg-violet-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <PieChartIcon size={20} className="text-brand-600" />
            <h2 className="text-lg font-semibold">Total Records Overview</h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <BarChart2 size={20} className="text-brand-600" />
            <h2 className="text-lg font-semibold">Today's Activity (Entries)</h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-brand-600" />
            <h2 className="text-lg font-semibold">Daily Targets</h2>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span>Lead Gen - Resume Leads</span>
              <span className="font-medium">Min 30/day</span>
            </li>
            <li className="flex justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span>Lead Gen - Chat Leads</span>
              <span className="font-medium">Min 3/day</span>
            </li>
            <li className="flex justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span>Sales - Daily Calls</span>
              <span className="font-medium">Min 100/day</span>
            </li>
            <li className="flex justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span>Sales - Talk Time</span>
              <span className="font-medium">Min 2h 30m/day</span>
            </li>
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            Rows highlighted in red when daily targets are not met.
          </p>
        </div>

        <div className="card">
          <h2 className="mb-4 text-lg font-semibold">Quick Access</h2>
          <div className="grid gap-3">
            <Link
              to="/lead-generation"
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50"
            >
              <Users size={20} className="text-blue-500" />
              <div>
                <p className="font-medium">Lead Generation</p>
                <p className="text-sm text-slate-500">{stats?.totals?.leadGeneration} total records</p>
              </div>
            </Link>
            <Link
              to="/sales"
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50"
            >
              <Phone size={20} className="text-emerald-500" />
              <div>
                <p className="font-medium">Sales Team</p>
                <p className="text-sm text-slate-500">{stats?.totals?.sales} total records</p>
              </div>
            </Link>
            <Link
              to="/marketing"
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50"
            >
              <Megaphone size={20} className="text-violet-500" />
              <div>
                <p className="font-medium">Marketing Team</p>
                <p className="text-sm text-slate-500">{stats?.totals?.marketing} total records</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
