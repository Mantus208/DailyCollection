import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { username });
      setMessage(data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Request bhejne me dikkat hui");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/auth/reset-password", {
        username,
        otp,
        newPassword,
      });
      setMessage(data.message);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Password reset nahi ho paya");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
        <div className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-7 py-8 text-white">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-2xl">
              🔐
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-100">
              Daily Collection
            </p>
            <h1 className="mt-1 text-2xl font-bold">Reset your password</h1>
            <p className="mt-2 text-sm text-blue-100">
              {step === 1
                ? "Username enter karke OTP request karein."
                : "Admin se mila OTP aur naya password enter karein."}
            </p>
          </div>

          <div className="p-7">
            <div className="mb-6 flex items-center gap-2">
              {[1, 2].map((n) => (
                <div key={n} className="flex flex-1 items-center gap-2">
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${step >= n ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}
                  >
                    {n}
                  </div>
                  {n === 1 && (
                    <div
                      className={`h-1 flex-1 rounded-full ${step === 2 ? "bg-blue-600" : "bg-slate-100"}`}
                    />
                  )}
                </div>
              ))}
            </div>

            {message && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleRequestOtp} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Username
                  </label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                    placeholder="Enter your username"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
                <button
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {isSubmitting ? "Sending..." : "Request OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    6-digit OTP
                  </label>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    autoFocus
                    inputMode="numeric"
                    placeholder="••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xl font-bold tracking-[0.5em] outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    New Password
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={4}
                    placeholder="Enter new password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
                <button
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
                >
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            )}

            <p className="mt-7 text-center text-sm text-slate-500">
              Yaad aa gaya?{" "}
              <Link
                to="/login"
                className="font-semibold text-blue-600 hover:underline"
              >
                Login karein
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
