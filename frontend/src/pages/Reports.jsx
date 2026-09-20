import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";

const TABS = [
  { key: "today", label: "Aaj ka Collection" },
  { key: "unpaid", label: "Unpaid" },
  { key: "due", label: "Due (Agle Mahine)" },
  { key: "defaulters", label: "Defaulters" },
];

const Reports = () => {
  const { areaId } = useParams();
  const [tab, setTab] = useState("today");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    setLoading(true);
    setData(null);
    const load = async () => {
      try {
        if (tab === "today") {
          const { data } = await api.get("/reports/today-collection", {
            params: { areaId },
          });
          setData(data);
        } else if (tab === "unpaid" || tab === "due") {
          const { data } = await api.get("/reports/status-list", {
            params: { areaId, status: tab },
          });
          setData(data);
        } else if (tab === "defaulters") {
          const { data } = await api.get("/reports/defaulters", {
            params: { areaId },
          });
          setData(data);
        }
      } catch (err) {
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tab, areaId]);

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Reports</h1>
          <Link
            to={`/area/${areaId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Wapas
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                tab === t.key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border border-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <p className="text-sm text-gray-400 text-center">
            Load ho raha hai...
          </p>
        )}

        {!loading && tab === "today" && data && (
          <div className="space-y-2">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700">₹{data.total}</p>
              <p className="text-xs text-gray-500">
                {data.count} consumers se aaj collection
              </p>
            </div>
            {data.visits.map((v) => (
              <div
                key={v._id}
                className="bg-white rounded-lg p-3 text-sm flex justify-between"
              >
                <span>{v.consumerId?.name}</span>
                <span className="font-medium">₹{v.amountCollected}</span>
              </div>
            ))}
          </div>
        )}

        {!loading &&
          (tab === "unpaid" || tab === "due") &&
          Array.isArray(data) && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">{data.length} consumers</p>
              {data.map((b) => (
                <div key={b._id} className="bg-white rounded-lg p-3">
                  <p className="font-medium text-gray-800">
                    {b.consumerId?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {b.consumerId?.consumerId} • ₹{b.amount}
                    {tab === "due" ? ` • ${b.dueRemark}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}

        {!loading && tab === "defaulters" && Array.isArray(data) && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">{data.length} consumers</p>
            {data.map((d) => (
              <div
                key={d.consumer._id}
                className="bg-white rounded-lg p-3 border-l-4 border-red-400"
              >
                <p className="font-medium text-gray-800">{d.consumer.name}</p>
                <p className="text-xs text-gray-500">{d.consumer.consumerId}</p>
                <p className="text-xs text-red-600">{d.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
