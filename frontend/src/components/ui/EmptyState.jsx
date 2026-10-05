import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There is currently no data matching your criteria.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[#D0D5DD] bg-[#F9FAFB]/50 ${className}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-[#E5E7EB] text-[#667085] shadow-xs mb-3">
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-[#667085] leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn-primary mt-4 text-xs h-8 px-3"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
