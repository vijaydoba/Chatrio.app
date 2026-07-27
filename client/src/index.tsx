import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./auth";

const rootElement = document.getElementById("root") as HTMLElement;

const app = (
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);

// Use hydrateRoot when react-snap has pre-rendered content, createRoot otherwise
if (rootElement.hasChildNodes()) {
  ReactDOM.hydrateRoot(rootElement, app, {
    onRecoverableError(error, errorInfo) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `Hydration recoverable error: ${message}${errorInfo.componentStack || ""}`
      );
    },
  });
} else {
  ReactDOM.createRoot(rootElement).render(app);
}
