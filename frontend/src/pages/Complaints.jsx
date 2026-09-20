import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";

const Complaints = () => {
  const { areaId } = useParams();
  const [statusFilter, setStatusFilter] = useState("open");
  const [complaints, setComplaints] = useState([]);
  const [resolveNotes, setResolveNotes] = useState({});
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get("/complaints", { params: { areaId, status: statusFilter } })
      .then(({ data }) => setComplaints(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [areaId, statusFilter]);

  const handleResolve = async (id) => {
    try {
      await api.put(`/complaints/${id}/resolve`, {
        resolutionNote: resolveNotes[id] || "",
      });
      load();
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-bold text-gray-800">Consumer Complaints</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter("open")}
            className={`text-xs font-medium px-3 py-1.5 rounded-full ${statusFilter === "open" ? "bg-orange-600 text-white" : "bg-white text-gray-600 border"}`}
          >
            Open
          </button>
          <button
            onClick={() => setStatusFilter("resolved")}
            className={`text-xs font-medium px-3 py-1.5 rounded-full ${statusFilter === "resolved" ? "bg-green-600 text-white" : "bg-white text-gray-600 border"}`}
          >
            Resolved
          </button>
        </div>

        {loading && (
          <p className="text-sm text-gray-400 text-center">
            Load ho raha hai...
          </p>
        )}

        <div className="space-y-2">
          {complaints.map((c) => (
            <div
              key={c._id}
              className="bg-white rounded-xl shadow-sm p-4 space-y-2"
            >
              <p className="font-semibold text-gray-800">
                {c.consumerId?.name}
              </p>
              <p className="text-xs text-gray-500">
                {c.consumerId?.consumerId} • {c.consumerId?.address}
              </p>
              <p className="text-sm text-gray-700">{c.complaintText}</p>
              {statusFilter === "open" ? (
                <>
                  <input
                    type="text"
                    value={resolveNotes[c._id] || ""}
                    onChange={(e) =>
                      setResolveNotes((prev) => ({
                        ...prev,
                        [c._id]: e.target.value,
                      }))
                    }
                    placeholder="Resolve note (optional)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => handleResolve(c._id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-1.5 rounded-lg"
                  >
                    Resolved Mark Karein
                  </button>
                </>
              ) : (
                <p className="text-xs text-green-700">
                  Resolved: {c.resolutionNote || "-"}
                </p>
              )}
            </div>
          ))}
          {!loading && complaints.length === 0 && (
            <p className="text-sm text-gray-400 text-center bg-white rounded-xl p-4">
              Koi complaint nahi
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Complaints;
