import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import ResetPassword from "./ResetPassword";
import Dashboard from "./pages/Dashboard";
import Skills from "./pages/Skills";

export default function App() {
  return (
    <Routes>
      {/* AUTH */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* DASHBOARD */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/skills" element={<Skills />} />

      {/* DEFAULT */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
