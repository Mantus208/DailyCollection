import { useState, useEffect } from "react";
import api from "../api/axios";

const AreaAdd = () => {
  const [areas, setAreas] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => api.get("/areas").then(({ data }) => setAreas(data));

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await api.post("/areas", { name, description });
      setName("");
      setDescription("");
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
        <h1 className="text-xl font-bold text-gray-800">Area Add</h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm p-4 space-y-3"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Area ka naam"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold py-2 rounded-lg"
          >
            {isSubmitting ? "Add ho raha hai..." : "Area Add Karein"}
          </button>
        </form>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">
            Existing Areas ({areas.length})
          </p>
          {areas.map((a) => (
            <div key={a._id} className="bg-white rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-800">{a.name}</p>
              {a.description && (
                <p className="text-xs text-gray-500">{a.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AreaAdd;
