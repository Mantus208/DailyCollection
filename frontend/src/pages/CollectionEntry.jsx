import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Search, UserRound, ReceiptIndianRupee } from "lucide-react";
import api from "../api/axios";

const CollectionEntry = () => {
  const { areaId } = useParams();
  const navigate = useNavigate();

  const [area, setArea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");

  const [consumerSearch, setConsumerSearch] = useState("");
  const [consumerResults, setConsumerResults] = useState([]);

  // =====================================================
  // AREA ACCESS VALIDATION
  // =====================================================
  useEffect(() => {
    const openCollection = async () => {
      try {
        setLoading(true);
        setError("");

        const { data: areas } = await api.get("/areas");

        const selectedArea = areas.find(
          (a) => String(a._id) === String(areaId),
        );

        if (!selectedArea) {
          localStorage.removeItem("dc_selected_area");
          navigate("/", { replace: true });
          return;
        }

        // Keep selected area in localStorage
        localStorage.setItem("dc_selected_area", JSON.stringify(selectedArea));

        setArea(selectedArea);

        // =================================================
        // MOBILE
        // Existing ConsumerSearch page
        // =================================================
        if (window.innerWidth < 1024) {
          navigate(`/area/${areaId}/search`, {
            replace: true,
          });
          return;
        }

        // =================================================
        // DESKTOP
        // DO NOT OPEN FIRST CUSTOMER
        // =================================================
      } catch (err) {
        console.error("Collection Entry open error:", err);

        setError(
          err.response?.data?.message || "Collection Entry open nahi hua",
        );
      } finally {
        setLoading(false);
      }
    };

    openCollection();
  }, [areaId, navigate]);

  // =====================================================
  // LOAD CONSUMERS
  // =====================================================
  useEffect(() => {
    if (!area) return;

    const timer = setTimeout(async () => {
      try {
        setListLoading(true);

        const { data } = await api.get("/consumers/search", {
          params: {
            areaId: area._id,
            q: consumerSearch,
          },
        });

        setConsumerResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Consumer list load error:", err);

        setConsumerResults([]);
      } finally {
        setListLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [area, consumerSearch]);

  // =====================================================
  // LOADING
  // =====================================================
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-3 text-xs font-medium text-slate-500">
            Opening Collection Entry...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!area) {
    return null;
  }

  // =====================================================
  // DESKTOP OPENING SCREEN
  // =====================================================
  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <div className="mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* =================================================
            LEFT — CONSUMERS
        ================================================== */}
        <aside className="hidden h-screen flex-col border-r border-slate-200 bg-white lg:flex">
          {/* HEADER */}
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-extrabold text-slate-900">
                  Consumers
                </h2>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  Current Area
                  <span className="ml-1 font-semibold text-blue-600">
                    {area.name}
                  </span>
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                {consumerResults.length}
              </span>
            </div>

            {/* SEARCH */}
            <div className="relative mt-3">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={consumerSearch}
                onChange={(e) => setConsumerSearch(e.target.value)}
                placeholder="Search consumer..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* CONSUMER LIST */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {listLoading ? (
              <div className="px-4 py-8 text-center text-xs text-slate-400">
                Loading consumers...
              </div>
            ) : consumerResults.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <UserRound size={26} className="mx-auto text-slate-300" />

                <p className="mt-2 text-xs font-medium text-slate-400">
                  No consumer found
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {consumerResults.map((c) => {
                  const bill = c.currentBill;

                  const billAmount = Number(
                    bill?.amount ?? c.monthlyAmount ?? 0,
                  );

                  const paidAmount = Number(bill?.amountPaid ?? 0);

                  const balance = Math.max(billAmount - paidAmount, 0);

                  const isPaid =
                    Boolean(bill) && billAmount > 0 && balance <= 0;

                  const isNoPrice = billAmount <= 0;

                  let statusText = "";
                  let statusClass = "";

                  if (isNoPrice) {
                    statusText = "Not Set";
                    statusClass = "text-slate-400";
                  } else if (isPaid) {
                    statusText = "PAID";
                    statusClass = "text-emerald-600";
                  } else {
                    statusText = `₹${balance}`;
                    statusClass = "text-amber-600";
                  }

                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() =>
                        navigate(`/area/${areaId}/consumer/${c._id}`)
                      }
                      className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      {/* AVATAR */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {c.name?.charAt(0)?.toUpperCase() || "C"}
                      </div>

                      {/* NAME + ID */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {c.name}
                        </p>

                        <p className="mt-0.5 truncate text-[9px] text-slate-400">
                          {c.consumerId}
                        </p>
                      </div>

                      {/* STATUS */}
                      <div
                        className={`shrink-0 text-[9px] font-bold ${statusClass}`}
                      >
                        {statusText}
                      </div>

                      <span className="text-xs text-slate-300 transition group-hover:text-blue-500">
                        ›
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* =================================================
            RIGHT — OPENING INFORMATION
        ================================================== */}
        <main className="hidden min-w-0 lg:flex">
          <div className="flex min-h-screen w-full items-center justify-center bg-[#f5f7fb] px-8">
            <div className="w-full max-w-xl text-center">
              {/* ICON */}
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <ReceiptIndianRupee size={26} />
                </div>
              </div>

              {/* TITLE */}
              <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900">
                Daily Collection
              </h1>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Select a consumer from the left to view account details, collect
                payment, manage dues and check transaction history.
              </p>

              {/* AREA */}
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                <span className="text-xs font-semibold text-slate-600">
                  {area.name}
                </span>
              </div>

              {/* SMALL INFO */}
              <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xl font-extrabold text-slate-900">
                    {consumerResults.length}
                  </p>

                  <p className="mt-1 text-[10px] font-medium text-slate-400">
                    Consumers
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-lg font-extrabold text-blue-600">
                    Collection
                  </p>

                  <p className="mt-1 text-[10px] font-medium text-slate-400">
                    Ready to start
                  </p>
                </div>
              </div>

              {/* FOOTER INFO */}
              <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <Search size={13} />
                <span>
                  Search or select a consumer from the left panel to begin.
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CollectionEntry;
