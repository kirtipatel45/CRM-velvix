import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useCandidateAuth } from "./context/CandidateAuthContext";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";

const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const EmployeeSetPassword = lazy(() => import("./pages/EmployeeSetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LeadGeneration = lazy(() => import("./pages/LeadGeneration"));
const Sales = lazy(() => import("./pages/Sales"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Profile = lazy(() => import("./pages/Profile"));
const EmployeeManagement = lazy(() => import("./pages/EmployeeManagement"));
const AssignedLeads = lazy(() => import("./pages/AssignedLeads"));
const Candidates = lazy(() => import("./pages/Candidates"));
const ActivityLogs = lazy(() => import("./pages/ActivityLogs"));

// Candidate Portal Pages
const CandidateLogin = lazy(() => import("./pages/candidate/CandidateLogin"));
const CandidateFirstLogin = lazy(() => import("./pages/candidate/CandidateFirstLogin"));
const CandidateSetPassword = lazy(() => import("./pages/candidate/CandidateSetPassword"));
const CandidatePortalHome = lazy(() => import("./pages/candidate/CandidatePortalHome"));
const CandidateLayout = lazy(() => import("./components/CandidateLayout"));

import { Skeleton, SkeletonAvatar } from "./components/skeleton";

function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col gap-6">
      {/* Top Navbar Skeleton */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-3">
          <Skeleton variant="rounded" width={38} height={38} className="rounded-xl" />
          <Skeleton variant="text" width={140} height={20} />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton variant="rounded" width={160} height={36} className="rounded-xl hidden sm:inline-block" />
          <SkeletonAvatar size={38} />
        </div>
      </div>
      {/* Content Area Skeleton */}
      <div className="space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton variant="text" width={240} height={26} />
            <Skeleton variant="text" width={380} height={14} />
          </div>
          <Skeleton variant="rounded" width={120} height={38} className="rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5 space-y-3">
              <Skeleton variant="text" width="50%" height={12} />
              <Skeleton variant="rounded" width="40%" height={32} />
              <Skeleton variant="text" width="70%" height={11} />
            </div>
          ))}
        </div>
        <div className="card p-6 min-h-[360px] flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <Skeleton variant="text" width={200} height={18} />
            <Skeleton variant="rounded" width={100} height={32} />
          </div>
          <div className="space-y-4 py-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton variant="text" width="30%" height={14} />
                <Skeleton variant="text" width="20%" height={14} />
                <Skeleton variant="rounded" width={80} height={24} className="rounded-full" />
                <Skeleton variant="text" width="15%" height={14} />
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-4 flex justify-between">
            <Skeleton variant="text" width={120} height={14} />
            <Skeleton variant="rounded" width={80} height={28} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivateRoute({ children, requiredModule, adminOnly }) {
  const { user, isAuthenticated, loading, hasModule } = useAuth();
  if (loading) {
    return <PageLoadingSkeleton />;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (requiredModule && !hasModule(requiredModule)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function CandidatePrivateRoute({ children }) {
  const { isCandidateAuthenticated, loading } = useCandidateAuth();
  if (loading) {
    return <PageLoadingSkeleton />;
  }

  if (!isCandidateAuthenticated) return <Navigate to="/candidate/login" replace />;

  return children;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoadingSkeleton />}>

      <Routes>
        {/* Employee Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/set-password" element={<EmployeeSetPassword />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Candidate Portal Routes */}
        <Route path="/candidate/login" element={<CandidateLogin />} />
        <Route path="/candidate/first-login" element={<CandidateFirstLogin />} />
        <Route path="/candidate/set-password" element={<CandidateSetPassword />} />
        <Route
          path="/candidate/portal"
          element={
            <CandidatePrivateRoute>
              <CandidateLayout />
            </CandidatePrivateRoute>
          }
        >
          <Route index element={<CandidatePortalHome />} />
        </Route>
        <Route path="/candidate" element={<Navigate to="/candidate/portal" replace />} />

        {/* Employee CRM Workspace */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route
            path="lead-generation"
            element={
              <PrivateRoute requiredModule="lead_generation">
                <LeadGeneration />
              </PrivateRoute>
            }
          />
          <Route
            path="leads"
            element={
              <PrivateRoute requiredModule="leads">
                <AssignedLeads />
              </PrivateRoute>
            }
          />
          <Route
            path="sales"
            element={
              <PrivateRoute requiredModule="leads">
                <AssignedLeads />
              </PrivateRoute>
            }
          />
          <Route
            path="candidates"
            element={
              <PrivateRoute requiredModule="candidates">
                <Candidates />
              </PrivateRoute>
            }
          />
          <Route
            path="marketing"
            element={
              <PrivateRoute requiredModule="marketing">
                <Marketing />
              </PrivateRoute>
            }
          />
          <Route
            path="employees"
            element={
              <PrivateRoute adminOnly>
                <EmployeeManagement />
              </PrivateRoute>
            }
          />
          <Route 
            path="profile" 
            element={<Profile />} 
          />
          <Route 
            path="settings" 
            element={<Profile />} 
          />
          <Route 
            path="activity-logs" 
            element={
              <PrivateRoute adminOnly>
                <ActivityLogs />
              </PrivateRoute>
            } 
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
