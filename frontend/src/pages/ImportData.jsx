import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const emptyToInputDate = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
};

const ImportCard = ({
  number,
  title,
  subtitle,
  file,
  setFile,
  accept,
  onUpload,
  busy,
  result,
  children,
  tone = "blue",
}) => {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-4 border-b border-slate-100 px-5 py-4">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${tones[tone]}`}
        >
          {number}
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">
        {children}
        <input
          type="file"
          accept={accept}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-1 block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700"
        />
        <button
          onClick={onUpload}
          disabled={!file || !!busy}
          className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-200"
        >
          {busy ? "Uploading..." : "Upload File"}
        </button>
        {result && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {result}
          </div>
        )}
      </div>
    </section>
  );
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
  const [unmatchedGroups, setUnmatchedGroups] = useState(null);
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
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              DATA MANAGEMENT
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Import Data
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Upload master, expiry and bill files step by step.
            </p>
          </div>
          <Link
            to="/"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {["Area List", "Master Customers", "Expiry", "Bills"].map((s, i) => (
            <div
              key={s}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                {i + 1}
              </span>
              <span className="text-xs font-semibold text-slate-700">{s}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <ImportCard
            number="1"
            title="Area List"
            subtitle="One-time setup • XLS, XLSX or CSV"
            file={areaFile}
            setFile={setAreaFile}
            accept=".xls,.xlsx,.csv"
            busy={busy === "area"}
            onUpload={() =>
              uploadTo("/import/areas", areaFile, setAreaResult, "area")
            }
            result={
              areaResult ? `New areas created: ${areaResult.created}` : null
            }
            tone="slate"
          />
          <ImportCard
            number="2"
            title="All Customers"
            subtitle="Master customer list"
            file={masterFile}
            setFile={setMasterFile}
            accept=".xls,.xlsx,.csv"
            busy={busy === "master"}
            onUpload={() =>
              uploadTo(
                "/import/master-customers",
                masterFile,
                setMasterResult,
                "master",
              )
            }
            result={
              masterResult
                ? `Created: ${masterResult.created} • Updated: ${masterResult.updated} • Area unmatched: ${masterResult.areaUnmatched}`
                : null
            }
          />
          <ImportCard
            number="3"
            title="Monthly Expiry"
            subtitle="Update customer expiry data"
            file={expiryFile}
            setFile={setExpiryFile}
            accept=".xls,.xlsx,.csv"
            busy={busy === "expiry"}
            onUpload={() =>
              uploadTo("/import/expiry", expiryFile, setExpiryResult, "expiry")
            }
            result={
              expiryResult
                ? `Updated: ${expiryResult.updated} • Not found: ${expiryResult.unmatchedConsumers?.length || 0}`
                : null
            }
          />
          <ImportCard
            number="4"
            title="Monthly Bills"
            subtitle="Refresh bill and consumer data"
            file={billFile}
            setFile={setBillFile}
            accept=".xls,.xlsx,.csv"
            busy={busy === "bill"}
            onUpload={() =>
              uploadTo("/import/bills", billFile, setBillResult, "bill")
            }
            result={
              billResult
                ? `Consumers updated: ${billResult.consumersUpdated} • Bills: ${billResult.billsCreated}`
                : null
            }
          />
        </div>

        {masterResult && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Unmatched Areas</h2>
                <p className="text-xs text-slate-500">
                  Group consumers by address and assign an area.
                </p>
              </div>
              <button
                onClick={loadUnmatchedGroups}
                disabled={busy === "groups"}
                className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                {busy === "groups" ? "Loading..." : "Check / Fix Areas"}
              </button>
            </div>

            {unmatchedGroups !== null && (
              <div className="mt-4 space-y-3">
                {unmatchedGroups.length === 0 ? (
                  <div className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                    All areas are matched. 🎉
                  </div>
                ) : (
                  unmatchedGroups.map((g) => (
                    <div
                      key={g.address}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-800">
                            {g.address || "(Blank address)"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {g.count} consumers •{" "}
                            {g.samples
                              ?.map((s) => `${s.name} (${s.consumerId})`)
                              .join(", ")}
                            {g.count > (g.samples?.length || 0) ? "..." : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={groupAreaChoice[g.address] || ""}
                            onChange={(e) =>
                              setGroupAreaChoice((p) => ({
                                ...p,
                                [g.address]: e.target.value,
                              }))
                            }
                            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                          >
                            <option value="">-- Choose Area --</option>
                            {areas.map((a) => (
                              <option key={a._id} value={a._id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssignGroup(g.address)}
                            disabled={!groupAreaChoice[g.address]}
                            className="rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:bg-blue-200"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        )}

        {pendingConsumers.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
            <h2 className="font-bold text-amber-900">
              Consumers not found in master list ({pendingConsumers.length})
            </h2>
            <p className="mt-1 text-xs text-amber-700">
              Check the details and add them.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {pendingConsumers.map((c, index) => (
                <div
                  key={c.consumerId + index}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="mb-3 text-xs font-semibold text-slate-400">
                    Consumer ID: {c.consumerId}
                  </p>
                  <div className="space-y-2">
                    <input
                      value={c.name}
                      onChange={(e) =>
                        updatePendingField(index, "name", e.target.value)
                      }
                      placeholder="Name"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      value={c.address}
                      onChange={(e) =>
                        updatePendingField(index, "address", e.target.value)
                      }
                      placeholder="Address"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <select
                      value={c.areaId}
                      onChange={(e) =>
                        updatePendingField(index, "areaId", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">-- Choose Area --</option>
                      {areas.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={c.stbNo}
                        onChange={(e) =>
                          updatePendingField(index, "stbNo", e.target.value)
                        }
                        placeholder="STB No"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                      <input
                        value={c.vcNo}
                        onChange={(e) =>
                          updatePendingField(index, "vcNo", e.target.value)
                        }
                        placeholder="VC No"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <input
                      type="date"
                      value={c.expiryDate}
                      onChange={(e) =>
                        updatePendingField(index, "expiryDate", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => handleAddPending(index)}
                      className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Add Consumer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {billResult?.notFoundConsumers?.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            These Sub.No. were not found:{" "}
            {billResult.notFoundConsumers.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportData;
