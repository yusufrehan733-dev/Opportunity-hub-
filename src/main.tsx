import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");

if (!root) {
  document.body.innerHTML = "<h1>Root not found ❌</h1>";
} else {
  const queryClient = new QueryClient();

  ReactDOM.createRoot(root).render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
