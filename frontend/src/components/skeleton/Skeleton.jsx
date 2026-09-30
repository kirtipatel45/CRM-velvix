import React from 'react';

/**
 * Core Skeleton primitive component with customizable variant and animation.
 */
export function Skeleton({
  variant = 'rounded', // 'text' | 'circular' | 'rounded' | 'rectangular'
  width,
  height,
  className = '',
  animation = 'shimmer', // 'shimmer' | 'pulse' | 'none'
  style = {},
}) {
  const variantClasses = {
    text: 'rounded-md h-4 w-full',
    circular: 'rounded-full',
    rounded: 'rounded-xl',
    rectangular: 'rounded-none',
  }[variant] || 'rounded-xl';

  const animationClass = {
    shimmer: 'skeleton-shimmer',
    pulse: 'skeleton-pulse',
    none: 'bg-slate-200',
  }[animation] || 'skeleton-shimmer';

  return (
    <div
      className={`inline-block ${variantClasses} ${animationClass} ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Natural looking text skeleton block with variable line widths.
 */
export function SkeletonText({
  lines = 3,
  widths = ['100%', '85%', '65%'],
  gap = 'gap-2.5',
  className = '',
  lineHeight = 'h-3.5',
}) {
  return (
    <div className={`flex flex-col ${gap} ${className}`}>
      {Array.from({ length: lines }).map((_, index) => {
        const width = widths[index % widths.length] || '100%';
        return (
          <Skeleton
            key={index}
            variant="text"
            className={`${lineHeight}`}
            style={{ width }}
          />
        );
      })}
    </div>
  );
}

/**
 * Avatar placeholder skeleton.
 */
export function SkeletonAvatar({ size = 40, className = '' }) {
  return (
    <Skeleton
      variant="circular"
      style={{ width: size, height: size }}
      className={`shrink-0 ${className}`}
    />
  );
}

/**
 * Badge pill skeleton.
 */
export function SkeletonBadge({ width = 72, height = 22, className = '' }) {
  return (
    <Skeleton
      variant="rounded"
      style={{ width, height }}
      className={`rounded-full ${className}`}
    />
  );
}

/**
 * Button skeleton.
 */
export function SkeletonButton({ width = 96, height = 38, className = '' }) {
  return (
    <Skeleton
      variant="rounded"
      style={{ width, height }}
      className={`rounded-lg ${className}`}
    />
  );
}

/**
 * Card container skeleton wrapper.
 */
export function SkeletonCard({ children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  );
}

export default Skeleton;
