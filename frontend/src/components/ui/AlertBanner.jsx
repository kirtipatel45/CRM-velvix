import React from 'react';
import { AlertTriangle, Info, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AlertBanner({
  id,
  type = 'warning', // 'warning' | 'info' | 'danger'
  message,
  title,
  actionLabel,
  actionTo,
  onAction,
  onDismiss,
  className = '',
}) {
  const isWarning = type === 'warning';
  const isDanger = type === 'danger';
  const isInfo = type === 'info';

  const containerBg = isWarning
    ? 'bg-[#FFFAEB] border-[#FEDF89] text-[#B54708]'
    : isDanger
    ? 'bg-[#FEF3F2] border-[#FECDCA] text-[#B42318]'
    : 'bg-[#EFF8FF] border-[#B2DDFF] text-[#175CD3]';

  const iconColor = isWarning
    ? 'text-[#F79009]'
    : isDanger
    ? 'text-[#F04438]'
    : 'text-[#2E90FA]';

  const Icon = isWarning || isDanger ? AlertTriangle : Info;

  return (
    <div
      className={`min-h-[44px] sm:h-11 flex items-center justify-between gap-3 px-4 py-2 rounded-lg border text-xs sm:text-sm transition ${containerBg} ${className}`}
      role="alert"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon size={16} strokeWidth={2} className={`shrink-0 ${iconColor}`} />
        <div className="flex items-center gap-x-2 truncate text-xs">
          {title && <span className="font-semibold text-[#111827] shrink-0">{title}</span>}
          {title && message && <span className="text-[#98A2B3] hidden sm:inline">·</span>}
          <span className="font-normal text-[#344054] truncate">{message}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {actionLabel && actionTo && (
          <Link
            to={actionTo}
            className="inline-flex items-center gap-1 font-semibold text-[#2563EB] hover:underline text-xs shrink-0"
          >
            <span>{actionLabel}</span>
            {!actionLabel.includes('→') && <ArrowRight size={13} />}
          </Link>
        )}
        {actionLabel && !actionTo && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1 font-semibold text-[#2563EB] hover:underline text-xs shrink-0"
          >
            <span>{actionLabel}</span>
            {!actionLabel.includes('→') && <ArrowRight size={13} />}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded p-1 hover:bg-black/5 text-[#667085] hover:text-[#111827] transition"
            aria-label="Dismiss alert"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
