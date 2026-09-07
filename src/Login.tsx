import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    // ✅ FAKE AUTH (for now)
    localStorage.setItem("user", JSON.stringify({ email }));

    navigate("/dashboard");
  };

  return (
    <div style={{ padding: 40, maxWidth: 320, margin: "auto" }}>
      <h1>Login 🔐</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: 10, padding: 10 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: 10, padding: 10 }}
      />

      <button onClick={handleLogin} style={{ width: "100%", padding: 10 }}>
        Login
      </button>
    </div>
  );
}
