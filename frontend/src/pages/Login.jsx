import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  UsersRound,
  ReceiptIndianRupee,
} from "lucide-react";

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Login nahi ho paya. Username ya password check karein.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl min-h-[650px] bg-white rounded-[28px] overflow-hidden shadow-2xl grid lg:grid-cols-2">
        {/* LEFT BRAND SECTION */}
        <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 p-12 text-white flex-col justify-between">
          {/* Background decoration */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/10 rounded-full" />
          <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-white/10 rounded-full" />

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
                <ReceiptIndianRupee size={26} />
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  Daily Collection
                </h1>
                <p className="text-blue-100 text-xs">
                  Collection Management System
                </p>
              </div>
            </div>

            <div className="mt-24 max-w-md">
              <p className="text-blue-100 text-sm font-medium mb-3">
                SMART COLLECTION MANAGEMENT
              </p>

              <h2 className="text-4xl font-bold leading-tight">
                Manage your daily collection
                <span className="text-blue-200"> smarter.</span>
              </h2>

              <p className="mt-5 text-blue-100 leading-7">
                Track consumers, collections, dues, complaints and reports from
                one simple platform.
              </p>
            </div>

            <div className="mt-10 space-y-4">
              <Feature
                icon={<ReceiptIndianRupee size={18} />}
                text="Daily collection tracking"
              />

              <Feature
                icon={<UsersRound size={18} />}
                text="Consumer management"
              />

              <Feature
                icon={<BarChart3 size={18} />}
                text="Reports & analytics"
              />

              <Feature
                icon={<ShieldCheck size={18} />}
                text="Secure staff access"
              />
            </div>
          </div>

          <div className="relative z-10 text-sm text-blue-200">
            © {new Date().getFullYear()} Daily Collection
          </div>
        </div>

        {/* RIGHT LOGIN */}
        <div className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-10">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <ReceiptIndianRupee size={22} />
              </div>

              <div>
                <h1 className="font-bold text-slate-900">Daily Collection</h1>
                <p className="text-xs text-slate-500">Collection Management</p>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-blue-600 text-sm font-semibold mb-2">
                WELCOME BACK
              </p>

              <h2 className="text-3xl font-bold text-slate-900">
                Sign in to your account
              </h2>

              <p className="text-slate-500 mt-2 text-sm">
                ଆପଣଙ୍କ ଦୈନିକ ସଂଗ୍ରହ ପରିଚାଳନା କରିବା ପାଇଁ ଲଗ୍ ଇନ୍ କରନ୍ତୁ ।
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* USERNAME */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Username
                </label>

                <div className="relative">
                  <UserRound
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                    placeholder="Enter your username"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none transition focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Password
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <LockKeyhole
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="w-full h-12 pl-11 pr-12 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none transition focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="group w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/20"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition"
                    />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>

              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-slate-400">
                  New to Daily Collection?
                </span>
              </div>
            </div>

            <Link
              to="/signup"
              className="w-full h-11 rounded-xl border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const Feature = ({ icon, text }) => {
  return (
    <div className="flex items-center gap-3 text-sm text-blue-50">
      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
        {icon}
      </div>

      <span>{text}</span>
    </div>
  );
};

export default Login;
