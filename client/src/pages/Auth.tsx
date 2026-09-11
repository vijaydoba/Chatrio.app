import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../auth";
import { GOOGLE_CLIENT_ID } from "../config";
import "./circles.css";

type Tab = "password" | "code";

export default function Auth({ mode }: { mode: "login" | "signup" }) {
  const { login, signup, requestCode, verifyCode, googleSignIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || "/circles";

  const [tab, setTab] = useState<Tab>("password");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const goToRedirect = () => navigate(redirectTo, { replace: true });

  const switchTab = (next: Tab) => {
    setTab(next);
    setError("");
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") await signup(email, name, password);
      else await login(email, password);
      goToRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  // Email code works for both login and signup — the account is
  // found-or-created server-side, so there's no separate "code signup" form.
  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!codeSent) {
        await requestCode(email);
        setCodeSent(true);
      } else {
        await verifyCode(email, code);
        goToRedirect();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSuccess = async (idToken?: string) => {
    if (!idToken) return;
    setError("");
    setBusy(true);
    try {
      await googleSignIn(idToken);
      goToRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="circles-wrap circles-auth">
      <Helmet>
        <title>{mode === "signup" ? "Create account" : "Log in"} — Chatrio</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="auth-card">
        <h1 className="circles-h1">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p className="circles-sub">
          An account unlocks Video Chat and Friends, plus your Circles.
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab${tab === "password" ? " auth-tab-active" : ""}`}
            onClick={() => switchTab("password")}
          >
            Password
          </button>
          <button
            type="button"
            className={`auth-tab${tab === "code" ? " auth-tab-active" : ""}`}
            onClick={() => switchTab("code")}
          >
            Email code
          </button>
        </div>

        {tab === "password" ? (
          <form onSubmit={submitPassword} className="auth-form">
            {mode === "signup" && (
              <label className="auth-field">
                <span>Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={32}
                  required
                  autoComplete="name"
                  placeholder="What should we call you?"
                />
              </label>
            )}
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
              />
            </label>
            {error && <div className="auth-error">{error}</div>}
            <button className="circles-btn-primary" type="submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="auth-form">
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                disabled={codeSent}
              />
            </label>
            {codeSent && (
              <label className="auth-field">
                <span>6-digit code</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  autoFocus
                />
              </label>
            )}
            {error && <div className="auth-error">{error}</div>}
            <button className="circles-btn-primary" type="submit" disabled={busy}>
              {busy ? "Please wait…" : codeSent ? "Verify code" : "Send code"}
            </button>
            {codeSent && (
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  setCodeSent(false);
                  setCode("");
                }}
                disabled={busy}
              >
                Use a different email
              </button>
            )}
          </form>
        )}

        {!!GOOGLE_CLIENT_ID && (
          <div className="auth-google">
            <div className="auth-divider"><span>or</span></div>
            <GoogleLogin
              onSuccess={(cred) => handleGoogleSuccess(cred.credential)}
              onError={() => setError("Google sign-in failed")}
            />
          </div>
        )}

        <div className="auth-switch">
          {mode === "signup" ? (
            <>Already have an account? <NavLink to="/login">Log in</NavLink></>
          ) : (
            <>New here? <NavLink to="/signup">Create an account</NavLink></>
          )}
        </div>
      </div>
    </div>
  );
}
