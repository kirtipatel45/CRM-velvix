import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useCandidateAuth } from "./context/CandidateAuthContext";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";

const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LeadGeneration = lazy(() => import("./pages/LeadGeneration"));
const Sales = lazy(() => import("./pages/Sales"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Profile = lazy(() => import("./pages/Profile"));
const EmployeeManagement = lazy(() => import("./pages/EmployeeManagement"));
const AssignedLeads = lazy(() => import("./pages/AssignedLeads"));
const Candidates = lazy(() => import("./pages/Candidates"));

// Candidate Portal Pages
const CandidateLogin = lazy(() => import("./pages/candidate/CandidateLogin"));
const CandidateFirstLogin = lazy(() => import("./pages/candidate/CandidateFirstLogin"));
const CandidateSetPassword = lazy(() => import("./pages/candidate/CandidateSetPassword"));
const CandidatePortalHome = lazy(() => import("./pages/candidate/CandidatePortalHome"));
const CandidateLayout = lazy(() => import("./components/CandidateLayout"));

function PrivateRoute({ children, requiredModule, adminOnly }) {
  const { user, isAuthenticated, loading, hasModule } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!isCandidateAuthenticated) return <Navigate to="/candidate/login" replace />;

  return children;
}

export default function App() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    }>
      <Routes>
        {/* Employee Auth Routes */}
        <Route path="/login" element={<Login />} />
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
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
