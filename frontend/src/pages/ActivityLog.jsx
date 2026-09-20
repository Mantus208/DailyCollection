import { useState, useEffect } from "react";
import api from "../api/axios";

const formatDateTime = (d) => new Date(d).toLocaleString("en-IN");

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api
      .get("/activity-log", { params: { limit: 200 } })
      .then(({ data }) => setLogs(data));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-md mx-auto space-y-3">
        <h1 className="text-xl font-bold text-gray-800">Activity Log</h1>
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log._id} className="bg-white rounded-lg p-3 text-sm">
              <p className="text-gray-800">
                <span className="font-medium">{log.userName}</span> —{" "}
                {log.action}
              </p>
              {log.details && (
                <p className="text-xs text-gray-500">{log.details}</p>
              )}
              <p className="text-xs text-gray-400">
                {formatDateTime(log.createdAt)}
              </p>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-sm text-gray-400 text-center bg-white rounded-xl p-4">
              Koi activity nahi mili
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;
