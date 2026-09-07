import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Leads from "./pages/Leads";
import NotFound from "./pages/NotFound";

import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import InviteRegister from "./InviteRegister";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Home />} />

        {/* AUTH */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* INVITE FLOW */}
        <Route path="/invite/:token" element={<InviteRegister />} />

        {/* APP */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />

        {/* FALLBACK */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
