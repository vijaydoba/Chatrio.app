import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./auth";
import { GOOGLE_CLIENT_ID } from "./config";

const rootElement = document.getElementById("root") as HTMLElement;

// Only mount GoogleOAuthProvider once a real Client ID exists — until then
// the Google sign-in button on /login and /signup stays hidden.
const withAuthProviders = (children: React.ReactNode) =>
  GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>
  ) : (
    children
  );

const app = (
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        {withAuthProviders(
          <AuthProvider>
            <App />
          </AuthProvider>
        )}
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
