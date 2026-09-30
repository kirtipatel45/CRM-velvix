import React from 'react';
import { Skeleton, SkeletonAvatar, SkeletonBadge } from './Skeleton';

/**
 * Skeleton for activity feed, audit timeline, and live event streams.
 */
export function SkeletonActivityFeed({ items = 6, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-start gap-3.5 p-4 rounded-xl border border-slate-100 bg-white shadow-2xs hover:shadow-xs transition"
        >
          <SkeletonAvatar size={38} />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton variant="text" width="40%" height={14} />
              <Skeleton variant="text" width={60} height={11} />
            </div>
            <Skeleton variant="text" width="80%" height={13} />
            <div className="flex items-center gap-2 pt-1">
              <SkeletonBadge width={65} height={20} />
              <Skeleton variant="text" width={100} height={11} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SkeletonActivityFeed;
