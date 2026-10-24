import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";

const todayStr = () => new Date().toISOString().slice(0, 10);
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const PaymentHistory = () => {
  const { areaId } = useParams();
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get("/reports/payment-history", { params: { areaId, from, to } })
      .then(({ data }) => setData(data))
      .catch(() => setData({ total: 0, count: 0, visits: [] }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [areaId]);

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Payment History</h1>
          <Link
            to={`/area/${areaId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Wapas
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
          <button
            onClick={load}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            Filter
          </button>
        </div>

        {loading && (
          <p className="text-sm text-gray-400 text-center">
            Load ho raha hai...
          </p>
        )}

        {data && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700">
                {inr(data.total)}
              </p>
              <p className="text-xs text-gray-500">{data.count} payments</p>
            </div>

            <div className="space-y-2">
              {data.visits.map((v) => (
                <div
                  key={v._id}
                  className="bg-white rounded-lg p-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {v.consumerId?.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {v.consumerId?.consumerId} •{" "}
                      {new Date(v.createdAt).toLocaleString("en-IN")} •{" "}
                      {v.visitedBy?.name || "?"}
                    </p>
                  </div>
                  <p className="font-bold text-green-700">
                    {inr(v.amountCollected)}
                  </p>
                </div>
              ))}
              {data.visits.length === 0 && (
                <p className="text-sm text-gray-400 text-center bg-white rounded-xl p-4">
                  Is range me koi payment nahi
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
