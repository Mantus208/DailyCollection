import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import AreaSelection from "./pages/AreaSelection";
import AreaAdd from "./pages/AreaAdd";
import FranchiseeAdd from "./pages/FranchiseeAdd";
import ManageStaff from "./pages/ManageStaff";
import ImportData from "./pages/ImportData";
import Dashboard from "./pages/Dashboard";
import ConsumerSearch from "./pages/ConsumerSearch";
import ConsumerDetail from "./pages/ConsumerDetail";
import Reports from "./pages/Reports";
import Complaints from "./pages/Complaints";
import StockMaterialAdd from "./pages/StockMaterialAdd";
import StockDetail from "./pages/StockDetail";
import StockReport from "./pages/StockReport";
import ActivityLog from "./pages/ActivityLog";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import PackagePricing from "./pages/PackagePricing";
import CollectionEntry from "./pages/CollectionEntry";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<AreaSelection />} />
        <Route path="/area-add" element={<AreaAdd />} />
        <Route path="/franchisee-add" element={<FranchiseeAdd />} />
        <Route path="/manage-staff" element={<ManageStaff />} />
        <Route path="/import-data" element={<ImportData />} />
        <Route path="/stock-material-add" element={<StockMaterialAdd />} />
        <Route path="/stock-detail" element={<StockDetail />} />
        <Route path="/stock-report" element={<StockReport />} />
        <Route path="/package-pricing" element={<PackagePricing />} />
        <Route path="/activity-log" element={<ActivityLog />} />
        <Route path="/area/:areaId" element={<Dashboard />} />
        <Route path="/area/:areaId/search" element={<ConsumerSearch />} />
        <Route path="/area/:areaId/collection" element={<CollectionEntry />} />
        <Route path="/area/:areaId/reports" element={<Reports />} />
        <Route path="/area/:areaId/complaints" element={<Complaints />} />
        <Route
          path="/area/:areaId/consumer/:consumerId"
          element={<ConsumerDetail />}
        />
      </Route>
    </Routes>
  );
}

export default App;
