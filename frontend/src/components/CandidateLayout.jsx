import { Outlet, useNavigate } from "react-router-dom";
import { useCandidateAuth } from "../context/CandidateAuthContext";
import { LogOut, User, CheckCircle2, ShieldCheck, Briefcase } from "lucide-react";

export default function CandidateLayout() {
  const { candidate, logoutCandidate } = useCandidateAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutCandidate();
    navigate("/candidate/login");
  };

  const displayName = candidate?.firstName
    ? `${candidate.firstName} ${candidate.lastName || ''}`.trim()
    : candidate?.email || "Candidate";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-500/30">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-slate-900 text-lg">Velvix</span>
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 border border-brand-200">
                  Candidate Portal
                </span>
              </div>
              <p className="text-xs text-slate-500">Career & Talent Workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-sm border border-brand-200">
                {candidate?.firstName?.[0]?.toUpperCase() || <User size={16} />}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight">
                  {displayName}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-0.5">
                  <CheckCircle2 size={11} />
                  <span>Portal Active</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn-secondary py-1.5 px-3 text-xs gap-1.5"
              title="Sign Out"
            >
              <LogOut size={14} className="text-slate-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-slate-600">
            <ShieldCheck size={14} className="text-brand-600" />
            <span>Secure Talent Authentication &bull; Velvix IT Staffing</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Velvix Staffing. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

