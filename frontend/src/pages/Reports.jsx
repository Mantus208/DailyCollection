import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";

const TABS = [
  { key: "today", label: "Today's Collection", icon: "₹" },
  { key: "unpaid", label: "Unpaid", icon: "!" },
  { key: "due", label: "Due", icon: "◷" },
  { key: "defaulters", label: "Defaulters", icon: "⚠" },
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
    <div className="min-h-screen bg-[#f7f9fc] px-4 py-6 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Analytics
            </p>

            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
              Collection Reports
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              View collection, pending payments and defaulters.
            </p>
          </div>

          <Link
            to={`/area/${areaId}`}
            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  tab === t.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />

            <p className="text-sm text-slate-500 mt-4">
              Report load ho raha hai...
            </p>
          </div>
        )}

        {/* Today */}
        {!loading && tab === "today" && data && (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 md:p-8 text-white shadow-lg">
              <p className="text-blue-100 text-sm">Today's Collection</p>

              <p className="text-4xl md:text-5xl font-bold mt-2">
                ₹{data.total}
              </p>

              <p className="text-blue-100 text-sm mt-2">
                {data.count} consumers se collection
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Collection Activity
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Today's individual collections
                  </p>
                </div>

                <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full">
                  {data.visits.length} Visits
                </span>
              </div>

              {data.visits.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-400">
                  No collection recorded today.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.visits.map((v) => (
                    <div
                      key={v._id}
                      className="px-5 py-4 flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {v.consumerId?.name}
                        </p>

                        <p className="text-xs text-slate-400 mt-1">
                          Collection entry
                        </p>
                      </div>

                      <p className="font-bold text-green-600">
                        ₹{v.amountCollected}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Unpaid / Due */}
        {!loading &&
          (tab === "unpaid" || tab === "due") &&
          Array.isArray(data) && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    {tab === "unpaid" ? "Unpaid Consumers" : "Due Consumers"}
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Consumers with pending payment
                  </p>
                </div>

                <span className="bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                  {data.length}
                </span>
              </div>

              {data.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto text-xl">
                    ✓
                  </div>

                  <p className="font-semibold text-slate-900 mt-3">All Clear</p>

                  <p className="text-sm text-slate-400 mt-1">
                    No pending consumers found.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.map((b) => (
                    <div key={b._id} className="px-5 py-4 hover:bg-slate-50">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {b.consumerId?.name}
                          </p>

                          <p className="text-xs text-slate-500 mt-1">
                            {b.consumerId?.consumerId}
                          </p>

                          {tab === "due" && b.dueRemark && (
                            <p className="text-xs text-orange-600 mt-1">
                              {b.dueRemark}
                            </p>
                          )}
                        </div>

                        <p className="font-bold text-red-600 whitespace-nowrap">
                          ₹{b.amount}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        {/* Defaulters */}
        {!loading && tab === "defaulters" && Array.isArray(data) && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Defaulters</h2>

              <p className="text-xs text-slate-500 mt-1">
                Consumers requiring attention
              </p>
            </div>

            {data.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto text-xl">
                  ✓
                </div>

                <p className="font-semibold text-slate-900 mt-3">
                  No Defaulters
                </p>

                <p className="text-sm text-slate-400 mt-1">
                  Everything looks good.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.map((d) => (
                  <div
                    key={d.consumer._id}
                    className="px-5 py-4 border-l-4 border-red-400 hover:bg-red-50/30"
                  >
                    <p className="font-semibold text-slate-900">
                      {d.consumer.name}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      {d.consumer.consumerId}
                    </p>

                    <p className="text-xs text-red-600 mt-2">{d.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
