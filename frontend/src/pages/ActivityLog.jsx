import { useState, useEffect } from "react";
import api from "../api/axios";

const formatDateTime = (d) =>
  new Date(d).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const getInitial = (name) => name?.charAt(0)?.toUpperCase() || "?";

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/activity-log", { params: { limit: 200 } })
      .then(({ data }) => setLogs(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f9fc] px-4 py-6 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Administration
            </p>

            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
              Activity Log
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Track recent actions performed in the system.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400">Total Activities</p>

            <p className="text-xl font-bold text-slate-900">{logs.length}</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Recent Activity</h2>

            <p className="text-xs text-slate-500 mt-1">Latest system actions</p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />

              <p className="text-sm text-slate-500 mt-4">
                Activity load ho rahi hai...
              </p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                ◷
              </div>

              <p className="font-semibold text-slate-900 mt-3">
                No activity found
              </p>

              <p className="text-sm text-slate-400 mt-1">
                System activity will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <div
                  key={log._id}
                  className="px-5 py-4 hover:bg-slate-50 transition"
                >
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      {getInitial(log.userName)}
                    </div>

                    {/* Activity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <p className="text-sm text-slate-800">
                          <span className="font-bold">{log.userName}</span>{" "}
                          <span className="text-slate-600">{log.action}</span>
                        </p>

                        <p className="text-xs text-slate-400 whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </p>
                      </div>

                      {log.details && (
                        <div className="mt-2 bg-slate-50 rounded-xl px-3 py-2">
                          <p className="text-xs text-slate-500">
                            {log.details}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;
