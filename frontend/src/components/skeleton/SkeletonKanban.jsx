import React from 'react';
import { Skeleton, SkeletonAvatar, SkeletonBadge } from './Skeleton';

/**
 * Skeleton card matching a Kanban Lead Card.
 */
function SkeletonKanbanCard() {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
      {/* Header: Candidate Name + Time */}
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-1.5">
          <Skeleton variant="text" width="70%" height={15} />
          <Skeleton variant="text" width="45%" height={12} />
        </div>
        <Skeleton variant="circular" size={28} />
      </div>

      {/* Info Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <SkeletonBadge width={64} height={20} />
        <SkeletonBadge width={74} height={20} />
      </div>

      {/* Details snippet */}
      <div className="space-y-1.5 pt-1">
        <Skeleton variant="text" width="90%" height={11} />
        <Skeleton variant="text" width="60%" height={11} />
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <Skeleton variant="rounded" width={70} height={26} className="rounded-md" />
        <div className="flex items-center gap-1.5">
          <Skeleton variant="rounded" width={28} height={28} className="rounded-md" />
          <Skeleton variant="rounded" width={28} height={28} className="rounded-md" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton Kanban columns board.
 */
export function SkeletonKanban({ columnsCount = 3, cardsPerColumn = 3, className = '' }) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-5 items-start ${className}`}>
      {Array.from({ length: columnsCount }).map((_, cIdx) => (
        <div key={cIdx} className="flex flex-col rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-xs">
          {/* Column Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Skeleton variant="circular" size={10} />
              <Skeleton variant="text" width={110} height={16} />
            </div>
            <Skeleton variant="rounded" width={32} height={20} className="rounded-full" />
          </div>

          {/* Column Cards */}
          <div className="mt-3 space-y-3">
            {Array.from({ length: cardsPerColumn }).map((_, rIdx) => (
              <SkeletonKanbanCard key={rIdx} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default SkeletonKanban;
