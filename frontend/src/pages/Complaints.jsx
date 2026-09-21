import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";

const Complaints = () => {
  const { areaId } = useParams();

  const [statusFilter, setStatusFilter] = useState("open");
  const [complaints, setComplaints] = useState([]);
  const [resolveNotes, setResolveNotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  const load = () => {
    setLoading(true);

    api
      .get("/complaints", {
        params: {
          areaId,
          status: statusFilter,
        },
      })
      .then(({ data }) => setComplaints(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [areaId, statusFilter]);

  const handleResolve = async (id) => {
    try {
      setResolvingId(id);

      await api.put(`/complaints/${id}/resolve`, {
        resolutionNote: resolveNotes[id] || "",
      });

      load();
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <Link to={`/area/${areaId}`} className="hover:text-blue-600">
                Dashboard
              </Link>

              <span>/</span>

              <span className="text-slate-700 font-medium">Complaints</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Consumer Complaints
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Track and resolve consumer complaints.
            </p>
          </div>

          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setStatusFilter("open")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                statusFilter === "open"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Open
            </button>

            <button
              onClick={() => setStatusFilter("resolved")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                statusFilter === "resolved"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Resolved
            </button>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-500">
              {statusFilter === "open"
                ? "Open Complaints"
                : "Resolved Complaints"}
            </p>

            <p className="text-3xl font-bold text-slate-900 mt-1">
              {complaints.length}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-500">Status</p>

            <p className="text-sm font-bold text-slate-800 mt-2">
              {statusFilter === "open" ? "Needs Attention" : "Completed"}
            </p>
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse"
              >
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-slate-200 rounded w-2/3 mb-5" />
                <div className="h-10 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* EMPTY */}
        {!loading && complaints.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
              ✓
            </div>

            <h3 className="font-bold text-slate-800 mt-4">
              No complaints found
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              There are no {statusFilter} complaints for this area.
            </p>
          </div>
        )}

        {/* LIST */}
        {!loading && complaints.length > 0 && (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div
                key={c._id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="w-11 h-11 shrink-0 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                      {c.consumerId?.name?.charAt(0)?.toUpperCase() || "C"}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900">
                        {c.consumerId?.name}
                      </h3>

                      <p className="text-xs text-slate-500 mt-1">
                        {c.consumerId?.consumerId}
                        {c.consumerId?.address
                          ? ` • ${c.consumerId.address}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`self-start px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      statusFilter === "open"
                        ? "bg-orange-50 text-orange-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {statusFilter === "open" ? "Open" : "Resolved"}
                  </span>
                </div>

                <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Complaint
                  </p>

                  <p className="text-sm text-slate-700 leading-relaxed">
                    {c.complaintText}
                  </p>
                </div>

                {statusFilter === "open" ? (
                  <div className="mt-4">
                    <input
                      type="text"
                      value={resolveNotes[c._id] || ""}
                      onChange={(e) =>
                        setResolveNotes((prev) => ({
                          ...prev,
                          [c._id]: e.target.value,
                        }))
                      }
                      placeholder="Add resolution note (optional)"
                      className="
                        w-full
                        bg-white
                        border border-slate-200
                        rounded-xl
                        px-4 py-3
                        text-sm
                        outline-none
                        focus:border-blue-500
                        focus:ring-4
                        focus:ring-blue-500/10
                      "
                    />

                    <button
                      onClick={() => handleResolve(c._id)}
                      disabled={resolvingId === c._id}
                      className="
                        w-full
                        mt-2
                        bg-emerald-600
                        hover:bg-emerald-700
                        disabled:bg-emerald-300
                        text-white
                        font-semibold
                        py-3
                        rounded-xl
                        text-sm
                        transition
                      "
                    >
                      {resolvingId === c._id
                        ? "Resolving..."
                        : "Mark as Resolved"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-emerald-700">
                      Resolution Note
                    </p>

                    <p className="text-sm text-emerald-800 mt-1">
                      {c.resolutionNote || "No note added"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Complaints;
