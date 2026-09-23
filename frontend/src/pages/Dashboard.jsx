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
const nextMonthStr = () => {
  const now = new Date();

  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
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
const formatCollectionDate = (value) => {
  if (!value) return "-";

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
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

  const currentMonthStr = () => {
    const now = new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}`;
  };

  const [cashMonth, setCashMonth] = useState(currentMonthStr());

  const [cashCollectionData, setCashCollectionData] = useState(null);
  const [showCollectionList, setShowCollectionList] = useState(false);

  const [complaints, setComplaints] = useState([]);
  const [reminderTab, setReminderTab] = useState("today");
  const [billingMonth, setBillingMonth] = useState(() =>
    todayStr().slice(0, 7),
  );
  const [billingSummary, setBillingSummary] = useState(null);
  const [billingListType, setBillingListType] = useState("");
  const [showBillingList, setShowBillingList] = useState(false);

  const [loading, setLoading] = useState(true);
  const greeting = getGreeting();

  useEffect(() => {
    const validateAreaAccess = async () => {
      try {
        const { data: areas } = await api.get("/areas");

        const allowedArea = areas.find((a) => String(a._id) === String(areaId));

        if (!allowedArea) {
          localStorage.removeItem("dc_selected_area");
          navigate("/", { replace: true });
          return;
        }

        localStorage.setItem("dc_selected_area", JSON.stringify(allowedArea));

        setArea(allowedArea);
      } catch (error) {
        console.error("Area access validation error:", error);
        localStorage.removeItem("dc_selected_area");
        navigate("/", { replace: true });
      }
    };

    validateAreaAccess();
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
      api.get("/reports/billing-summary", {
        params: {
          areaId: area._id,
          month: billingMonth,
        },
      }),
      api.get("/reports/monthly-cash-collection", {
        params: {
          areaId: area._id,
          month: cashMonth,
        },
      }),
    ])
      .then(
        ([followUpData, complaintData, collection, billingData, cashData]) => {
          setFollowUps(followUpData.data);

          setComplaints(complaintData.data);

          setCollectionData(collection.data);
          setBillingSummary(billingData.data);
          setCashCollectionData(cashData.data);
        },
      )
      .finally(() => {
        setLoading(false);
      });
  }, [area, collectionDate, billingMonth, cashMonth]);
  const getBillingList = (type) => {
    if (!billingSummary) return [];

    if (type === "all") {
      return billingSummary.customers || [];
    }

    if (type === "paid") {
      return billingSummary.paidCustomers || [];
    }

    if (type === "pending") {
      return billingSummary.pendingCustomers || [];
    }

    if (type === "not_billed") {
      return billingSummary.notBilledCustomers || [];
    }

    if (type === "no_price") {
      return billingSummary.noPriceCustomers || [];
    }

    return [];
  };
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

            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("dc_selected_area");
                navigate("/");
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-sm font-semibold transition"
            >
              Change Area
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div
            onClick={() => {
              if (collectionData?.visits?.length) {
                setShowCollectionList(true);
              }
            }}
            className="cursor-pointer"
          >
            <StatCard
              title="Selected Date Collection"
              value={`₹${formatCurrency(totalCollection)}`}
              subtitle={`${formatCollectionDate(collectionDate)} • ${consumerCount} consumers • View list`}
              icon={ReceiptIndianRupee}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
          </div>

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
              to={`/area/${area._id}/collection`}
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
        {/* BILLING SUMMARY */}
        <section className="mb-6">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">Billing Summary</h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Expected billing and payment status
                  </p>
                </div>

                <input
                  type="month"
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {!billingSummary ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Billing summary load ho raha hai...
              </div>
            ) : (
              <>
                {/* COUNTS */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-5">
                  <button
                    type="button"
                    onClick={() => {
                      setBillingListType("all");
                      setShowBillingList(true);
                    }}
                    className="text-left rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-blue-200 hover:bg-blue-50/50 transition"
                  >
                    <p className="text-xs text-slate-500">Total Customers</p>

                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {billingSummary.totalCustomers}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBillingListType("paid");
                      setShowBillingList(true);
                    }}
                    className="text-left rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 hover:bg-emerald-50 transition"
                  >
                    <p className="text-xs text-emerald-700">Paid</p>

                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                      {billingSummary.paidCustomersCount}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBillingListType("pending");
                      setShowBillingList(true);
                    }}
                    className="text-left rounded-xl border border-red-100 bg-red-50/50 p-4 hover:bg-red-50 transition"
                  >
                    <p className="text-xs text-red-700">Pending</p>

                    <p className="text-2xl font-bold text-red-700 mt-1">
                      {billingSummary.pendingCustomersCount}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBillingListType("not_billed");
                      setShowBillingList(true);
                    }}
                    className="text-left rounded-xl border border-amber-100 bg-amber-50/50 p-4 hover:bg-amber-50 transition"
                  >
                    <p className="text-xs text-amber-700">Not Yet Billed</p>

                    <p className="text-2xl font-bold text-amber-700 mt-1">
                      {billingSummary.notBilledCustomersCount}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBillingListType("no_price");
                      setShowBillingList(true);
                    }}
                    className="text-left rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition"
                  >
                    <p className="text-xs text-slate-500">No Price</p>

                    <p className="text-2xl font-bold text-slate-700 mt-1">
                      {billingSummary.noPriceCustomersCount}
                    </p>
                  </button>
                </div>

                {/* AMOUNTS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-5 pb-5">
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-xs text-blue-600">Expected Bill</p>

                    <p className="text-xl font-bold text-blue-700 mt-1">
                      ₹{formatCurrency(billingSummary.expectedBill)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="text-xs text-emerald-600">Collected</p>

                    <p className="text-xl font-bold text-emerald-700 mt-1">
                      ₹{formatCurrency(billingSummary.totalPaid)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-50 p-4">
                    <p className="text-xs text-red-600">Pending</p>

                    <p className="text-xl font-bold text-red-700 mt-1">
                      ₹{formatCurrency(billingSummary.totalPending)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* MONTHLY CASH COLLECTION */}
        <section className="mb-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Monthly Cash Collection
                </p>

                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ₹{formatCurrency(cashCollectionData?.total || 0)}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  {cashCollectionData?.count || 0} collection entries
                </p>
              </div>

              <div className="text-sm text-slate-500">
                {new Date(`${cashMonth}-01`).toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
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
        {showBillingList && billingSummary && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm p-4 flex items-center justify-center">
            <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* HEADER */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900">
                    {billingListType === "all"
                      ? "All Customers"
                      : billingListType === "paid"
                        ? "Paid Customers"
                        : billingListType === "pending"
                          ? "Pending Customers"
                          : billingListType === "not_billed"
                            ? "Not Yet Billed"
                            : "No Price / Package"}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1">
                    {getBillingList(billingListType).length} customers
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBillingList(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                >
                  ✕
                </button>
              </div>

              {/* LIST */}
              <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
                {getBillingList(billingListType).length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="font-semibold text-slate-700">
                      No customers found
                    </p>

                    <p className="text-xs text-slate-400 mt-1">
                      Is category me koi customer nahi hai.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getBillingList(billingListType).map((c) => (
                      <Link
                        key={c.consumerId}
                        to={`/area/${area._id}/consumer/${c.consumerId}`}
                        onClick={() => setShowBillingList(false)}
                        className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-3.5 hover:bg-slate-50 transition"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-800 truncate">
                            {c.name}
                          </p>

                          <p className="text-xs text-slate-500 mt-0.5">
                            {c.customerId}
                          </p>

                          <p className="text-[11px] text-slate-400 mt-1 truncate">
                            {c.packageName || "No package"}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm text-slate-900">
                            ₹{formatCurrency(c.billAmount)}
                          </p>

                          {billingListType === "paid" && (
                            <p className="text-[11px] text-emerald-600">Paid</p>
                          )}

                          {billingListType === "pending" && (
                            <p className="text-[11px] text-red-600 font-semibold">
                              ₹{formatCurrency(c.balance)} pending
                            </p>
                          )}

                          {billingListType === "not_billed" && (
                            <p className="text-[11px] text-amber-600">
                              Not yet billed
                            </p>
                          )}

                          {billingListType === "no_price" && (
                            <p className="text-[11px] text-slate-500">
                              Price required
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {showCollectionList && collectionData?.visits && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm p-4 flex items-center justify-center">
            <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* HEADER */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Collection Customers
                  </h3>

                  <p className="text-xs text-slate-500 mt-1">
                    {formatCollectionDate(collectionDate)} •{" "}
                    {collectionData.visits.length} customers
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCollectionList(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                >
                  ✕
                </button>
              </div>

              {/* LIST */}
              <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
                <div className="space-y-2">
                  {collectionData.visits.map((v) => (
                    <Link
                      key={v._id}
                      to={`/area/${area._id}/consumer/${v.consumerId?._id}`}
                      onClick={() => setShowCollectionList(false)}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-3.5 hover:bg-blue-50/50 hover:border-blue-100 transition"
                    >
                      {/* LEFT */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {v.consumerId?.name?.charAt(0)?.toUpperCase() || "C"}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-800 truncate">
                            {v.consumerId?.name || "Unknown Consumer"}
                          </p>

                          <p className="text-xs text-slate-500 mt-0.5">
                            {v.consumerId?.consumerId || "-"}
                          </p>
                        </div>
                      </div>

                      {/* RIGHT */}
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-emerald-600">
                          ₹{formatCurrency(v.amountCollected)}
                        </p>

                        <p className="text-[11px] text-slate-400">Collected</p>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* TOTAL */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600">
                    Total Collection
                  </span>

                  <span className="text-lg font-bold text-slate-900">
                    ₹{formatCurrency(collectionData.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
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
