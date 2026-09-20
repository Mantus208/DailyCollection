import { useState, useEffect } from "react";
import api from "../api/axios";

const StockDetail = () => {
  const [items, setItems] = useState([]);
  const [restockFor, setRestockFor] = useState(null);
  const [qty, setQty] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => api.get("/stock/items").then(({ data }) => setItems(data));

  useEffect(() => {
    load();
  }, []);

  const handleRestock = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      await api.post("/stock/purchase", {
        stockItemId: restockFor._id,
        qty,
        totalCost,
      });
      setRestockFor(null);
      setQty("");
      setTotalCost("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Restock nahi hua");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-bold text-gray-800">Stock Detail</h1>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-2">
          {items.map((it) => (
            <div
              key={it._id}
              className="bg-white rounded-xl shadow-sm p-4 space-y-2"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-800">{it.name}</p>
                  <p className="text-xs text-gray-500">
                    Stock: {it.currentStock} • Last cost/unit: ₹
                    {it.lastCostPerUnit?.toFixed(2) || 0}
                  </p>
                </div>
                <button
                  onClick={() => setRestockFor(it)}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg"
                >
                  Restock
                </button>
              </div>

              {restockFor?._id === it._id && (
                <div className="border-t pt-2 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="Quantity"
                      className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      value={totalCost}
                      onChange={(e) => setTotalCost(e.target.value)}
                      placeholder="Total Cost ₹"
                      className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRestock}
                      disabled={isSubmitting}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-1.5 rounded-lg"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setRestockFor(null)}
                      className="px-3 text-sm text-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-gray-400 text-center bg-white rounded-xl p-4">
              Koi item nahi hai — pehle "Stock Material Add" se item banayein
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockDetail;
