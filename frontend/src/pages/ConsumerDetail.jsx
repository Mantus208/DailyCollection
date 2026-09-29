import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, AlertCircle } from "lucide-react"; // NAYA IMPORT 🌟
import api from "../api/axios";

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "-");
const formatDateTime = (d) => (d ? new Date(d).toLocaleString("en-IN") : "-");

// =========================================================
// PAYTV PREFETCH CACHE
// =========================================================
const getLiveCurrentPackage = (livePaytv) => {
  const packageName = String(livePaytv?.package?.name || "")
    .trim()
    .toLowerCase();

  const packages = Array.isArray(livePaytv?.package?.packages)
    ? livePaytv.package.packages
    : [];

  return (
    packages.find(
      (p) =>
        String(p?.name || "")
          .trim()
          .toLowerCase() === packageName,
    ) ||
    livePaytv?.hardware?.basicPackage ||
    null
  );
};
const livePaytvDataCache = new Map();
const livePaytvPromiseCache = new Map();

const preloadLivePaytv = (consumerId, force = false) => {
  if (!consumerId) {
    return Promise.resolve(null);
  }

  const key = String(consumerId);

  // Already fetched data
  if (!force && livePaytvDataCache.has(key)) {
    return Promise.resolve(livePaytvDataCache.get(key));
  }

  // Same request already running
  if (!force && livePaytvPromiseCache.has(key)) {
    return livePaytvPromiseCache.get(key);
  }

  if (force) {
    livePaytvDataCache.delete(key);
    livePaytvPromiseCache.delete(key);
  }

  const request = api
    .get(`/consumers/${key}/paytv-live`)
    .then(({ data }) => {
      livePaytvDataCache.set(key, data);
      return data;
    })
    .catch((error) => {
      livePaytvDataCache.delete(key);
      throw error;
    })
    .finally(() => {
      livePaytvPromiseCache.delete(key);
    });

  livePaytvPromiseCache.set(key, request);

  return request;
};

const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const Field = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 p-3">
    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <p className="mt-1 break-words text-sm font-semibold text-slate-800">
      {value || "-"}
    </p>
  </div>
);

