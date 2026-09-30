import React from 'react';
import { Skeleton, SkeletonAvatar, SkeletonBadge, SkeletonButton } from './Skeleton';
import { SkeletonTable } from './SkeletonTable';

/**
 * Skeleton loader for Employee Profile page.
 */
export function SkeletonProfile() {
  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      {/* Profile Header Card */}
      <div className="card overflow-hidden p-0 border border-slate-200/80 shadow-xs">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 skeleton-shimmer" />
        
        {/* Info row */}
        <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12">
          <div className="flex items-end gap-4">
            <SkeletonAvatar size={88} className="ring-4 ring-white shadow-md" />
            <div className="space-y-1.5 pb-1">
              <Skeleton variant="text" width={180} height={22} />
              <div className="flex items-center gap-2">
                <SkeletonBadge width={90} height={22} />
                <Skeleton variant="text" width={130} height={14} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SkeletonButton width={120} height={38} />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 px-6 border-t border-slate-100 pt-3">
          {[80, 110, 90].map((w, i) => (
            <Skeleton key={i} variant="text" width={w} height={20} className="rounded mb-3" />
          ))}
        </div>
      </div>

      {/* Profile Content Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: User meta cards */}
        <div className="lg:col-span-1 space-y-5">
          <div className="card p-5 space-y-4">
            <Skeleton variant="text" width="50%" height={16} />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center py-1 border-b border-slate-50">
                  <Skeleton variant="text" width="35%" height={13} />
                  <Skeleton variant="text" width="45%" height={13} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Assigned leads / Activity */}
        <div className="lg:col-span-2">
          <SkeletonTable
            rows={5}
            columns={[
              { width: '30%', type: 'avatar-text' },
              { width: '25%', type: 'text' },
              { width: '25%', type: 'badge' },
              { width: '20%', type: 'actions' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export default SkeletonProfile;
