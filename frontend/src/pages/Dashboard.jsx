import { useEffect, useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Phone,
  TrendingUp,
  UserCheck,
  Briefcase,
  Megaphone,
  ArrowUpRight,
  ShieldAlert,
  ArrowRight,
  Calendar,
  Layers,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SkeletonDashboard } from '../components/skeleton';
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
import Badge from '../components/ui/Badge';
import AlertBanner from '../components/ui/AlertBanner';
import SegmentedControl from '../components/ui/SegmentedControl';
import { pluralize, pluralizeWord, formatTalkTime } from '../utils/formatters';

// Clean Enterprise KPI Card (Divider-free, Spacing-driven Hierarchy)
const KpiCard = memo(function KpiCard({
  label,
  value,
  supportingText,
  icon: Icon,
  trend,
  trendType = 'positive', // 'positive' | 'negative' | 'neutral'
}) {
  return (
    <div className="card flex flex-col justify-between p-5 transition-colors hover:border-[#D0D5DD]">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#667085]">{label}</p>
          {Icon && (
            <Icon size={19} strokeWidth={1.8} className="text-[#667085]" />
          )}
        </div>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-[#111827]">{value}</p>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-[#667085]">
        <span className="truncate">{supportingText}</span>
        {trend && (
          <span
            className={`font-semibold shrink-0 ml-2 ${
              trendType === 'positive'
                ? 'text-[#12B76A]'
                : trendType === 'negative'
                ? 'text-[#F04438]'
                : 'text-[#667085]'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
});

export default function Dashboard() {
  const { user, hasModule } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('today'); // 'today' | 'all' | 'custom'
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

  const pickedUpBreakdown = callingStats?.pickedUpBreakdown || {};
  const totalPickedUp = callingStats?.outcomes?.pickedUp || 0;
  const pickedUpInterested = pickedUpBreakdown.interested ?? (callingStats?.interestLevels?.interested || 0);
  const pickedUpNotInterested = pickedUpBreakdown.notInterested ?? (callingStats?.interestLevels?.notInterested || 0);
  const pickedUpCallBackLater = pickedUpBreakdown.callBackLater ?? (callingStats?.interestLevels?.callBackLater || 0);
  const pickedUpOther = Math.max(0, totalPickedUp - (pickedUpInterested + pickedUpNotInterested + pickedUpCallBackLater));

  // 1. Pipeline Performance Funnel Data
  const funnelData = useMemo(() => {
    return [
      {
        stage: '1. Sourced',
        count: executiveKpis.totalLeadsSourced || 0,
        fill: '#2563EB',
      },
      {
        stage: '2. Contacted',
        count: executiveKpis.totalCalls || 0,
        fill: '#3B82F6',
      },
      {
        stage: '3. Converted',
        count: executiveKpis.convertedCandidates || 0,
        fill: '#12B76A',
      },
    ];
  }, [executiveKpis]);

  // Dynamic Y-Axis Domain with sensible headroom (~20-25%)
  const maxPipelineValue = useMemo(() => {
    return Math.max(
      executiveKpis.totalLeadsSourced || 0,
      executiveKpis.totalCalls || 0,
      executiveKpis.convertedCandidates || 0
    );
  }, [executiveKpis]);

  const yAxisDomain = useMemo(() => {
    if (maxPipelineValue === 0) return [0, 4];
    if (maxPipelineValue === 1) return [0, 2]; // 1 sits clearly visible at 50% height with 50% headroom
    if (maxPipelineValue <= 5) return [0, maxPipelineValue + 1];
    const ceiling = Math.ceil(maxPipelineValue * 1.25);
    return [0, ceiling];
  }, [maxPipelineValue]);

  // 2. Call Outcomes Data (only active non-zero categories)
  const callOutcomesData = useMemo(() => {
    const outcomes = callingStats.outcomes || {};
    const interest = callingStats.interestLevels || {};
    const notInterestedCount = (outcomes.notAnswered || 0) + (interest.notInterested || 0);

    const items = [
      { name: 'Picked Up', value: outcomes.pickedUp || 0, color: '#12B76A' },
      { name: 'Not Interested', value: notInterestedCount, color: '#F04438' },
      { name: 'Voicemail', value: outcomes.voicemail || 0, color: '#F79009' },
      { name: 'Call Cut', value: outcomes.callCut || 0, color: '#98A2B3' },
      { name: 'Callback', value: interest.callBackLater || pickedUpCallBackLater || 0, color: '#2E90FA' },
    ].filter((item) => item.value > 0);

    return items;
  }, [callingStats, pickedUpCallBackLater]);

  if (loading) {
    return <SkeletonDashboard />;
  }

  const dateFilterOptions = [
    { label: 'Today', value: 'today' },
    { label: 'All Time', value: 'all' },
    { label: 'Custom', value: 'custom' },
  ];

  const accountsCount = leadGenStats.accountsCount || 0;
  const totalCalls = executiveKpis.totalCalls || 0;
  const sourcedCount = executiveKpis.totalLeadsSourced || 0;
  const convertedCount = executiveKpis.convertedCandidates || 0;
  const benchTotal = benchStats.total || 0;

  return (
    <div className="pb-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] pb-5 mb-6">
        <div>
          <h1 className="text-page-title text-[#111827]">Dashboard</h1>
          <p className="text-page-subtitle mt-0.5">
            Pipeline performance and team activity
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <SegmentedControl
            options={dateFilterOptions}
            value={timeframe}
            onChange={(val) => setTimeframe(val)}
          />

          {timeframe === 'custom' && (
            <input
              id="dashboard-date-filter"
              type="date"
              className="input-field text-xs h-8 w-auto"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              aria-label="Filter records by date"
            />
          )}
        </div>
      </div>

      {/* Row 1: 4 Structured KPI Cards (Divider-free spacing layout) */}
      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${alerts.length > 0 ? 'mb-4' : 'mb-6'}`}>
        <KpiCard
          label="Total Leads Sourced"
          value={sourcedCount}
          supportingText={`${accountsCount} ${pluralizeWord(accountsCount, 'active account', 'active accounts')}`}
          icon={Users}
        />
        <KpiCard
          label="Calls Made"
          value={totalCalls}
          supportingText={`${totalPickedUp} picked up · ${formatTalkTime(executiveKpis.totalTalkTimeMinutes)} talk time`}
          icon={Phone}
        />
        <KpiCard
          label="Candidates on Bench"
          value={benchTotal}
          supportingText={`${benchStats.active || 0} active · ${benchStats.atsResumeReady || 0} ATS ready`}
          icon={UserCheck}
        />
        <KpiCard
          label="Conversion Rate"
          value={`${typeof executiveKpis.conversionRate === 'number' ? executiveKpis.conversionRate.toFixed(1) : (executiveKpis.conversionRate || '0.0')}%`}
          supportingText={`${convertedCount} converted / ${sourcedCount} sourced`}
          icon={TrendingUp}
        />
      </div>

      {/* Row 1.5: Operational Attention Alerts (Reduced height: 44-48px) */}
      {alerts.length > 0 && (
        <div className="space-y-2.5 mb-6">
          {alerts.map((alt) => {
            const countMatch = alt.message?.match(/\d+/);
            const count = countMatch ? parseInt(countMatch[0], 10) : 1;
            let formattedTitle = alt.title;
            let formattedMsg = alt.message;

            if (alt.id === 'leadgen-target') {
              formattedTitle = 'Lead Gen Target Missed';
              formattedMsg = `${count} ${pluralizeWord(count, 'entry', 'entries')} missed today's target`;
            } else if (alt.id === 'sales-target') {
              formattedTitle = 'Calling Quota Missed';
              formattedMsg = `${count} ${pluralizeWord(count, 'entry', 'entries')} fell below calling quota`;
            } else if (alt.id === 'missing-ats') {
              formattedTitle = 'Pending ATS Resumes';
              formattedMsg = `${count} ${pluralizeWord(count, 'candidate', 'candidates')} awaiting ATS-formatted ${count === 1 ? 'resume' : 'resumes'}`;
            }

            return (
              <AlertBanner
                key={alt.id}
                type={alt.severity === 'warning' ? 'warning' : 'info'}
                title={formattedTitle}
                message={formattedMsg}
                actionLabel={
                  alt.id === 'leadgen-target'
                    ? 'View lead gen →'
                    : alt.id === 'sales-target'
                    ? 'View sales →'
                    : 'Review candidates →'
                }
                actionTo={
                  alt.id === 'leadgen-target'
                    ? '/lead-generation'
                    : alt.id === 'sales-target'
                    ? '/leads'
                    : '/candidates'
                }
              />
            );
          })}
        </div>
      )}

      {/* Row 2: Analytics & Visual Performance Grid (24px spacing, visually aligned heights) */}
      <div className="grid gap-4 lg:grid-cols-12 mb-6">
        {/* Pipeline Performance Chart (approx 60% width) */}
        <div className="card lg:col-span-7 flex flex-col justify-between min-h-[310px]">
          <div>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E5E7EB] pb-3">
              <div>
                <h2 className="text-section-heading text-[#111827]">Pipeline Performance</h2>
                <p className="text-small text-[#667085] mt-0.5">Sourced → Contacted → Converted</p>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <span className="text-[#344054]">
                  <strong className="font-semibold text-[#111827]">{sourcedCount}</strong>{' '}
                  {pluralizeWord(sourcedCount, 'Sourced', 'Sourced')}
                </span>
                <span className="text-[#D0D5DD]">·</span>
                <span className="text-[#344054]">
                  <strong className="font-semibold text-[#111827]">{totalCalls}</strong>{' '}
                  {pluralizeWord(totalCalls, 'Call', 'Calls')}
                </span>
                <span className="text-[#D0D5DD]">·</span>
                <span className={convertedCount > 0 ? 'text-[#027A48]' : 'text-[#667085]'}>
                  <strong className="font-semibold">{convertedCount}</strong> Converted
                </span>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAECF0" />
                  <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#667085' }} />
                  <YAxis domain={yAxisDomain} allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#667085' }} />
                  <Tooltip
                    cursor={{ fill: '#F9FAFB' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 1px 3px rgba(16,24,40,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={56}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Call Outcomes Distribution (approx 40% width, adaptive visualization) */}
        <div className="card lg:col-span-5 flex flex-col justify-between min-h-[310px]">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <h2 className="text-section-heading text-[#111827]">Call Outcomes</h2>
                <p className="text-small text-[#667085] mt-0.5">Distribution of call results</p>
              </div>
              <span className="text-xs font-semibold text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] px-2.5 py-1 rounded-md">
                {callingStats.totalCalls || 0} {pluralizeWord(callingStats.totalCalls || 0, 'dial', 'dials')}
              </span>
            </div>

            {callOutcomesData.length === 0 ? (
              <div className="text-empty-body flex h-48 items-center justify-center text-xs text-[#667085]">
                No call outcomes recorded yet
              </div>
            ) : callOutcomesData.length === 1 ? (
              /* Compact single outcome: clean progress bar instead of giant empty donut */
              <div className="py-6 px-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: callOutcomesData[0].color }}
                    />
                    <span className="text-sm font-semibold text-[#111827]">
                      {callOutcomesData[0].name}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#111827]">
                    100%
                  </span>
                </div>

                <div className="h-3 w-full rounded-full bg-[#F2F4F7] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: '100%',
                      backgroundColor: callOutcomesData[0].color,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[#667085] pt-1">
                  <span>
                    {callOutcomesData[0].value}{' '}
                    {pluralizeWord(callOutcomesData[0].value, 'call', 'calls')}
                  </span>
                  <span>100% of recorded volume</span>
                </div>
              </div>
            ) : (
              /* Donut for multiple categories */
              <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
                <div className="h-40 w-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={callOutcomesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={62}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {callOutcomesData.map((entry, index) => (
                          <Cell key={`pie-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val, name) => [`${val} calls`, name]}
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Flat, Clean Legend & Breakdown */}
                <div className="flex-1 w-full space-y-2 text-xs">
                  {callOutcomesData.map((item) => {
                    const total = callingStats.totalCalls || 1;
                    const percent = Math.round((item.value / total) * 100);
                    return (
                      <div key={item.name} className="flex items-center justify-between py-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-[#344054] font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-semibold text-[#111827]">{item.value}</span>
                          <span className="text-[#98A2B3]">({percent}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Clean Picked-Up Sub-Breakdown row */}
          {totalPickedUp > 0 && (
            <div className="mt-4 pt-3 border-t border-[#E5E7EB] text-xs">
              <div className="flex items-center justify-between mb-2 text-[#667085]">
                <span className="font-medium">Picked Up Sentiment:</span>
                <span>{totalPickedUp} Answered</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-[#ECFDF3] border border-[#A6F4C5]">
                  <p className="text-[11px] text-[#027A48] font-medium uppercase">Interested</p>
                  <p className="text-sm font-bold text-[#027A48] mt-0.5">{pickedUpInterested}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#FEF3F2] border border-[#FECDCA]">
                  <p className="text-[11px] text-[#B42318] font-medium uppercase">Not Int.</p>
                  <p className="text-sm font-bold text-[#B42318] mt-0.5">{pickedUpNotInterested}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#EFF8FF] border border-[#B2DDFF]">
                  <p className="text-[11px] text-[#175CD3] font-medium uppercase">Callback</p>
                  <p className="text-sm font-bold text-[#175CD3] mt-0.5">{pickedUpCallBackLater}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Recruiter / Team Performance Table (24px spacing, 10-12px rounded, compact rows) */}
      {isAdmin && (
        <div className="card p-0 overflow-hidden mb-6">
          <div className="p-5 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-section-heading text-[#111827]">Recruiter / Team Performance</h2>
              <p className="text-small text-[#667085] mt-0.5">Live operational output and targets breakdown</p>
            </div>
            <Link
              to="/employees"
              className="btn-secondary text-xs h-8 self-start sm:self-auto"
            >
              <span>Manage Employees</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {leaderboard.length === 0 ? (
              <div className="text-empty-body py-8 text-center text-xs text-[#667085]">
                No employee records found. Create employees in the Employee Management portal.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="py-3 px-4 text-table-header w-12 text-center">#</th>
                    <th className="py-3 px-4 text-table-header">Recruiter</th>
                    <th className="py-3 px-4 text-table-header text-right">Leads</th>
                    <th className="py-3 px-4 text-table-header text-right">Calls</th>
                    <th className="py-3 px-4 text-table-header text-right">Interested</th>
                    <th className="py-3 px-4 text-table-header text-right">Interviews</th>
                    <th className="py-3 px-4 text-table-header text-right">Placements</th>
                    <th className="py-3 px-4 text-table-header">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {leaderboard.map((emp, index) => (
                    <tr key={emp.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-2.5 px-4 text-center font-medium text-[#667085]">
                        {emp.rank || index + 1}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-[#EFF6FF] text-[#175CD3] border border-[#B2DDFF] flex items-center justify-center font-semibold text-xs shrink-0">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[#111827]">{emp.name}</p>
                            <p className="text-[11px] text-[#667085]">{emp.designation || emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-[#111827]">{emp.leadsSourced}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-[#111827]">{emp.callsMade}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-[#111827]">{emp.interested ?? emp.applications ?? 0}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-[#111827]">{emp.interviews || 0}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-[#12B76A]">{emp.conversions || 0}</td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant={
                            emp.targetStatus === 'Top Performer'
                              ? 'success'
                              : emp.targetStatus === 'On Track'
                              ? 'info'
                              : 'warning'
                          }
                          size="sm"
                          dot
                        >
                          {emp.targetStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Row 4: Workspace Module Direct Navigation */}
      <div className="card">
        <h2 className="text-section-heading mb-3 text-[#111827]">Direct Module Access</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {canLeadGen && (
            <Link
              to="/lead-generation"
              className="flex items-center justify-between p-3.5 rounded-lg border border-[#E5E7EB] hover:border-[#2563EB] hover:bg-[#EFF6FF]/40 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] text-[#667085] group-hover:text-[#2563EB]">
                  <Users size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#111827]">Lead Generation</p>
                  <p className="text-[11px] text-[#667085] mt-0.5">
                    {stats?.totals?.leadGeneration || 0} {pluralizeWord(stats?.totals?.leadGeneration || 0, 'Record', 'Records')}
                  </p>
                </div>
              </div>
              <ArrowRight size={14} className="text-[#98A2B3] group-hover:text-[#2563EB] transition" />
            </Link>
          )}

          {canLeads && (
            <Link
              to="/leads"
              className="flex items-center justify-between p-3.5 rounded-lg border border-[#E5E7EB] hover:border-[#2563EB] hover:bg-[#EFF6FF]/40 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] text-[#667085] group-hover:text-[#2563EB]">
                  <Briefcase size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#111827]">Sales Team</p>
                  <p className="text-[11px] text-[#667085] mt-0.5">
                    {callingStats.totalCalls || 0} {pluralizeWord(callingStats.totalCalls || 0, 'Call', 'Calls')} Made
                  </p>
                </div>
              </div>
              <ArrowRight size={14} className="text-[#98A2B3] group-hover:text-[#2563EB] transition" />
            </Link>
          )}

          {canMarketing && (
            <Link
              to="/candidates"
              className="flex items-center justify-between p-3.5 rounded-lg border border-[#E5E7EB] hover:border-[#2563EB] hover:bg-[#EFF6FF]/40 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] text-[#667085] group-hover:text-[#2563EB]">
                  <UserCheck size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#111827]">Candidates</p>
                  <p className="text-[11px] text-[#667085] mt-0.5">
                    {benchStats.total || 0} {pluralizeWord(benchStats.total || 0, 'Candidate', 'Candidates')} on Bench
                  </p>
                </div>
              </div>
              <ArrowRight size={14} className="text-[#98A2B3] group-hover:text-[#2563EB] transition" />
            </Link>
          )}

          {canMarketing && (
            <Link
              to="/marketing"
              className="flex items-center justify-between p-3.5 rounded-lg border border-[#E5E7EB] hover:border-[#2563EB] hover:bg-[#EFF6FF]/40 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] text-[#667085] group-hover:text-[#2563EB]">
                  <Megaphone size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#111827]">Marketing</p>
                  <p className="text-[11px] text-[#667085] mt-0.5">
                    {marketingStats.totalApplications || 0} {pluralizeWord(marketingStats.totalApplications || 0, 'Submission', 'Submissions')}
                  </p>
                </div>
              </div>
              <ArrowRight size={14} className="text-[#98A2B3] group-hover:text-[#2563EB] transition" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
