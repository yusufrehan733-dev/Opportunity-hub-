import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "./hook/use-auth";

export default function Register() {
  const navigate = useNavigate();
  const registerMutation = useRegister();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleRegister() {
    setMessage("");

    if (!name.trim()) {
      setMessage("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      setMessage("Please enter your email.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setMessage("Creating your account...");

    try {
      const result = await registerMutation.mutateAsync({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
      });

      if (result.emailConfirmationRequired) {
        setMessage(
          "Account created. Please check your email, confirm your account, then log in."
        );

        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 1500);

        return;
      }

      setMessage("Account created successfully. Opening your dashboard...");

      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 500);
    } catch (error: any) {
      console.error("Registration error:", error);
      setMessage(
        error?.message || "Registration failed. Please try again."
      );
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
          maxWidth: 400,
          background: "#fff",
          padding: 30,
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          boxSizing: "border-box",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Create Account</h1>

        <p style={{ color: "#666" }}>
          Start your 14-day Opportunity Hub trial.
        </p>

        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 10,
            boxSizing: "border-box",
          }}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 10,
            boxSizing: "border-box",
          }}
        />

        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 10,
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
            padding: 12,
            marginBottom: 10,
            boxSizing: "border-box",
          }}
        />

        <input
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 15,
            boxSizing: "border-box",
          }}
        />

        <button
          type="button"
          onClick={handleRegister}
          disabled={registerMutation.isPending}
          style={{
            width: "100%",
            padding: 12,
            cursor: registerMutation.isPending ? "wait" : "pointer",
          }}
        >
          {registerMutation.isPending
            ? "Creating account..."
            : "Create Account"}
        </button>

        {message && (
          <p
            style={{
              marginTop: 15,
              color: message.includes("successfully") ||
                message.includes("Account created")
                ? "green"
                : "#b00020",
            }}
          >
            {message}
          </p>
        )}

        <p style={{ marginTop: 20 }}>
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
