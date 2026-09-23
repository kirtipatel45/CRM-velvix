import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  LogOut,
  Menu,
  X,
  UserCheck,
  Briefcase,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", isUniversal: true },
  {
    to: "/employees",
    icon: UserCheck,
    label: "Employees",
    adminOnly: true,
  },
  {
    to: "/lead-generation",
    icon: Users,
    label: "Lead Generation",
    module: "lead_generation",
  },
  {
    to: "/leads",
    icon: Briefcase,
    label: "Leads",
    module: "leads",
  },
  {
    to: "/candidates",
    icon: UserCheck,
    label: "Candidates",
    module: "candidates",
  },
  {
    to: "/marketing",
    icon: Megaphone,
    label: "Marketing Team",
    module: "marketing",
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100/90 p-2 sm:p-3 lg:p-3.5 gap-3 lg:gap-3.5">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Floating Liquid Glass Sidebar - Light Mode */}
      <aside
        className={`fixed inset-y-3 left-3 z-50 w-64 transform rounded-2xl bg-white/85 text-slate-800 backdrop-blur-2xl border border-white/80 ring-1 ring-slate-900/5 shadow-[0_15px_35px_rgba(15,23,42,0.07),0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-300 lg:static lg:translate-x-0 lg:h-full lg:flex lg:flex-col lg:justify-between shrink-0 overflow-hidden relative ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Ambient liquid glass lights */}
        <div className="pointer-events-none absolute -top-12 -left-12 h-36 w-36 rounded-full bg-brand-500/10 blur-2xl" />
        <div className="pointer-events-none absolute top-1/2 -right-12 h-36 w-36 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-sky-500/10 blur-2xl" />

        {/* Top Brand Area (V icon removed) */}
        <div className="relative z-10 flex h-18 items-center justify-between px-5 border-b border-slate-100">
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 leading-tight">
              CRM <span className="bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">Velvix</span>
            </h1>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Enterprise Portal
            </p>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items with Liquid Glass Highlights */}
        <nav
          className="relative z-10 mt-3 space-y-1.5 px-3 overflow-y-auto flex-1 custom-scrollbar"
          style={{ maxHeight: "calc(100vh - 200px)" }}
        >
          {navItems
            .filter((item) => {
              if (item.isUniversal) return true;
              if (user?.role === "admin") return true;
              if (item.adminOnly) return false;
              if (item.module) {
                return (user?.allowedModules || []).includes(item.module);
              }
              return true;
            })
            .map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-600 text-white shadow-md shadow-brand-500/25 border border-white/30 backdrop-blur-md font-semibold"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={18}
                      className={`shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    />
                    <span className="truncate">{label}</span>
                    {isActive && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
        </nav>

        {/* Bottom User Card in Light Frosted Glass */}
        <div className="relative z-10 p-3 border-t border-slate-100 bg-slate-50/60 backdrop-blur-md">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/90 border border-slate-200/70 shadow-xs mb-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs border border-white/40 shrink-0">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="truncate text-xs flex-1">
              <p className="font-semibold text-slate-800 truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] text-brand-600 font-medium truncate mt-0.5">
                {user?.designation || user?.role || "Employee"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200/80 transition"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white rounded-2xl border border-slate-200/80 shadow-xs relative">
        {/* Mobile Hamburger Toggle Button */}
        <button
          className="lg:hidden absolute top-4 right-4 z-30 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-slate-700 shadow-sm border border-slate-200/80 backdrop-blur-sm hover:bg-slate-50 transition"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
