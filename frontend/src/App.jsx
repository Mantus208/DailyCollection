import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import AreaSelection from "./pages/AreaSelection";
import ManageStaff from "./pages/ManageStaff";
import ImportData from "./pages/ImportData";
import Dashboard from "./pages/Dashboard";
import ConsumerDetail from "./pages/ConsumerDetail";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AreaSelection />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage-staff"
        element={
          <ProtectedRoute>
            <ManageStaff />
          </ProtectedRoute>
        }
      />
      <Route
        path="/import-data"
        element={
          <ProtectedRoute>
            <ImportData />
          </ProtectedRoute>
        }
      />
      <Route
        path="/area/:areaId"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/area/:areaId/consumer/:consumerId"
        element={
          <ProtectedRoute>
            <ConsumerDetail />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
