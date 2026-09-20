import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../api/axios";

const todayStr = () => new Date().toISOString().slice(0, 10);
const isSameMonth = (d) => {
  if (!d) return true;
  const now = new Date();
  const fd = new Date(d);
  return (
    fd.getFullYear() === now.getFullYear() && fd.getMonth() === now.getMonth()
  );
};

const Dashboard = () => {
  const { areaId } = useParams();
  const navigate = useNavigate();
  const [area, setArea] = useState(null);

  const [dueTab, setDueTab] = useState("this");
  const [dueBills, setDueBills] = useState([]);

  const [collectionDate, setCollectionDate] = useState(todayStr());
  const [collectionData, setCollectionData] = useState(null);

  const [complaints, setComplaints] = useState([]);
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem("dc_selected_area");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed._id === areaId) {
        setArea(parsed);
        return;
      }
    }
    navigate("/");
  }, [areaId, navigate]);

  useEffect(() => {
    if (!area) return;
    api
      .get("/reports/status-list", {
        params: { areaId: area._id, status: "due" },
      })
      .then(({ data }) => setDueBills(data));
    api
      .get("/complaints", { params: { areaId: area._id, status: "open" } })
      .then(({ data }) => setComplaints(data));
    api
      .get("/reports/reminders", { params: { areaId: area._id } })
      .then(({ data }) => setReminders(data));
  }, [area]);

  useEffect(() => {
    if (!area) return;
    api
      .get("/reports/today-collection", {
        params: { areaId: area._id, date: collectionDate },
      })
      .then(({ data }) => setCollectionData(data));
  }, [area, collectionDate]);

  if (!area) return null;

  const thisMonthDue = dueBills.filter((b) => isSameMonth(b.followUpDate));
  const nextMonthDue = dueBills.filter((b) => !isSameMonth(b.followUpDate));
  const visibleDue = dueTab === "this" ? thisMonthDue : nextMonthDue;

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <div>
          <p className="text-sm text-gray-500">Area</p>
          <h1 className="text-xl font-bold text-gray-800">{area.name}</h1>
        </div>

        {/* Shortcuts */}
        <div className="grid grid-cols-4 gap-2">
          <Link
            to={`/area/${area._id}/search`}
            className="bg-white rounded-xl shadow-sm p-3 text-center text-xs font-medium text-gray-700 hover:bg-blue-50"
          >
            🔍
            <br />
            Collection
          </Link>
          <Link
            to={`/area/${area._id}/reports`}
            className="bg-white rounded-xl shadow-sm p-3 text-center text-xs font-medium text-gray-700 hover:bg-blue-50"
          >
            📊
            <br />
            Reports
          </Link>
          <Link
            to={`/area/${area._id}/complaints`}
            className="bg-white rounded-xl shadow-sm p-3 text-center text-xs font-medium text-gray-700 hover:bg-blue-50"
          >
            📢
            <br />
            Complaints
          </Link>
          <Link
            to="/import-data"
            className="bg-white rounded-xl shadow-sm p-3 text-center text-xs font-medium text-gray-700 hover:bg-blue-50"
          >
            📥
            <br />
            Import
          </Link>
        </div>

        {/* Collection card */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-gray-800">Collection</p>
            <input
              type="date"
              value={collectionDate}
              max={todayStr()}
              onChange={(e) => setCollectionDate(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1"
            />
          </div>
          {collectionData ? (
            <>
              <p className="text-3xl font-bold text-green-700">
                ₹{collectionData.total}
              </p>
              <p className="text-xs text-gray-500">
                {collectionData.count} consumers se collection
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Load ho raha hai...</p>
          )}
        </div>

        {/* Due card */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="font-semibold text-gray-800 mb-2">Due Consumers</p>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setDueTab("this")}
              className={`text-xs font-medium px-3 py-1.5 rounded-full ${dueTab === "this" ? "bg-yellow-500 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              Is Mahine ({thisMonthDue.length})
            </button>
            <button
              onClick={() => setDueTab("next")}
              className={`text-xs font-medium px-3 py-1.5 rounded-full ${dueTab === "next" ? "bg-yellow-500 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              Agle Mahine ({nextMonthDue.length})
            </button>
          </div>
          {visibleDue.length === 0 ? (
            <p className="text-sm text-gray-400">Koi due consumer nahi</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {visibleDue.map((b) => (
                <Link
                  key={b._id}
                  to={`/area/${area._id}/consumer/${b.consumerId?._id}`}
                  className="block text-sm border-b pb-1.5"
                >
                  <span className="font-medium text-gray-800">
                    {b.consumerId?.name}
                  </span>
                  <span className="text-gray-500">
                    {" "}
                    — ₹{b.amount - (b.amountPaid || 0)} baaki
                  </span>
                  {b.dueRemark && (
                    <p className="text-xs text-gray-400">{b.dueRemark}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Reminders */}
        {reminders.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <p className="font-semibold text-red-700 mb-2">
              ⏰ Aaj ke Reminders
            </p>
            <div className="space-y-2">
              {reminders.map((r) => (
                <Link
                  key={r._id}
                  to={`/area/${area._id}/consumer/${r.consumerId?._id}`}
                  className="block text-sm"
                >
                  <span className="font-medium text-gray-800">
                    {r.consumerId?.name}
                  </span>
                  <span className="text-gray-500"> — {r.dueRemark}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Complaints */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-orange-700">Open Complaints</p>
            <span className="text-2xl font-bold text-orange-700">
              {complaints.length}
            </span>
          </div>
          <Link
            to={`/area/${area._id}/complaints`}
            className="text-xs text-orange-700 hover:underline"
          >
            Sab dekhein →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