const Section = ({ title, subtitle, children, action }) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="font-bold text-slate-900">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const ConsumerDetail = () => {
  const { areaId, consumerId } = useParams();

  const storedArea = localStorage.getItem("dc_selected_area");
  const area = storedArea ? JSON.parse(storedArea) : null;
  const navigate = useNavigate();

  const [consumer, setConsumer] = useState(null);

  const [livePaytv, setLivePaytv] = useState(null);
  const [livePaytvLoading, setLivePaytvLoading] = useState(false);
  const [livePaytvError, setLivePaytvError] = useState("");
  const livePaytvRequestRef = useRef(null);

  const [concessionAmount, setConcessionAmount] = useState("");
  const [concessionRemark, setConcessionRemark] = useState("");
  const [showConcessionForm, setShowConcessionForm] = useState(false);
  const [showStock, setShowStock] = useState(false);

  const [actionDrawer, setActionDrawer] = useState(null);

  const [error, setError] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [editingAmount, setEditingAmount] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [showDueForm, setShowDueForm] = useState(false);
  const [dueRemark, setDueRemark] = useState("");
  const [followUpDate, setFollowUpDate] = useState(tomorrowStr());
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [servicePurpose, setServicePurpose] = useState("service");
  const [serviceNote, setServiceNote] = useState("");
  const [serviceOutcome, setServiceOutcome] = useState("not_paid");
  const [serviceFollowUpDays, setServiceFollowUpDays] = useState("1");
  const [serviceRemark, setServiceRemark] = useState("");
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintText, setComplaintText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [previousDue, setPreviousDue] = useState("");

  const [consumerSearch, setConsumerSearch] = useState("");
  const [consumerResults, setConsumerResults] = useState([]);
  const [consumerListLoading, setConsumerListLoading] = useState(false);
  const [paytvPreloadingId, setPaytvPreloadingId] = useState("");

  const [stockItems, setStockItems] = useState([]);
  const [stockItemId, setStockItemId] = useState("");
  const [stockQty, setStockQty] = useState("1");
  const [stockUnitPrice, setStockUnitPrice] = useState("");
  const [stockAmountPaid, setStockAmountPaid] = useState("");
  const [stockRemark, setStockRemark] = useState("");
  const [stockLoading, setStockLoading] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/consumers/${consumerId}`);
      setConsumer(data);
    } catch (err) {
      setError(err.response?.data?.message || "Load nahi hua");
    }
  };
  const loadLivePaytv = async ({ force = false } = {}) => {
    if (!consumerId) return;

    const key = String(consumerId);

    // ✅ Cache available = immediately show
    if (!force && livePaytvDataCache.has(key)) {
      setLivePaytv(livePaytvDataCache.get(key));
      setLivePaytvError("");
      setLivePaytvLoading(false);
      return;
    }

    setLivePaytvLoading(true);
    setLivePaytvError("");

    try {
      const data = await preloadLivePaytv(key, force);
      console.log("🔥 LIVE PAYTV RESPONSE:", data);
      setLivePaytv(data);
    } catch (err) {
      console.error("Live PayTV load error:", err);

      setLivePaytv(null);

      setLivePaytvError(
        err.response?.data?.message || "Live PayTV information load nahi hui.",
      );
    } finally {
      setLivePaytvLoading(false);
    }
  };
  const loadStockItems = async () => {
    try {
      const { data } = await api.get("/stock/items");

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];

      setStockItems(items);
    } catch (err) {
      console.error("Stock load error:", err);
      setStockItems([]);
    }
  };
  useEffect(() => {
    // 1. Naya customer khulte hi purani history aur messages clear karo
    setHistory(null);
    setMessage("");
    setError("");

    // 2. Data load karo
    load();
    loadStockItems();
    loadLivePaytv();
    loadHistory();
  }, [consumerId]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setConsumerListLoading(true);

        const { data } = await api.get("/consumers/search", {
          params: {
            areaId,
            q: consumerSearch,
          },
        });

        setConsumerResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Consumer list load error:", err);
        setConsumerResults([]);
      } finally {
        setConsumerListLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [areaId, consumerSearch]);
  const handleCollect = async () => {
    const paidAmount = Number(amountPaid);

    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      setError("Valid amount enter karein.");
      return;
    }

    setBusy("collect");
    setError("");
    setMessage("");

    try {
      const { data } = await api.put(`/consumers/${consumerId}/collect`, {
        amountPaid: paidAmount,
      });

      console.log("COLLECTION RESPONSE:", data);

      setAmountPaid("");
      setConcessionAmount("");
      setConcessionRemark("");
      setShowConcessionForm(false);

      // IMPORTANT: database se fresh data
      await load();
      await loadHistory(); //

      setActionDrawer(null);

      setMessage(
        isPaid
          ? `₹${paidAmount} advance receive ho gaya.`
          : `₹${paidAmount} collection receive ho gaya.`,
      );
    } catch (err) {
      setError(err.response?.data?.message || "Collection save nahi hua");
    } finally {
      setBusy("");
    }
  };
  const handleAdvance = async () => {
    const advance = Number(amountPaid);

    if (!Number.isFinite(advance) || advance <= 0) {
      setError("Valid advance amount enter karein.");
      return;
    }

    setBusy("advance");
    setError("");
    setMessage("");

    try {
      const { data } = await api.put(`/consumers/${consumerId}/advance`, {
        amount: advance,
      });

      console.log("ADVANCE RESPONSE:", data);

      // Screen par immediately latest advance dikhaye
      setConsumer((prev) => ({
        ...prev,
        advanceAmount: Number(data.advanceAmount || 0),
      }));

      setAmountPaid("");

      setActionDrawer(null);

      setMessage(`₹${advance} advance successfully save ho gaya.`);

      // Database se fresh consumer data
      await load();
      await loadHistory();
      console.log("ADVANCE SENT:", advance);
      console.log("ADVANCE RESPONSE:", data);
      console.log("SERVER ADVANCE:", data.advanceAmount);
    } catch (err) {
      setError(err.response?.data?.message || "Advance payment save nahi hua");
    } finally {
      setBusy("");
    }
  };
  const handleSetPreviousDue = async () => {
    const current = Number(consumer?.previousDue || 0);

    const value = window.prompt(
      "Previous Due amount enter karein:",
      String(current),
    );

    if (value === null) {
      return;
    }

    const amount = Number(value);

    if (!Number.isFinite(amount) || amount < 0) {
      alert("Valid amount enter karein.");
      return;
    }

    try {
      setBusy("previousDue");

      await api.put(`/consumers/${consumerId}/previous-due`, {
        previousDue: amount,
      });

      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Previous due save nahi hua");
    } finally {
      setBusy("");
    }
  };
  const handleConcession = async () => {
    setBusy("concession");
    setError("");

    try {
      await api.put(`/consumers/${consumerId}/concession`, {
        amount: concessionAmount,
        remark: concessionRemark.trim(),
      });

      setConcessionAmount("");
      setConcessionRemark("");
      setShowConcessionForm(false);

      await load();
      await loadHistory();

      setActionDrawer(null);
      setMessage(`₹${concessionAmount} concession successfully apply ho gaya.`);
    } catch (err) {
      setError(err.response?.data?.message || "Concession apply nahi hua");
    } finally {
      setBusy("");
    }
  };
  const handleStockSale = async () => {
    setError("");
    setMessage("");

    const selectedItem = stockItems.find(
      (item) => String(item._id) === String(stockItemId),
    );

    if (!selectedItem) {
      return setError("Stock item select karein.");
    }

    const qty = Number(stockQty);
    const unitPrice = Number(stockUnitPrice);
    const paid = Number(stockAmountPaid || 0);
    const available = Number(selectedItem.currentStock || 0);
    const total = qty * unitPrice;

    if (!Number.isFinite(qty) || qty <= 0) {
      return setError("Quantity sahi enter karein.");
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return setError("Selling price sahi enter karein.");
    }

    if (qty > available) {
      const msg =
        `⚠️ Stock Insufficient\n\n` +
        `Available Stock: ${available}\n` +
        `Entered Quantity: ${qty}\n\n` +
        `Sirf ${available} quantity available hai.`;

      setError(msg);
      alert(msg);
      return;
    }

    if (!Number.isFinite(paid) || paid < 0) {
      return setError("Paid amount sahi enter karein.");
    }

    if (paid > total) {
      return setError(
        `Paid amount ₹${paid} total ₹${total} se zyada nahi ho sakta.`,
      );
    }

    setStockLoading(true);

    try {
      await api.post("/stock/sale", {
        consumerId,
        stockItemId,
        qty,
        unitPrice,
        amountPaid: paid,
        remark: stockRemark.trim(),
      });

      const balance = total - paid;

      setMessage(
        balance > 0
          ? `✅ ${selectedItem.name} sale ho gaya. Pending ₹${balance}`
          : `✅ ${selectedItem.name} sale successfully ho gaya.`,
      );

      setStockItemId("");
      setStockQty("1");
      setStockUnitPrice("");
      setStockAmountPaid("");
      setStockRemark("");
      setShowStock(false);
      await loadStockItems();
      setActionDrawer(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Stock sale nahi hua.",
      );
    } finally {
      setStockLoading(false);
    }
  };
  const handleEditAmount = async () => {
    setBusy("editAmount");
    setError("");
    try {
      await api.put(`/consumers/${consumerId}/edit-amount`, {
        amount: newAmount,
      });
      setEditingAmount(false);
      setNewAmount("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Amount edit nahi hua");
    } finally {
      setBusy("");
    }
  };

  const handleUnpaid = async () => {
    const confirmed = window.confirm(
      `Kya aap is payment ko reverse karke Unpaid karna chahte hain?\n\n` +
        `Collected amount ₹${bill?.amountPaid || 0} zero ho jayega.\n` +
        `Current bill ₹${bill?.amount || consumer.monthlyAmount || 0} hi rahega.`,
    );

    if (!confirmed) return;

    setBusy("unpaid");
    setError("");
    setMessage("");

    try {
      await api.put(`/consumers/${consumerId}/unpaid`);

      setMessage(
        "Galti se hua payment reverse karke bill ko Unpaid kar diya gaya.",
      );

      await load();
      await loadHistory();
    } catch (err) {
      setError(err.response?.data?.message || "Unpaid nahi ho paya");
    } finally {
      setBusy("");
    }
  };
  const handleMergeSeptemberHistory = async () => {
    const confirmed = window.confirm(
      "September ki split collection history ko ek single payment entry mein merge karna hai?\n\n" +
        "Bill/payment amount ko touch nahi kiya jayega.\n" +
        "Sirf Recent Activity clean hogi.",
    );

    if (!confirmed) return;

    setBusy("mergeSeptemberHistory");
    setError("");
    setMessage("");

    try {
      const { data } = await api.put(
        `/consumers/${consumerId}/merge-september-collection-history`,
      );

      console.log("MERGE SEPTEMBER HISTORY RESPONSE:", data);

      await load();

      setMessage(
        `September collection ₹${data.totalAmount} ko single history entry mein merge kar diya gaya.`,
      );

      setActionDrawer(null);
    } catch (err) {
      setError(
        err.response?.data?.message || "Collection history merge nahi hui",
      );
    } finally {
      setBusy("");
    }
  };
  const handleDue = async () => {
    setBusy("due");
    setError("");
    try {
      await api.put(`/consumers/${consumerId}/due`, {
        remark: dueRemark,
        followUpDate: followUpDate || null,
      });
      setDueRemark("");
      setShowDueForm(false);
      load();
      setActionDrawer(null);
    } catch (err) {
      setError(err.response?.data?.message || "Nahi ho paya");
    } finally {
      setBusy("");
    }
  };

  const handleServiceSubmit = async () => {
    if (serviceOutcome === "promised_later" && !serviceFollowUpDays) {
      alert("Follow-up days select karein.");
      return;
    }

    setBusy("service");
    setError("");
    setMessage("");

    try {
      let followUpDate = null;

      if (serviceOutcome === "promised_later") {
        const days = Number(serviceFollowUpDays);

        const date = new Date();

        date.setDate(date.getDate() + days);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        followUpDate = `${year}-${month}-${day}`;
      }

      const { data } = await api.post(`/consumers/${consumerId}/visit`, {
        purpose: servicePurpose,
        serviceNote,
        outcome: serviceOutcome,
        customerRemark: serviceRemark,
        followUpDate,
      });

      setServiceNote("");
      setServiceRemark("");
      setServiceFollowUpDays("1");
      setServiceOutcome("not_paid");
      setShowServiceForm(false);

      if (data.followUpCreated) {
        setMessage(
          "Payment promise save ho gaya aur follow-up dashboard mein add ho gaya.",
        );
      } else {
        setMessage("Visit entry save ho gayi.");
      }

      load();
      setActionDrawer(null);
    } catch (err) {
      const msg = err.response?.data?.message || "Save nahi hua";

      setError(msg);

      // Important: user ko clearly alert bhi mile
      alert(msg);
    } finally {
      setBusy("");
    }
  };

  const handleComplaintSubmit = async () => {
    setBusy("complaint");
    setError("");
    try {
      await api.post("/complaints", { consumerId, complaintText });
      setComplaintText("");
      setShowComplaintForm(false);
      setMessage("Complaint darj ho gayi");
      setActionDrawer(null);
    } catch (err) {
      setError(err.response?.data?.message || "Complaint darj nahi hui");
    } finally {
      setBusy("");
    }
  };

  const loadHistory = async () => {
    setBusy("history");
    setError("");

    try {
      const { data } = await api.get(`/consumers/${consumerId}/history`);

      console.log("HISTORY RESPONSE:", data);

      setHistory({
        bills: Array.isArray(data?.bills) ? data.bills : [],
        visits: Array.isArray(data?.visits) ? data.visits : [],
      });

      setShowHistory(true);
    } catch (err) {
      console.error("HISTORY ERROR:", err);
      setError(err.response?.data?.message || "History load nahi hui");
    } finally {
      setBusy("");
    }
  };

  if (!consumer) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-500">
        Loading consumer...
      </div>
    );
  }

  const bill = consumer.currentBill;

  const currentBillAmount = Number(bill?.amount ?? consumer.monthlyAmount ?? 0);

  const currentBillPaid = Number(bill?.amountPaid ?? 0);

  const currentBillConcession = Number(bill?.concessionAmount ?? 0);

  const currentBalance = Math.max(
    currentBillAmount - currentBillPaid - currentBillConcession,
    0,
  );

  // Previous monthly bills
  const previousBillsDue = Number(consumer?.previousBillsDue ?? 0);

  // Manual previous due
  const manualPreviousDue = Number(consumer?.previousDue ?? 0);

  // Combined previous due
  const totalPreviousDue = previousBillsDue + manualPreviousDue;

  // Advance
  const advanceAmount = Number(consumer?.advanceAmount ?? 0);

  // Final total outstanding
  const totalOutstanding = Math.max(
    totalPreviousDue + currentBalance - advanceAmount,
    0,
  );

  // Used for Collect / Advance button
  const isPaid = Boolean(bill) && totalOutstanding <= 0;

  // Existing compatibility
  const balance = totalOutstanding;
  const livePackages = Array.isArray(livePaytv?.package?.packages)
    ? livePaytv.package.packages
    : [];

  const liveBasicPackage = livePaytv?.package?.name
    ? livePaytv.package
    : livePackages.find(
        (item) => String(item?.packType || "").toLowerCase() === "basic",
      );

  const liveAddonPackages = livePackages.filter(
    (item) => String(item?.packType || "").toLowerCase() === "addon",
  );

  const selectedStockItem = stockItems.find(
    (item) => String(item._id) === String(stockItemId),
  );

  const stockTotal = Number(stockQty || 0) * Number(stockUnitPrice || 0);

  const stockPending = Math.max(stockTotal - Number(stockAmountPaid || 0), 0);
  const currentLivePackage =
    livePaytv?.package?.packages?.find(
      (p) =>
        String(p?.name || "")
          .trim()
          .toLowerCase() ===
        String(livePaytv?.package?.name || "")
          .trim()
          .toLowerCase(),
    ) || null;
  const liveDisplayStartDate =
    currentLivePackage?.startDate || livePaytv?.package?.startDate || null;

  const liveDisplayExpiryDate =
    currentLivePackage?.endDate || livePaytv?.package?.expiryDate || null;
  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <div className="mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* =========================================================
          LEFT CONSUMER LIST - DESKTOP
        ========================================================== */}
        <aside className="sticky top-0 hidden h-screen border-r border-slate-200 bg-white lg:block">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-slate-200 px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-bold text-slate-900">
                    Consumers
                  </h2>

                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Current Area
                    {area?.name && (
                      <span className="ml-1 font-semibold text-blue-600">
                        {area.name}
                      </span>
                    )}
                  </p>
                </div>

                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                  {consumerResults.length}
                </span>
              </div>

              <div className="mt-3">
                <input
                  type="text"
                  value={consumerSearch}
                  onChange={(e) => setConsumerSearch(e.target.value)}
                  placeholder="Search consumer..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Consumer List */}
            <div className="flex-1 overflow-y-auto">
              {consumerListLoading ? (
                <div className="px-4 py-8 text-center text-xs text-slate-400">
                  Loading...
                </div>
              ) : consumerResults.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-500">
                    No consumer found
                  </p>

                  <p className="mt-1 text-[11px] text-slate-400">
                    Search by name, ID or mobile
                  </p>
                </div>
              ) : (
                consumerResults.map((c) => {
                  const cBill = c.currentBill;

                  const cAmount = Number(cBill?.amount ?? c.monthlyAmount ?? 0);

                  const cPaid = Number(cBill?.amountPaid ?? 0);

                  const cPrevious = Number(c.previousDue ?? 0);

                  const cAdvance = Number(c.advanceAmount ?? 0);

                  const cDue = Math.max(
                    cPrevious + Math.max(cAmount - cPaid, 0) - cAdvance,
                    0,
                  );

                  const selected = String(c._id) === String(consumer?._id);

                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => {
                        // PayTV background mein start
                        void preloadLivePaytv(c._id);

                        // Page immediately open
                        navigate(`/area/${areaId}/consumer/${c._id}`);
                      }}
                      className={`w-full border-b border-slate-100 px-4 py-3 text-left transition ${
                        selected ? "bg-blue-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            selected
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {(c.name || "?").charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[13px] font-semibold text-slate-800">
                              {c.name}
                            </p>

                            {cDue > 0 ? (
                              <span className="shrink-0 text-[11px] font-bold text-amber-600">
                                ₹{cDue}
                              </span>
                            ) : (
                              <span className="shrink-0 text-[10px] font-bold text-emerald-600">
                                PAID
                              </span>
                            )}
                          </div>

                          <p className="mt-0.5 truncate text-[10px] text-slate-400">
                            {c.consumerId || "-"}
                          </p>
                        </div>

                        {paytvPreloadingId === c._id ? (
                          <span className="shrink-0 text-[10px] font-semibold text-blue-600">
                            Loading...
                          </span>
                        ) : (
                          <span className="shrink-0 text-slate-300">›</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* =========================================================
          RIGHT CUSTOMER PANEL (CLEAN UI)
        ========================================================== */}
        <main className="relative min-w-0 bg-[#f5f7fb]">
          {/* =======================================================
            CLEAN HEADER
          ======================================================== */}
          <div className="sticky top-0 z-30 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between px-4 py-4 md:px-6">
              <div className="flex min-w-0 items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate(`/area/${areaId}/search`)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 lg:hidden"
                >
                  ←
                </button>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white shadow-sm">
                  {(consumer.name || "?").charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-lg font-extrabold text-slate-900">
                    {consumer.name}
                  </h1>

                  <p className="truncate text-[12px] font-medium text-slate-500">
                    {consumer.consumerId}
                    {consumer.mobile ? ` • ${consumer.mobile}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {consumer.mobile && consumer.mobile !== "-" && (
                  <button
                    type="button"
                    onClick={() =>
                      (window.location.href = `tel:${consumer.mobile}`)
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                  >
                    📞
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActionDrawer("more")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600 transition hover:bg-slate-200"
                >
                  ⋮
                </button>
              </div>
            </div>
          </div>

          {/* =======================================================
            MAIN LEDGER AREA
          ======================================================== */}
          <div className="px-3 py-4 pb-40 md:px-6 md:py-6 md:pb-36">
            {/* Alert Messages */}
            {message && (
              <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700 shadow-sm">
                {message}
              </div>
            )}

            {error && (
              <div className="mb-4 whitespace-pre-line rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700 shadow-sm">
                {error}
              </div>
            )}

            <div className="mx-auto max-w-2xl">
              {/* =======================================================
                  SMART STATUS CARD (Replaces both old breakdown cards)
              ======================================================== */}
              <div
                className={`rounded-3xl border shadow-sm p-6 mb-6 ${
                  totalOutstanding <= 0
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-white border-slate-200"
                }`}
              >
                {totalOutstanding <= 0 ? (
                  // ✅ PAID STATE
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <CheckCircle2 className="mb-4 h-16 w-16 text-emerald-500" />
                    <h3 className="text-2xl font-black text-emerald-800">
                      Account Clear
                    </h3>
                    <p className="mt-2 text-sm font-medium text-emerald-600">
                      Koi pending due nahi hai.
                    </p>
                  </div>
                ) : (
                  // ⚠️ UNPAID STATE
                  <div>
                    <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
                      <AlertCircle className="h-7 w-7 text-rose-500" />
                      <h3 className="text-xl font-bold text-slate-900">
                        Payment Pending
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-slate-50 p-5">
                      <div className="text-center">
                        <p className="mb-1 text-xs font-semibold text-slate-500">
                          Current Bill
                        </p>
                        <p className="text-lg font-bold text-slate-700">
                          ₹{currentBillAmount}
                        </p>
                      </div>

                      <div className="text-xl font-black text-slate-300">+</div>

                      <div className="text-center">
                        <p className="mb-1 text-xs font-semibold text-slate-500">
                          Previous Due
                        </p>
                        <p className="text-lg font-bold text-slate-700">
                          ₹{totalPreviousDue}
                        </p>
                      </div>

                      {currentBillPaid > 0 && (
                        <>
                          <div className="text-xl font-black text-slate-300">
                            -
                          </div>
                          <div className="text-center">
                            <p className="mb-1 text-xs font-semibold text-slate-500">
                              Paid
                            </p>
                            <p className="text-lg font-bold text-emerald-500">
                              ₹{currentBillPaid}
                            </p>
                          </div>
                        </>
                      )}

                      {currentBillConcession > 0 && (
                        <>
                          <div className="text-xl font-black text-slate-300">
                            -
                          </div>
                          <div className="text-center">
                            <p className="mb-1 text-xs font-semibold text-slate-500">
                              Discount
                            </p>
                            <p className="text-lg font-bold text-orange-500">
                              ₹{currentBillConcession}
                            </p>
                          </div>
                        </>
                      )}

                      {advanceAmount > 0 && (
                        <>
                          <div className="text-xl font-black text-slate-300">
                            -
                          </div>
                          <div className="text-center">
                            <p className="mb-1 text-xs font-semibold text-slate-500">
                              Advance
                            </p>
                            <p className="text-lg font-bold text-indigo-500">
                              ₹{advanceAmount}
                            </p>
                          </div>
                        </>
                      )}

                      <div className="text-xl font-black text-slate-300">=</div>

                      <div className="text-center">
                        <p className="mb-1 text-xs font-black uppercase tracking-wider text-rose-500">
                          Total Due
                        </p>
                        <p className="text-2xl font-black text-rose-600">
                          ₹{totalOutstanding}
                        </p>
                      </div>
                    </div>

                    {bill?.status === "due" && (
                      <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
                          Follow-up Added
                        </p>
                        {bill.dueRemark && (
                          <p className="mt-1 text-xs text-amber-800">
                            {bill.dueRemark}
                          </p>
                        )}
                        {bill.followUpDate && (
                          <p className="mt-1 text-[11px] font-bold text-amber-600">
                            Expected Date: {formatDate(bill.followUpDate)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* No Package Price Configured Warning */}
              {!bill && currentBillAmount <= 0 && (
                <div className="mb-6 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-5 py-4">
                  <p className="text-sm font-bold text-amber-700">
                    Current package price configured nahi hai.
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber-600">
                    Package Pricing screen se price configure karein.
                  </p>
                </div>
              )}

              {/* =====================================================
                  RECENT ACTIVITY
              ====================================================== */}
              {history?.visits?.length > 0 && (
                <div className="mt-8">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Recent Activity
                    </span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    {history.visits.slice(0, 8).map((v) => {
                      const amount = Number(v.amountCollected || 0);
                      const isPayment = amount > 0;

                      return (
                        <div
                          key={v._id}
                          className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition"
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                                isPayment
                                  ? "bg-emerald-100 text-emerald-600"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {isPayment ? "₹" : "•"}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-800">
                                {isPayment
                                  ? "Payment Received"
                                  : v.purpose || "Activity"}
                              </p>

                              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                                {v.outcome || "-"}
                                {" • "}
                                {formatDateTime(v.createdAt)}
                              </p>

                              {v.customerRemark && (
                                <p className="mt-1 truncate text-xs text-slate-500">
                                  {v.customerRemark}
                                </p>
                              )}
                            </div>
                          </div>

                          {isPayment && (
                            <p className="shrink-0 text-lg font-black text-emerald-600">
                              ₹{amount}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* =======================================================
            BOTTOM ACTION BAR (Unchanged)
          ======================================================== */}
          <div className="fixed bottom-3 left-3 right-3 z-40 lg:left-[calc(300px+16px)] lg:right-4">
            <div className="mx-auto grid max-w-[1000px] grid-cols-4 gap-1.5 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur">
              <button
                type="button"
                onClick={() => setActionDrawer("collect")}
                disabled={!isPaid && currentBillAmount <= 0}
                className="rounded-xl bg-emerald-600 py-3 text-[11px] font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                💰 {isPaid ? "Advance" : "Collect"}
              </button>

              <button
                type="button"
                onClick={() => setActionDrawer("due")}
                className="rounded-xl bg-amber-50 py-3 text-[11px] font-extrabold text-amber-700 transition hover:bg-amber-100"
              >
                ⏳ Due
              </button>

              <button
                type="button"
                onClick={() => setActionDrawer("concession")}
                className="rounded-xl bg-orange-50 py-3 text-[11px] font-extrabold text-orange-700 transition hover:bg-orange-100"
              >
                🎁 Discount
              </button>

              <button
                type="button"
                onClick={() => setActionDrawer("more")}
                className="rounded-xl bg-slate-100 py-3 text-[11px] font-extrabold text-slate-700 transition hover:bg-slate-200"
              >
                ⋮ More
              </button>
            </div>
          </div>

          {/* =======================================================
            RIGHT ACTION DRAWER (Unchanged)
          ======================================================== */}
          {actionDrawer && (
            <>
              {/* Overlay */}
              <button
                type="button"
                aria-label="Close"
                onClick={() => setActionDrawer(null)}
                className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm"
              />

              <div
                className={`fixed z-[60] overflow-y-auto bg-white shadow-2xl transition-transform ${
                  actionDrawer === "more"
                    ? "right-0 top-0 h-full w-[320px] max-w-[90vw]"
                    : "bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl lg:bottom-0 lg:left-auto lg:top-0 lg:h-full lg:max-h-none lg:w-[400px] lg:rounded-none"
                }`}
              >
                {/* Drawer Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      {actionDrawer === "collect" &&
                        (isPaid ? "Advance Payment" : "Collect Payment")}
                      {actionDrawer === "due" && "Due / Follow-up"}
                      {actionDrawer === "concession" && "Concession"}
                      {actionDrawer === "editAmount" && "Edit Amount"}
                      {actionDrawer === "info" && "Customer Information"}
                      {actionDrawer === "stock" && "Sell Stock Item"}
                      {actionDrawer === "service" && "Service / Visit"}
                      {actionDrawer === "complaint" && "Complaint"}
                      {actionDrawer === "history" && "Transaction History"}
                      {actionDrawer === "more" && "More Actions"}
                    </h2>

                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {consumer.name}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActionDrawer(null)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                  >
                    ×
                  </button>
                  {[
                    "info",
                    "editAmount",
                    "stock",
                    "service",
                    "complaint",
                    "history",
                  ].includes(actionDrawer) && (
                    <button
                      type="button"
                      onClick={() => setActionDrawer("more")}
                      className="flex w-full items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      <span className="text-sm">←</span>
                      Menu par wapas
                    </button>
                  )}
                </div>

                {/* =================================================
                  COLLECT
                ================================================== */}
                {actionDrawer === "collect" && (
                  <div className="p-6">
                    <div className="mb-6 rounded-2xl bg-slate-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {isPaid
                          ? "Advance for Next Month"
                          : "Current Outstanding"}
                      </p>

                      <p
                        className={`mt-1 text-4xl font-black ${
                          isPaid ? "text-blue-600" : "text-amber-600"
                        }`}
                      >
                        ₹{isPaid ? advanceAmount : totalOutstanding}
                      </p>

                      <p className="mt-2 text-xs font-medium text-slate-500">
                        {isPaid
                          ? "Payment future month ke liye save hoga."
                          : "Current bill / previous due ke against adjust hoga."}
                      </p>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                          {isPaid ? "Advance Amount" : "Received Amount"}
                        </label>

                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
                            ₹
                          </span>

                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(e.target.value)}
                            placeholder="0"
                            autoFocus
                            className="w-full rounded-2xl border-2 border-slate-200 bg-white py-4 pl-10 pr-4 text-2xl font-black outline-none transition focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {isPaid && (
                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                          <p className="text-xs font-bold text-blue-700">
                            Advance Payment
                          </p>

                          <p className="mt-1 text-[11px] leading-5 text-blue-600">
                            Ye amount current month collection mein add nahi
                            hoga. Future month ke liye advance balance mein save
                            hoga.
                          </p>
                        </div>
                      )}

                      {!isPaid && currentBillAmount <= 0 && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                          <p className="text-xs font-bold text-red-700">
                            Current package price configured nahi hai.
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={isPaid ? handleAdvance : handleCollect}
                        disabled={
                          isPaid
                            ? busy === "advance" || !amountPaid
                            : busy === "collect" ||
                              !amountPaid ||
                              currentBillAmount <= 0
                        }
                        className={`w-full rounded-2xl py-4 text-sm font-black text-white transition ${
                          isPaid
                            ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                            : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                        } shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none`}
                      >
                        {isPaid
                          ? busy === "advance"
                            ? "Saving..."
                            : "Receive Advance"
                          : busy === "collect"
                            ? "Saving..."
                            : "Collect Payment"}
                      </button>
                    </div>
                  </div>
                )}

                {/* =================================================
                  DUE
                ================================================== */}
                {actionDrawer === "due" && (
                  <div className="space-y-5 p-6">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Remark
                      </label>

                      <textarea
                        value={dueRemark}
                        onChange={(e) => setDueRemark(e.target.value)}
                        placeholder="Kyu due hai?"
                        rows={4}
                        className="w-full rounded-2xl border-2 border-slate-200 p-4 text-sm font-medium outline-none transition focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Follow-up Date
                      </label>

                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-sm font-medium outline-none transition focus:border-amber-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleDue}
                      disabled={busy === "due"}
                      className="w-full rounded-2xl bg-amber-500 py-4 text-sm font-black text-white shadow-lg shadow-amber-200 transition hover:bg-amber-600 disabled:opacity-50 disabled:shadow-none"
                    >
                      {busy === "due" ? "Saving..." : "Confirm Due"}
                    </button>
                  </div>
                )}

                {/* =================================================
                  CONCESSION
                ================================================== */}
                {actionDrawer === "concession" && (
                  <div className="space-y-5 p-6">
                    <div className="rounded-2xl bg-orange-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-orange-700">
                        Current Outstanding
                      </p>
                      <p className="mt-1 text-3xl font-black text-orange-800">
                        ₹{totalOutstanding}
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Concession Amount
                      </label>

                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={concessionAmount}
                          onChange={(e) => setConcessionAmount(e.target.value)}
                          placeholder="0"
                          className="w-full rounded-2xl border-2 border-slate-200 py-3.5 pl-10 pr-4 text-lg font-bold outline-none transition focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Remark
                      </label>

                      <input
                        type="text"
                        value={concessionRemark}
                        onChange={(e) => setConcessionRemark(e.target.value)}
                        placeholder="Reason for concession"
                        className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-sm font-medium outline-none transition focus:border-orange-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleConcession}
                      disabled={busy === "concession" || !concessionAmount}
                      className="w-full rounded-2xl bg-orange-500 py-4 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:opacity-50 disabled:shadow-none"
                    >
                      {busy === "concession"
                        ? "Applying..."
                        : "Apply Concession"}
                    </button>
                  </div>
                )}

                {/* =================================================
                  MORE MENU
                ================================================== */}
                {actionDrawer === "more" && (
                  <div className="space-y-2 p-4">
                    <button
                      type="button"
                      onClick={() => {
                        setActionDrawer("info");
                      }}
                      className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                    >
                      Customer Information
                      <span className="text-slate-400">›</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionDrawer("editAmount")}
                      className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                    >
                      Edit Amount
                      <span className="text-slate-400">›</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          "PRE-START BILLING RESET\n\n" +
                            "August aur usse pehle ke MonthlyBill records delete honge.\n" +
                            "September ki collection current September bill mein re-allocate hogi.\n\n" +
                            "Kya aap continue karna chahte hain?",
                        );

                        if (!confirmed) return;

                        try {
                          setBusy("resetPreStart");

                          const { data } = await api.put(
                            `/consumers/${consumerId}/reset-prestart-billing`,
                          );

                          console.log(
                            "RESET PRE-START BILLING RESPONSE:",
                            data,
                          );

                          setMessage(
                            `Pre-start billing clear ho gaya. ` +
                              `September collection ₹${data.septemberCollected} ` +
                              `current bill mein adjust hua.`,
                          );

                          await load();
                          setActionDrawer(null);
                        } catch (err) {
                          setError(
                            err.response?.data?.message ||
                              "Pre-start billing reset nahi hua",
                          );
                        } finally {
                          setBusy("");
                        }
                      }}
                      disabled={busy === "resetPreStart"}
                      className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <span>
                        {busy === "resetPreStart"
                          ? "Resetting..."
                          : "Reset Pre-Start Billing"}
                      </span>
                      <span>↻</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSetPreviousDue}
                      className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                    >
                      Previous Due
                      <span className="text-slate-500">
                        ₹{manualPreviousDue}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionDrawer("stock")}
                      className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                    >
                      Sell Stock
                      <span className="text-slate-400">›</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionDrawer("service")}
                      className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                    >
                      Service / Visit
                      <span className="text-slate-400">›</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionDrawer("complaint")}
                      className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                    >
                      Complaint
                      <span className="text-slate-400">›</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setActionDrawer("history");
                        await loadHistory();
                      }}
                      className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                    >
                      Transaction History
                      <span className="text-slate-400">›</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleMergeSeptemberHistory}
                      disabled={busy === "mergeSeptemberHistory"}
                      className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left text-sm font-bold text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
                    >
                      <span>
                        {busy === "mergeSeptemberHistory"
                          ? "Merging..."
                          : "Merge September Collection"}
                      </span>
                      <span>↔</span>
                    </button>

                    {isPaid && (
                      <>
                        <div className="my-2 border-t border-slate-100" />
                        <button
                          type="button"
                          onClick={handleUnpaid}
                          disabled={busy === "unpaid"}
                          className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"
                        >
                          {busy === "unpaid" ? "Reversing..." : "Mark Unpaid"}
                          <span>↶</span>
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* =================================================
                  EDIT AMOUNT
                ================================================== */}
                {actionDrawer === "editAmount" && (
                  <div className="space-y-5 p-6">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Monthly Amount
                      </label>
                      <input
                        type="number"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        placeholder="₹ Amount"
                        className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-lg font-bold outline-none transition focus:border-blue-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleEditAmount}
                      disabled={busy === "editAmount"}
                      className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none"
                    >
                      {busy === "editAmount" ? "Saving..." : "Save Amount"}
                    </button>
                  </div>
                )}

                {/* =================================================
                  CUSTOMER INFO (PayTV Live Data)
                ================================================== */}
                {actionDrawer === "info" && (
                  <div className="p-6">
                    {livePaytvLoading ? (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-8 text-center">
                        <p className="text-sm font-bold text-blue-700">
                          Live PayTV information load ho rahi hai...
                        </p>
                        <p className="mt-2 text-xs font-medium text-blue-500">
                          Please wait
                        </p>
                      </div>
                    ) : livePaytvError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6">
                        <p className="text-sm font-bold text-red-700">
                          Live PayTV data unavailable
                        </p>
                        <p className="mt-1 text-xs font-medium text-red-600">
                          {livePaytvError}
                        </p>
                        <button
                          type="button"
                          onClick={() => loadLivePaytv({ force: true })}
                          className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-700"
                        >
                          Retry Refresh
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="mb-5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                              PayTV Live Information
                            </p>
                            <p className="mt-1 text-xs font-bold text-emerald-600">
                              ● Live Connected
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => loadLivePaytv({ force: true })}
                            disabled={livePaytvLoading}
                            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                          >
                            {livePaytvLoading ? "Refreshing..." : "↻ Refresh"}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Field
                            label="Address"
                            value={
                              [
                                livePaytv?.address?.address1,
                                livePaytv?.address?.address2,
                                livePaytv?.address?.address3,
                                livePaytv?.address?.area?.name,
                                livePaytv?.address?.city?.name,
                                livePaytv?.address?.postCode,
                              ]
                                .filter(Boolean)
                                .join(", ") || "-"
                            }
                          />

                          <Field
                            label="Mobile"
                            value={livePaytv?.consumer?.mobile || "-"}
                          />

                          <Field
                            label="STB No"
                            value={livePaytv?.hardware?.stbNo || "-"}
                          />

                          <Field
                            label="VC No"
                            value={livePaytv?.hardware?.vcNo || "-"}
                          />
                          <Field
                            label="Start Date"
                            value={
                              liveDisplayStartDate
                                ? formatDate(liveDisplayStartDate)
                                : "-"
                            }
                          />

                          <Field
                            label="Expiry"
                            value={
                              liveDisplayExpiryDate
                                ? formatDate(liveDisplayExpiryDate)
                                : "-"
                            }
                          />
                        </div>

                        {livePaytv?.package?.pricingBreakdown?.length > 0 && (
                          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="px-4 py-3 font-bold text-slate-500">
                                    Package
                                  </th>
                                  <th className="px-4 py-3 text-right font-bold text-slate-500">
                                    Price
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {livePaytv.package.pricingBreakdown.map(
                                  (item, i) => (
                                    <tr
                                      key={i}
                                      className="border-t border-slate-100"
                                    >
                                      <td className="px-4 py-3 font-medium text-slate-700">
                                        {item.name}
                                      </td>
                                      <td className="px-4 py-3 text-right font-bold text-slate-800">
                                        {item.configuredPrice != null ? (
                                          `₹${item.configuredPrice}`
                                        ) : (
                                          <span className="text-amber-600">
                                            Not set
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                              <tfoot>
                                <tr className="border-t-2 border-slate-200 bg-slate-50">
                                  <td className="px-4 py-3 font-extrabold text-slate-900">
                                    Customer Monthly Amount
                                  </td>
                                  <td className="px-4 py-3 text-right font-black text-slate-900">
                                    {livePaytv.package.totalAmount != null
                                      ? `₹${livePaytv.package.totalAmount}`
                                      : "-"}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                            {livePaytv.package.missingPricing?.length > 0 && (
                              <p className="bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
                                ⚠ In packages ka price "Package Pricing" screen
                                se set karein:{" "}
                                {livePaytv.package.missingPricing
                                  .map((m) => m.packageName)
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                        )}
                        {!livePaytv?.package?.pricingBreakdown?.length && (
                          <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center">
                            <p className="text-xs font-semibold text-slate-600">
                              Koi active package nahi
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              PayTV me is customer ka koi package abhi active
                              nahi hai.
                            </p>
                          </div>
                        )}
                        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Live fetched
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-600">
                            {formatDateTime(livePaytv?.fetchedAt)}
                          </p>
                        </div>

                        <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-500">
                            PayTV Mapping
                          </p>
                          <p className="mt-1 text-xs font-bold text-blue-700">
                            Franchisee: {livePaytv?.paytv?.franchiseeId || "-"}
                            {" • "}
                            Area: {livePaytv?.paytv?.areaId || "-"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* =================================================
                  STOCK
                ================================================== */}
                {actionDrawer === "stock" && (
                  <div className="space-y-4 p-6">
                    <select
                      value={stockItemId}
                      onChange={(e) => {
                        setStockItemId(e.target.value);
                        setStockUnitPrice("");
                      }}
                      className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-sm font-bold outline-none transition focus:border-indigo-500"
                    >
                      <option value="">Select item</option>
                      {stockItems.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name} — Stock: {item.currentStock || 0}
                        </option>
                      ))}
                    </select>

                    {selectedStockItem && (
                      <div className="rounded-2xl bg-blue-50 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                            Available Stock
                          </span>
                          <span className="text-xl font-black text-blue-700">
                            {selectedStockItem.currentStock || 0}
                          </span>
                        </div>

                        {Number(stockQty) >
                          Number(selectedStockItem.currentStock || 0) && (
                          <p className="mt-2 text-xs font-bold text-red-600">
                            ⚠ Stock insufficient
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={stockQty}
                        onChange={(e) => setStockQty(e.target.value)}
                        placeholder="Qty"
                        className="rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-sm font-bold outline-none transition focus:border-indigo-500"
                      />

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={stockUnitPrice}
                        onChange={(e) => setStockUnitPrice(e.target.value)}
                        placeholder="Price/Unit"
                        className="rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-sm font-bold outline-none transition focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-3 text-center">
                        <p className="text-xs font-semibold text-slate-400">
                          Total
                        </p>
                        <p className="mt-1 text-base font-black">
                          ₹{stockTotal}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-emerald-50 p-3 text-center">
                        <p className="text-xs font-semibold text-emerald-600">
                          Paid
                        </p>
                        <p className="mt-1 text-base font-black text-emerald-700">
                          ₹{Number(stockAmountPaid || 0)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-amber-50 p-3 text-center">
                        <p className="text-xs font-semibold text-amber-600">
                          Due
                        </p>
                        <p className="mt-1 text-base font-black text-amber-700">
                          ₹{Math.max(stockPending, 0)}
                        </p>
                      </div>
                    </div>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={stockAmountPaid}
                      onChange={(e) => setStockAmountPaid(e.target.value)}
                      placeholder="Amount received (₹)"
                      className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-sm font-bold outline-none transition focus:border-indigo-500"
                    />

                    <input
                      type="text"
                      value={stockRemark}
                      onChange={(e) => setStockRemark(e.target.value)}
                      placeholder="Remark (optional)"
                      className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-sm font-medium outline-none transition focus:border-indigo-500"
                    />

                    <button
                      type="button"
                      onClick={handleStockSale}
                      disabled={
                        stockLoading ||
                        !stockItemId ||
                        !stockQty ||
                        !stockUnitPrice
                      }
                      className="w-full rounded-2xl bg-indigo-600 py-4 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none"
                    >
                      {stockLoading ? "Selling..." : "Confirm Sale"}
                    </button>
                  </div>
                )}

                {/* =================================================
                  SERVICE
                ================================================== */}
                {actionDrawer === "service" && (
                  <div className="space-y-4 p-6">
                    <select
                      value={servicePurpose}
                      onChange={(e) => setServicePurpose(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-sm font-bold outline-none transition focus:border-blue-500"
                    >
                      <option value="service">Service / Repair</option>
                      <option value="collection">Collection Attempt</option>
                      <option value="other">Other</option>
                    </select>

                    <input
                      value={serviceNote}
                      onChange={(e) => setServiceNote(e.target.value)}
                      placeholder="Visit ka reason..."
                      className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-sm font-medium outline-none transition focus:border-blue-500"
                    />

                    <select
                      value={serviceOutcome}
                      onChange={(e) => {
                        const value = e.target.value;
                        setServiceOutcome(value);
                        if (value === "promised_later") {
                          setServiceFollowUpDays("1");
                        }
                      }}
                      className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-sm font-bold outline-none transition focus:border-blue-500"
                    >
                      <option value="not_paid">Paisa nahi mila</option>
                      <option value="promised_later">
                        Baad me denge (Promise)
                      </option>
                      <option value="paid">Paisa mil gaya</option>
                    </select>

                    {serviceOutcome === "promised_later" && (
                      <select
                        value={serviceFollowUpDays}
                        onChange={(e) => setServiceFollowUpDays(e.target.value)}
                        className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-sm font-bold outline-none transition focus:border-blue-500"
                      >
                        <option value="1">1 Day Later</option>
                        <option value="2">2 Days Later</option>
                        <option value="3">3 Days Later</option>
                        <option value="7">7 Days Later</option>
                        <option value="15">15 Days Later</option>
                        <option value="30">30 Days Later</option>
                      </select>
                    )}

                    <input
                      value={serviceRemark}
                      onChange={(e) => setServiceRemark(e.target.value)}
                      placeholder="Customer ne kya kaha..."
                      className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-sm font-medium outline-none transition focus:border-blue-500"
                    />

                    <button
                      type="button"
                      onClick={handleServiceSubmit}
                      disabled={busy === "service"}
                      className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none"
                    >
                      {busy === "service" ? "Saving..." : "Save Visit"}
                    </button>
                  </div>
                )}

                {/* =================================================
                  COMPLAINT
                ================================================== */}
                {actionDrawer === "complaint" && (
                  <div className="space-y-4 p-6">
                    <textarea
                      value={complaintText}
                      onChange={(e) => setComplaintText(e.target.value)}
                      placeholder="Customer ki problem describe karein..."
                      rows={5}
                      className="w-full rounded-2xl border-2 border-slate-200 p-4 text-sm font-medium outline-none transition focus:border-orange-500"
                    />

                    <button
                      type="button"
                      onClick={handleComplaintSubmit}
                      disabled={busy === "complaint"}
                      className="w-full rounded-2xl bg-orange-600 py-4 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700 disabled:opacity-50 disabled:shadow-none"
                    >
                      {busy === "complaint" ? "Saving..." : "Save Complaint"}
                    </button>
                  </div>
                )}

                {/* =================================================
                  HISTORY
                ================================================== */}
                {actionDrawer === "history" && (
                  <div className="space-y-6 p-6">
                    {/* Bills */}
                    <div>
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Monthly Bills
                      </p>
                      <div className="space-y-3">
                        {!history?.bills?.length ? (
                          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-500">
                            Koi bill nahi.
                          </p>
                        ) : (
                          history.bills.map((b) => (
                            <div
                              key={b._id}
                              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                            >
                              <div>
                                <p className="text-sm font-extrabold text-slate-800">
                                  {b.month}
                                </p>
                                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                  {b.status}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-black text-slate-800">
                                  <span
                                    className={
                                      b.amountPaid > 0 ? "text-emerald-600" : ""
                                    }
                                  >
                                    ₹{b.amountPaid || 0}
                                  </span>
                                  <span className="text-slate-300 mx-1">/</span>
                                  ₹{b.amount}
                                </p>

                                {/* 🟢 DISCOUNT DIKHANE KE LIYE YE ADD KIYA */}
                                {Number(b.concessionAmount || 0) > 0 && (
                                  <p className="mt-1 text-[10px] font-bold text-orange-500">
                                    Discount: ₹{b.concessionAmount}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Visits */}
                    <div>
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Activity History
                      </p>
                      <div className="space-y-3">
                        {!history?.visits?.length ? (
                          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-500">
                            Koi activity nahi.
                          </p>
                        ) : (
                          history.visits.map((v) => (
                            <div
                              key={v._id}
                              className={`rounded-2xl border p-4 ${
                                Number(v.amountCollected || 0) > 0
                                  ? "border-emerald-100 bg-emerald-50"
                                  : "border-slate-100 bg-white shadow-sm"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-bold text-slate-800">
                                  {v.purpose || "Activity"}
                                </p>
                                {Number(v.amountCollected || 0) > 0 && (
                                  <p className="text-base font-black text-emerald-600">
                                    ₹{v.amountCollected}
                                  </p>
                                )}
                              </div>
                              <p className="mt-1 text-xs font-medium text-slate-500">
                                {v.outcome || "-"}
                              </p>
                              {v.serviceNote && (
                                <p className="mt-1.5 text-xs text-slate-600">
                                  {v.serviceNote}
                                </p>
                              )}
                              {v.customerRemark && (
                                <p className="mt-1 text-xs italic text-slate-600">
                                  “{v.customerRemark}”
                                </p>
                              )}
                              <p className="mt-2 text-[10px] font-bold text-slate-400">
                                {formatDateTime(v.createdAt)} •{" "}
                                {v.visitedBy?.name || "User"}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default ConsumerDetail;
