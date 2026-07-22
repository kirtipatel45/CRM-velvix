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
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";

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
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, clearNotifications, markAsRead, markAllAsRead } = useNotification();
  const unreadCount = notifications.filter(n => !n.read).length;
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                className="relative p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <>
                  <div 
                    className="fixed inset-0 bg-black/20 z-40" 
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 bg-white">
                      <h3 className="font-bold text-lg text-slate-800">Notifications</h3>
                      <button 
                        onClick={() => setShowNotifications(false)} 
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                      {unreadCount > 0 ? (
                        <button onClick={markAllAsRead} className="text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors">
                          Mark all read
                        </button>
                      ) : <div />}
                      {notifications.length > 0 && (
                        <button onClick={clearNotifications} className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors">
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-slate-500">
                        No new notifications
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {notifications.map((notif) => (
                          <div 
                            key={notif._id} 
                            onClick={() => {
                              if (!notif.read) markAsRead(notif._id);
                            }}
                            className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.read ? 'bg-brand-50/30' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className={`text-sm font-semibold ${notif.type === 'error' ? 'text-red-600' : notif.type === 'success' ? 'text-brand-600' : 'text-slate-700'}`}>
                                  {notif.title}
                                </p>
                                <p className="text-sm text-slate-600 mt-0.5">
                                  {notif.message}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {!notif.read && (
                                <div className="mt-1 h-2 w-2 rounded-full bg-brand-500 shrink-0"></div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                </>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            {/* User Dropdown */}
            <div className="relative hidden sm:block">
              <button
                className="flex items-center gap-3 rounded-lg p-1 pr-2 hover:bg-slate-100 transition-colors"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
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
