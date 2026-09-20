import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const AppLayout = () => (
  <div className="md:flex">
    <Sidebar />
    <div className="flex-1 min-w-0">
      <Outlet />
    </div>
  </div>
);

export default AppLayout;
