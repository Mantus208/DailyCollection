import { useState, useEffect } from "react";
import api from "../api/axios";

const StockReport = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/stock/report").then(({ data }) => setData(data));
  }, []);

  if (!data)
    return (
      <div className="min-h-screen bg-gray-100 p-6 text-center text-gray-500">
        Load ho raha hai...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-bold text-gray-800">Stock Report</h1>

        <div className="bg-white rounded-2xl shadow-md p-5 text-center">
          <p className="text-2xl font-bold text-gray-800">
            ₹{data.totalPurchaseCost}
          </p>
          <p className="text-xs text-gray-500">
            Total stock purchase cost (recent 50 entries)
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">
            Current Stock
          </p>
          {data.items.map((it) => (
            <div
              key={it._id}
              className="bg-white rounded-lg p-3 text-sm flex justify-between"
            >
              <span className="font-medium text-gray-800">{it.name}</span>
              <span className="text-gray-500">{it.currentStock} units</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">
            Recent Purchases
          </p>
          {data.purchases.map((p) => (
            <div
              key={p._id}
              className="bg-white rounded-lg p-3 text-sm flex justify-between"
            >
              <span>
                {p.stockItemId?.name} x{p.qty}
              </span>
              <span className="font-medium">₹{p.totalCost}</span>
            </div>
          ))}
          {data.purchases.length === 0 && (
            <p className="text-sm text-gray-400">Koi purchase nahi</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockReport;
