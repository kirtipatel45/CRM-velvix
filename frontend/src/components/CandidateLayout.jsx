import { Outlet, useNavigate } from "react-router-dom";
import { useCandidateAuth } from "../context/CandidateAuthContext";
import { LogOut, User, CheckCircle2, ShieldCheck } from "lucide-react";
import BenchTrixLogo from "./BenchTrixLogo";

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
    <div className="min-h-screen bg-[#F7F8FA] text-[#111827] flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-7 lg:px-8">
          <div className="flex items-center gap-4">
            <BenchTrixLogo size="text-lg" subtitle="Candidate Portal" />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-sm border border-blue-200">
                {candidate?.firstName?.[0]?.toUpperCase() || <User size={16} />}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-[#111827] leading-tight">
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
              <LogOut size={14} className="text-[#667085]" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 mx-auto w-full max-w-[1500px] p-7 lg:p-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-6 text-center text-xs text-[#667085]">
        <div className="mx-auto max-w-[1500px] px-7 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[#667085]">
            <ShieldCheck size={14} className="text-[#2563EB]" />
            <span>Secure Talent Authentication &bull; BenchTrix IT Staffing</span>
          </div>
          <p>&copy; {new Date().getFullYear()} BenchTrix Staffing. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

