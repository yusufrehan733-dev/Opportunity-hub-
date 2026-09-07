import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 100); // small delay prevents crash

    return () => clearTimeout(timer);
  }, [navigate]);

  return <div className="p-6">Redirecting...</div>;
}
