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
    setError("");
    setMessage("");
    setIsSaving(true);
    try {
      const { data } = await api.put(`/users/${selectedUserId}/areas`, {
        areaIds: checkedAreaIds,
      });
      setUsers((prev) => prev.map((u) => (u._id === data._id ? data : u)));
      setMessage("Areas update ho gaye!");
    } catch (err) {
      setError(err.response?.data?.message || "Save nahi ho paya");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedUser = users.find((u) => u._id === selectedUserId);

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">Manage Staff</h1>
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            ← Wapas
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Load ho raha hai...</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Staff Chunein
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => handleSelectUser(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Staff chunein --</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.username}) — {u.role}
                  </option>
                ))}
              </select>
            </div>

            {selectedUser && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Areas assign karein ({selectedUser.name})
                  </p>
                  <div className="space-y-2 max-h-72 overflow-y-auto border rounded-lg p-3">
                    {areas.map((area) => (
                      <label
                        key={area._id}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={checkedAreaIds.includes(area._id)}
                          onChange={() => toggleArea(area._id)}
                          className="h-4 w-4"
                        />
                        {area.name}
                      </label>
                    ))}
                  </div>
                </div>

                {message && (
                  <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    {message}
                  </p>
                )}
                {error && (
                  <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg transition"
                >
                  {isSaving ? "Save ho raha hai..." : "Save Karein"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageStaff;
