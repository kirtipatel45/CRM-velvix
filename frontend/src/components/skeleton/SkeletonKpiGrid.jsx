import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Single KPI / Metric card skeleton matching ExecutiveCard design.
 */
export function SkeletonKpiCard({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Label */}
          <Skeleton variant="text" width="60%" height={14} className="mb-2" />
          {/* Value */}
          <Skeleton variant="rounded" width="45%" height={36} className="my-2 rounded-lg" />
          {/* Subtitle / Meta */}
          <Skeleton variant="text" width="80%" height={12} className="mt-2" />
        </div>
        {/* Icon container */}
        <Skeleton variant="rounded" width={48} height={48} className="rounded-xl shrink-0" />
      </div>
      {/* Footer / Badge */}
      <div className="mt-3 flex items-center gap-1.5 pt-3 border-t border-slate-100">
        <Skeleton variant="rounded" width={90} height={20} className="rounded-full" />
      </div>
    </div>
  );
}

/**
 * Grid of KPI card skeletons.
 */
export function SkeletonKpiGrid({ count = 4, columns = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4', className = '' }) {
  return (
    <div className={`grid gap-4 sm:gap-5 ${columns} ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonKpiCard key={i} />
      ))}
    </div>
  );
}

export default SkeletonKpiGrid;
