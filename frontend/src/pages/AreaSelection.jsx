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
    const savedArea = localStorage.getItem("dc_selected_area");

    // Agar area already selected hai
    if (savedArea) {
      try {
        const area = JSON.parse(savedArea);

        if (area?._id) {
          navigate(`/area/${area._id}`, { replace: true });
          return;
        }
      } catch (err) {
        localStorage.removeItem("dc_selected_area");
      }
    }

    // Area select nahi hai, tabhi areas load karo
    api
      .get("/areas")
      .then(({ data }) => setAreas(data))
      .catch((err) =>
        setError(err.response?.data?.message || "Areas load nahi ho paye"),
      )
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSelectArea = (area) => {
    localStorage.setItem("dc_selected_area", JSON.stringify(area));

    navigate(`/area/${area._id}`);
  };

  const filteredAreas = areas.filter((a) =>
    a.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* HEADER */}
        <div className="max-w-2xl mb-7">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 mb-4">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Select Area
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            Choose an area or franchisee to start your daily collection work.
          </p>
        </div>

        {/* SEARCH */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-6">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search area..."
              className="
                w-full
                bg-slate-50
                border border-slate-200
                rounded-xl
                pl-12 pr-4 py-3.5
                text-sm
                outline-none
                focus:bg-white
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-500/10
              "
            />
          </div>

          <div className="flex justify-between mt-3 px-1">
            <p className="text-xs text-slate-400">
              {areas.length} areas available
            </p>

            <p className="text-xs text-slate-400">
              {filteredAreas.length} shown
            </p>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm mb-5">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse"
              >
                <div className="w-11 h-11 bg-slate-200 rounded-xl mb-4" />
                <div className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {/* EMPTY */}
        {!loading && filteredAreas.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </div>

            <h3 className="font-bold text-slate-800 mt-4">
              {query ? "No area found" : "No areas available"}
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              {query
                ? "Try another search."
                : "Create an area from the admin setup."}
            </p>
          </div>
        )}

        {/* AREAS */}
        {!loading && filteredAreas.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAreas.map((area) => (
              <button
                key={area._id}
                onClick={() => handleSelectArea(area)}
                className="
                  group
                  bg-white
                  border border-slate-200
                  rounded-2xl
                  p-5
                  text-left
                  shadow-sm
                  hover:shadow-md
                  hover:border-blue-300
                  hover:-translate-y-0.5
                  transition-all
                "
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                  </div>

                  <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition">
                    →
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 mt-4">{area.name}</h3>

                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                  {area.description || "Collection area"}
                </p>

                <div className="flex items-center gap-2 mt-4 text-xs font-medium text-blue-600">
                  Open Dashboard
                  <span>→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AreaSelection;
