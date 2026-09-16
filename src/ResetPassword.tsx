import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUpdatePassword } from "./hook/use-auth";

export default function ResetPassword() {
  const navigate = useNavigate();
  const updatePassword = useUpdatePassword();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      await updatePassword.mutateAsync(password);

      setMessage("Password updated successfully. Redirecting to login...");

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (error: any) {
      setMessage(error?.message || "Could not update password.");
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
        }}
      >
        <h1>Set New Password</h1>

        <p style={{ color: "#666" }}>
          Enter your new Opportunity Hub password.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 10,
              boxSizing: "border-box",
            }}
          />

          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 15,
              boxSizing: "border-box",
            }}
          />

          <button
            type="submit"
            disabled={updatePassword.isPending}
            style={{
              width: "100%",
              padding: 12,
              cursor: updatePassword.isPending ? "wait" : "pointer",
            }}
          >
            {updatePassword.isPending
              ? "Updating..."
              : "Update Password"}
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: 15,
              color: message.includes("successfully") ? "green" : "#b00020",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
  }
