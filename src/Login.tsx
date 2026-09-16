import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useLogin, useResetPassword } from "./hook/use-auth";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const loginMutation = useLogin();
  const resetMutation = useResetPassword();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const expired = searchParams.get("expired") === "true";

  async function handleLogin() {
    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Please enter email and password.");
      return;
    }

    try {
      await loginMutation.mutateAsync({
        email: email.trim().toLowerCase(),
        password,
      });

      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      setMessage(error?.message || "Login failed.");
    }
  }

  async function handleResetPassword() {
    setMessage("");

    if (!email.trim()) {
      setMessage("Enter your email first, then tap Forgot password.");
      return;
    }

    try {
      await resetMutation.mutateAsync(email);

      setMessage(
        "Password reset email sent. Check your email and follow the link."
      );
    } catch (error: any) {
      setMessage(error?.message || "Could not send password reset email.");
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
          autoComplete="email"
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
          autoComplete="current-password"
          style={{
            width: "100%",
            marginBottom: 10,
            padding: 10,
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={handleLogin}
          disabled={loginMutation.isPending || resetMutation.isPending}
          style={{
            width: "100%",
            padding: 10,
            cursor:
              loginMutation.isPending || resetMutation.isPending
                ? "wait"
                : "pointer",
          }}
        >
          {loginMutation.isPending ? "Signing in..." : "Login"}
        </button>

        <button
          type="button"
          onClick={handleResetPassword}
          disabled={resetMutation.isPending}
          style={{
            width: "100%",
            marginTop: 10,
            padding: 10,
            background: "transparent",
            border: "none",
            textDecoration: "underline",
            cursor: resetMutation.isPending ? "wait" : "pointer",
          }}
        >
          {resetMutation.isPending
            ? "Sending..."
            : "Forgot password?"}
        </button>

        {message && (
          <p
            style={{
              marginTop: 15,
              color: message.includes("sent") ? "green" : "#b00020",
            }}
          >
            {message}
          </p>
        )}

        <p style={{ marginTop: 15 }}>
          Don't have an account?{" "}
          <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
