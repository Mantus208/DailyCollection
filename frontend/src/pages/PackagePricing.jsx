import { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import { RefreshCw } from "lucide-react";

import api from "../api/axios";

const normalize = (value) => (value || "").toString().trim().toUpperCase();

const getConfigKey = (packageName, packageType) =>
  `${normalize(packageName)}|${normalize(packageType)}`;

const PackagePricing = () => {
  const [applyingId, setApplyingId] = useState("");
  const [packages, setPackages] = useState([]);
  const [areas, setAreas] = useState([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [packageName, setPackageName] = useState("");
  const [packageType, setPackageType] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");

  const [areaOverrides, setAreaOverrides] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [overridePrice, setOverridePrice] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [packageRes, areaRes] = await Promise.all([
        api.get("/package-prices/catalog"),
        api.get("/areas"),
      ]);

      setPackages(packageRes.data || []);
      setAreas(areaRes.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Package pricing data load nahi ho paya",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return packages;

    return packages.filter((item) =>
      `${item.packageName || ""} ${item.packageType || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [packages, search]);

  const openCreate = () => {
    setEditing({
      _id: null,
      configured: false,
    });

    setPackageName("");
    setPackageType("");
    setDefaultPrice("");
    setAreaOverrides([]);

    setSelectedAreaId("");
    setOverridePrice("");

    setMessage("");
    setError("");
  };

  const openEdit = (item) => {
    setEditing(item);

    setPackageName(item.packageName || "");
    setPackageType(item.packageType || "");
    setDefaultPrice(
      item.defaultPrice !== undefined ? String(item.defaultPrice) : "",
    );

    setAreaOverrides(
      (item.areaOverrides || []).map((item) => ({
        areaId:
          typeof item.areaId === "object" ? item.areaId?._id : item.areaId,

        areaName:
          typeof item.areaId === "object"
            ? item.areaId?.name
            : areas.find((a) => a._id === item.areaId)?.name || "Area",

        price: Number(item.price || 0),
      })),
    );

    setSelectedAreaId("");
    setOverridePrice("");

    setMessage("");
    setError("");
  };

  const closeEditor = () => {
    setEditing(null);
    setMessage("");
    setError("");
  };

  const addOverride = () => {
    setError("");

    if (!selectedAreaId) {
      setError("Pehle area select karein");
      return;
    }

    if (overridePrice === "" || Number(overridePrice) < 0) {
      setError("Valid area price enter karein");
      return;
    }

    const existing = areaOverrides.find(
      (item) => item.areaId === selectedAreaId,
    );

    if (existing) {
      setError("Is area ka price already added hai");
      return;
    }

    const area = areas.find((a) => a._id === selectedAreaId);

    setAreaOverrides((prev) => [
      ...prev,
      {
        areaId: selectedAreaId,
        areaName: area?.name || "Area",
        price: Number(overridePrice),
      },
    ]);

    setSelectedAreaId("");
    setOverridePrice("");
  };

  const removeOverride = (areaId) => {
    setAreaOverrides((prev) => prev.filter((item) => item.areaId !== areaId));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!packageName.trim()) {
      setError("Package name required hai");
      return;
    }

    if (defaultPrice === "" || Number(defaultPrice) < 0) {
      setError("Valid default price enter karein");
      return;
    }

    const key = getConfigKey(packageName, packageType);

    const duplicate = packages.find(
      (item) =>
        item._id !== editing?._id &&
        getConfigKey(item.packageName, item.packageType) === key &&
        item.configured,
    );

    if (duplicate) {
      setError("Ye package pricing already configured hai");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        packageName: packageName.trim(),
        packageType: packageType.trim(),
        defaultPrice: Number(defaultPrice),

        areaOverrides: areaOverrides.map((item) => ({
          areaId: item.areaId,
          price: Number(item.price),
        })),
      };

      let saved;

      if (editing?._id) {
        const response = await api.put(
          `/package-prices/${editing._id}`,
          payload,
        );

        saved = response.data;
      } else {
        const response = await api.post("/package-prices", payload);

        saved = response.data;
      }

      setMessage(
        editing?._id
          ? "Package pricing updated successfully."
          : "Package pricing created successfully.",
      );

      await loadData();

      setTimeout(() => {
        setEditing(null);
        setMessage("");
      }, 1000);

      return saved;
    } catch (err) {
      setError(
        err.response?.data?.message || "Package pricing save nahi ho payi",
      );
    } finally {
      setIsSaving(false);
    }
  };
  const applyExistingPricing = async (pkg) => {
    if (!pkg?._id) {
      alert("Please configure pricing first.");
      return;
    }

    const confirmed = window.confirm(
      `Apply pricing for "${pkg.packageName}" to all existing consumers?\n\n` +
        `Default Price: ₹${Number(pkg.defaultPrice || 0).toLocaleString("en-IN")}\n\n` +
        `Area-specific prices will be used where configured.\n` +
        `Paid bills will NOT be changed.`,
    );

    if (!confirmed) return;

    try {
      setApplyingId(pkg._id);

      const { data } = await api.post(`/package-prices/${pkg._id}/apply`);

      alert(
        `Pricing applied successfully.\n\n` +
          `Consumers Updated: ${data.updatedConsumers}\n` +
          `Bills Updated: ${data.updatedBills}\n` +
          `Skipped: ${data.skippedConsumers}`,
      );

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message || "Failed to apply package pricing.",
      );
    } finally {
      setApplyingId("");
    }
  };
  const configuredCount = packages.filter((p) => p.configured).length;

  const unconfiguredCount = packages.length - configuredCount;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* =====================================================
            HEADER
        ====================================================== */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              ADMINISTRATION
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Package Pricing
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage default package prices and area-specific price overrides.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              ↻ Refresh
            </button>

            <button
              onClick={openCreate}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              + Add Pricing
            </button>
          </div>
        </div>

        {/* =====================================================
            SUMMARY
        ====================================================== */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-400">Total Packages</p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {packages.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs text-emerald-600">Pricing Configured</p>

            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {configuredCount}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs text-amber-600">Need Pricing</p>

            <p className="mt-1 text-2xl font-bold text-amber-700">
              {unconfiguredCount}
            </p>
          </div>
        </div>

        {/* =====================================================
            MESSAGE
        ====================================================== */}
        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* =====================================================
            SEARCH
        ====================================================== */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative max-w-xl">
            <svg
              className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search package name..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>

        {/* =====================================================
            PACKAGE TABLE
        ====================================================== */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(250px,1.5fr)_130px_140px_150px_200px] items-center gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 md:grid">
            <div>Package</div>
            <div>Consumers</div>
            <div>Default Price</div>
            <div>Area Overrides</div>
            <div className="text-right">Action</div>
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">
              Loading package pricing...
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-400">
                ₹
              </div>

              <p className="mt-3 font-semibold text-slate-700">
                No package found
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Try another package name.
              </p>
            </div>
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              {filteredPackages.map((item) => (
                <div
                  key={
                    item._id || getConfigKey(item.packageName, item.packageType)
                  }
                  className="border-b border-slate-100 px-4 py-4 transition last:border-b-0 hover:bg-slate-50 md:px-5"
                >
                  {/* Desktop */}
                  <div className="hidden grid-cols-[minmax(250px,1.5fr)_120px_120px_150px_220px] items-center gap-4 md:grid">
                    {/* Package */}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {item.packageName}
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        {item.packageType && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            {item.packageType}
                          </span>
                        )}

                        {item.configured ? (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Configured
                          </span>
                        ) : (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            Price Required
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Consumers */}
                    <div className="text-sm text-slate-600">
                      {item.consumerCount}
                    </div>

                    {/* Default Price */}
                    <div>
                      {item.configured ? (
                        <span className="text-sm font-bold text-slate-900">
                          ₹
                          {Number(item.defaultPrice || 0).toLocaleString(
                            "en-IN",
                          )}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-amber-600">
                          Not Set
                        </span>
                      )}
                    </div>

                    {/* Area Overrides */}
                    <div>
                      {item.configured && item.areaOverrides?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.areaOverrides.slice(0, 2).map((override) => (
                            <span
                              key={
                                typeof override.areaId === "object"
                                  ? override.areaId?._id
                                  : override.areaId
                              }
                              className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700"
                            >
                              {typeof override.areaId === "object"
                                ? override.areaId?.name
                                : "Area"}
                            </span>
                          ))}

                          {item.areaOverrides.length > 2 && (
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                              +{item.areaOverrides.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Default only
                        </span>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        {item.configured ? "Edit" : "Set Price"}
                      </button>

                      <button
                        type="button"
                        onClick={() => applyExistingPricing(item)}
                        disabled={!item._id || applyingId === item._id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <RefreshCw
                          size={14}
                          className={
                            applyingId === item._id ? "animate-spin" : ""
                          }
                        />

                        {applyingId === item._id ? "Applying..." : "Apply"}
                      </button>
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="flex items-center gap-3 md:hidden">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 font-bold text-blue-600">
                      ₹
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {item.packageName}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {item.consumerCount} consumers
                        </span>

                        <span className="text-slate-300">•</span>

                        <span className="text-xs font-semibold text-slate-700">
                          {item.configured
                            ? `₹${Number(item.defaultPrice || 0).toLocaleString(
                                "en-IN",
                              )}`
                            : "Price not set"}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => applyExistingPricing(item)}
                        disabled={!item._id || applyingId === item._id}
                        className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-40"
                      >
                        {applyingId === item._id ? "..." : "Apply"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =====================================================
            HELP
        ====================================================== */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm">
          <p className="font-semibold text-blue-900">How pricing works</p>

          <p className="mt-1 text-xs leading-5 text-blue-700">
            Default Price sabhi areas par apply hota hai. Sirf jis area ka price
            different hai, uske liye Area Override add karein.
          </p>
        </div>

        {/* =====================================================
            EDIT PANEL
        ====================================================== */}
        {editing && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
              onClick={closeEditor}
            />

            <div className="relative flex min-h-full items-start justify-center px-4 py-8">
              <form
                onSubmit={handleSave}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-blue-100">
                        Package Pricing
                      </p>

                      <h2 className="mt-1 text-xl font-bold">
                        {editing._id ? "Edit Pricing" : "Add Pricing"}
                      </h2>

                      <p className="mt-1 text-xs text-blue-100">
                        Set default price and area-specific exceptions.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeEditor}
                      className="rounded-xl bg-white/10 px-3 py-2 text-lg hover:bg-white/20"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  {/* Error */}
                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {/* Package Name */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Package Name
                    </label>

                    <input
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                      placeholder="e.g. CCN ODIA PACK NEW"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  {/* Package Type */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Package Type
                      <span className="ml-1 font-normal text-slate-400">
                        (optional)
                      </span>
                    </label>

                    <input
                      value={packageType}
                      onChange={(e) => setPackageType(e.target.value)}
                      placeholder="e.g. SD / HD / Package"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  {/* Default Price */}
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                    <label className="mb-1.5 block text-sm font-semibold text-blue-900">
                      Default Monthly Price
                    </label>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-blue-600">
                        ₹
                      </span>

                      <input
                        type="number"
                        min="0"
                        value={defaultPrice}
                        onChange={(e) => setDefaultPrice(e.target.value)}
                        placeholder="250"
                        className="w-full rounded-xl border border-blue-200 bg-white py-3 pl-9 pr-4 text-lg font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>

                    <p className="mt-2 text-xs text-blue-700">
                      Ye price sabhi areas ke liye default rahega.
                    </p>
                  </div>

                  {/* Area Overrides */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Area Price Overrides
                        </h3>

                        <p className="text-xs text-slate-500">
                          Sirf different-price areas add karein.
                        </p>
                      </div>

                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {areaOverrides.length}
                      </span>
                    </div>

                    {/* Existing overrides */}
                    {areaOverrides.length > 0 && (
                      <div className="mb-4 max-h-48 space-y-2 overflow-y-auto">
                        {areaOverrides.map((item) => (
                          <div
                            key={item.areaId}
                            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-xs font-bold text-blue-600">
                              A
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {item.areaName}
                              </p>

                              <p className="text-xs text-slate-400">
                                Area-specific price
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="font-bold text-slate-900">
                                ₹{Number(item.price).toLocaleString("en-IN")}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeOverride(item.areaId)}
                              className="rounded-lg px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add override */}
                    <div className="rounded-xl border border-dashed border-slate-300 p-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_auto]">
                        <select
                          value={selectedAreaId}
                          onChange={(e) => setSelectedAreaId(e.target.value)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        >
                          <option value="">Select Area</option>

                          {areas
                            .filter(
                              (area) =>
                                !areaOverrides.some(
                                  (item) => item.areaId === area._id,
                                ),
                            )
                            .map((area) => (
                              <option key={area._id} value={area._id}>
                                {area.name}
                              </option>
                            ))}
                        </select>

                        <input
                          type="number"
                          min="0"
                          value={overridePrice}
                          onChange={(e) => setOverridePrice(e.target.value)}
                          placeholder="₹ Price"
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        />

                        <button
                          type="button"
                          onClick={addOverride}
                          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 border-t border-slate-100 bg-slate-50 p-5">
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {isSaving ? "Saving..." : "Save Pricing"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PackagePricing;
