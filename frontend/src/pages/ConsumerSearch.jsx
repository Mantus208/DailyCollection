import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

const statusConfig = {
  paid: {
    label: "Paid",
    className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  due: {
    label: "Due",
    className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
  },
  not_packaged: {
    label: "Not Packaged",
    className: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    dot: "bg-slate-400",
  },
  box_issue: {
    label: "Box Issue",
    className: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    dot: "bg-orange-500",
  },
};

const StatusBadge = ({ bill }) => {
  const config = statusConfig[bill?.status] || {
    label: bill ? "Unpaid" : "Not Set",
    className: bill
      ? "bg-red-50 text-red-700 ring-1 ring-red-200"
      : "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
    dot: bill ? "bg-red-500" : "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${config.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

const ConsumerSearch = () => {
  const { areaId } = useParams();
  const navigate = useNavigate();

  const [area, setArea] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load selected area
  useEffect(() => {
    const stored = localStorage.getItem("dc_selected_area");

    if (stored) {
      try {
        const parsed = JSON.parse(stored);

        if (parsed._id === areaId) {
          setArea(parsed);
          return;
        }
      } catch (error) {
        console.error("Invalid selected area:", error);
      }
    }

    navigate("/");
  }, [areaId, navigate]);

  // Search consumers
  useEffect(() => {
    if (!area) return;

    const timer = setTimeout(() => {
      setLoading(true);

      api
        .get("/consumers/search", {
          params: {
            areaId: area._id,
            q: query,
          },
        })
        .then(({ data }) => setResults(data))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query, area]);

  if (!area) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* ================= HEADER ================= */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <button
              onClick={() => navigate(`/area/${areaId}`)}
              className="hover:text-blue-600 transition"
            >
              Dashboard
            </button>

            <span>/</span>

            <span className="text-slate-700 font-medium">Collection Entry</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Collection Entry
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Search consumer and collect monthly payment
              </p>
            </div>

            {/* AREA */}
            <div className="inline-flex items-center gap-2 self-start sm:self-auto bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Area
                </p>

                <p className="text-sm font-semibold text-slate-800">
                  {area.name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= SEARCH ================= */}
        {/* ================= SEARCH ================= */}
        <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm pt-1 pb-3">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
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
                placeholder="Search by name, Consumer ID, VC No. or mobile..."
                autoFocus
                className="
          w-full
          bg-slate-50
          border border-slate-200
          rounded-xl
          pl-12 pr-12
          py-3.5
          text-sm
          text-slate-800
          placeholder:text-slate-400
          outline-none
          transition
          focus:bg-white
          focus:border-blue-500
          focus:ring-4
          focus:ring-blue-500/10
        "
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 px-1">
              <p className="text-xs text-slate-400">
                Search starts automatically
              </p>

              {query && !loading && (
                <p className="text-xs font-medium text-slate-500">
                  {results.length} result
                  {results.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ================= LOADING ================= */}
        {loading && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="px-4 py-4 border-b border-slate-100 animate-pulse"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 bg-slate-200 rounded-lg" />

                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>

                  <div className="h-6 bg-slate-200 rounded-full w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================= NO RESULT ================= */}
        {!loading && query && results.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 text-slate-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </div>

            <h3 className="font-semibold text-slate-800">No consumer found</h3>

            <p className="text-sm text-slate-500 mt-1">
              Try a different name, Consumer ID or mobile number.
            </p>
          </div>
        )}

        {/* ================= CONSUMER TABLE ================= */}
        {!loading && results.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* TABLE HEADER */}
            <div className="hidden md:grid grid-cols-[minmax(220px,1.5fr)_150px_minmax(200px,1fr)_110px_45px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <div>Consumer</div>
              <div>Consumer ID</div>
              <div>Address</div>
              <div>Status</div>
              <div></div>
            </div>

            {/* ROWS */}
            <div>
              {results.map((c, index) => (
                <button
                  key={c._id}
                  onClick={() =>
                    navigate(`/area/${area._id}/consumer/${c._id}`)
                  }
                  className="
                    w-full
                    text-left
                    border-b border-slate-100
                    last:border-b-0
                    hover:bg-blue-50/40
                    transition
                    group
                  "
                >
                  {/* DESKTOP */}
                  <div className="hidden md:grid grid-cols-[minmax(220px,1.5fr)_150px_minmax(200px,1fr)_110px_45px] gap-4 items-center px-5 py-3.5">
                    {/* CONSUMER */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {c.name?.charAt(0)?.toUpperCase() || "C"}
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">
                          {c.name}
                        </p>

                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {c.vcNo || c.mobile || "Consumer"}
                        </p>
                      </div>
                    </div>

                    {/* CONSUMER ID */}
                    <div className="text-xs font-medium text-slate-600 truncate">
                      {c.consumerId || "—"}
                    </div>

                    {/* ADDRESS */}
                    <div className="text-xs text-slate-500 truncate">
                      {c.address || "—"}
                    </div>

                    {/* STATUS */}
                    <div>
                      <StatusBadge bill={c.currentBill} />
                    </div>

                    {/* ARROW */}
                    <div className="flex justify-end">
                      <div
                        className="
                          w-8 h-8
                          rounded-lg
                          bg-slate-50
                          group-hover:bg-blue-100
                          flex items-center justify-center
                          text-slate-400
                          group-hover:text-blue-600
                          transition
                        "
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* MOBILE ROW */}
                  <div className="md:hidden flex items-center gap-3 px-4 py-3.5">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      {c.name?.charAt(0)?.toUpperCase() || "C"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-slate-800 truncate">
                          {c.name}
                        </p>

                        <StatusBadge bill={c.currentBill} />
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span className="font-medium text-slate-600">
                          {c.consumerId || "—"}
                        </span>

                        {c.address && (
                          <>
                            <span>•</span>
                            <span className="truncate">{c.address}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div
                      className="
                        w-8 h-8
                        shrink-0
                        rounded-lg
                        bg-slate-50
                        group-hover:bg-blue-100
                        flex items-center justify-center
                        text-slate-400
                        group-hover:text-blue-600
                      "
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ================= INITIAL STATE ================= */}
        {!loading && !query && results.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 text-blue-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </div>

            <h3 className="font-semibold text-slate-800">Find a consumer</h3>

            <p className="text-sm text-slate-500 mt-1">
              Search using name, Consumer ID, VC number or mobile number.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsumerSearch;
