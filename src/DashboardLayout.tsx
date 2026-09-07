import { NavLink, Outlet } from "react-router-dom";

export default function DashboardLayout() {
  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    color: isActive ? "#00ffae" : "#fff",
    textDecoration: "none",
    padding: "8px 10px",
    borderRadius: 6,
    background: isActive ? "#222" : "transparent"
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {/* SIDEBAR */}
      <div
        style={{
          width: 240,
          background: "#111",
          color: "#fff",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 20
        }}
      >
        <h2>Opportunity Hub 🚀</h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>

          <NavLink to="/dashboard" style={linkStyle}>
            Dashboard
          </NavLink>

          <NavLink to="/dashboard/skills" style={linkStyle}>
            Skills
          </NavLink>

          <NavLink to="/dashboard/leads" style={linkStyle}>
            Leads
          </NavLink>

          <NavLink to="/dashboard/reseller" style={linkStyle}>
            Reseller
          </NavLink>

          {/* ✅ ADDED MISSING */}
          <NavLink to="/dashboard/contact" style={linkStyle}>
            Contact
          </NavLink>

          <NavLink to="/dashboard/referral" style={linkStyle}>
            Referral
          </NavLink>

          <NavLink to="/dashboard/admin" style={linkStyle}>
            Admin
          </NavLink>

        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div
        style={{
          flex: 1,
          padding: 30,
          background: "#f5f5f5",
          minHeight: "100vh"
        }}
      >
        <Outlet />
      </div>

    </div>
  );
}
