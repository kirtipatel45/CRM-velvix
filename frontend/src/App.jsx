import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LeadGeneration = lazy(() => import("./pages/LeadGeneration"));
const Sales = lazy(() => import("./pages/Sales"));
const Marketing = lazy(() => import("./pages/Marketing"));

function PrivateRoute({ children, roles }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user?.role) && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

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
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
              <PrivateRoute roles={['lead_gen', 'manager']}>
                <LeadGeneration />
              </PrivateRoute>
            }
          />
          <Route
            path="sales"
            element={
              <PrivateRoute roles={['sales', 'manager']}>
                <Sales />
              </PrivateRoute>
            }
          />
          <Route
            path="marketing"
            element={
              <PrivateRoute roles={['marketing', 'manager']}>
                <Marketing />
              </PrivateRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
