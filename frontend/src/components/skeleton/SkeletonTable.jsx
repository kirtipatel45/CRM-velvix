import React from 'react';
import { Skeleton, SkeletonAvatar, SkeletonBadge } from './Skeleton';

/**
 * Highly polished Table skeleton loader matching BenchTrix CRM table layouts.
 */
export function SkeletonTable({
  rows = 6,
  columns = [
    { width: '25%', type: 'avatar-text' },
    { width: '15%', type: 'text' },
    { width: '20%', type: 'badge' },
    { width: '15%', type: 'text' },
    { width: '15%', type: 'badge' },
    { width: '10%', type: 'actions' },
  ],
  showHeader = true,
  showPagination = true,
  cardWrapper = true,
  className = '',
}) {
  const content = (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-body">
        {showHeader && (
          <thead className="border-b border-slate-200 bg-slate-50/80">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} scope="col" className="px-5 py-3.5 text-left" style={{ width: col.width }}>
                  <Skeleton variant="text" width="60%" height={12} className="rounded" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-slate-100 bg-white">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-50/50 transition">
              {columns.map((col, cIdx) => (
                <td key={cIdx} className="px-5 py-4 align-middle">
                  {col.type === 'avatar-text' ? (
                    <div className="flex items-center gap-3">
                      <SkeletonAvatar size={34} />
                      <div className="flex-1 min-w-0">
                        <Skeleton variant="text" width="80%" height={14} className="mb-1" />
                        <Skeleton variant="text" width="50%" height={11} />
                      </div>
                    </div>
                  ) : col.type === 'badge' ? (
                    <SkeletonBadge width={85} height={24} />
                  ) : col.type === 'multi-badge' ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <SkeletonBadge width={60} height={20} />
                      <SkeletonBadge width={70} height={20} />
                    </div>
                  ) : col.type === 'actions' ? (
                    <div className="flex items-center gap-2">
                      <Skeleton variant="rounded" width={32} height={32} className="rounded-lg" />
                      <Skeleton variant="rounded" width={32} height={32} className="rounded-lg" />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Skeleton variant="text" width={col.lineWidth || (cIdx % 2 === 0 ? '75%' : '90%')} height={13} />
                      {col.twoLines && <Skeleton variant="text" width="45%" height={10} />}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {showPagination && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 bg-slate-50/40">
          <Skeleton variant="text" width={140} height={14} />
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" width={32} height={32} className="rounded-lg" />
            <Skeleton variant="rounded" width={32} height={32} className="rounded-lg" />
            <Skeleton variant="rounded" width={32} height={32} className="rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );

  if (cardWrapper) {
    return (
      <div className={`card overflow-hidden p-0 shadow-sm border border-slate-200/80 ${className}`}>
        {content}
      </div>
    );
  }

  return content;
}

export default SkeletonTable;
