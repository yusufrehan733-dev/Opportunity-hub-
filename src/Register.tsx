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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      alert("Please enter your email.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const result = await registerMutation.mutateAsync({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
      });

      if (result.emailConfirmationRequired) {
        alert(
          "Account created successfully. Please check your email and confirm your account before logging in."
        );

        navigate("/login", { replace: true });
        return;
      }

      alert("Account created successfully!");

      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      console.error("Registration error:", error);

      alert(
        error?.message ||
          "Registration failed. Please try again."
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

        <form onSubmit={handleRegister}>
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
            type="submit"
            disabled={registerMutation.isPending}
            style={{
              width: "100%",
              padding: 12,
              cursor: registerMutation.isPending
                ? "wait"
                : "pointer",
            }}
          >
            {registerMutation.isPending
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        <p style={{ marginTop: 20 }}>
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>

        {registerMutation.isError && (
          <p style={{ color: "#b00020", marginTop: 15 }}>
            Registration failed. Please try again.
          </p>
        )}
      </div>
    </div>
  );
            }
