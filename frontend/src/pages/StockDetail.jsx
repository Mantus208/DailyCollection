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

    if (!qty || Number(qty) <= 0) {
      setError("Please enter a valid quantity");
      return;
    }

    if (!totalCost || Number(totalCost) < 0) {
      setError("Please enter a valid total cost");
      return;
    }

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

  const getStockStatus = (stock) => {
    if (stock <= 0) {
      return {
        label: "Out of Stock",
        className: "bg-red-50 text-red-600 border-red-100",
      };
    }

    if (stock <= 5) {
      return {
        label: "Low Stock",
        className: "bg-orange-50 text-orange-600 border-orange-100",
      };
    }

    return {
      label: "In Stock",
      className: "bg-green-50 text-green-600 border-green-100",
    };
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] px-4 py-6 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              Inventory
            </p>

            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Stock Detail
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              View current inventory and manage stock purchases.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400">Total Items</p>
            <p className="text-xl font-bold text-slate-900">{items.length}</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Stock Grid */}
        {items.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center text-2xl">
              📦
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              No stock items
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Pehle "Stock Material Add" se item banayein.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map((it) => {
              const status = getStockStatus(it.currentStock);

              return (
                <div
                  key={it._id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition"
                >
                  {/* Item Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-xl">
                          📦
                        </div>

                        <div>
                          <h2 className="font-bold text-slate-900">
                            {it.name}
                          </h2>

                          <span
                            className={`inline-flex mt-1 px-2.5 py-1 rounded-full border text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setRestockFor(it);
                          setError("");
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                      >
                        + Restock
                      </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-400">Current Stock</p>

                        <p className="text-2xl font-bold text-slate-900 mt-1">
                          {it.currentStock}
                        </p>

                        <p className="text-xs text-slate-500">units</p>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-400">
                          Last Cost / Unit
                        </p>

                        <p className="text-2xl font-bold text-slate-900 mt-1">
                          ₹{it.lastCostPerUnit?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Restock Form */}
                  {restockFor?._id === it._id && (
                    <div className="border-t border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            Add Stock
                          </h3>

                          <p className="text-xs text-slate-500">
                            Enter purchase quantity and total cost
                          </p>
                        </div>

                        <button
                          onClick={() => setRestockFor(null)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Quantity
                          </label>

                          <input
                            type="number"
                            min="1"
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                            placeholder="Enter quantity"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Total Cost
                          </label>

                          <input
                            type="number"
                            min="0"
                            value={totalCost}
                            onChange={(e) => setTotalCost(e.target.value)}
                            placeholder="₹ Total cost"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={handleRestock}
                          disabled={isSubmitting}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-xl transition"
                        >
                          {isSubmitting ? "Saving..." : "Save Purchase"}
                        </button>

                        <button
                          onClick={() => setRestockFor(null)}
                          className="px-5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockDetail;
