import { useEffect, useState } from "react";
import { Plus, Building2, Search, RefreshCw } from "lucide-react";
import api from "../api/axios";

const FranchiseeAdd = () => {
  const [franchisees, setFranchisees] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/franchisees");
      setFranchisees(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Franchisee list load nahi ho payi",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await api.post("/franchisees", {
        name: name.trim(),
        description: description.trim(),
      });
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Franchisee add nahi ho paya");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = franchisees.filter((f) =>
    `${f.name || ""} ${f.description || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
              <Building2 size={14} /> Administration
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Franchisee Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create and manage franchisees.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Total
            </p>
            <p className="text-xl font-bold text-slate-900">
              {franchisees.length}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Plus size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Add Franchisee</h2>
                <p className="text-xs text-slate-500">
                  Enter franchisee information
                </p>
              </div>
            </div>
            <div className="space-y-3.5">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Franchisee name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Description (optional)"
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
              <button
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
              >
                {isSubmitting ? "Saving..." : "Add Franchisee"}
              </button>
            </div>
          </form>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Franchisees</h2>
                <p className="text-xs text-slate-500">Compact list</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                    className="w-44 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={load}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  title="Refresh"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>
            <div className="max-h-[430px] overflow-y-auto">
              <div className="grid grid-cols-[48px_minmax(140px,1fr)_minmax(160px,1.5fr)] border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span>#</span>
                <span>Franchisee</span>
                <span>Description</span>
              </div>
              {loading ? (
                <div className="px-4 py-10 text-center text-sm text-slate-400">
                  Loading...
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-400">
                  No franchisees found.
                </div>
              ) : (
                filtered.map((f, index) => (
                  <div
                    key={f._id}
                    className="grid grid-cols-[48px_minmax(140px,1fr)_minmax(160px,1.5fr)] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-0 hover:bg-slate-50"
                  >
                    <span className="text-xs text-slate-400">{index + 1}</span>
                    <span className="flex items-center gap-2 font-semibold text-slate-800">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                        {String(f.name || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                      {f.name}
                    </span>
                    <span className="truncate text-xs text-slate-500">
                      {f.description || "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FranchiseeAdd;
