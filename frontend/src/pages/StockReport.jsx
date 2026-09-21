import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  ShoppingCart,
  IndianRupee,
  Clock3,
  Search,
  CalendarDays,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import api from "../api/axios";

const formatCurrency = (amount = 0) => {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN");
};

const getCustomerName = (sale) => {
  if (sale?.consumerId?.name) return sale.consumerId.name;
  return "Unknown Customer";
};

const getCustomerCode = (sale) => {
  if (sale?.consumerId?.consumerId) {
    return sale.consumerId.consumerId;
  }

  return "-";
};

const getItemName = (sale) => {
  if (sale?.stockItemId?.name) {
    return sale.stockItemId.name;
  }

  return "Unknown Item";
};

const StockReport = () => {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [search, setSearch] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadReport = async () => {
    try {
      setError("");

      const { data: response } = await api.get("/stock/report");

      setData({
        items: Array.isArray(response?.items) ? response.items : [],
        purchases: Array.isArray(response?.purchases) ? response.purchases : [],
        sales: Array.isArray(response?.sales) ? response.sales : [],

        totalPurchaseCost: Number(response?.totalPurchaseCost || 0),
        totalSalesAmount: Number(response?.totalSalesAmount || 0),
        totalSalesPaid: Number(response?.totalSalesPaid || 0),
        totalSalesDue: Number(response?.totalSalesDue || 0),
      });
    } catch (err) {
      console.error("Stock report error:", err);

      setError(
        err.response?.data?.message || "Stock report load nahi ho paya.",
      );
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadReport();
    } finally {
      setRefreshing(false);
    }
  };

  const sales = data?.sales || [];
  const items = data?.items || [];
  const purchases = data?.purchases || [];

  // -----------------------------------------
  // SALES FILTER
  // -----------------------------------------
  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();

    return sales.filter((sale) => {
      const customerName = getCustomerName(sale).toLowerCase();
      const customerCode = getCustomerCode(sale).toLowerCase();
      const itemName = getItemName(sale).toLowerCase();

      const matchesSearch =
        !q ||
        customerName.includes(q) ||
        customerCode.includes(q) ||
        itemName.includes(q);

      const saleItemId =
        typeof sale?.stockItemId === "object"
          ? sale.stockItemId?._id
          : sale?.stockItemId;

      const matchesItem =
        !itemFilter || String(saleItemId) === String(itemFilter);

      const saleStatus = String(sale?.status || "").toLowerCase();

      const matchesStatus =
        statusFilter === "all" || saleStatus === statusFilter;

      const saleDate = sale?.date
        ? new Date(sale.date)
        : sale?.createdAt
          ? new Date(sale.createdAt)
          : null;

      let matchesFrom = true;
      let matchesTo = true;

      if (fromDate && saleDate) {
        const from = new Date(`${fromDate}T00:00:00`);
        matchesFrom = saleDate >= from;
      }

      if (toDate && saleDate) {
        const to = new Date(`${toDate}T23:59:59.999`);
        matchesTo = saleDate <= to;
      }

      return (
        matchesSearch &&
        matchesItem &&
        matchesStatus &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [sales, search, itemFilter, statusFilter, fromDate, toDate]);

  // -----------------------------------------
  // FILTERED SALES SUMMARY
  // -----------------------------------------
  const filteredSalesSummary = useMemo(() => {
    return filteredSales.reduce(
      (acc, sale) => {
        acc.total += Number(sale?.totalAmount || 0);
        acc.paid += Number(sale?.amountPaid || 0);
        acc.due += Number(sale?.balance || 0);
        return acc;
      },
      {
        total: 0,
        paid: 0,
        due: 0,
      },
    );
  }, [filteredSales]);

  // -----------------------------------------
  // ITEMS WITH LOW STOCK
  // -----------------------------------------
  const lowStockItems = useMemo(() => {
    return items.filter((item) => Number(item?.currentStock || 0) <= 2);
  }, [items]);

  // -----------------------------------------
  // LOADING
  // -----------------------------------------
  if (!data && !error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-9 h-9 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />

          <p className="text-sm text-slate-500 mt-4">
            Stock report load ho raha hai...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ---------------------------------- */}
        {/* HEADER */}
        {/* ---------------------------------- */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Inventory
            </p>

            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
              Stock Report
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Stock, purchases aur customer sales ka complete account.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ---------------------------------- */}
        {/* SUMMARY CARDS */}
        {/* ---------------------------------- */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-blue-100">
                Total Purchase
              </p>

              <ShoppingCart size={18} />
            </div>

            <p className="mt-2 text-2xl font-bold">
              ₹{formatCurrency(data?.totalPurchaseCost)}
            </p>

            <p className="mt-1 text-[11px] text-blue-100">
              Stock purchase cost
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">
                Total Sales
              </p>

              <IndianRupee size={18} className="text-blue-600" />
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              ₹{formatCurrency(data?.totalSalesAmount)}
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              Customer stock sales
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-emerald-600">
                Cash Received
              </p>

              <CheckCircle2 size={18} className="text-emerald-600" />
            </div>

            <p className="mt-2 text-2xl font-bold text-emerald-700">
              ₹{formatCurrency(data?.totalSalesPaid)}
            </p>

            <p className="mt-1 text-[11px] text-emerald-600">
              Amount received from customers
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-amber-600">
                Customer Due
              </p>

              <Clock3 size={18} className="text-amber-600" />
            </div>

            <p className="mt-2 text-2xl font-bold text-amber-700">
              ₹{formatCurrency(data?.totalSalesDue)}
            </p>

            <p className="mt-1 text-[11px] text-amber-600">
              Pending stock payment
            </p>
          </div>
        </div>

        {/* ---------------------------------- */}
        {/* LOW STOCK ALERT */}
        {/* ---------------------------------- */}
        {lowStockItems.length > 0 && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertCircle size={19} className="mt-0.5 text-orange-600" />

              <div>
                <p className="text-sm font-bold text-orange-800">
                  Low Stock Alert
                </p>

                <p className="mt-1 text-xs text-orange-700">
                  {lowStockItems
                    .map((item) => `${item.name} (${item.currentStock || 0})`)
                    .join(" • ")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------- */}
        {/* TABS */}
        {/* ---------------------------------- */}
        <div className="rounded-2xl border border-slate-200 bg-white p-1.5 flex gap-1 overflow-x-auto">
          {[
            ["overview", "Stock Overview"],
            ["purchases", "Purchases"],
            ["sales", "Customer Sales"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ================================================= */}
        {/* STOCK OVERVIEW */}
        {/* ================================================= */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Current Stock */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-blue-600" />

                  <h2 className="font-bold text-slate-900">Current Stock</h2>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Current inventory levels
                </p>
              </div>

              {items.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-400">
                  No stock items found.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const stock = Number(item?.currentStock || 0);

                    return (
                      <div
                        key={item._id}
                        className="flex items-center justify-between px-5 py-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                            <Package size={18} className="text-blue-600" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {item.name}
                            </p>

                            <p className="text-xs text-slate-400">
                              Last cost ₹
                              {formatCurrency(item.lastCostPerUnit || 0)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p
                            className={`font-bold ${
                              stock <= 2 ? "text-red-600" : "text-slate-900"
                            }`}
                          >
                            {stock}
                          </p>

                          <p className="text-[11px] text-slate-400">units</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Sales Summary */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-bold text-slate-900">Sales Summary</h2>

                <p className="mt-1 text-xs text-slate-500">
                  Customer stock sales overview
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-5">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Sales Entries</p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {sales.length}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-xs text-blue-600">Sales Amount</p>

                  <p className="mt-1 text-2xl font-bold text-blue-700">
                    ₹{formatCurrency(data?.totalSalesAmount)}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs text-emerald-600">Received</p>

                  <p className="mt-1 text-2xl font-bold text-emerald-700">
                    ₹{formatCurrency(data?.totalSalesPaid)}
                  </p>
                </div>

                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-xs text-amber-600">Pending</p>

                  <p className="mt-1 text-2xl font-bold text-amber-700">
                    ₹{formatCurrency(data?.totalSalesDue)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("sales")}
                className="mx-5 mb-5 w-[calc(100%-2.5rem)] rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                View Customer Sales
              </button>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* PURCHASES */}
        {/* ================================================= */}
        {activeTab === "purchases" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-900">Purchase History</h2>

              <p className="mt-1 text-xs text-slate-500">
                Latest stock purchase entries
              </p>
            </div>

            {purchases.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400">
                No purchase records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-left">Date</th>

                      <th className="px-5 py-3 text-left">Item</th>

                      <th className="px-5 py-3 text-right">Qty</th>

                      <th className="px-5 py-3 text-right">Cost / Unit</th>

                      <th className="px-5 py-3 text-right">Total Cost</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {purchases.map((purchase) => (
                      <tr key={purchase._id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 text-slate-600">
                          {formatDate(purchase.date || purchase.createdAt)}
                        </td>

                        <td className="px-5 py-3.5 font-semibold text-slate-900">
                          {purchase.stockItemId?.name || "Unknown Item"}
                        </td>

                        <td className="px-5 py-3.5 text-right text-slate-700">
                          {purchase.qty}
                        </td>

                        <td className="px-5 py-3.5 text-right text-slate-700">
                          ₹{formatCurrency(purchase.costPerUnit || 0)}
                        </td>

                        <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                          ₹{formatCurrency(purchase.totalCost || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================================================= */}
        {/* SALES */}
        {/* ================================================= */}
        {activeTab === "sales" && (
          <div className="space-y-5">
            {/* FILTERS */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4">
                <h2 className="font-bold text-slate-900">
                  Customer Sales Ledger
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Kis customer ko kab, kya aur kitna stock becha gaya.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {/* Search */}
                <div className="relative xl:col-span-2">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Customer / ID / item search..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {/* Item */}
                <select
                  value={itemFilter}
                  onChange={(e) => setItemFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="">All Items</option>

                  {items.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>

                {/* Status */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="due">Due</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setItemFilter("");
                    setStatusFilter("all");
                    setFromDate("");
                    setToDate("");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Clear Filters
                </button>
              </div>

              {/* Date filters */}
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="relative">
                  <CalendarDays
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="relative">
                  <CalendarDays
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* FILTERED SUMMARY */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Sales</p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  ₹{formatCurrency(filteredSalesSummary.total)}
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  {filteredSales.length} entries
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs text-emerald-600">Received</p>

                <p className="mt-1 text-xl font-bold text-emerald-700">
                  ₹{formatCurrency(filteredSalesSummary.paid)}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs text-amber-600">Pending</p>

                <p className="mt-1 text-xl font-bold text-amber-700">
                  ₹{formatCurrency(filteredSalesSummary.due)}
                </p>
              </div>
            </div>

            {/* SALES TABLE */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {filteredSales.length === 0 ? (
                <div className="p-12 text-center">
                  <Package size={32} className="mx-auto text-slate-300" />

                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    Koi sales record nahi mila.
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Search/filter change karke dekhiye.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[1050px] text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-4 py-3 text-left">Date</th>

                          <th className="px-4 py-3 text-left">Customer</th>

                          <th className="px-4 py-3 text-left">Item</th>

                          <th className="px-4 py-3 text-right">Qty</th>

                          <th className="px-4 py-3 text-right">Rate</th>

                          <th className="px-4 py-3 text-right">Total</th>

                          <th className="px-4 py-3 text-right">Paid</th>

                          <th className="px-4 py-3 text-right">Due</th>

                          <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredSales.map((sale) => {
                          const customerId = sale?.consumerId?._id;

                          const customerAreaId = sale?.consumerId?.areaId;

                          const total = Number(sale?.totalAmount || 0);

                          const paid = Number(sale?.amountPaid || 0);

                          const due = Number(sale?.balance || 0);

                          const status = sale?.status || "paid";

                          const customerContent = (
                            <>
                              <p className="font-semibold text-slate-900">
                                {getCustomerName(sale)}
                              </p>

                              <p className="text-[11px] text-slate-400">
                                {getCustomerCode(sale)}
                              </p>
                            </>
                          );

                          return (
                            <tr key={sale._id} className="hover:bg-slate-50">
                              <td className="px-4 py-3.5 text-slate-600">
                                {formatDate(sale.date || sale.createdAt)}
                              </td>

                              <td className="px-4 py-3.5">
                                {customerId && customerAreaId ? (
                                  <Link
                                    to={`/area/${customerAreaId}/consumer/${customerId}`}
                                    className="block hover:text-blue-600"
                                  >
                                    {customerContent}
                                  </Link>
                                ) : (
                                  customerContent
                                )}
                              </td>

                              <td className="px-4 py-3.5 font-semibold text-slate-800">
                                {getItemName(sale)}
                              </td>

                              <td className="px-4 py-3.5 text-right">
                                {sale.qty}
                              </td>

                              <td className="px-4 py-3.5 text-right">
                                ₹{formatCurrency(sale.unitPrice)}
                              </td>

                              <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                                ₹{formatCurrency(total)}
                              </td>

                              <td className="px-4 py-3.5 text-right font-semibold text-emerald-700">
                                ₹{formatCurrency(paid)}
                              </td>

                              <td className="px-4 py-3.5 text-right font-semibold text-amber-700">
                                ₹{formatCurrency(due)}
                              </td>

                              <td className="px-4 py-3.5 text-center">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                    status === "paid"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {status === "paid" ? "PAID" : "DUE"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="divide-y divide-slate-100 md:hidden">
                    {filteredSales.map((sale) => {
                      const customerId = sale?.consumerId?._id;

                      const customerAreaId = sale?.consumerId?.areaId;

                      const total = Number(sale?.totalAmount || 0);

                      const paid = Number(sale?.amountPaid || 0);

                      const due = Number(sale?.balance || 0);

                      const status = sale?.status || "paid";

                      return (
                        <div key={sale._id} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              {customerId && customerAreaId ? (
                                <Link
                                  to={`/area/${customerAreaId}/consumer/${customerId}`}
                                  className="font-bold text-slate-900 hover:text-blue-600"
                                >
                                  {getCustomerName(sale)}
                                </Link>
                              ) : (
                                <p className="font-bold text-slate-900">
                                  {getCustomerName(sale)}
                                </p>
                              )}

                              <p className="text-xs text-slate-400">
                                {getCustomerCode(sale)}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                status === "paid"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {status === "paid" ? "PAID" : "DUE"}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg bg-slate-50 p-2.5">
                              <p className="text-slate-400">Date</p>

                              <p className="mt-0.5 font-semibold text-slate-700">
                                {formatDate(sale.date || sale.createdAt)}
                              </p>
                            </div>

                            <div className="rounded-lg bg-slate-50 p-2.5">
                              <p className="text-slate-400">Item</p>

                              <p className="mt-0.5 font-semibold text-slate-700">
                                {getItemName(sale)}
                              </p>
                            </div>

                            <div className="rounded-lg bg-slate-50 p-2.5">
                              <p className="text-slate-400">Qty × Rate</p>

                              <p className="mt-0.5 font-semibold text-slate-700">
                                {sale.qty} × ₹{formatCurrency(sale.unitPrice)}
                              </p>
                            </div>

                            <div className="rounded-lg bg-slate-50 p-2.5">
                              <p className="text-slate-400">Total</p>

                              <p className="mt-0.5 font-bold text-slate-900">
                                ₹{formatCurrency(total)}
                              </p>
                            </div>

                            <div className="rounded-lg bg-emerald-50 p-2.5">
                              <p className="text-emerald-600">Paid</p>

                              <p className="mt-0.5 font-bold text-emerald-700">
                                ₹{formatCurrency(paid)}
                              </p>
                            </div>

                            <div className="rounded-lg bg-amber-50 p-2.5">
                              <p className="text-amber-600">Due</p>

                              <p className="mt-0.5 font-bold text-amber-700">
                                ₹{formatCurrency(due)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockReport;
