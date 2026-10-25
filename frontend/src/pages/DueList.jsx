import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  RefreshCw,
  Users,
  IndianRupee,
  AlertCircle,
  Wallet,
  Package,
} from "lucide-react";

import api from "../api/axios";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const DueList = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [currentMonth, setCurrentMonth] = useState("");
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [totalConsumersDue, setTotalConsumersDue] = useState(0);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDueList = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/consumers/due-list");
      const data = response.data;

      setRows(Array.isArray(data.rows) ? data.rows : []);
      setCurrentMonth(data.currentMonth || "");
      setTotalOutstanding(Number(data.totalOutstanding) || 0);
      setTotalConsumersDue(Number(data.totalConsumersDue) || 0);
    } catch (err) {
      console.error("Due List load error:", err);

      setError(
        err.response?.data?.message ||
          "Due List load nahi hui. Server aur API route check kijiye.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDueList();
  }, []);

  const filteredRows = rows.filter((row) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return [
      row.consumerId,
      row.name,
      row.mobile,
      row.areaName,
      row.stbNo,
      row.vcNo,
    ].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(query),
    );
  });

  const openConsumer = (row) => {
    if (!row.areaId || !row._id) return;

    navigate(`/area/${row.areaId}/consumer/${row._id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Due List</h1>

          <p className="mt-1 text-sm text-slate-500">
            Customers jinka payment abhi pending hai
            {currentMonth ? ` · Billing month: ${currentMonth}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDueList}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg
            bg-blue-600 px-4 py-2.5 font-medium text-white
            hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Customers With Due
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-800">
                {totalConsumersDue}
              </h2>
            </div>

            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Outstanding
              </p>

              <h2 className="mt-2 text-2xl font-bold text-red-600">
                {formatCurrency(totalOutstanding)}
              </h2>
            </div>

            <div className="rounded-xl bg-red-50 p-3 text-red-600">
              <IndianRupee size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search
            size={19}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customer name, ID, mobile, area, STB or VC..."
            className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4
              text-sm outline-none transition focus:border-blue-500
              focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-4 flex items-start gap-3 rounded-lg border border-red-200
          bg-red-50 p-4 text-red-700"
        >
          <AlertCircle size={20} className="mt-0.5 shrink-0" />

          <div>
            <p className="font-semibold">Due List load nahi hui</p>
            <p className="mt-1 text-sm">{error}</p>

            <button
              type="button"
              onClick={fetchDueList}
              className="mt-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Table / Responsive Mobile Cards */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Table Header */}
        <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-slate-800">Pending Customers</h2>

          <p className="text-sm text-slate-500">
            Showing {filteredRows.length} of {rows.length} customers
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">
            <RefreshCw size={25} className="mx-auto mb-3 animate-spin" />
            Due List load ho rahi hai...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-slate-500">
            Data load karne ke liye Refresh button dabaiye.
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 w-fit rounded-full bg-green-50 p-4 text-green-600">
              {search ? <Search size={28} /> : <Wallet size={28} />}
            </div>

            <h3 className="font-semibold text-slate-800">
              {search ? "No matching customers" : "No Pending Dues"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Doosra customer name ya ID search kijiye."
                : "Abhi kisi customer ka outstanding due nahi mila."}
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE VIEW: Customer Cards */}
            <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
              {filteredRows.map((row) => (
                <article
                  key={row._id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  {/* Customer Name and Total Due */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words font-bold text-slate-800">
                        {row.name || "Unnamed Customer"}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Customer ID: {row.consumerId || "-"}
                      </p>

                      {row.mobile && String(row.mobile).trim() !== "0" && (
                        <p className="mt-1 text-xs text-slate-500">
                          Mobile: {row.mobile}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-right">
                      <p className="text-xs font-medium text-red-600">
                        Total Due
                      </p>

                      <p className="mt-1 text-base font-bold text-red-600">
                        {formatCurrency(row.totalDue)}
                      </p>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-500">Area</span>
                      <span className="text-right font-medium text-slate-700">
                        {row.areaName || "-"}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-500">STB Number</span>
                      <span className="break-all text-right text-slate-700">
                        {row.stbNo || "-"}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-500">VC Number</span>
                      <span className="break-all text-right text-slate-700">
                        {row.vcNo || "-"}
                      </span>
                    </div>
                  </div>

                  {/* Due Breakdown */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Old Bills Due</p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {formatCurrency(row.oldBillsDue)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Previous Due</p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {formatCurrency(row.previousDue)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-blue-50 p-3">
                      <p className="text-xs text-slate-500">Current Package</p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {Number(row.currentPackageAmount) > 0
                          ? formatCurrency(row.currentPackageAmount)
                          : "No Package"}
                      </p>

                      {Number(row.currentPackageAmount) > 0 && (
                        <p className="mt-1 text-xs font-medium text-red-600">
                          Due: {formatCurrency(row.currentPackageDue)}
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg bg-emerald-50 p-3">
                      <p className="text-xs text-slate-500">Advance</p>

                      <p className="mt-1 font-semibold text-emerald-700">
                        {formatCurrency(row.advanceAmount)}
                      </p>
                    </div>
                  </div>

                  {/* View Customer */}
                  <button
                    type="button"
                    onClick={() => openConsumer(row)}
                    disabled={!row.areaId || !row._id}
                    className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3
                text-sm font-semibold text-white transition
                hover:bg-blue-700 active:scale-[0.99]
                disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    View Customer Details
                  </button>
                </article>
              ))}
            </div>

            {/* DESKTOP VIEW: Existing Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1150px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-4">Customer</th>
                    <th className="px-4 py-4">Area</th>
                    <th className="px-4 py-4">STB / VC</th>
                    <th className="px-4 py-4 text-right">Old Bills Due</th>
                    <th className="px-4 py-4 text-right">Previous Due</th>
                    <th className="px-4 py-4">Current Package</th>
                    <th className="px-4 py-4 text-right">Advance</th>
                    <th className="px-4 py-4 text-right">Total Due</th>
                    <th className="px-4 py-4 text-center">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr
                      key={row._id}
                      className="transition hover:bg-blue-50/50"
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800">
                          {row.name || "Unnamed Customer"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          ID: {row.consumerId || "-"}
                        </div>

                        {row.mobile && String(row.mobile).trim() !== "0" && (
                          <div className="mt-1 text-xs text-slate-500">
                            {row.mobile}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {row.areaName || "-"}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        <div>STB: {row.stbNo || "-"}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          VC: {row.vcNo || "-"}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right text-slate-700">
                        {formatCurrency(row.oldBillsDue)}
                      </td>

                      <td className="px-4 py-4 text-right text-slate-700">
                        {formatCurrency(row.previousDue)}
                      </td>

                      <td className="px-4 py-4">
                        {Number(row.currentPackageAmount) > 0 ? (
                          <>
                            <div className="flex items-center gap-1 font-medium text-slate-700">
                              <Package size={15} />
                              {formatCurrency(row.currentPackageAmount)}
                            </div>

                            <div className="mt-1 text-xs text-red-600">
                              Due: {formatCurrency(row.currentPackageDue)}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400">No Package</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right text-emerald-700">
                        {formatCurrency(row.advanceAmount)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <span className="font-bold text-red-600">
                          {formatCurrency(row.totalDue)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => openConsumer(row)}
                          disabled={!row.areaId || !row._id}
                          className="rounded-lg border border-blue-200 px-3 py-2
                      font-medium text-blue-700 hover:bg-blue-50
                      disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Total Due mein old unpaid bills, previous due aur current-month imported
        bill ka pending balance shamil hai; available advance minus kiya gaya
        hai. Current package ka amount tabhi dikhega jab us month ka MonthlyBill
        record database mein maujood ho.
      </p>
    </div>
  );
};

export default DueList;
