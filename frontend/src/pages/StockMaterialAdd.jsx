import { useState, useEffect } from "react";
import api from "../api/axios";

const StockMaterialAdd = () => {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => api.get("/stock/items").then(({ data }) => setItems(data));

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!name.trim()) {
      setError("Item name required");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post("/stock/items", {
        name: name.trim(),
      });

      setName("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Add nahi ho paya");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] px-4 py-6 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Inventory Setup
          </p>

          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
            Stock Material
          </h1>

          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Create and manage materials used in your daily collection business.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Add Form */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 h-fit">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-xl">
              +
            </div>

            <h2 className="font-bold text-slate-900 mt-4">Add New Material</h2>

            <p className="text-xs text-slate-500 mt-1 mb-5">
              Example: Remote, Adapter, AV Cable, HDMI, Battery, RG6 etc.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Material Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Remote"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-xl transition"
              >
                {isSubmitting ? "Adding..." : "Add Material"}
              </button>
            </form>
          </div>

          {/* Existing Items */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Existing Materials</h2>

                <p className="text-xs text-slate-500 mt-1">
                  Available inventory materials
                </p>
              </div>

              <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold">
                {items.length} Items
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-3xl">📦</div>

                <p className="font-medium text-slate-700 mt-3">
                  No materials yet
                </p>

                <p className="text-sm text-slate-400 mt-1">
                  Add your first stock material.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((it) => (
                  <div
                    key={it._id}
                    className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center">
                        📦
                      </div>

                      <div>
                        <p className="font-semibold text-slate-900">
                          {it.name}
                        </p>

                        <p className="text-xs text-slate-400 mt-0.5">
                          Stock material
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        {it.currentStock}
                      </p>

                      <p className="text-xs text-slate-400">in stock</p>
                    </div>
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

export default StockMaterialAdd;
