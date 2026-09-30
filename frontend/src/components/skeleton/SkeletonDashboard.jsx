import React from 'react';
import { Skeleton, SkeletonAvatar, SkeletonBadge } from './Skeleton';
import { SkeletonKpiGrid } from './SkeletonKpiGrid';
import { SkeletonChart } from './SkeletonChart';

/**
 * Full Dashboard loading state skeleton.
 */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div className="space-y-2">
          <Skeleton variant="text" width={280} height={28} className="rounded-lg" />
          <Skeleton variant="text" width={420} height={15} />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="rounded" width={180} height={36} className="rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <SkeletonKpiGrid count={4} columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />

      {/* Secondary KPI Cards Grid */}
      <SkeletonKpiGrid count={4} columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel Pipeline */}
        <div className="lg:col-span-1">
          <SkeletonChart type="funnel" titleWidth="60%" height={260} />
        </div>
        {/* Outcomes Donut */}
        <div className="lg:col-span-1">
          <SkeletonChart type="donut" titleWidth="55%" height={260} />
        </div>
        {/* Performance Bar Chart */}
        <div className="lg:col-span-1">
          <SkeletonChart type="bar" titleWidth="50%" height={260} />
        </div>
      </div>

      {/* Bottom Section: Leaderboard + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard Skeleton */}
        <div className="card shadow-xs border border-slate-200/80 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <Skeleton variant="text" width={160} height={16} />
            <Skeleton variant="badge" width={80} height={20} />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <Skeleton variant="circular" size={24} />
                  <SkeletonAvatar size={34} />
                  <div className="space-y-1">
                    <Skeleton variant="text" width={120} height={13} />
                    <Skeleton variant="text" width={80} height={10} />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Skeleton variant="text" width={60} height={14} />
                  <Skeleton variant="text" width={40} height={10} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Alerts / Feed Skeleton */}
        <div className="card shadow-xs border border-slate-200/80 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <Skeleton variant="text" width={140} height={16} />
            <Skeleton variant="rounded" width={24} height={24} className="rounded-full" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                <Skeleton variant="rounded" width={36} height={36} className="rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton variant="text" width="85%" height={13} />
                  <Skeleton variant="text" width="60%" height={11} />
                </div>
                <Skeleton variant="text" width={50} height={11} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkeletonDashboard;
