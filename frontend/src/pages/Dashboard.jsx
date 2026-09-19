import { useState, useContext, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";

const statusBadge = (bill) => {
  if (!bill) return { label: "Not Set", color: "bg-gray-100 text-gray-500" };
  if (bill.status === "paid")
    return { label: "Paid", color: "bg-green-100 text-green-700" };
  if (bill.status === "due")
    return { label: "Due", color: "bg-yellow-100 text-yellow-700" };
  if (bill.status === "not_packaged")
    return { label: "Not Packaged", color: "bg-gray-200 text-gray-600" };
  if (bill.status === "box_issue")
    return { label: "Box Issue", color: "bg-orange-100 text-orange-700" };
  return { label: "Unpaid", color: "bg-red-100 text-red-700" };
};

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { areaId } = useParams();
  const navigate = useNavigate();
  const [area, setArea] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

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
    const timer = setTimeout(() => {
      setLoading(true);
      api
        .get("/consumers/search", { params: { areaId: area._id, q: query } })
        .then(({ data }) => setResults(data))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300); // typing ke thoda ruk ke search karo
    return () => clearTimeout(timer);
  }, [query, area]);

  const handleChangeArea = () => {
    localStorage.removeItem("dc_selected_area");
    navigate("/");
  };

  if (!area) return null;

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-gray-500">Welcome</p>
            <h1 className="text-xl font-bold text-gray-800">{user?.name}</h1>
          </div>
          <button
            onClick={logout}
            className="text-sm text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 h-fit"
          >
            Logout
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            Area:{" "}
            <span className="font-semibold text-gray-800">{area.name}</span>
          </p>
          <button
            onClick={handleChangeArea}
            className="text-xs text-blue-600 hover:underline"
          >
            Area Badlein
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Naam, Consumer ID, VC No. ya mobile se dhoondein..."
          autoFocus
          className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />

        {loading && (
          <p className="text-sm text-gray-400 text-center">
            Dhoond rahe hain...
          </p>
        )}

        {!loading && results.length === 0 && (
          <p className="text-sm text-gray-400 text-center bg-white rounded-xl p-4">
            {query
              ? "Koi consumer nahi mila"
              : "Search karke consumer dhoondein"}
          </p>
        )}

        <div className="space-y-2">
          {results.map((c) => {
            const badge = statusBadge(c.currentBill);
            return (
              <button
                key={c._id}
                onClick={() => navigate(`/area/${area._id}/consumer/${c._id}`)}
                className="w-full bg-white rounded-xl shadow-sm p-4 text-left hover:shadow-md transition flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {c.consumerId} {c.address ? `• ${c.address}` : ""}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${badge.color}`}
                >
                  {badge.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
