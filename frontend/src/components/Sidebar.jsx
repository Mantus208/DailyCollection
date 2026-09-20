import { useState, useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const NavItem = ({ to, label, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `block px-3 py-2 rounded-lg text-sm ${
        isActive
          ? "bg-blue-600 text-white font-semibold"
          : "text-gray-700 hover:bg-gray-100"
      }`
    }
  >
    {label}
  </NavLink>
);

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const [open, setOpen] = useState(false);

  const storedArea = localStorage.getItem("dc_selected_area");
  const area = storedArea ? JSON.parse(storedArea) : null;
  const areaId = area?._id;
  const isAdmin = user?.role === "admin";
  const close = () => setOpen(false);

  const groups = [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", to: areaId ? `/area/${areaId}` : "/" },
        { label: "Change Area/Franchisee", to: "/" },
      ],
    },
    {
      title: "Field Work",
      items: areaId
        ? [
            { label: "Collection Entry", to: `/area/${areaId}/search` },
            { label: "Consumer Complaint", to: `/area/${areaId}/complaints` },
            { label: "Stock Detail", to: "/stock-detail" },
          ]
        : [{ label: "Pehle Area chunein →", to: "/" }],
    },
    {
      title: "Reports",
      items: [
        ...(areaId
          ? [{ label: "Collection Report", to: `/area/${areaId}/reports` }]
          : []),
        { label: "Stock Report", to: "/stock-report" },
      ],
    },
    ...(isAdmin
      ? [
          {
            title: "Setup",
            items: [
              { label: "Area Add", to: "/area-add" },
              { label: "Franchisee Add", to: "/franchisee-add" },
              { label: "Stock Material Add", to: "/stock-material-add" },
              { label: "Manage Staff", to: "/manage-staff" },
              { label: "Import Data", to: "/import-data" },
              { label: "Activity Log", to: "/activity-log" },
            ],
          },
        ]
      : []),
  ];

  return (
    <>
      <div className="md:hidden flex items-center justify-between bg-white border-b px-4 py-3 sticky top-0 z-20">
        <button onClick={() => setOpen(true)} className="text-gray-700 text-xl">
          ☰
        </button>
        <p className="font-bold text-gray-800">Daily Collection</p>
        <div className="w-6" />
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={close}
        />
      )}

      <div
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r z-40 transform transition-transform overflow-y-auto
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="p-4 border-b">
          <p className="font-bold text-gray-800">Daily Collection App</p>
          <p className="text-xs text-gray-500">
            {user?.name} • {user?.role}
          </p>
          {area && (
            <p className="text-xs text-blue-600 mt-1">Area: {area.name}</p>
          )}
        </div>

        <div className="p-3 space-y-4">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="text-xs font-semibold text-gray-400 uppercase px-3 mb-1">
                {g.title}
              </p>
              <div className="space-y-1">
                {g.items.map((item) => (
                  <NavItem
                    key={item.label}
                    to={item.to}
                    label={item.label}
                    onClick={close}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t mt-2">
          <button
            onClick={logout}
            className="w-full text-sm text-red-600 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
