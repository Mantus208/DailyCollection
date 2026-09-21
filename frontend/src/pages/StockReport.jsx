import { useState, useEffect } from "react";
import api from "../api/axios";

const StockReport = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/stock/report").then(({ data }) => setData(data));
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 mt-4">
            Stock report load ho raha hai...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] px-4 py-6 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Inventory
          </p>

          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
            Stock Report
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Inventory overview and recent purchase history.
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-5 shadow-md">
            <p className="text-blue-100 text-sm">Total Purchase Cost</p>

            <p className="text-3xl font-bold mt-2">₹{data.totalPurchaseCost}</p>

            <p className="text-xs text-blue-100 mt-1">
              Recent 50 purchase entries
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-sm text-slate-500">Stock Items</p>

            <p className="text-3xl font-bold text-slate-900 mt-2">
              {data.items.length}
            </p>

            <p className="text-xs text-slate-400 mt-1">
              Active inventory items
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-sm text-slate-500">Recent Purchases</p>

            <p className="text-3xl font-bold text-slate-900 mt-2">
              {data.purchases.length}
            </p>

            <p className="text-xs text-slate-400 mt-1">Purchase records</p>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Current Stock */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Current Stock</h2>

              <p className="text-xs text-slate-500 mt-1">
                Current inventory levels
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {data.items.map((it) => (
                <div
                  key={it._id}
                  className="px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      📦
                    </div>

                    <div>
                      <p className="font-medium text-slate-900">{it.name}</p>

                      <p className="text-xs text-slate-400">Inventory item</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      {it.currentStock}
                    </p>

                    <p className="text-xs text-slate-400">units</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Purchases */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Recent Purchases</h2>

              <p className="text-xs text-slate-500 mt-1">
                Latest stock purchase entries
              </p>
            </div>

            {data.purchases.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400">
                No purchase records found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.purchases.map((p) => (
                  <div
                    key={p._id}
                    className="px-5 py-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {p.stockItemId?.name}
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        Quantity: {p.qty}
                      </p>
                    </div>

                    <p className="font-bold text-green-600">₹{p.totalCost}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockReport;
