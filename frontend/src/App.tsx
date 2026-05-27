import { Routes, Route, Navigate } from "react-router-dom";
import { SiteLayout } from "./components/layout/SiteLayout";
import { AdminLayout } from "./components/layout/AdminLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

import { GuestHome } from "./pages/guest/Home";
import { GuestAbout } from "./pages/guest/About";
import { GuestServices } from "./pages/guest/Services";
import { GuestPromo } from "./pages/guest/Promo";
import { GuestMasterDetail } from "./pages/guest/MasterDetail";

import { LoginPage } from "./pages/auth/Login";
import { RegisterPage } from "./pages/auth/Register";

import { ClientHome } from "./pages/client/Home";
import { ClientMasterDetail } from "./pages/client/MasterDetail";
import { ClientCalendar } from "./pages/client/Calendar";
import { ClientCabinet } from "./pages/client/Cabinet";
import { ClientHistory } from "./pages/client/History";
import { ClientProfile } from "./pages/client/Profile";
import { ClientNotifications } from "./pages/client/Notifications";

import { MasterDashboard } from "./pages/master/Dashboard";
import { MasterAppointment } from "./pages/master/Appointment";
import { MasterCare } from "./pages/master/Care";
import { MasterProfile } from "./pages/master/Profile";

import { AdminClients } from "./pages/admin/Clients";
import { AdminMasters } from "./pages/admin/Masters";
import { AdminServices } from "./pages/admin/Services";
import { AdminSchedule } from "./pages/admin/Schedule";
import { AdminReports } from "./pages/admin/Reports";

export function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<GuestHome />} />
        <Route path="/about" element={<GuestAbout />} />
        <Route path="/services" element={<GuestServices />} />
        <Route path="/promo" element={<GuestPromo />} />
        <Route path="/masters/:id" element={<GuestMasterDetail />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/client" element={<ProtectedRoute roles={["client", "admin"]}><ClientHome /></ProtectedRoute>} />
        <Route path="/client/masters/:id" element={<ProtectedRoute roles={["client", "admin"]}><ClientMasterDetail /></ProtectedRoute>} />
        <Route path="/client/masters/:id/calendar" element={<ProtectedRoute roles={["client", "admin"]}><ClientCalendar /></ProtectedRoute>} />
        <Route path="/client/cabinet" element={<ProtectedRoute roles={["client", "admin"]}><ClientCabinet /></ProtectedRoute>} />
        <Route path="/client/history" element={<ProtectedRoute roles={["client", "admin"]}><ClientHistory /></ProtectedRoute>} />
        <Route path="/client/profile" element={<ProtectedRoute roles={["client", "admin"]}><ClientProfile /></ProtectedRoute>} />
        <Route path="/client/notifications" element={<ProtectedRoute roles={["client", "admin"]}><ClientNotifications /></ProtectedRoute>} />

        <Route path="/master" element={<ProtectedRoute roles={["master", "admin"]}><MasterDashboard /></ProtectedRoute>} />
        <Route path="/master/appointments/:id" element={<ProtectedRoute roles={["master", "admin"]}><MasterAppointment /></ProtectedRoute>} />
        <Route path="/master/appointments/:id/care" element={<ProtectedRoute roles={["master", "admin"]}><MasterCare /></ProtectedRoute>} />
        <Route path="/master/profile" element={<ProtectedRoute roles={["master", "admin"]}><MasterProfile /></ProtectedRoute>} />
      </Route>

      <Route element={<ProtectedRoute roles={["admin"]}><AdminLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<Navigate to="/admin/clients" replace />} />
        <Route path="/admin/clients" element={<AdminClients />} />
        <Route path="/admin/masters" element={<AdminMasters />} />
        <Route path="/admin/services" element={<AdminServices />} />
        <Route path="/admin/halls" element={<AdminClients />} />
        <Route path="/admin/discounts" element={<AdminClients />} />
        <Route path="/admin/templates" element={<AdminClients />} />
        <Route path="/admin/schedule" element={<AdminSchedule />} />
        <Route path="/admin/reports" element={<AdminReports />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
