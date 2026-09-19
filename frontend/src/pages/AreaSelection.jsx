import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";

const AreaSelection = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Admin-only "add new area" form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaDesc, setNewAreaDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAreas = async () => {
    try {
      const { data } = await api.get("/areas");
      setAreas(data);
    } catch (err) {
      setError(err.response?.data?.message || "Areas load nahi ho paye");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const handleSelectArea = (area) => {
    localStorage.setItem("dc_selected_area", JSON.stringify(area));
    navigate(`/area/${area._id}`);
  };

  const handleAddArea = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await api.post("/areas", { name: newAreaName, description: newAreaDesc });
      setNewAreaName("");
      setNewAreaDesc("");
      setShowAddForm(false);
      fetchAreas();
    } catch (err) {
      setError(err.response?.data?.message || "Area add nahi ho paya");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">Welcome</p>
            <h1 className="text-xl font-bold text-gray-800">{user?.name}</h1>
            {user?.role === "admin" && (
              <div className="flex gap-3">
                <Link
                  to="/manage-staff"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Manage Staff →
                </Link>
                <Link
                  to="/import-data"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Import Data →
                </Link>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className="text-sm text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 h-fit"
          >
            Logout
          </button>
        </div>

        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          Area Chunein
        </h2>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Load ho raha hai...</p>
        ) : areas.length === 0 ? (
          <p className="text-gray-500 text-sm bg-white rounded-xl p-4 text-center">
            {user?.role === "admin"
              ? "Abhi koi area nahi bana hai — niche se add karein."
              : "Aapko abhi koi area assign nahi hua hai. Admin se baat karein."}
          </p>
        ) : (
          <div className="space-y-2">
            {areas.map((area) => (
              <button
                key={area._id}
                onClick={() => handleSelectArea(area)}
                className="w-full bg-white rounded-xl shadow-sm p-4 text-left hover:shadow-md hover:bg-blue-50 transition"
              >
                <p className="font-semibold text-gray-800">{area.name}</p>
                {area.description && (
                  <p className="text-sm text-gray-500">{area.description}</p>
                )}
              </button>
            ))}
          </div>
        )}

        {user?.role === "admin" && (
          <div className="mt-6">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full border-2 border-dashed border-gray-300 text-gray-500 rounded-xl py-3 hover:border-blue-400 hover:text-blue-600 transition"
              >
                + Naya Area Add Karein
              </button>
            ) : (
              <form
                onSubmit={handleAddArea}
                className="bg-white rounded-xl shadow-sm p-4 space-y-3"
              >
                <input
                  type="text"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  required
                  placeholder="Area ka naam (e.g. Ramapalli)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newAreaDesc}
                  onChange={(e) => setNewAreaDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold py-2 rounded-lg"
                  >
                    {isSubmitting ? "Add ho raha hai..." : "Add Karein"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 text-sm text-gray-500 border border-gray-300 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AreaSelection;
