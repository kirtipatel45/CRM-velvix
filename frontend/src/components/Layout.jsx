import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Phone,
  Megaphone,
  LogOut,
  Menu,
  X,
  Bell,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  {
    to: "/lead-generation",
    icon: Users,
    label: "Lead Generation",
    roles: ["lead_gen", "manager", "admin"],
  },
  {
    to: "/sales",
    icon: Phone,
    label: "Sales Team",
    roles: ["sales", "manager", "admin"],
  },
  {
    to: "/marketing",
    icon: Megaphone,
    label: "Marketing Team",
    roles: ["marketing", "manager", "admin"],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-brand-900 text-white transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-bold">CRM Velvix</h1>
            <p className="text-xs text-brand-200">Lead • Sales • Marketing</p>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav
          className="mt-4 space-y-1 px-3 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 140px)" }}
        >
          {navItems
            .filter(
              (item) =>
                !item.roles ||
                item.roles.includes(user?.role) ||
                user?.role === "admin",
            )
            .map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-brand-700 text-white"
                      : "text-brand-100 hover:bg-brand-800 hover:text-white"
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
        </nav>

        <div className="absolute bottom-0 w-full border-t border-brand-700 p-4 bg-brand-900">
          <div className="mb-3 truncate text-sm">
            <p className="font-medium">{user?.name}</p>
            <p className="text-xs text-brand-300">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand-200 transition hover:bg-brand-800 hover:text-white"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-30 flex shrink-0 h-20 items-center gap-4 border-b border-slate-200 bg-white px-4 lg:px-8 shadow-sm">
          <button
            className="lg:hidden text-slate-500 hover:text-slate-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="hidden lg:block">
            <h2 className="text-xl font-semibold text-slate-800">
              Welcome back, {user?.name?.split(" ")[0] || "User"}! 👋
            </h2>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            {/* User Dropdown */}
            <div className="relative hidden sm:block">
              <button
                className="flex items-center gap-3 rounded-lg p-1 pr-2 hover:bg-slate-100 transition-colors"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-slate-700">
                    {user?.name || "User"}
                  </span>
                  <span className="text-xs text-brand-600 font-medium capitalize">
                    {user?.role?.replace("_", " ") || "Role"}
                  </span>
                </div>
                <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm border border-brand-200">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="text-sm font-medium text-slate-800">
                      {user?.name}
                    </p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
