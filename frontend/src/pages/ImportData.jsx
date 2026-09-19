import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const emptyToInputDate = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
};

const ImportData = () => {
  const [areas, setAreas] = useState([]);
  const [areaFile, setAreaFile] = useState(null);
  const [masterFile, setMasterFile] = useState(null);
  const [expiryFile, setExpiryFile] = useState(null);
  const [billFile, setBillFile] = useState(null);

  const [areaResult, setAreaResult] = useState(null);
  const [masterResult, setMasterResult] = useState(null);
  const [expiryResult, setExpiryResult] = useState(null);
  const [billResult, setBillResult] = useState(null);
  const [pendingConsumers, setPendingConsumers] = useState([]);

  const [unmatchedGroups, setUnmatchedGroups] = useState(null); // null = not loaded yet
  const [groupAreaChoice, setGroupAreaChoice] = useState({});

  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    api
      .get("/areas")
      .then(({ data }) => setAreas(data))
      .catch(() => {});
  }, []);

  const uploadTo = async (endpoint, file, setResult, key) => {
    if (!file) return;
    setError("");
    setBusy(key);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post(endpoint, formData);
      setResult(data);
      if (data.unmatchedConsumers) {
        setPendingConsumers(
          data.unmatchedConsumers.map((c) => ({
            ...c,
            expiryDate: emptyToInputDate(c.expiryDate),
            areaId: c.areaId || "",
          })),
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || "Import nahi ho paya");
    } finally {
      setBusy("");
    }
  };

  const loadUnmatchedGroups = async () => {
    setError("");
    setBusy("groups");
    try {
      const { data } = await api.get("/consumers/unmatched-areas");
      setUnmatchedGroups(data);
    } catch (err) {
      setError(err.response?.data?.message || "List load nahi ho payi");
    } finally {
      setBusy("");
    }
  };

  const handleAssignGroup = async (address) => {
    const areaId = groupAreaChoice[address];
    if (!areaId) return;
    setError("");
    try {
      await api.put("/consumers/assign-area-by-address", { address, areaId });
      setUnmatchedGroups((prev) => prev.filter((g) => g.address !== address));
    } catch (err) {
      setError(err.response?.data?.message || "Assign nahi ho paya");
    }
  };

  const updatePendingField = (index, field, value) => {
    setPendingConsumers((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  };

  const handleAddPending = async (index) => {
    const c = pendingConsumers[index];
    setError("");
    try {
      await api.post("/consumers", {
        consumerId: c.consumerId,
        name: c.name,
        mobile: c.mobile,
        areaId: c.areaId || null,
        address: c.address,
        stbNo: c.stbNo,
        vcNo: c.vcNo,
        expiryDate: c.expiryDate || null,
        packageType: c.packageType,
        packageName: c.packageName,
        franchisee: c.franchisee,
      });
      setPendingConsumers((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      setError(err.response?.data?.message || "Add nahi ho paya");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Data Import</h1>
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            ← Wapas
          </Link>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          One-time Setup
        </p>

        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="font-semibold text-gray-800 mb-1">Area List</p>
          <input
            type="file"
            accept=".xls,.xlsx,.csv"
            onChange={(e) => setAreaFile(e.target.files[0])}
            className="text-sm mb-3 w-full"
          />
          <button
            onClick={() =>
              uploadTo("/import/areas", areaFile, setAreaResult, "area")
            }
            disabled={!areaFile || busy === "area"}
            className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white text-sm font-semibold py-2 rounded-lg"
          >
            {busy === "area"
              ? "Upload ho raha hai..."
              : "Area List Upload Karein"}
          </button>
          {areaResult && (
            <div className="mt-3 text-sm bg-green-50 border border-green-200 rounded-lg p-3">
              <p>Naye areas bane: {areaResult.created}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="font-semibold text-gray-800 mb-1">
            All Customers (Master List)
          </p>
          <input
            type="file"
            accept=".xls,.xlsx,.csv"
            onChange={(e) => setMasterFile(e.target.files[0])}
            className="text-sm mb-3 w-full"
          />
          <button
            onClick={() =>
              uploadTo(
                "/import/master-customers",
                masterFile,
                setMasterResult,
                "master",
              )
            }
            disabled={!masterFile || busy === "master"}
            className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white text-sm font-semibold py-2 rounded-lg"
          >
            {busy === "master"
              ? "Upload ho raha hai..."
              : "Customer List Upload Karein"}
          </button>
          {masterResult && (
            <div className="mt-3 text-sm bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
              <p>Naye consumer: {masterResult.created}</p>
              <p>Update hue: {masterResult.updated}</p>
              <p className="text-amber-700">
                Area match nahi hua: {masterResult.areaUnmatched}
              </p>
            </div>
          )}
          <button
            onClick={loadUnmatchedGroups}
            className="w-full text-blue-600 text-sm font-semibold hover:underline py-1"
          >
            Unmatched Areas Dekhein / Fix Karein →
          </button>
        </div>

        {/* Unmatched Areas Fix */}
        {unmatchedGroups !== null && (
          <div className="bg-white rounded-2xl shadow-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800">
                Unmatched Areas Fix Karein
              </p>
              <button
                onClick={loadUnmatchedGroups}
                className="text-xs text-blue-600 hover:underline"
              >
                Refresh
              </button>
            </div>
            {unmatchedGroups.length === 0 ? (
              <p className="text-sm text-green-700">Sab match ho gaye! 🎉</p>
            ) : (
              unmatchedGroups.map((g) => (
                <div
                  key={g.address}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <p className="text-sm font-medium text-gray-700">
                    {g.address || "(Khali address)"}{" "}
                    <span className="text-gray-400 text-xs">
                      — {g.count} consumers
                    </span>
                  </p>
                  {g.samples?.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {g.samples
                        .map((s) => `${s.name} (${s.consumerId})`)
                        .join(", ")}
                      {g.count > g.samples.length ? "..." : ""}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <select
                      value={groupAreaChoice[g.address] || ""}
                      onChange={(e) =>
                        setGroupAreaChoice((prev) => ({
                          ...prev,
                          [g.address]: e.target.value,
                        }))
                      }
                      className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                    >
                      <option value="">-- Area chunein --</option>
                      {areas.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssignGroup(g.address)}
                      disabled={!groupAreaChoice[g.address]}
                      className="px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm rounded-lg"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">
          Monthly Import
        </p>

        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="font-semibold text-gray-800 mb-1">
            Step 1: Expiry File
          </p>
          <input
            type="file"
            accept=".xls,.xlsx,.csv"
            onChange={(e) => setExpiryFile(e.target.files[0])}
            className="text-sm mb-3 w-full"
          />
          <button
            onClick={() =>
              uploadTo("/import/expiry", expiryFile, setExpiryResult, "expiry")
            }
            disabled={!expiryFile || busy === "expiry"}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold py-2 rounded-lg"
          >
            {busy === "expiry"
              ? "Upload ho raha hai..."
              : "Expiry File Upload Karein"}
          </button>
          {expiryResult && (
            <div className="mt-3 text-sm bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
              <p>Update hue: {expiryResult.updated}</p>
              <p className="text-amber-700">
                Master list me nahi mile:{" "}
                {expiryResult.unmatchedConsumers?.length || 0}
              </p>
            </div>
          )}
        </div>

        {pendingConsumers.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-amber-700">
              Ye {pendingConsumers.length} consumer master list me nahi mile —
              check karke Add karein:
            </p>
            {pendingConsumers.map((c, index) => (
              <div
                key={c.consumerId + index}
                className="bg-white rounded-xl shadow-sm p-4 space-y-2"
              >
                <p className="text-xs text-gray-400">
                  Consumer ID: {c.consumerId}
                </p>
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) =>
                    updatePendingField(index, "name", e.target.value)
                  }
                  placeholder="Naam"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                />
                <input
                  type="text"
                  value={c.address}
                  onChange={(e) =>
                    updatePendingField(index, "address", e.target.value)
                  }
                  placeholder="Address"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                />
                <select
                  value={c.areaId}
                  onChange={(e) =>
                    updatePendingField(index, "areaId", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">-- Area chunein --</option>
                  {areas.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={c.stbNo}
                    onChange={(e) =>
                      updatePendingField(index, "stbNo", e.target.value)
                    }
                    placeholder="STB No"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    value={c.vcNo}
                    onChange={(e) =>
                      updatePendingField(index, "vcNo", e.target.value)
                    }
                    placeholder="VC No"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <input
                  type="date"
                  value={c.expiryDate}
                  onChange={(e) =>
                    updatePendingField(index, "expiryDate", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                />
                <button
                  onClick={() => handleAddPending(index)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg"
                >
                  Add Karein
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-md p-5">
          <p className="font-semibold text-gray-800 mb-1">Step 2: Bill File</p>
          <input
            type="file"
            accept=".xls,.xlsx,.csv"
            onChange={(e) => setBillFile(e.target.files[0])}
            className="text-sm mb-3 w-full"
          />
          <button
            onClick={() =>
              uploadTo("/import/bills", billFile, setBillResult, "bill")
            }
            disabled={!billFile || busy === "bill"}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold py-2 rounded-lg"
          >
            {busy === "bill"
              ? "Upload ho raha hai..."
              : "Bill File Upload Karein"}
          </button>
          {billResult && (
            <div className="mt-3 text-sm bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
              <p>Consumer update hue: {billResult.consumersUpdated}</p>
              <p>Bill entries bani/refresh hui: {billResult.billsCreated}</p>
              {billResult.notFoundConsumers?.length > 0 && (
                <p className="text-amber-700">
                  Ye Sub.No. nahi mile:{" "}
                  {billResult.notFoundConsumers.join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportData;
