import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../api/axios";

import {
  ReceiptIndianRupee,
  UsersRound,
  MessageSquareWarning,
  Clock3,
  Search,
  FileText,
  Upload,
  ArrowUpRight,
  CalendarDays,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

const todayStr = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);

  return local.toISOString().slice(0, 10);
};

const isSameMonth = (d) => {
  if (!d) return true;

  const now = new Date();
  const fd = new Date(d);

  return (
    fd.getFullYear() === now.getFullYear() && fd.getMonth() === now.getMonth()
  );
};
const todayKey = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatFollowUpDate = (value) => {
  if (!value) return "-";

  const key = getDateKey(value);
  if (!key) return "-";

  const [year, month, day] = key.split("-");

  return `${day}/${month}/${year}`;
};
const getDateKey = (value) => {
  if (!value) return "";

  // API agar YYYY-MM-DD ya ISO date de
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return new Date(value).toISOString().slice(0, 10);
};
const formatCurrency = (amount = 0) => {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
};
const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return {
      text: "Good Morning",
      icon: "🌅",
    };
  }

  if (hour >= 12 && hour < 17) {
    return {
      text: "Good Afternoon",
      icon: "☀️",
    };
  }

  if (hour >= 17 && hour < 21) {
    return {
      text: "Good Evening",
      icon: "🌆",
    };
  }

  return {
    text: "Good Night",
    icon: "🌙",
  };
};
const Dashboard = () => {
  const { areaId } = useParams();
  const navigate = useNavigate();

  const [area, setArea] = useState(null);

  const [followUps, setFollowUps] = useState({
    today: [],
    overdue: [],
    upcoming: [],
  });

  const [collectionDate, setCollectionDate] = useState(todayStr());
  const [collectionData, setCollectionData] = useState(null);

  const [complaints, setComplaints] = useState([]);
  const [reminderTab, setReminderTab] = useState("today");

  const [loading, setLoading] = useState(true);
  const greeting = getGreeting();

  useEffect(() => {
    const stored = localStorage.getItem("dc_selected_area");

    if (stored) {
      const parsed = JSON.parse(stored);

      if (parsed._id === areaId) {
        setArea(parsed);
        return;
      }
    }

    navigate("/");
  }, [areaId, navigate]);

  useEffect(() => {
    if (!area) return;

    setLoading(true);

    Promise.all([
      api.get("/follow-ups", {
        params: {
          areaId: area._id,
        },
      }),

      api.get("/complaints", {
        params: {
          areaId: area._id,
          status: "open",
        },
      }),

      api.get("/reports/today-collection", {
        params: {
          areaId: area._id,
          date: collectionDate,
        },
      }),
    ])
      .then(([followUpData, complaintData, collection]) => {
        setFollowUps(followUpData.data);

        setComplaints(complaintData.data);

        setCollectionData(collection.data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [area, collectionDate]);

  if (!area) return null;

  const totalCollection = Number(collectionData?.total || 0);
  const consumerCount = Number(collectionData?.count || 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* MAIN CONTENT */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <span>Dashboard</span>
              <ChevronRight size={14} />
              <span className="text-slate-700">{area.name}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {greeting.text} {greeting.icon}
            </h1>

            <p className="text-slate-500 mt-1 text-sm">
              Here's what's happening with your collection today.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-600">
              <CalendarDays size={17} />

              <input
                type="date"
                value={collectionDate}
                max={todayStr()}
                onChange={(e) => setCollectionDate(e.target.value)}
                className="bg-transparent outline-none text-sm"
              />
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* AREA BAR */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 sm:p-6 text-white mb-6 shadow-lg shadow-blue-600/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-blue-100 text-xs uppercase tracking-wider font-semibold">
                Current Area
              </p>

              <h2 className="text-xl font-bold mt-1">{area.name}</h2>
            </div>

            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-sm font-semibold transition"
            >
              Change Area
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Today's Collection"
            value={`₹${formatCurrency(totalCollection)}`}
            subtitle={`${consumerCount} consumers`}
            icon={ReceiptIndianRupee}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />

          <StatCard
            title="Due Consumers"
            value={
              followUps.today.length +
              followUps.overdue.length +
              followUps.upcoming.length
            }
            subtitle="All pending follow-ups"
            icon={UsersRound}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />

          <StatCard
            title="Open Complaints"
            value={complaints.length}
            subtitle={complaints.length === 0 ? "All clear" : "Needs attention"}
            icon={MessageSquareWarning}
            iconBg="bg-orange-50"
            iconColor="text-orange-600"
          />

          <StatCard
            title="Today's Follow-ups"
            value={followUps.today.length}
            subtitle={`${followUps.overdue.length} overdue • ${followUps.upcoming.length} upcoming`}
            icon={Clock3}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
          />
        </div>

        {/* QUICK ACTIONS */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900">Quick Actions</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickAction
              to={`/area/${area._id}/search`}
              icon={Search}
              title="Collection Entry"
              subtitle="Search consumer"
            />

            <QuickAction
              to={`/area/${area._id}/reports`}
              icon={FileText}
              title="Reports"
              subtitle="View collection"
            />

            <QuickAction
              to={`/area/${area._id}/complaints`}
              icon={MessageSquareWarning}
              title="Complaints"
              subtitle="Manage complaints"
            />

            <QuickAction
              to="/import-data"
              icon={Upload}
              title="Import Data"
              subtitle="Upload consumers"
            />
          </div>
        </section>

        {/* MAIN GRID */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* COLLECTION */}
          <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Collection Overview
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  Collection for selected date
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ReceiptIndianRupee size={20} />
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <LoadingState />
              ) : (
                <>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Total collected</p>

                      <p className="text-4xl font-bold text-slate-900 mt-1">
                        ₹{formatCurrency(totalCollection)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">
                        {consumerCount}
                      </p>

                      <p className="text-xs text-slate-500">Consumers</p>
                    </div>
                  </div>

                  <div className="mt-7">
                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                      <span>Today's activity</span>
                      <span>
                        {consumerCount > 0 ? "Active" : "No collection"}
                      </span>
                    </div>

                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                        style={{
                          width: consumerCount > 0 ? "100%" : "0%",
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 mt-6">
                    <MiniStat label="Consumers" value={consumerCount} />

                    <MiniStat
                      label="Average"
                      value={
                        consumerCount
                          ? `₹${formatCurrency(
                              totalCollection / consumerCount,
                            )}`
                          : "₹0"
                      }
                    />

                    <MiniStat
                      label="Status"
                      value={consumerCount > 0 ? "Active" : "Waiting"}
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* COMPLAINTS */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-900">Open Complaints</h2>

                <p className="text-xs text-slate-500 mt-1">
                  Requires attention
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <MessageSquareWarning size={20} />
              </div>
            </div>

            <div className="p-5">
              {complaints.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No open complaints"
                  subtitle="Everything looks good."
                />
              ) : (
                <div className="space-y-3">
                  {complaints.slice(0, 5).map((c) => (
                    <Link
                      key={c._id}
                      to={`/area/${area._id}/complaints`}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-orange-50 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                          <AlertCircle size={17} />
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {c.consumerId?.name ||
                              c.title ||
                              "Consumer complaint"}
                          </p>

                          <p className="text-xs text-slate-500 truncate">
                            {c.message || c.description || "Complaint pending"}
                          </p>
                        </div>
                      </div>

                      <ChevronRight
                        size={17}
                        className="text-slate-400 shrink-0"
                      />
                    </Link>
                  ))}

                  <Link
                    to={`/area/${area._id}/complaints`}
                    className="flex items-center justify-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700 pt-2"
                  >
                    View all complaints
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* LOWER GRID */}
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          {/* FOLLOW-UPS */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Collection Follow-ups
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Kaunse consumer ke ghar kab jaana hai
                  </p>
                </div>

                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Clock3 size={20} />
                </div>
              </div>

              {/* TABS */}
              <div className="flex flex-wrap gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setReminderTab("today")}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                    reminderTab === "today"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Today ({followUps.today.length})
                </button>

                <button
                  type="button"
                  onClick={() => setReminderTab("overdue")}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                    reminderTab === "overdue"
                      ? "bg-red-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Overdue ({followUps.overdue.length})
                </button>

                <button
                  type="button"
                  onClick={() => setReminderTab("upcoming")}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                    reminderTab === "upcoming"
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Upcoming ({followUps.upcoming.length})
                </button>
              </div>
            </div>

            <div className="p-5">
              {(() => {
                const currentList =
                  reminderTab === "today"
                    ? followUps.today
                    : reminderTab === "overdue"
                      ? followUps.overdue
                      : followUps.upcoming;

                if (currentList.length === 0) {
                  return (
                    <EmptyState
                      icon={CheckCircle2}
                      title={
                        reminderTab === "today"
                          ? "No follow-ups today"
                          : reminderTab === "overdue"
                            ? "No overdue follow-ups"
                            : "No upcoming follow-ups"
                      }
                      subtitle={
                        reminderTab === "today"
                          ? "Aaj kisi customer ke ghar jaana pending nahi hai."
                          : reminderTab === "overdue"
                            ? "Koi follow-up pending nahi hai."
                            : "Future mein koi scheduled follow-up nahi hai."
                      }
                    />
                  );
                }

                return (
                  <div className="space-y-2 max-h-[360px] overflow-y-auto">
                    {currentList.slice(0, 10).map((b) => {
                      const remaining =
                        Number(b.amount || 0) - Number(b.amountPaid || 0);

                      const followUp = getDateKey(b.followUpDate);

                      return (
                        <Link
                          key={b._id}
                          to={`/area/${area._id}/consumer/${b.consumerId?._id}`}
                          className={`flex items-center justify-between gap-4 rounded-xl border p-3.5 transition ${
                            reminderTab === "overdue"
                              ? "border-red-100 bg-red-50/40 hover:bg-red-50"
                              : reminderTab === "today"
                                ? "border-blue-100 bg-blue-50/30 hover:bg-blue-50"
                                : "border-violet-100 bg-violet-50/30 hover:bg-violet-50"
                          }`}
                        >
                          {/* LEFT */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                reminderTab === "overdue"
                                  ? "bg-red-100 text-red-600"
                                  : reminderTab === "today"
                                    ? "bg-blue-100 text-blue-600"
                                    : "bg-violet-100 text-violet-600"
                              }`}
                            >
                              {b.consumerId?.name?.charAt(0)?.toUpperCase() ||
                                "C"}
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-slate-800 truncate">
                                {b.consumerId?.name || "Unknown Consumer"}
                              </p>

                              <p className="text-xs text-slate-500 truncate">
                                {b.dueRemark || "Payment pending"}
                              </p>

                              {/* TODAY → EXPIRY */}
                              {reminderTab === "today" && b.expiryDate && (
                                <p className="mt-1 text-[11px] font-semibold text-blue-600">
                                  Expiry:{" "}
                                  {new Date(b.expiryDate).toLocaleDateString(
                                    "en-IN",
                                  )}
                                </p>
                              )}

                              {/* OVERDUE → VISIT + FOLLOW-UP */}
                              {reminderTab === "overdue" && (
                                <>
                                  {b.visitDate && (
                                    <p className="mt-1 text-[11px] text-red-500">
                                      Visit:{" "}
                                      {new Date(b.visitDate).toLocaleDateString(
                                        "en-IN",
                                      )}
                                    </p>
                                  )}

                                  {followUp && (
                                    <p className="text-[11px] font-semibold text-red-600">
                                      Follow-up: {formatFollowUpDate(followUp)}
                                    </p>
                                  )}
                                </>
                              )}

                              {/* UPCOMING → FOLLOW-UP */}
                              {reminderTab === "upcoming" && followUp && (
                                <p className="mt-1 text-[11px] font-semibold text-violet-600">
                                  Follow-up: {formatFollowUpDate(followUp)}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* RIGHT */}
                          <div className="text-right shrink-0">
                            <p className="font-bold text-sm text-red-600">
                              ₹{formatCurrency(remaining)}
                            </p>

                            <p
                              className={`text-[11px] font-semibold ${
                                reminderTab === "overdue"
                                  ? "text-red-500"
                                  : reminderTab === "today"
                                    ? "text-blue-500"
                                    : "text-violet-500"
                              }`}
                            >
                              {reminderTab === "overdue"
                                ? "Overdue"
                                : reminderTab === "today"
                                  ? "Today"
                                  : "Upcoming"}
                            </p>
                          </div>
                        </Link>
                      );
                    })}

                    {currentList.length > 10 && (
                      <p className="pt-2 text-center text-xs text-slate-400">
                        Showing first 10 of {currentList.length} follow-ups
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

/* ---------------- COMPONENTS ---------------- */

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:shadow-slate-200/50 transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">{title}</p>

          <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>

          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>

        <div
          className={`w-11 h-11 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

const QuickAction = ({ to, icon: Icon, title, subtitle }) => {
  return (
    <Link
      to={to}
      className="group bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50 transition"
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
          <Icon size={20} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">{title}</p>

          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <ArrowUpRight
          size={16}
          className="ml-auto text-slate-300 group-hover:text-blue-600 transition"
        />
      </div>
    </Link>
  );
};

const MiniStat = ({ label, value }) => {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-xs text-slate-400">{label}</p>

      <p className="font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, subtitle }) => {
  return (
    <div className="py-10 text-center">
      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
        <Icon size={22} />
      </div>

      <p className="font-semibold text-slate-700 mt-3">{title}</p>

      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
};

const LoadingState = () => {
  return (
    <div className="py-8 flex flex-col items-center justify-center">
      <div className="w-9 h-9 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />

      <p className="text-sm text-slate-400 mt-3">Loading collection...</p>
    </div>
  );
};

export default Dashboard;
