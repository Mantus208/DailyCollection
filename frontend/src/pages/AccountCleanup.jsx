import { useState } from "react";
import api from "../api/axios";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const AccountCleanup = () => {
  const [beforeMonth, setBeforeMonth] = useState("2026-09");
  const [deleteVisitLogs, setDeleteVisitLogs] = useState(false);
  const [resetPreviousDue, setResetPreviousDue] = useState(true);

  const [preview, setPreview] = useState(null);
  const [backupDone, setBackupDone] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const resetFlow = () => {
    setPreview(null);
    setBackupDone(false);
    setConfirmText("");
    setResult(null);
    setError("");
  };

  const loadPreview = async () => {
    resetFlow();
    setBusy("preview");
    try {
      const { data } = await api.get("/admin/cleanup/preview", {
        params: { beforeMonth },
      });
      setPreview(data);
    } catch (err) {
      setError(err.response?.data?.message || "Preview load nahi hua");
    } finally {
      setBusy("");
    }
  };

  const downloadBackup = async () => {
    setBusy("backup");
    setError("");
    try {
      const { data } = await api.get("/admin/cleanup/backup", {
        params: { beforeMonth, deleteVisitLogs },
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-before-${beforeMonth}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupDone(true);
    } catch (err) {
      setError(err.response?.data?.message || "Backup download nahi hua");
    } finally {
      setBusy("");
    }
  };

  const execute = async () => {
    setBusy("execute");
    setError("");
    try {
      const { data } = await api.post("/admin/cleanup/execute", {
        beforeMonth,
        deleteVisitLogs,
        resetPreviousDue,
        confirmText,
      });
      setResult(data);
      setPreview(null);
      setBackupDone(false);
      setConfirmText("");
    } catch (err) {
      setError(err.response?.data?.message || "Cleanup fail ho gaya");
    } finally {
      setBusy("");
    }
  };

  const requiredText = `DELETE ${beforeMonth}`;
  const canExecute =
    preview && backupDone && confirmText === requiredText && busy !== "execute";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Account Cleanup</h1>
          <p className="mt-1 text-sm text-slate-500">
            Purane mahino ka data hatakar clean accounting shuru karein.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
            <p className="font-bold">✓ {result.message}</p>
            <p className="mt-1">Bills delete hue: {result.billsDeleted}</p>
            <p>Visit logs delete hue: {result.visitLogsDeleted}</p>
            <p>Previous due reset: {result.previousDueReset} consumers</p>
          </div>
        )}

        {/* Step 1 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Step 1 — Kya delete karna hai
          </p>

          <label className="mt-3 block text-sm font-semibold text-slate-700">
            Is mahine se PEHLE ke sab bills delete honge
          </label>
          <input
            type="month"
            value={beforeMonth}
            onChange={(e) => {
              setBeforeMonth(e.target.value);
              resetFlow();
            }}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm sm:w-56"
          />
          <p className="mt-1 text-xs text-slate-400">
            September select karne se August (aur usse pehle ke) bills delete
            honge. September ka data safe rahega.
          </p>

          <div className="mt-4 space-y-2">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={resetPreviousDue}
                onChange={(e) => {
                  setResetPreviousDue(e.target.checked);
                  resetFlow();
                }}
                className="mt-0.5"
              />
              <span>
                Manual "Previous Due" bhi zero karein (sab consumers ka)
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={deleteVisitLogs}
                onChange={(e) => {
                  setDeleteVisitLogs(e.target.checked);
                  resetFlow();
                }}
                className="mt-0.5"
              />
              <span>
                Purani visit/collection history bhi delete karein
                <span className="block text-xs text-slate-400">
                  Recommended: OFF. Isse dues par koi asar nahi padta, sirf
                  purana record (kisne kab kitna liya) bacha rehta hai.
                </span>
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={loadPreview}
            disabled={busy === "preview"}
            className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy === "preview" ? "Check ho raha hai..." : "Preview Dekhein"}
          </button>
        </div>

        {/* Step 2 */}
        {preview && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Step 2 — Ye sab delete hoga
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] text-slate-400">Bills</p>
                <p className="text-lg font-bold text-slate-900">
                  {preview.bills.count}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] text-slate-400">Due hatega</p>
                <p className="text-lg font-bold text-amber-600">
                  {inr(preview.bills.outstanding)}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] text-slate-400">Collected (record)</p>
                <p className="text-lg font-bold text-emerald-600">
                  {inr(preview.bills.collected)}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] text-slate-400">Previous Due</p>
                <p className="text-lg font-bold text-blue-600">
                  {resetPreviousDue ? inr(preview.previousDue.total) : "Safe"}
                </p>
              </div>
            </div>

            {preview.bills.byMonth.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-xl bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Month</th>
                      <th className="px-3 py-2 text-right">Bills</th>
                      <th className="px-3 py-2 text-right">Due</th>
                      <th className="px-3 py-2 text-right">Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.bills.byMonth.map((m) => (
                      <tr key={m.month} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-semibold">{m.month}</td>
                        <td className="px-3 py-2 text-right">{m.bills}</td>
                        <td className="px-3 py-2 text-right text-amber-600">
                          {inr(m.outstanding)}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-600">
                          {inr(m.collected)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-3 text-xs text-slate-600">
              Visit logs {deleteVisitLogs ? "delete honge" : "safe rahenge"}:{" "}
              {preview.visitLogs.count} entries (
              {inr(preview.visitLogs.collected)} collected record). Previous due{" "}
              {resetPreviousDue ? "zero hoga" : "safe rahega"}:{" "}
              {preview.previousDue.consumers} consumers.
            </p>

            <div className="mt-4 rounded-xl bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">
                Step 3 — Pehle backup download karein
              </p>
              <button
                type="button"
                onClick={downloadBackup}
                disabled={busy === "backup"}
                className="mt-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                {busy === "backup"
                  ? "Backup ban raha hai..."
                  : backupDone
                    ? "✓ Backup ho gaya (dobara download)"
                    : "⬇ Backup Download Karein"}
              </button>

              <p className="mt-4 text-sm font-semibold text-slate-800">
                Step 4 — Confirm karein
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Ye likhein:{" "}
                <span className="font-mono font-bold">{requiredText}</span>
              </p>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={!backupDone}
                placeholder={
                  backupDone ? requiredText : "Pehle backup download karein"
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-100"
              />

              <button
                type="button"
                onClick={execute}
                disabled={!canExecute}
                className="mt-3 w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "execute"
                  ? "Delete ho raha hai..."
                  : "Permanently Delete Karein"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountCleanup;
