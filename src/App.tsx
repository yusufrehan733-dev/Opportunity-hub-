import { Routes, Route } from "react-router-dom";
import Login from "./Login";

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<Login />} />
    </Routes>
  );
}
