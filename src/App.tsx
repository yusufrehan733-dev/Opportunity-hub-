import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./Login";
import Register from "./Register";
import ResetPassword from "./ResetPassword";
import InviteRegister from "./InviteRegister";

import Dashboard from "./pages/Dashboard";
import Skills from "./pages/Skills";
import Leads from "./pages/Leads";
import Reseller from "./pages/Reseller";
import Contact from "./pages/Contact";
import Referral from "./pages/Referral";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <Routes>
      {/* AUTH */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/invite-register/:token"
        element={<InviteRegister />}
      />

      {/* DASHBOARD */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/skills" element={<Skills />} />
      <Route path="/dashboard/leads" element={<Leads />} />
      <Route path="/dashboard/reseller" element={<Reseller />} />
      <Route path="/dashboard/contact" element={<Contact />} />
      <Route path="/dashboard/referral" element={<Referral />} />
      <Route path="/dashboard/admin" element={<Admin />} />

      {/* DEFAULT */}
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      {/* UNKNOWN ROUTES */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
}
