import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useLogin } from "./hook/use-auth";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginMutation = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const expired = searchParams.get("expired") === "true";

  async function handleLogin() {
    if (!email.trim() || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      await loginMutation.mutateAsync({
        email: email.trim().toLowerCase(),
        password,
      });

      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      alert(error?.message || "Login failed");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "#f5f5f5",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#fff",
          padding: 30,
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <h1>Opportunity Hub 🔐</h1>

        {expired && (
          <p style={{ color: "#b00020" }}>
            Your trial has expired. Please sign in with an active
            subscription or contact us to continue.
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            marginBottom: 10,
            padding: 10,
            boxSizing: "border-box",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            marginBottom: 10,
            padding: 10,
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={handleLogin}
          disabled={loginMutation.isPending}
          style={{
            width: "100%",
            padding: 10,
            cursor: loginMutation.isPending ? "wait" : "pointer",
          }}
        >
          {loginMutation.isPending ? "Signing in..." : "Login"}
        </button>

        <p style={{ marginTop: 15 }}>
          Don't have an account?{" "}
          <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
