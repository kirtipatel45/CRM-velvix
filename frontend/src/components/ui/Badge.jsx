import React from 'react';

const variantStyles = {
  success: 'text-[#027A48]',
  warning: 'text-[#B54708]',
  danger: 'text-[#B42318]',
  info: 'text-[#175CD3]',
  neutral: 'text-[#344054]',
};

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md', // 'sm' | 'md'
  dot = false,
  className = '',
}) {
  const sizeClass = size === 'sm' ? 'text-[11px]' : 'text-xs';
  const style = variantStyles[variant] || variantStyles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium tracking-tight ${sizeClass} ${style} ${className}`}
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
