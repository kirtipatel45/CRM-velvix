import React from 'react';
import { Skeleton, SkeletonAvatar, SkeletonBadge, SkeletonButton } from './Skeleton';

/**
 * Skeleton loader for Candidate Portal.
 */
export function SkeletonCandidatePortal() {
  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600/10 via-indigo-600/5 to-slate-100 p-6 sm:p-8 border border-brand-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton variant="badge" width={110} height={24} />
            <Skeleton variant="text" width={320} height={28} className="rounded-lg" />
            <Skeleton variant="text" width={480} height={15} />
          </div>
          <div className="flex items-center gap-3">
            <SkeletonButton width={140} height={42} />
          </div>
        </div>
      </div>

      {/* Progress & Profile Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Onboarding Status Card */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" width="60%" height={15} />
            <Skeleton variant="badge" width={60} height={20} />
          </div>
          <Skeleton variant="rounded" width="100%" height={10} className="rounded-full" />
          <Skeleton variant="text" width="80%" height={12} />
        </div>

        {/* Visa & Authorization Card */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" width="55%" height={15} />
            <Skeleton variant="circular" size={24} />
          </div>
          <Skeleton variant="badge" width={120} height={24} />
          <Skeleton variant="text" width="70%" height={12} />
        </div>

        {/* Assigned Recruiter Card */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" width="50%" height={15} />
            <Skeleton variant="circular" size={24} />
          </div>
          <div className="flex items-center gap-3">
            <SkeletonAvatar size={36} />
            <div className="space-y-1">
              <Skeleton variant="text" width={100} height={14} />
              <Skeleton variant="text" width={80} height={11} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Onboarding form / Candidate Profile details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Profile & Job Preferences */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <Skeleton variant="text" width={180} height={18} />
                <Skeleton variant="text" width={240} height={13} />
              </div>
              <Skeleton variant="rounded" width={80} height={32} className="rounded-lg" />
            </div>

            {/* Form Field Skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton variant="text" width="40%" height={13} />
                  <Skeleton variant="rounded" width="100%" height={40} className="rounded-lg" />
                </div>
              ))}
            </div>

            {/* Tags / Pills skeleton */}
            <div className="space-y-2 pt-2">
              <Skeleton variant="text" width="30%" height={13} />
              <div className="flex flex-wrap gap-2">
                {[80, 100, 70, 90, 110].map((w, i) => (
                  <Skeleton key={i} variant="badge" width={w} height={28} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Documents / Resume Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6 space-y-4">
            <Skeleton variant="text" width="60%" height={18} />
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 flex flex-col items-center justify-center gap-3">
              <Skeleton variant="circular" size={44} />
              <Skeleton variant="text" width={140} height={14} />
              <Skeleton variant="text" width={100} height={11} />
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton variant="rounded" width="100%" height={40} className="rounded-xl" />
              <Skeleton variant="rounded" width="100%" height={40} className="rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkeletonCandidatePortal;
