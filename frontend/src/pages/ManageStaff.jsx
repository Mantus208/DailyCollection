import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const ManageStaff = () => {
  const [users, setUsers] = useState([]);
  const [areas, setAreas] = useState([]);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [checkedAreaIds, setCheckedAreaIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
      const [usersRes, areasRes] = await Promise.all([
        api.get("/users"),
        api.get("/areas"),
      ]);

      setUsers(usersRes.data);
      setAreas(areasRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Data load nahi ho paya");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectUser = (userId) => {
    setSelectedUserId(userId);
    setMessage("");
    setError("");

    const user = users.find((u) => u._id === userId);

    setCheckedAreaIds(user ? user.assignedAreas.map((a) => a._id) : []);
  };

  const toggleArea = (areaId) => {
    setCheckedAreaIds((prev) =>
      prev.includes(areaId)
        ? prev.filter((id) => id !== areaId)
        : [...prev, areaId],
    );
  };

  const handleSave = async () => {
    if (!selectedUserId) return;

    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const { data } = await api.put(`/users/${selectedUserId}/areas`, {
        areaIds: checkedAreaIds,
      });

      setUsers((prev) => prev.map((u) => (u._id === data._id ? data : u)));

      setMessage("Staff areas updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Save nahi ho paya");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedUser = users.find((u) => u._id === selectedUserId);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <Link to="/" className="hover:text-blue-600">
                Dashboard
              </Link>

              <span>/</span>

              <span className="text-slate-700 font-medium">Manage Staff</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Manage Staff
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Assign collection areas to staff members.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              Staff
            </p>

            <p className="text-lg font-bold text-slate-900">{users.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/4 mb-3" />
            <div className="h-11 bg-slate-200 rounded-xl mb-6" />

            <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="h-16 bg-slate-200 rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-5">
            {/* USER SELECT */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 h-fit">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0 1 16 0" />
                  </svg>
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">Select Staff</h2>

                  <p className="text-xs text-slate-500">
                    Choose a staff member
                  </p>
                </div>
              </div>

              <select
                value={selectedUserId}
                onChange={(e) => handleSelectUser(e.target.value)}
                className="
                  w-full
                  bg-slate-50
                  border border-slate-200
                  rounded-xl
                  px-3 py-3
                  text-sm
                  text-slate-700
                  outline-none
                  focus:bg-white
                  focus:border-blue-500
                  focus:ring-4
                  focus:ring-blue-500/10
                "
              >
                <option value="">-- Select staff --</option>

                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.username}) — {u.role}
                  </option>
                ))}
              </select>

              {selectedUser && (
                <div className="mt-5 bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
                    Selected Staff
                  </p>

                  <p className="font-bold text-slate-900 mt-1">
                    {selectedUser.name}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    @{selectedUser.username}
                  </p>
                </div>
              )}
            </div>

            {/* AREA ASSIGNMENT */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-slate-900">Assign Areas</h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Select areas this staff member can access.
                  </p>
                </div>

                {selectedUser && (
                  <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                    {checkedAreaIds.length} selected
                  </span>
                )}
              </div>

              {!selectedUser ? (
                <div className="border border-dashed border-slate-300 rounded-2xl p-12 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <svg
                      className="w-7 h-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21a8 8 0 0 1 16 0" />
                    </svg>
                  </div>

                  <p className="font-semibold text-slate-700 mt-4">
                    Select a staff member
                  </p>

                  <p className="text-sm text-slate-400 mt-1">
                    Assigned areas will appear here.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                    {areas.map((area) => {
                      const checked = checkedAreaIds.includes(area._id);

                      return (
                        <label
                          key={area._id}
                          className={`
                            cursor-pointer
                            border
                            rounded-xl
                            p-4
                            flex items-center gap-3
                            transition
                            ${
                              checked
                                ? "border-blue-300 bg-blue-50"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }
                          `}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleArea(area._id)}
                            className="sr-only"
                          />

                          <div
                            className={`
                              w-5 h-5 shrink-0 rounded-md
                              border flex items-center justify-center
                              ${
                                checked
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-slate-300"
                              }
                            `}
                          >
                            {checked && (
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                viewBox="0 0 24 24"
                              >
                                <path d="m5 12 4 4L19 6" />
                              </svg>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-800 truncate">
                              {area.name}
                            </p>

                            <p className="text-xs text-slate-400 truncate">
                              {area.description || "Collection area"}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {message && (
                    <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
                      ✓ {message}
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="
                      w-full
                      mt-4
                      bg-blue-600
                      hover:bg-blue-700
                      disabled:bg-blue-300
                      text-white
                      font-semibold
                      py-3
                      rounded-xl
                      transition
                      shadow-sm
                    "
                  >
                    {isSaving ? "Saving changes..." : "Save Area Assignment"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageStaff;
