import { useState, useEffect } from "react";
import api from "../api/axios";

const AreaAdd = () => {
  const [areas, setAreas] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [franchisees, setFranchisees] = useState([]);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState("");

  const [franchiseLoading, setFranchiseLoading] = useState(false);

  const [mappingSavingId, setMappingSavingId] = useState("");

  const load = async () => {
    try {
      setLoading(true);

      const { data } = await api.get("/areas");
      setAreas(data);
    } catch (err) {
      setError(err.response?.data?.message || "Areas load nahi ho paye");
    } finally {
      setLoading(false);
    }
  };
  const loadPaytvFranchisees = async () => {
    try {
      setFranchiseLoading(true);

      const { data } = await api.get("/areas/paytv-franchisees");

      setFranchisees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("PayTV franchise load error:", err);

      setError(
        err.response?.data?.message || "PayTV Franchise list load nahi hui",
      );
    } finally {
      setFranchiseLoading(false);
    }
  };
  useEffect(() => {
    load();
    loadPaytvFranchisees();
  }, []);
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Area name required hai");
      return;
    }
    if (!selectedFranchiseId) {
      setError("PayTV Franchisee select karna zaroori hai");
      return;
    }
    setIsSubmitting(true);

    try {
      await api.post("/areas", {
        name: name.trim(),
        description: description.trim(),

        paytvCompanyId: 1,
        paytvFranchiseeId: Number(selectedFranchiseId),
      });

      setName("");
      setDescription("");
      setSelectedFranchiseId("");
      setSuccess("Area successfully create ho gaya.");

      await load();

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Area add nahi ho paya");
    } finally {
      setIsSubmitting(false);
    }
  };
  const savePaytvMapping = async (areaId, franchiseId) => {
    if (!franchiseId) {
      setError("PayTV Franchise select karein.");
      return;
    }

    try {
      setError("");
      setMappingSavingId(areaId);

      await api.put(`/areas/${areaId}/paytv-mapping`, {
        paytvCompanyId: 1,
        paytvFranchiseeId: Number(franchiseId),
      });

      await load();

      setSuccess("PayTV Franchise mapping save ho gayi.");

      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err) {
      console.error("PAYTV MAPPING SAVE ERROR:", err);

      console.error("PAYTV MAPPING RESPONSE:", err.response?.data);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "PayTV mapping save nahi hui",
      );
    } finally {
      setMappingSavingId("");
    }
  };
  const filteredAreas = areas.filter((area) =>
    area.name?.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
              Administration
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Area Management
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Create and manage collection areas.
            </p>
          </div>

          {/* TOTAL */}
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm min-w-[120px]">
            <p className="text-xs text-slate-400">Total Areas</p>

            <p className="text-2xl font-bold text-slate-900">{areas.length}</p>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-700 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="mb-5 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
            ✓ {success}
          </div>
        )}

        {/* MAIN GRID */}
        <div className="grid lg:grid-cols-[310px_minmax(0,1fr)] gap-5">
          {/* ================= ADD AREA ================= */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm h-fit">
            {/* CARD HEADER */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">Add New Area</h2>

                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter area information
                  </p>
                </div>
              </div>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* AREA NAME */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Area Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Barapalli"
                  className="
                    w-full
                    bg-slate-50
                    border border-slate-200
                    rounded-xl
                    px-3.5 py-3
                    text-sm
                    text-slate-800
                    outline-none
                    transition
                    focus:bg-white
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-500/10
                  "
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Description
                  <span className="font-normal text-slate-400">
                    {" "}
                    (optional)
                  </span>
                </label>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional description"
                  className="
                    w-full
                    bg-slate-50
                    border border-slate-200
                    rounded-xl
                    px-3.5 py-3
                    text-sm
                    text-slate-800
                    outline-none
                    resize-none
                    transition
                    focus:bg-white
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-500/10
                  "
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  PayTV Franchisee
                </label>

                <select
                  value={selectedFranchiseId}
                  onChange={(e) => setSelectedFranchiseId(e.target.value)}
                  disabled={franchiseLoading}
                  className="
      w-full
      bg-slate-50
      border border-slate-200
      rounded-xl
      px-3.5 py-3
      text-sm
      text-slate-800
      outline-none
      transition
      focus:bg-white
      focus:border-blue-500
      focus:ring-4
      focus:ring-blue-500/10
      disabled:opacity-60
    "
                >
                  <option value="">
                    {franchiseLoading
                      ? "Loading PayTV Franchisees..."
                      : "Select PayTV Franchisee"}
                  </option>

                  {franchisees.map((franchise) => (
                    <option key={franchise.id} value={franchise.id}>
                      {franchise.name}
                      {" — "}
                      {franchise.id}
                    </option>
                  ))}
                </select>
              </div>
              {/* BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="
                  w-full
                  bg-blue-600
                  hover:bg-blue-700
                  disabled:bg-blue-300
                  text-white
                  text-sm
                  font-semibold
                  py-3
                  rounded-xl
                  shadow-sm
                  shadow-blue-600/20
                  transition
                "
              >
                {isSubmitting ? "Creating Area..." : "Create Area"}
              </button>
            </form>
          </div>

          {/* ================= EXISTING AREAS ================= */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* LIST HEADER */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">Existing Areas</h2>

                  <p className="text-xs text-slate-400 mt-0.5">
                    All collection areas
                  </p>
                </div>

                <div className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-lg w-fit">
                  {filteredAreas.length} shown
                </div>
              </div>

              {/* SEARCH */}
              <div className="relative mt-4">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>

                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search area..."
                  className="
                    w-full
                    bg-slate-50
                    border border-slate-200
                    rounded-xl
                    pl-10 pr-4 py-2.5
                    text-sm
                    outline-none
                    focus:bg-white
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-500/10
                  "
                />
              </div>
            </div>

            {/* TABLE HEADER */}
            <div
              className="
                  hidden sm:grid
                  grid-cols-[55px_minmax(170px,1.1fr)_minmax(170px,1fr)_minmax(280px,1.5fr)]
                  items-center
                  px-5 py-2.5
                  bg-slate-50
                  border-b border-slate-100
                  text-[11px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-slate-400
                "
            >
              <div>#</div>
              <div>Area Name</div>
              <div>Description</div>
              <div>PayTV Franchise</div>
            </div>

            {/* SCROLLABLE LIST */}
            <div className="max-h-[560px] overflow-y-auto">
              {loading ? (
                <div className="p-10 text-center text-sm text-slate-400">
                  Loading areas...
                </div>
              ) : filteredAreas.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-4-4" />
                    </svg>
                  </div>

                  <p className="font-semibold text-slate-700 mt-3">
                    {query ? "No area found" : "No areas available"}
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    {query ? "Try another search." : "Create your first area."}
                  </p>
                </div>
              ) : (
                filteredAreas.map((area, index) => (
                  <div
                    key={area._id}
                    className="
                          grid
                          grid-cols-[45px_minmax(0,1fr)]
                          sm:grid-cols-[55px_minmax(170px,1.1fr)_minmax(170px,1fr)_minmax(280px,1.5fr)]
                          items-center
                          gap-0
                          px-5
                          py-3
                          border-b
                          border-slate-100
                          last:border-b-0
                          hover:bg-slate-50
                          transition
                        "
                  >
                    {/* NUMBER */}
                    <div>
                      <span className="text-xs font-medium text-slate-400">
                        #{index + 1}
                      </span>
                    </div>

                    {/* NAME */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">
                          {area.name?.charAt(0)?.toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {area.name}
                          </p>

                          {/* Mobile description */}
                          <p className="sm:hidden text-[11px] text-slate-400 truncate mt-0.5">
                            {area.description || "No description"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* DESCRIPTION */}
                    <div className="hidden sm:block min-w-0">
                      <p className="text-xs text-slate-500 truncate">
                        {area.description || "No description"}
                      </p>
                    </div>
                    <div className="hidden sm:block min-w-0">
                      <div className="flex items-center gap-2">
                        <select
                          value={area.paytvFranchiseeId || ""}
                          onChange={(e) => {
                            setAreas((prev) =>
                              prev.map((item) =>
                                item._id === area._id
                                  ? {
                                      ...item,
                                      paytvFranchiseeId:
                                        Number(e.target.value) || null,
                                    }
                                  : item,
                              ),
                            );
                          }}
                          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
                        >
                          <option value="">Select Franchise</option>

                          {franchisees.map((franchise) => (
                            <option key={franchise.id} value={franchise.id}>
                              {franchise.name}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() =>
                            savePaytvMapping(area._id, area.paytvFranchiseeId)
                          }
                          disabled={
                            mappingSavingId === area._id ||
                            !area.paytvFranchiseeId
                          }
                          className="rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-40"
                        >
                          {mappingSavingId === area._id ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AreaAdd;
