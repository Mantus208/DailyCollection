import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "-");
const formatDateTime = (d) => (d ? new Date(d).toLocaleString("en-IN") : "-");

const ConsumerDetail = () => {
  const { areaId, consumerId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [consumer, setConsumer] = useState(null);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [showDueForm, setShowDueForm] = useState(false);
  const [dueRemark, setDueRemark] = useState("");
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [servicePurpose, setServicePurpose] = useState("service");
  const [serviceNote, setServiceNote] = useState("");
  const [serviceOutcome, setServiceOutcome] = useState("not_paid");
  const [serviceRemark, setServiceRemark] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState("");

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
        amount: amount || undefined,
      });
      setAmount("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Collect nahi hua");
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
      await api.put(`/consumers/${consumerId}/due`, { remark: dueRemark });
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

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/area/${areaId}`)}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Wapas Search Pe
          </button>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Basic Info */}
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

        {/* Current Month Collection */}
        <div className="bg-white rounded-2xl shadow-md p-5 space-y-3">
          <p className="font-semibold text-gray-800">Is Mahine ka Collection</p>

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
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Amount (₹${consumer.monthlyAmount || 0})`}
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

        {/* Service Entry */}
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

        {/* History */}
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
                      {b.status} — ₹{b.amount}
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
