import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Chart Skeleton card for analytics, bar charts, and funnel charts.
 */
export function SkeletonChart({
  type = 'bar', // 'bar' | 'donut' | 'funnel'
  titleWidth = '40%',
  height = 280,
  className = '',
}) {
  return (
    <div className={`card shadow-xs border border-slate-200/80 p-5 ${className}`}>
      {/* Chart Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="space-y-1.5 flex-1">
          <Skeleton variant="text" width={titleWidth} height={16} />
          <Skeleton variant="text" width="25%" height={12} />
        </div>
        <Skeleton variant="rounded" width={80} height={28} className="rounded-lg shrink-0" />
      </div>

      {/* Chart Body */}
      <div className="pt-6 flex items-center justify-center" style={{ minHeight: height }}>
        {type === 'bar' && (
          <div className="w-full flex items-end justify-between gap-3 h-48 px-4">
            {[45, 75, 30, 90, 60, 85, 40, 65].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <Skeleton
                  variant="rounded"
                  className="w-full rounded-t-md"
                  style={{ height: `${h}%` }}
                />
                <Skeleton variant="text" width="60%" height={10} />
              </div>
            ))}
          </div>
        )}

        {type === 'donut' && (
          <div className="flex flex-col sm:flex-row items-center justify-around w-full gap-6">
            <div className="relative flex items-center justify-center">
              <Skeleton variant="circular" size={170} className="shadow-xs" />
              <div className="absolute h-24 w-24 rounded-full bg-white flex items-center justify-center">
                <Skeleton variant="text" width={40} height={14} />
              </div>
            </div>
            <div className="space-y-3 w-40">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Skeleton variant="circular" size={12} />
                  <Skeleton variant="text" width="70%" height={12} />
                </div>
              ))}
            </div>
          </div>
        )}

        {type === 'funnel' && (
          <div className="w-full space-y-3 px-2">
            {[100, 70, 45].map((width, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <Skeleton variant="text" width="30%" height={12} />
                  <Skeleton variant="text" width="15%" height={12} />
                </div>
                <div className="h-9 w-full bg-slate-100 rounded-xl overflow-hidden p-1 flex items-center">
                  <Skeleton
                    variant="rounded"
                    className="h-full rounded-lg"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SkeletonChart;
