import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./Login";
import Register from "./Register";
import InviteRegister from "./InviteRegister";
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "./DashboardLayout";

import Dashboard from "./pages/Dashboard";
import Skills from "./pages/Skills";
import Leads from "./pages/Leads";
import Reseller from "./pages/Reseller";
import Contact from "./pages/Contact";
import Referral from "./pages/Referral";
import Admin from "./pages/Admin";

import Home from "./pages/Home";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import SubscriptionPolicy from "./pages/SubscriptionPolicy";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/invite-register/:token" element={<InviteRegister />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route
        path="/subscription-policy"
        element={<SubscriptionPolicy />}
      />

      {/* PROTECTED APPLICATION */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="skills" element={<Skills />} />
          <Route path="leads" element={<Leads />} />
          <Route path="reseller" element={<Reseller />} />
          <Route path="contact" element={<Contact />} />
          <Route path="referral" element={<Referral />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
