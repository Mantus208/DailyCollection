import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";

const formatDate = (value) => {
  if (!value) return "-";

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return String(value);

  const [, yyyy, mm, dd] = match;

  return `${dd}/${mm}/${yyyy}`;
};

const statusClass = (row) => {
  const days = Number(row.days);

  if (days < 0) {
    return "bg-red-50 text-red-700";
  }

  if (days <= 3) {
    return "bg-orange-50 text-orange-700";
  }

  if (days <= 7) {
    return "bg-amber-50 text-amber-700";
  }

  if (days <= 15) {
    return "bg-yellow-50 text-yellow-700";
  }

  return "bg-emerald-50 text-emerald-700";
};

const ExpiryReport = () => {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [groupBy, setGroupBy] = useState("area");
  const lastLoadKey = useRef("");
  const loadingRef = useRef(false);
  const [searchParams] = useSearchParams();

  const urlDays = Number(searchParams.get("days") ?? 0);

  const [days, setDays] = useState(Number.isFinite(urlDays) ? urlDays : 0);

  const todayOnly = searchParams.get("today") === "1";

  const initialDays = Number(searchParams.get("days") ?? 0);

  const loadReport = async () => {
    if (loadingRef.current) {
      console.log("⏳ Expiry report already loading...");
      return;
    }

    loadingRef.current = true;

    try {
      setLoading(true);
      setError("");

      const { data } = await api.get("/reports/expiry", {
        params: {
          q: search,
          groupBy,
          days,
        },
      });

      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setSummary(data?.summary || {});
    } catch (err) {
      setRows([]);
      setSummary({});
      setError(
        err.response?.data?.message ||
          err.message ||
          "Expiry report load nahi hua",
      );
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [groupBy, days]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    let result = rows;

    // -----------------------------
    // STATUS FILTER
    // -----------------------------
    if (status === "expired") {
      result = result.filter((row) => Number(row.days) < 0);
    }

    if (status === "3days") {
      result = result.filter(
        (row) => Number(row.days) >= 0 && Number(row.days) <= 3,
      );
    }

    if (status === "7days") {
      result = result.filter(
        (row) => Number(row.days) > 3 && Number(row.days) <= 7,
      );
    }

    if (status === "15days") {
      result = result.filter(
        (row) => Number(row.days) > 7 && Number(row.days) <= 15,
      );
    }

    if (status === "30days") {
      result = result.filter(
        (row) => Number(row.days) > 15 && Number(row.days) <= 30,
      );
    }

    // -----------------------------
    // SEARCH
    // -----------------------------
    if (!q) {
      return result;
    }

    return result.filter((row) =>
      [
        row.consumerId,
        row.customerName,
        row.area,
        row.stbNo,
        row.vcNo,
        row.packageName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search, status]);

  const groupedRows = useMemo(() => {
    if (groupBy === "franchisee") {
      return filteredRows.reduce((acc, row) => {
        const key = String(row.franchiseeId || "Unknown");

        if (!acc[key]) acc[key] = [];

        acc[key].push(row);

        return acc;
      }, {});
    }

    return filteredRows.reduce((acc, row) => {
      const key = row.area || "Unknown";

      if (!acc[key]) acc[key] = [];

      acc[key].push(row);

      return acc;
    }, {});
  }, [filteredRows, groupBy]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              REPORT
            </div>

            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
              Expiry Report
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Customer-wise package expiry, STB and local billing amount
            </p>
          </div>

          <button
            type="button"
            onClick={loadReport}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {[
            ["Total", summary.total || 0],
            ["Expired", summary.expired || 0],
            ["3 Days", summary.within3 || 0],
            ["7 Days", summary.within7 || 0],
            ["15 Days", summary.within15 || 0],
            ["30 Days", summary.within30 || 0],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            >
              <p className="text-xs font-semibold text-slate-400">{label}</p>

              <p className="mt-1 text-2xl font-extrabold text-slate-900">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Customer ID / Name / STB / VC..."
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={days}
              onChange={(e) => {
                const newDays = Number(e.target.value);

                setDays(newDays);

                window.history.replaceState(
                  null,
                  "",
                  `/reports/expiry?days=${newDays}`,
                );
              }}
              className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
            >
              <option value={0}>Today</option>
              <option value={1}>Tomorrow</option>
              <option value={3}>Within 3 Days</option>
              <option value={7}>Within 7 Days</option>
              <option value={15}>Within 15 Days</option>
              <option value={30}>Within 30 Days</option>
            </select>

            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
            >
              <option value="area">Group by Area</option>
              <option value="franchisee">Group by Franchisee</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-400">
            Loading expiry report...
          </div>
        ) : (
          Object.entries(groupedRows).map(([group, groupRows]) => (
            <section
              key={group}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
            >
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-slate-900">
                    {groupBy === "area"
                      ? `AREA: ${group}`
                      : `FRANCHISEE: ${group}`}
                  </h2>

                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                    {groupRows.length}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-3">Customer ID</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Area</th>
                      <th className="px-4 py-3">STB No</th>
                      <th className="px-4 py-3">VC No</th>
                      <th className="px-4 py-3">Package</th>
                      <th className="px-4 py-3">Local</th>
                      <th className="px-4 py-3">Expiry</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {groupRows.map((row) => (
                      <tr
                        key={row._id}
                        className="border-b border-slate-50 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 text-xs font-bold text-slate-800">
                          {row.consumerId}
                        </td>

                        <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                          {row.customerName}
                        </td>

                        <td className="px-4 py-3 text-xs text-slate-500">
                          {row.area}
                        </td>

                        <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                          {row.stbNo}
                        </td>

                        <td className="px-4 py-3 text-xs text-slate-500">
                          {row.vcNo}
                        </td>

                        <td className="px-4 py-3 text-xs text-slate-600">
                          {row.packageName}
                        </td>

                        <td className="px-4 py-3 text-xs font-extrabold text-slate-900">
                          ₹
                          {Number(row.localAmount || 0).toLocaleString("en-IN")}
                        </td>

                        <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                          {formatDate(row.expiryDate)}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${statusClass(
                              row,
                            )}`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}

        {!loading && filteredRows.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-400">
            No customer found.
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpiryReport;
