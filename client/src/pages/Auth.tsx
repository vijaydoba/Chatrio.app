import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { useAuth } from "../auth";
import "./circles.css";

export default function Auth({ mode }: { mode: "login" | "signup" }) {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || "/circles";

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") await signup(email, name, password);
      else await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="circles-wrap circles-auth">
      <Helmet>
        <title>{mode === "signup" ? "Create account" : "Log in"} — Chatrio Circles</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="auth-card">
        <h1 className="circles-h1">{mode === "signup" ? "Join Circles" : "Welcome back"}</h1>
        <p className="circles-sub">
          {mode === "signup"
            ? "Create an account to join a small group that meets again and again."
            : "Log in to rejoin your Circles."}
        </p>
        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && (
            <label className="auth-field">
              <span>Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
                required
                autoComplete="name"
                placeholder="What should the group call you?"
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
        <div className="auth-switch">
          {mode === "signup" ? (
            <>Already have an account? <NavLink to="/login">Log in</NavLink></>
          ) : (
            <>New to Circles? <NavLink to="/signup">Create an account</NavLink></>
          )}
        </div>
      </div>
    </div>
  );
}
