import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <Sidebar />

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0">
          {/* Mobile header ke liye space */}
          <div className="h-16 md:hidden" />

          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
