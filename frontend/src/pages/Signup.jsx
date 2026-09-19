import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";

// Generates a readable-but-strong random password, e.g. "Xk7#mQ2p"
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
  for (let i = 0; i < 4; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd;
};

const Signup = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = details form, 2 = OTP entry
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGeneratePassword = () => {
    setPassword(generatePassword());
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!password) {
      setError("Pehle password generate karein");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/auth/signup", { name, username, password });
      setMessage(data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Signup nahi ho paya, dobara try karein");
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
      // verify-otp already returns a token — log the user straight in
      localStorage.setItem("dc_token", data.token);
      localStorage.setItem(
        "dc_user",
        JSON.stringify({ _id: data._id, name: data.name, username: data.username, role: data.role })
      );
      navigate("/");
      window.location.reload(); // ensures AuthContext picks up the new session
    } catch (err) {
      setError(err.response?.data?.message || "OTP verify nahi ho paya");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-1">
          Naya Account Banayein
        </h1>
        <p className="text-center text-gray-500 mb-6 text-sm">
          {step === 1 ? "Apni detail bharein" : "Admin se mila OTP daalein"}
        </p>

        {step === 1 && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="apna pura naam"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ek username chunein"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={password}
                  readOnly
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 font-mono"
                  placeholder="Generate button dabayein"
                />
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="px-3 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 whitespace-nowrap"
                >
                  Generate
                </button>
              </div>
              {password && (
                <p className="text-xs text-amber-600 mt-1">
                  Ye password yaad rakh lein ya likh lein — login karte waqt chahiye hoga.
                </p>
              )}
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg transition"
            >
              {isSubmitting ? "Bhej rahe hain..." : "Signup Request Bhejein"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            {message && (
              <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                {message}
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OTP (admin se maangein)
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="6-digit OTP"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-2.5 rounded-lg transition"
            >
              {isSubmitting ? "Verify ho raha hai..." : "OTP Verify Karein"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Pehle se account hai?{" "}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            Login karein
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
