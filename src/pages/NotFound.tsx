import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={{ padding: "20px", fontFamily: "Inter, sans-serif" }}>
      <h1>404 ❌</h1>
      <p>Page not found.</p>
      <Link to="/">Go Home</Link>
    </div>
  );
}
