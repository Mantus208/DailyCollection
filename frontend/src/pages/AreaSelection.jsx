import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const AreaSelection = () => {
  const navigate = useNavigate();
  const [areas, setAreas] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/areas")
      .then(({ data }) => setAreas(data))
      .catch((err) =>
        setError(err.response?.data?.message || "Areas load nahi ho paye"),
      )
      .finally(() => setLoading(false));
  }, []);

  const handleSelectArea = (area) => {
    localStorage.setItem("dc_selected_area", JSON.stringify(area));
    navigate(`/area/${area._id}`);
  };

  const filteredAreas = areas.filter((a) =>
    a.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-1">
          Change Area/Franchisee
        </h1>
        <p className="text-sm text-gray-500 mb-3">
          Kaam karne ke liye ek area chunein
        </p>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Area dhoondein..."
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Load ho raha hai...</p>
        ) : filteredAreas.length === 0 ? (
          <p className="text-gray-500 text-sm bg-white rounded-xl p-4 text-center">
            {query
              ? "Koi area nahi mila"
              : "Abhi koi area nahi bana hai — sidebar se 'Area Add' pe jayein"}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredAreas.map((area) => (
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
      </div>
    </div>
  );
};

export default AreaSelection;
