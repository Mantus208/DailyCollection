import { useState, useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

import {
  LayoutDashboard,
  ReceiptIndianRupee,
  MessageSquareWarning,
  Package,
  FileText,
  Upload,
  UsersRound,
  Building2,
  Boxes,
  Activity,
  ChevronDown,
  LogOut,
  X,
  MapPinned,
} from "lucide-react";

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);

  const storedArea = localStorage.getItem("dc_selected_area");
  const area = storedArea ? JSON.parse(storedArea) : null;

  const areaId = area?._id;
  const isAdmin = user?.role === "admin";

  const close = () => setOpen(false);
  const handleChangeArea = () => {
    localStorage.removeItem("dc_selected_area");
    close();
    navigate("/", { replace: true });
  };
  const groups = [
    {
      title: "MAIN",
      items: [
        {
          label: "Dashboard",
          icon: LayoutDashboard,
          to: areaId ? `/area/${areaId}` : "/",
        },
        {
          label: "Change Area",
          icon: MapPinned,
          action: handleChangeArea,
        },
      ],
    },

    {
      title: "OPERATIONS",
      items: areaId
        ? [
            {
              label: "Collection Entry",
              icon: ReceiptIndianRupee,
              to: `/area/${areaId}/search`,
            },
            {
              label: "Complaints",
              icon: MessageSquareWarning,
              to: `/area/${areaId}/complaints`,
            },
            {
              label: "Stock Detail",
              icon: Package,
              to: "/stock-detail",
            },
          ]
        : [],
    },

    {
      title: "REPORTS",
      items: [
        ...(areaId
          ? [
              {
                label: "Collection Report",
                icon: FileText,
                to: `/area/${areaId}/reports`,
              },
            ]
          : []),

        {
          label: "Stock Report",
          icon: Boxes,
          to: "/stock-report",
        },
      ],
    },

    ...(isAdmin
      ? [
          {
            title: "ADMINISTRATION",
            items: [
              {
                label: "Area Add",
                icon: MapPinned,
                to: "/area-add",
              },
              {
                label: "Franchisee Add",
                icon: Building2,
                to: "/franchisee-add",
              },
              {
                label: "Package Pricing",
                icon: ReceiptIndianRupee,
                to: "/package-pricing",
              },
              {
                label: "Stock Material",
                icon: Package,
                to: "/stock-material-add",
              },
              {
                label: "Manage Staff",
                icon: UsersRound,
                to: "/manage-staff",
              },
              {
                label: "Import Data",
                icon: Upload,
                to: "/import-data",
              },
              {
                label: "Activity Log",
                icon: Activity,
                to: "/activity-log",
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <>
      {/* MOBILE TOP BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-30 flex items-center justify-between px-4">
        <button
          onClick={() => setOpen(true)}
          className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center"
        >
          <LayoutDashboard size={21} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <ReceiptIndianRupee size={19} />
          </div>

          <span className="font-bold text-slate-900">Daily Collection</span>
        </div>

        <div className="w-10" />
      </div>

      {/* OVERLAY */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-40 md:hidden"
          onClick={close}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed md:sticky
          top-0 left-0
          h-screen
          w-[270px]
          bg-white
          border-r border-slate-200
          z-50
          flex flex-col
          transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* BRAND */}
        <div className="h-[76px] px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
              <ReceiptIndianRupee size={21} />
            </div>

            <div>
              <h1 className="font-bold text-slate-900 text-sm">
                Daily Collection
              </h1>

              <p className="text-[11px] text-slate-400">Management System</p>
            </div>
          </div>

          <button
            onClick={close}
            className="md:hidden text-slate-400 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* USER / AREA */}
        <div className="px-4 pt-4">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {user?.name || "User"}
                </p>

                <p className="text-xs text-slate-500 capitalize">
                  {user?.role || "Staff"}
                </p>
              </div>
            </div>

            {area && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPinned size={14} />

                  <span className="truncate">{area.name}</span>

                  <ChevronDown size={13} className="ml-auto" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-2 text-[10px] font-bold tracking-widest text-slate-400">
                {group.title}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  // Change Area
                  if (item.action) {
                    return (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="
          group w-full flex items-center gap-3
          px-3 py-2.5
          rounded-xl
          text-sm
          text-slate-600
          hover:bg-slate-100
          hover:text-slate-900
          transition-all
          text-left
        "
                      >
                        <Icon
                          size={18}
                          className="text-slate-400 group-hover:text-slate-700"
                        />

                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  }

                  // Normal navigation
                  return (
                    <NavLink
                      key={item.label}
                      to={item.to}
                      onClick={close}
                      className={({ isActive }) =>
                        `
        group flex items-center gap-3
        px-3 py-2.5
        rounded-xl
        text-sm
        transition-all
        ${
          isActive
            ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }
        `
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            size={18}
                            className={
                              isActive
                                ? "text-white"
                                : "text-slate-400 group-hover:text-slate-700"
                            }
                          />

                          <span className="font-medium">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* LOGOUT */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
