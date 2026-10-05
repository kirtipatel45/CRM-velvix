import React from 'react';

export default function SegmentedControl({
  options = [],
  value,
  onChange,
  className = '',
  size = 'md', // 'sm' | 'md'
}) {
  const sizeClasses = size === 'sm' ? 'py-1 px-2.5 text-xs' : 'py-1.5 px-3 text-xs';

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-0.5 ${className}`}
      role="tablist"
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(opt.value)}
            className={`rounded-md font-medium transition-colors ${sizeClasses} ${
              isSelected
                ? 'bg-white border border-[#E5E7EB] text-[#111827] font-semibold shadow-2xs'
                : 'border border-transparent text-[#667085] hover:text-[#111827]'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
