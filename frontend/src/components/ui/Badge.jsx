import React from 'react';

const variantStyles = {
  success: 'bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]',
  warning: 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]',
  danger: 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]',
  info: 'bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]',
  neutral: 'bg-[#F9FAFB] text-[#344054] border border-[#EAECF0]',
};

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md', // 'sm' | 'md'
  dot = false,
  className = '',
}) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs';
  const style = variantStyles[variant] || variantStyles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium tracking-tight ${sizeClass} ${style} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            variant === 'success'
              ? 'bg-[#12B76A]'
              : variant === 'warning'
              ? 'bg-[#F79009]'
              : variant === 'danger'
              ? 'bg-[#F04438]'
              : variant === 'info'
              ? 'bg-[#2E90FA]'
              : 'bg-[#667085]'
          }`}
        />
      )}
      {children}
    </span>
  );
}
