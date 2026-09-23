import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

const CollectionEntry = () => {
  const { areaId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const openCollection = async () => {
      try {
        setLoading(true);
        setError("");

        // -----------------------------------------
        // AREA ACCESS VALIDATION
        // -----------------------------------------
        const { data: areas } = await api.get("/areas");

        const area = areas.find((a) => String(a._id) === String(areaId));

        if (!area) {
          localStorage.removeItem("dc_selected_area");
          navigate("/", { replace: true });
          return;
        }

        localStorage.setItem("dc_selected_area", JSON.stringify(area));

        // -----------------------------------------
        // MOBILE
        // Existing search screen
        // -----------------------------------------
        if (window.innerWidth < 1024) {
          navigate(`/area/${areaId}/search`, {
            replace: true,
          });
          return;
        }

        // -----------------------------------------
        // DESKTOP
        // Load first consumer
        // -----------------------------------------
        const { data } = await api.get("/consumers/search", {
          params: {
            areaId: areaId,
            q: "",
          },
        });

        const consumers = Array.isArray(data) ? data : [];

        if (consumers.length === 0) {
          navigate(`/area/${areaId}/search`, {
            replace: true,
          });
          return;
        }

        // First customer open in split workspace
        navigate(`/area/${areaId}/consumer/${consumers[0]._id}`, {
          replace: true,
        });
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

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

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
};

export default CollectionEntry;
