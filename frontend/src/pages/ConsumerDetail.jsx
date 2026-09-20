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
  const [serviceRemark, setServiceRemark] = useState("");
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintText, setComplaintText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const load = () => {
    api
      .get(`/consumers/${consumerId}`)
      .then(({ data }) => setConsumer(data))
      .catch((err) => setError(err.response?.data?.message || "Load nahi hua"));
  };

  useEffect(() => {
    load();
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
    setBusy("unpaid");
    setError("");
    try {
      await api.put(`/consumers/${consumerId}/unpaid`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Nahi ho paya");
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
    setBusy("service");
    setError("");
    try {
      await api.post(`/consumers/${consumerId}/visit`, {
        purpose: servicePurpose,
        serviceNote,
        outcome: serviceOutcome,
        customerRemark: serviceRemark,
      });
      setServiceNote("");
      setServiceRemark("");
      setShowServiceForm(false);
    } catch (err) {
      setError(err.response?.data?.message || "Save nahi hua");
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
      <div className="min-h-screen bg-gray-100 p-6 text-center text-gray-500">
        Load ho raha hai...
      </div>
    );
  }

  const bill = consumer.currentBill;
  const isPaid = bill?.status === "paid";
  const balance = bill
    ? bill.amount - (bill.amountPaid || 0)
    : consumer.monthlyAmount || 0;

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <button
          onClick={() => navigate(`/area/${areaId}/search`)}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Wapas Search Pe
        </button>

        {message && (
          <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {message}
          </p>
        )}
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="bg-white rounded-2xl shadow-md p-5 space-y-1">
          <h1 className="text-lg font-bold text-gray-800">{consumer.name}</h1>
          <p className="text-sm text-gray-500">
            Consumer ID: {consumer.consumerId}
          </p>
          <p className="text-sm text-gray-500">
            Address: {consumer.address || "-"}
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
            <p className="text-gray-500">
              STB No:{" "}
              <span className="text-gray-800">{consumer.stbNo || "-"}</span>
            </p>
            <p className="text-gray-500">
              VC No:{" "}
              <span className="text-gray-800">{consumer.vcNo || "-"}</span>
            </p>
            <p className="text-gray-500">
              Last Package:{" "}
              <span className="text-gray-800">
                {formatDate(consumer.lastPackageDate)}
              </span>
            </p>
            <p className="text-gray-500">
              Expiry:{" "}
              <span className="text-gray-800">
                {formatDate(consumer.expiryDate)}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800">
              Is Mahine ka Collection
            </p>
            {!editingAmount ? (
              <button
                onClick={() => {
                  setEditingAmount(true);
                  setNewAmount(
                    String(bill?.amount ?? consumer.monthlyAmount ?? 0),
                  );
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                ✏️ Amount Edit
              </button>
            ) : (
              <div className="flex gap-1 items-center">
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-20 border border-gray-300 rounded px-1.5 py-0.5 text-xs"
                />
                <button
                  onClick={handleEditAmount}
                  disabled={busy === "editAmount"}
                  className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingAmount(false)}
                  className="text-xs text-gray-500"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500">
            Package Amount:{" "}
            <span className="font-semibold text-gray-700">
              ₹{bill?.amount ?? consumer.monthlyAmount ?? 0}
            </span>
            {bill?.amountPaid > 0 && !isPaid && (
              <>
                {" "}
                • Ab tak mila: ₹{bill.amountPaid} • Baaki:{" "}
                <span className="text-red-600 font-semibold">₹{balance}</span>
              </>
            )}
          </p>

          {isPaid ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-700 font-semibold">
                Paid — ₹{bill.amount} ({formatDate(bill.paidDate)})
              </p>
              <button
                onClick={handleUnpaid}
                disabled={busy === "unpaid"}
                className="mt-2 text-xs text-red-600 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50"
              >
                Galti se Paid hua — Unpaid Karein
              </button>
            </div>
          ) : (
            <>
              {bill?.status === "due" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                  <p className="text-yellow-800 font-semibold">
                    Due — {bill.dueRemark || "koi remark nahi"}
                  </p>
                  {bill.followUpDate && (
                    <p className="text-xs text-yellow-700">
                      Follow-up: {formatDate(bill.followUpDate)}
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={`Aaj kitna mila? (baaki ₹${balance})`}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={handleCollect}
                  disabled={busy === "collect"}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-4 rounded-lg"
                >
                  Collect
                </button>
              </div>
              <button
                onClick={() => setShowDueForm((s) => !s)}
                className="text-xs text-yellow-700 border border-yellow-300 rounded-lg px-2 py-1 hover:bg-yellow-50"
              >
                Due Karein (paisa nahi mila)
              </button>
              {showDueForm && (
                <div className="space-y-2">
                  <textarea
                    value={dueRemark}
                    onChange={(e) => setDueRemark(e.target.value)}
                    placeholder="Kyu due hai — customer ne kya bola"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    rows={2}
                  />
                  <div>
                    <label className="text-xs text-gray-500">
                      Kab denge bole (reminder date):
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm mt-1"
                    />
                  </div>
                  <button
                    onClick={handleDue}
                    disabled={busy === "due"}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold py-2 rounded-lg"
                  >
                    Due Confirm Karein
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5 space-y-3">
          <button
            onClick={() => setShowServiceForm((s) => !s)}
            className="text-sm font-semibold text-gray-700"
          >
            + Service / Visit Entry
          </button>
          {showServiceForm && (
            <div className="space-y-2">
              <select
                value={servicePurpose}
                onChange={(e) => setServicePurpose(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="service">
                  Service (Box repair, complaint, etc.)
                </option>
                <option value="collection">
                  Collection attempt (paisa lene gaye)
                </option>
                <option value="other">Other</option>
              </select>
              <input
                type="text"
                value={serviceNote}
                onChange={(e) => setServiceNote(e.target.value)}
                placeholder="Kisliye gaye the"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={serviceOutcome}
                onChange={(e) => setServiceOutcome(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="not_paid">Paisa nahi mila</option>
                <option value="promised_later">Baad me denge bole</option>
                <option value="paid">Paisa mil gaya</option>
              </select>
              <input
                type="text"
                value={serviceRemark}
                onChange={(e) => setServiceRemark(e.target.value)}
                placeholder="Customer ne kya bola (optional)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={handleServiceSubmit}
                disabled={busy === "service"}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg"
              >
                Save Karein
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5 space-y-3">
          <button
            onClick={() => setShowComplaintForm((s) => !s)}
            className="text-sm font-semibold text-gray-700"
          >
            + Complaint Darj Karein
          </button>
          {showComplaintForm && (
            <div className="space-y-2">
              <textarea
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder="Complaint kya hai"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
              <button
                onClick={handleComplaintSubmit}
                disabled={busy === "complaint"}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold py-2 rounded-lg"
              >
                Complaint Save Karein
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5 space-y-3">
          <button
            onClick={loadHistory}
            className="text-sm font-semibold text-gray-700"
          >
            {showHistory ? "History Chhupayein ▲" : "History Dekhein ▼"}
          </button>
          {showHistory && history && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Monthly Bills
                </p>
                {history.bills.length === 0 && (
                  <p className="text-gray-400">Koi bill nahi</p>
                )}
                {history.bills.map((b) => (
                  <div
                    key={b._id}
                    className="border-b py-1.5 flex justify-between"
                  >
                    <span>{b.month}</span>
                    <span className="capitalize">
                      {b.status} — ₹{b.amountPaid || 0}/₹{b.amount}
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Visits
                </p>
                {history.visits.length === 0 && (
                  <p className="text-gray-400">Koi visit nahi</p>
                )}
                {history.visits.map((v) => (
                  <div key={v._id} className="border-b py-1.5">
                    <p className="text-gray-700">
                      {formatDateTime(v.createdAt)} — {v.visitedBy?.name || "?"}
                    </p>
                    <p className="text-gray-500">
                      {v.purpose} • {v.outcome}
                      {v.amountCollected ? ` • ₹${v.amountCollected}` : ""}
                      {v.serviceNote ? ` • ${v.serviceNote}` : ""}
                      {v.customerRemark ? ` • "${v.customerRemark}"` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsumerDetail;
