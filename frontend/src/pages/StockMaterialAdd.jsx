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
    setIsSubmitting(true);
    try {
      await api.post("/stock/items", { name });
      setName("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Add nahi ho paya");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-bold text-gray-800">Stock Material Add</h1>
        <p className="text-xs text-gray-500">
          Naya item (Remote, Adapter, AV Cable, HDMI, Battery, RG6, etc.) yahan
          banayein — quantity/cost "Stock Detail" se khareed ke daalna hoga.
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm p-4 space-y-3"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Item ka naam (e.g. Remote)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold py-2 rounded-lg"
          >
            {isSubmitting ? "Add ho raha hai..." : "Item Add Karein"}
          </button>
        </form>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">
            Existing Items ({items.length})
          </p>
          {items.map((it) => (
            <div
              key={it._id}
              className="bg-white rounded-lg p-3 text-sm flex justify-between"
            >
              <span className="font-medium text-gray-800">{it.name}</span>
              <span className="text-gray-500">{it.currentStock} in stock</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StockMaterialAdd;
