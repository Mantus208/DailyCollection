import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";

const generatePassword = () => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%";
  const all = upper + lower + numbers + symbols;
  let pwd = "";
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = 0; i < 4; i++)
    pwd += all[Math.floor(Math.random() * all.length)];
  return pwd;
};

const Signup = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGeneratePassword = () => setPassword(generatePassword());

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!password) {
      setError("Pehle password generate karein");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/auth/signup", {
        name,
        username,
        password,
      });
      setMessage(data.message);
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message || "Signup nahi ho paya, dobara try karein",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { username, otp });
      localStorage.setItem("dc_token", data.token);
      localStorage.setItem(
        "dc_user",
        JSON.stringify({
          _id: data._id,
          name: data.name,
          username: data.username,
          role: data.role,
        }),
      );
      navigate("/");
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || "OTP verify nahi ho paya");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <div className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-7 py-8 text-white">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-2xl">
              👤
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-100">
              Daily Collection
            </p>
            <h1 className="mt-1 text-2xl font-bold">Create your account</h1>
            <p className="mt-2 text-sm text-blue-100">
              {step === 1
                ? "Account details fill karein aur secure password generate karein."
                : "Admin se mila OTP enter karke account activate karein."}
            </p>
          </div>

          <div className="p-7">
            <div className="mb-6 grid grid-cols-2 gap-2">
              <div
                className={`rounded-xl px-3 py-2 text-center text-xs font-semibold ${step === 1 ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}
              >
                1. Details
              </div>
              <div
                className={`rounded-xl px-3 py-2 text-center text-xs font-semibold ${step === 2 ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-400"}`}
              >
                2. Verify OTP
              </div>
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
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Full Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Apna pura naam"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Username
                  </label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Choose a username"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Generated Password
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={password}
                      readOnly
                      placeholder="Generate button dabayein"
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 font-mono text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Generate
                    </button>
                  </div>
                  {password && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      Password ko save/likh kar rakhein.
                    </p>
                  )}
                </div>
                <button
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {isSubmitting ? "Sending..." : "Signup Request Bhejein"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    OTP
                  </label>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    autoFocus
                    inputMode="numeric"
                    placeholder="6-digit OTP"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-bold tracking-[0.45em] outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
                <button
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
                >
                  {isSubmitting ? "Verifying..." : "OTP Verify Karein"}
                </button>
              </form>
            )}

            <p className="mt-7 text-center text-sm text-slate-500">
              Pehle se account hai?{" "}
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

export default Signup;
