import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Megaphone,
  UserCheck,
  UserCog,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import BenchTrixLogo from "./BenchTrixLogo";

export default function Layout() {
  const { user, logout, hasModule } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isAdmin = user?.role === "admin";

  const workspaceItems = [
    {
      to: "/",
      icon: LayoutDashboard,
      label: "Dashboard",
      visible: true,
    },
    {
      to: "/employees",
      icon: UserCog,
      label: "Employees",
      visible: isAdmin,
    },
    {
      to: "/lead-generation",
      icon: Users,
      label: "Lead Generation",
      visible: isAdmin || hasModule("lead_generation"),
    },
    {
      to: "/leads",
      icon: Briefcase,
      label: "Sales Team",
      visible: isAdmin || hasModule("leads"),
    },
    {
      to: "/candidates",
      icon: UserCheck,
      label: "Candidates",
      visible: isAdmin || hasModule("candidates"),
    },
    {
      to: "/marketing",
      icon: Megaphone,
      label: "Marketing Team",
      visible: isAdmin || hasModule("marketing"),
    },
  ].filter((item) => item.visible);

  const renderNavGroup = (title, items) => (
    <div className="space-y-1">
      <div className="px-3 pb-1.5 pt-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
          {title}
        </span>
      </div>
      <div className="space-y-1">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#EFF6FF] text-[#175CD3] font-semibold"
                  : "text-[#667085] hover:bg-[#F9FAFB] hover:text-[#111827]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2 : 1.75}
                  className={`shrink-0 transition-colors ${
                    isActive ? "text-[#2563EB]" : "text-[#667085] group-hover:text-[#111827]"
                  }`}
                />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F8FA]">
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Enterprise Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-[#E5E7EB] bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 shrink-0 ${
          sidebarOpen ? "translate-x-0 shadow-lg" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top Header / Logo Section */}
        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex min-h-[82px] items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
            <BenchTrixLogo size="text-2xl" subtitle="Staffing & CRM Platform" />
            <button
              type="button"
              className="rounded-md p-1.5 text-[#667085] hover:bg-[#F2F4F7] hover:text-[#111827] lg:hidden transition"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6 custom-scrollbar">
            {renderNavGroup("Workspace", workspaceItems)}
          </nav>
        </div>

        {/* Bottom User Profile Section */}
        <div className="border-t border-[#E5E7EB] p-4 bg-white">
          <NavLink
            to="/profile"
            className="flex items-center gap-3 px-2 py-1.5 mb-2 rounded-lg hover:bg-[#F9FAFB] transition-colors group cursor-pointer"
            title="View profile & account settings"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] border border-[#B2DDFF] text-[#175CD3] font-semibold text-xs group-hover:border-[#2563EB] transition-colors">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#111827] group-hover:text-[#2563EB] transition-colors leading-tight">
                {user?.name || "Admin User"}
              </p>
              <p className="truncate text-[11px] text-[#667085] capitalize mt-0.5">
                {user?.designation || user?.role || "admin"}
              </p>
            </div>
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#667085] hover:bg-[#FEF3F2] hover:text-[#F04438] hover:border-[#FECDCA] transition-colors"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Topbar for Hamburger toggle */}
        <div className="flex h-16 items-center justify-between border-b border-[#E5E7EB] bg-white px-5 lg:hidden">
          <BenchTrixLogo size="text-xl" subtitle={null} />
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#667085] hover:text-[#111827] transition"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Scrollable Page Outlet */}
        <main className="flex-1 overflow-y-auto bg-[#F7F8FA] p-7 lg:p-8 custom-scrollbar">
          <div className="mx-auto max-w-[1500px] w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
