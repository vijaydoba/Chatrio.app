import React, { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { circlesAdmin, Report, Ban } from "../circlesApi";
import "./circles-admin.css";

type Tab = "reports" | "bans";
const TOKEN_KEY = "circles_admin_token";

const fmtWhen = (ms: number) => {
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};
const initials = (name?: string | null) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
};

export default function CirclesAdmin() {
  const [token, setToken] = useState<string>(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState<Tab>("reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  // ban modal
  const [banFor, setBanFor] = useState<{ id: number; nick: string | null } | null>(null);
  const [banReason, setBanReason] = useState("");

  const toast = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 3000); };

  const loadAll = useCallback(async (tk: string) => {
    setLoading(true);
    try {
      const [r, b] = await Promise.all([circlesAdmin.reports(tk), circlesAdmin.bans(tk)]);
      setReports(r); setBans(b);
      return true;
    } catch (e) {
      throw e;
    } finally { setLoading(false); }
  }, []);

  // If a token is already cached, try to use it on mount.
  useEffect(() => {
    if (!token) return;
    loadAll(token).then(() => setUnlocked(true)).catch(() => { sessionStorage.removeItem(TOKEN_KEY); setToken(""); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const unlock = async () => {
    if (!pwd.trim()) return;
    setBusy(true); setAuthErr("");
    try {
      await loadAll(pwd.trim());
      sessionStorage.setItem(TOKEN_KEY, pwd.trim());
      setToken(pwd.trim()); setUnlocked(true); setPwd("");
    } catch (e) {
      setAuthErr(e instanceof Error && e.message !== "Unauthorized" ? e.message : "Wrong admin token.");
    } finally { setBusy(false); }
  };

  const lock = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(""); setUnlocked(false); setReports([]); setBans([]);
  };

  const refresh = async () => { try { await loadAll(token); } catch (e) { toast(e instanceof Error ? e.message : "Failed"); } };

  const doBan = async () => {
    if (!banFor) return;
    try {
      await circlesAdmin.ban(token, banFor.id, banReason.trim());
      toast(`Banned ${banFor.nick || `user ${banFor.id}`}.`);
      setBanFor(null); setBanReason("");
      await loadAll(token);
    } catch (e) { toast(e instanceof Error ? e.message : "Failed"); }
  };

  const doUnban = async (userId: number, nick?: string | null) => {
    try {
      await circlesAdmin.unban(token, userId);
      toast(`Unbanned ${nick || `user ${userId}`}.`);
      await loadAll(token);
    } catch (e) { toast(e instanceof Error ? e.message : "Failed"); }
  };

  const Shell = (children: React.ReactNode) => (
    <div className="ca-wrap">
      <Helmet><title>Circles Admin | Chatrio</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      <div className="ca-toast-wrap" aria-live="polite" role="status">{!!notice && <div className="ca-toast">{notice}</div>}</div>
      {children}
    </div>
  );

  // ── lock screen ──
  if (!unlocked) {
    return Shell(
      <div className="ca-card ca-login">
        <span className="ca-badge">Moderation</span>
        <h1 className="ca-h1">Circles Admin</h1>
        <p className="ca-sub">Enter the admin token to review reports and manage bans.</p>
        <label className="ca-field">
          <span className="ca-label">Admin token</span>
          <input className="ca-input" type="password" value={pwd} autoFocus autoComplete="off"
            placeholder="••••••••" onChange={(e) => setPwd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && unlock()} />
        </label>
        <button className="ca-btn" disabled={busy || !pwd.trim()} onClick={unlock}>{busy ? "Checking…" : "Unlock"}</button>
        {!!authErr && <p className="ca-err" role="alert">{authErr}</p>}
      </div>
    );
  }

  const banReportedCount = reports.filter((r) => !r.reported_banned).length;

  // ── dashboard ──
  return Shell(
    <div className="ca-main">
      <header className="ca-head">
        <div>
          <h1 className="ca-h1 ca-h1-sm">Circles Admin</h1>
          <p className="ca-meta">{reports.length} report{reports.length === 1 ? "" : "s"} · {bans.length} ban{bans.length === 1 ? "" : "s"}</p>
        </div>
        <div className="ca-head-actions">
          <button className="ca-icon-btn" aria-label="Refresh" onClick={refresh} disabled={loading}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          </button>
          <button className="ca-btn ca-ghost ca-sm" onClick={lock}>Lock</button>
        </div>
      </header>

      <div className="ca-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "reports"} className={tab === "reports" ? "on" : ""} onClick={() => setTab("reports")}>
          Reports{banReportedCount ? <span className="ca-tab-badge">{banReportedCount}</span> : null}
        </button>
        <button role="tab" aria-selected={tab === "bans"} className={tab === "bans" ? "on" : ""} onClick={() => setTab("bans")}>
          Bans{bans.length ? <span className="ca-tab-badge ca-tab-badge-muted">{bans.length}</span> : null}
        </button>
      </div>

      {tab === "reports" && (
        <div className="ca-list">
          {loading && reports.length === 0 && <p className="ca-dim">Loading…</p>}
          {!loading && reports.length === 0 && <p className="ca-dim">No reports yet. 🎉</p>}
          {reports.map((r) => (
            <div className={`ca-report${r.reported_banned ? " banned" : ""}`} key={r.id}>
              <div className="ca-report-top">
                <span className="ca-avatar" aria-hidden="true">{initials(r.reported_nick)}</span>
                <div className="ca-report-who">
                  <div className="ca-name">
                    {r.reported_nick || "Unknown"} <span className="ca-uid">#{r.reported_id}</span>
                    {r.reported_count > 1 && <span className="ca-flag">{r.reported_count}× reported</span>}
                    {!!r.reported_banned && <span className="ca-banned-tag">Banned</span>}
                  </div>
                  <div className="ca-when">{fmtWhen(r.created_at)} · by {r.reporter_nick || "Unknown"} <span className="ca-uid">#{r.reporter_id}</span></div>
                </div>
                {r.reported_banned
                  ? <button className="ca-btn ca-ghost ca-sm" onClick={() => doUnban(r.reported_id, r.reported_nick)}>Unban</button>
                  : <button className="ca-btn ca-danger ca-sm" onClick={() => { setBanFor({ id: r.reported_id, nick: r.reported_nick }); setBanReason(""); }}>Ban</button>}
              </div>
              {r.reason && <div className="ca-reason">“{r.reason}”</div>}
            </div>
          ))}
        </div>
      )}

      {tab === "bans" && (
        <div className="ca-list">
          {!loading && bans.length === 0 && <p className="ca-dim">No active bans.</p>}
          {bans.map((b) => (
            <div className="ca-row" key={b.user_id}>
              <div className="ca-row-main">
                <span className="ca-avatar ca-avatar-muted" aria-hidden="true">{initials(b.nickname)}</span>
                <div className="ca-row-text">
                  <div className="ca-name">{b.nickname || "Unknown"} <span className="ca-uid">#{b.user_id}</span></div>
                  <div className="ca-when">{fmtWhen(b.created_at)}{b.reason ? ` · ${b.reason}` : ""}</div>
                </div>
              </div>
              <button className="ca-btn ca-ghost ca-sm" onClick={() => doUnban(b.user_id, b.nickname)}>Unban</button>
            </div>
          ))}
        </div>
      )}

      {banFor && (
        <div className="ca-modal" role="dialog" aria-modal="true" aria-label={`Ban ${banFor.nick || `user ${banFor.id}`}`} onClick={() => setBanFor(null)}>
          <div className="ca-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="ca-modal-title">Ban {banFor.nick || `user #${banFor.id}`}?</h3>
            <p className="ca-fine">They'll be blocked from Circles on every request and disconnected immediately. You can unban later.</p>
            <input className="ca-input" placeholder="Reason (optional, internal)" maxLength={200} autoFocus
              value={banReason} onChange={(e) => setBanReason(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doBan()} />
            <div className="ca-modal-actions">
              <button className="ca-btn ca-ghost ca-sm" onClick={() => setBanFor(null)}>Cancel</button>
              <button className="ca-btn ca-danger ca-sm" onClick={doBan}>Ban user</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
