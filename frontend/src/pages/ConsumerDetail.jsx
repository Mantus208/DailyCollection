import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "-");
const formatDateTime = (d) => (d ? new Date(d).toLocaleString("en-IN") : "-");

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
  const navigate = useNavigate();

  const [consumer, setConsumer] = useState(null);
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

  const [stockItems, setStockItems] = useState([]);
  const [stockItemId, setStockItemId] = useState("");
  const [stockQty, setStockQty] = useState("1");
  const [stockUnitPrice, setStockUnitPrice] = useState("");
  const [stockAmountPaid, setStockAmountPaid] = useState("");
  const [stockRemark, setStockRemark] = useState("");
  const [stockLoading, setStockLoading] = useState(false);

  const load = () => {
    api
      .get(`/consumers/${consumerId}`)
      .then(({ data }) => {
        console.log("CONSUMER DATA:", data);
        console.log("CURRENT BILL:", data.currentBill);
        console.log("MONTHLY AMOUNT:", data.monthlyAmount);

        setConsumer(data);
      })
      .catch((err) => setError(err.response?.data?.message || "Load nahi hua"));
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
    load();
    loadStockItems();
  }, [consumerId]);

  const handleCollect = async () => {
    setBusy("collect");
    setError("");
    try {
      await api.put(`/consumers/${consumerId}/collect`, {
        amountPaid: amountPaid || 0,
      });
      setAmountPaid("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Collect nahi hua");
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

      await loadStockItems();
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

      load();
    } catch (err) {
      setError(err.response?.data?.message || "Unpaid nahi ho paya");
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
    } catch (err) {
      setError(err.response?.data?.message || "Complaint darj nahi hui");
    } finally {
      setBusy("");
    }
  };

  const loadHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setBusy("history");
    try {
      const { data } = await api.get(`/consumers/${consumerId}/history`);
      setHistory(data);
      setShowHistory(true);
    } catch (err) {
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
  const isPaid = bill?.status === "paid";
  const balance = bill
    ? bill.amount - (bill.amountPaid || 0)
    : consumer.monthlyAmount || 0;
  const selectedStockItem = stockItems.find(
    (item) => String(item._id) === String(stockItemId),
  );

  const stockTotal = Number(stockQty || 0) * Number(stockUnitPrice || 0);

  const stockPending = stockTotal - Number(stockAmountPaid || 0);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <button
          onClick={() => navigate(`/area/${areaId}/search`)}
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          ← Back to Consumer Search
        </button>

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-100">
                Consumer Profile
              </p>
              <h1 className="mt-1 text-3xl font-bold">{consumer.name}</h1>
              <p className="mt-1 text-sm text-blue-100">
                Consumer ID: {consumer.consumerId}
              </p>
            </div>
            <div
              className={`rounded-2xl px-4 py-3 text-center ${isPaid ? "bg-emerald-500/20" : "bg-white/10"}`}
            >
              <p className="text-xs text-blue-100">Current Status</p>
              <p className="mt-1 text-lg font-bold">
                {isPaid ? "PAID" : bill?.status?.toUpperCase() || "PENDING"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <Section
            title="Consumer Information"
            subtitle="Account and connection details"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Address" value={consumer.address} />
              <Field label="Mobile" value={consumer.mobile} />
              <Field label="STB No" value={consumer.stbNo} />
              <Field label="VC No" value={consumer.vcNo} />
              <Field
                label="Last Package"
                value={formatDate(consumer.lastPackageDate)}
              />
              <Field label="Expiry" value={formatDate(consumer.expiryDate)} />
            </div>
          </Section>

          <Section
            title="Monthly Collection"
            subtitle="Current bill and payment status"
            action={
              !editingAmount ? (
                <button
                  onClick={() => {
                    setEditingAmount(true);
                    setNewAmount(
                      String(bill?.amount ?? consumer.monthlyAmount ?? 0),
                    );
                  }}
                  className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                >
                  Edit Amount
                </button>
              ) : null
            }
          >
            {editingAmount && (
              <div className="mb-4 flex gap-2">
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  onClick={handleEditAmount}
                  disabled={busy === "editAmount"}
                  className="rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingAmount(false)}
                  className="rounded-xl px-3 text-sm text-slate-500"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Package Amount</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  ₹{bill?.amount ?? consumer.monthlyAmount ?? 0}
                </p>
              </div>
              <div
                className={`rounded-2xl p-4 ${isPaid ? "bg-emerald-50" : "bg-amber-50"}`}
              >
                <p className="text-xs text-slate-500">Balance</p>
                <p
                  className={`mt-1 text-2xl font-bold ${isPaid ? "text-emerald-700" : "text-amber-700"}`}
                >
                  ₹{isPaid ? 0 : balance}
                </p>
              </div>
            </div>

            {isPaid ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-bold text-emerald-700">
                  ✓ Paid — ₹{bill.amount}
                </p>
                <p className="mt-1 text-xs text-emerald-600">
                  {formatDate(bill.paidDate)}
                </p>
                <button
                  onClick={handleUnpaid}
                  disabled={busy === "unpaid"}
                  className="mt-3 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600"
                >
                  Mark Unpaid
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {bill?.status === "due" && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <b>Due:</b> {bill.dueRemark || "No remark"}
                      {bill.amountPaid > 0 && (
                        <p className="mt-1 text-xs font-semibold">
                          Ab tak mila: ₹{bill.amountPaid} • Baaki: ₹{balance}
                        </p>
                      )}
                      {bill.followUpDate && (
                        <p className="mt-1 text-xs">
                          Follow-up: {formatDate(bill.followUpDate)}
                        </p>
                      )}
                    </div>

                    {/* Partial payment reverse */}
                    {bill.amountPaid > 0 && (
                      <button
                        type="button"
                        onClick={handleUnpaid}
                        disabled={busy === "unpaid"}
                        className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busy === "unpaid"
                          ? "Reversing..."
                          : `↶ Galti se ₹${bill.amountPaid} collect hua — Unpaid Karein`}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder={`Aaj kitna mila? (baaki ₹${balance})`}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm"
                  />

                  <button
                    onClick={handleCollect}
                    disabled={busy === "collect"}
                    className="rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    Collect
                  </button>
                </div>

                <button
                  onClick={() => setShowDueForm((s) => !s)}
                  className="w-full rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-semibold text-amber-700"
                >
                  Due Karein
                </button>

                {showDueForm && (
                  <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                    <textarea
                      value={dueRemark}
                      onChange={(e) => setDueRemark(e.target.value)}
                      placeholder="Kyu due hai?"
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />

                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />

                    <button
                      onClick={handleDue}
                      disabled={busy === "due"}
                      className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white"
                    >
                      Confirm Due
                    </button>
                  </div>
                )}
              </div>
            )}
          </Section>
        </div>
        {/* STOCK SALE */}
        <Section
          title="Sell Stock Item"
          subtitle="Consumer ko stock material bechein"
        >
          <div className="space-y-4">
            {/* Item */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Stock Item
              </label>

              <select
                value={stockItemId}
                onChange={(e) => {
                  const value = e.target.value;
                  setStockItemId(value);

                  const item = stockItems.find(
                    (x) => String(x._id) === String(value),
                  );

                  if (item) {
                    setStockUnitPrice(String(item.lastCostPerUnit || ""));
                  } else {
                    setStockUnitPrice("");
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">Select item</option>

                {stockItems.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} — Stock: {item.currentStock || 0}
                  </option>
                ))}
              </select>
            </div>

            {/* Available stock */}
            {selectedStockItem && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700">
                    Available Stock
                  </span>

                  <span className="text-lg font-bold text-blue-800">
                    {selectedStockItem.currentStock || 0}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-blue-600">
                  {selectedStockItem.name}
                </p>
              </div>
            )}

            {/* Stock validation warning */}
            {selectedStockItem &&
              Number(stockQty) >
                Number(selectedStockItem.currentStock || 0) && (
                <p className="mt-2 text-xs font-bold text-red-600">
                  ⚠️ Available stock sirf {selectedStockItem.currentStock} hai.
                  Aap {stockQty} quantity enter kar rahe hain.
                </p>
              )}

            {/* Qty + Rate */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Quantity
                </label>

                <input
                  type="number"
                  min="1"
                  max={selectedStockItem?.currentStock ?? undefined}
                  step="1"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Selling Rate / Unit
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={stockUnitPrice}
                  onChange={(e) => setStockUnitPrice(e.target.value)}
                  placeholder="₹ Rate"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* Amount summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">Total</p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  ₹{stockTotal}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-[11px] text-emerald-600">Paid</p>

                <p className="mt-1 text-lg font-bold text-emerald-700">
                  ₹{Number(stockAmountPaid || 0)}
                </p>
              </div>

              <div
                className={`rounded-xl p-3 ${
                  stockPending > 0 ? "bg-amber-50" : "bg-slate-50"
                }`}
              >
                <p className="text-[11px] text-slate-500">Pending</p>

                <p
                  className={`mt-1 text-lg font-bold ${
                    stockPending > 0 ? "text-amber-700" : "text-slate-800"
                  }`}
                >
                  ₹{Math.max(stockPending, 0)}
                </p>
              </div>
            </div>

            {/* Paid */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Amount Received
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={stockAmountPaid}
                onChange={(e) => setStockAmountPaid(e.target.value)}
                placeholder={`Aaj kitna mila? (Total ₹${stockTotal})`}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            {/* Remark */}
            <input
              type="text"
              value={stockRemark}
              onChange={(e) => setStockRemark(e.target.value)}
              placeholder="Remark (optional)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />

            {/* Sell button */}
            <button
              type="button"
              onClick={handleStockSale}
              disabled={
                stockLoading || !stockItemId || !stockQty || !stockUnitPrice
              }
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {stockLoading ? "Selling..." : "Sell Item"}
            </button>
          </div>
        </Section>
        <div className="grid gap-5 lg:grid-cols-2">
          <Section
            title="Service / Visit"
            subtitle="Record field activity"
            action={
              <button
                onClick={() => setShowServiceForm((s) => !s)}
                className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
              >
                + Add
              </button>
            }
          >
            {showServiceForm && (
              <div className="space-y-3">
                <select
                  value={servicePurpose}
                  onChange={(e) => setServicePurpose(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="service">Service / Repair</option>
                  <option value="collection">Collection Attempt</option>
                  <option value="other">Other</option>
                </select>
                <input
                  value={serviceNote}
                  onChange={(e) => setServiceNote(e.target.value)}
                  placeholder="Kisliye gaye the"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="not_paid">Paisa nahi mila</option>
                  <option value="promised_later">Baad me denge</option>
                  <option value="paid">Paisa mil gaya</option>
                </select>
                {serviceOutcome === "promised_later" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">
                      Follow-up After
                    </label>

                    <select
                      value={serviceFollowUpDays}
                      onChange={(e) => setServiceFollowUpDays(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option value="1">1 Day Later</option>
                      <option value="2">2 Days Later</option>
                      <option value="3">3 Days Later</option>
                      <option value="7">7 Days Later</option>
                      <option value="15">15 Days Later</option>
                      <option value="30">30 Days Later</option>
                    </select>

                    <p className="text-[11px] text-slate-400">
                      Save karne ki date se automatic follow-up date set hogi.
                    </p>
                  </div>
                )}
                <input
                  value={serviceRemark}
                  onChange={(e) => setServiceRemark(e.target.value)}
                  placeholder="Customer remark (optional)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <button
                  onClick={handleServiceSubmit}
                  disabled={busy === "service"}
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white"
                >
                  Save Visit
                </button>
              </div>
            )}
            {!showServiceForm && (
              <p className="text-sm text-slate-400">
                Use “+ Add” to record a service or field visit.
              </p>
            )}
          </Section>

          <Section
            title="Complaint"
            subtitle="Register a consumer complaint"
            action={
              <button
                onClick={() => setShowComplaintForm((s) => !s)}
                className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700"
              >
                + Add
              </button>
            }
          >
            {showComplaintForm ? (
              <div className="space-y-3">
                <textarea
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  placeholder="Complaint kya hai?"
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <button
                  onClick={handleComplaintSubmit}
                  disabled={busy === "complaint"}
                  className="w-full rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white"
                >
                  Save Complaint
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No complaint form open.</p>
            )}
          </Section>
        </div>

        <Section
          title="Consumer History"
          subtitle="Monthly bills and field visits"
          action={
            <button
              onClick={loadHistory}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              {busy === "history"
                ? "Loading..."
                : showHistory
                  ? "Hide History ▲"
                  : "View History ▼"}
            </button>
          }
        >
          {showHistory && history ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Monthly Bills
                </h3>
                <div className="space-y-2">
                  {history.bills.length === 0 && (
                    <p className="text-sm text-slate-400">Koi bill nahi</p>
                  )}
                  {history.bills.map((b) => (
                    <div
                      key={b._id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"
                    >
                      <span className="font-medium text-slate-700">
                        {b.month}
                      </span>
                      <span className="text-right text-xs text-slate-500">
                        {b.status} • ₹{b.amountPaid || 0}/₹{b.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Visits
                </h3>
                <div className="space-y-2">
                  {history.visits.length === 0 && (
                    <p className="text-sm text-slate-400">Koi visit nahi</p>
                  )}
                  {history.visits.map((v) => (
                    <div
                      key={v._id}
                      className="rounded-xl bg-slate-50 p-3 text-sm"
                    >
                      <p className="font-semibold text-slate-700">
                        {formatDateTime(v.createdAt)} •{" "}
                        {v.visitedBy?.name || "?"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {v.purpose} • {v.outcome}
                        {v.amountCollected ? ` • ₹${v.amountCollected}` : ""}
                        {v.serviceNote ? ` • ${v.serviceNote}` : ""}
                        {v.customerRemark ? ` • "${v.customerRemark}"` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              History load karne ke liye button dabayein.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
};

export default ConsumerDetail;
