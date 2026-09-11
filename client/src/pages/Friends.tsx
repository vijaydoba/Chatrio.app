import React, { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useAuth, apiGet, apiPost } from "../auth";
import "./circles.css";

type Friend = {
  id: number;
  name: string;
  status: "pending" | "accepted";
  incoming: boolean;
  createdAt: number;
};

export default function Friends() {
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiGet("/friends", token);
      setFriends(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load friends");
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { state: { from: "/friends" }, replace: true });
      return;
    }
    if (!authLoading && user) load();
  }, [authLoading, user, navigate, load]);

  const respond = async (friendId: number, action: "accept" | "decline") => {
    if (!token) return;
    setBusyId(friendId);
    try {
      await apiPost(`/friends/${friendId}/${action}`, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="circles-wrap route-loading" role="status">
        <Helmet><meta name="robots" content="noindex" /></Helmet>
        Loading…
      </div>
    );
  }

  const accepted = (friends || []).filter((f) => f.status === "accepted");
  const incoming = (friends || []).filter((f) => f.status === "pending" && f.incoming);
  const sent = (friends || []).filter((f) => f.status === "pending" && !f.incoming);

  return (
    <div className="circles-wrap">
      <Helmet>
        <title>Friends — Chatrio</title>
        <meta name="description" content="Your Chatrio friends — people you've added from random video chat. Reconnect directly any time they're online." />
        <link rel="canonical" href="https://chatrio.app/friends" />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <h1 className="circles-h1">Friends</h1>
      <p className="circles-sub">People you've added from random video chat. Reconnect any time they're online.</p>

      {error && <div className="auth-error">{error}</div>}

      {incoming.length > 0 && (
        <>
          <h2 className="circle-topic">Requests</h2>
          <div className="circles-grid">
            {incoming.map((f) => (
              <div className="circle-card" key={f.id}>
                <div className="circle-card-top">
                  <h3 className="circle-topic">{f.name}</h3>
                </div>
                <div className="circle-meta">
                  <button className="circles-btn-primary circle-cta" disabled={busyId === f.id} onClick={() => respond(f.id, "accept")}>
                    Accept
                  </button>
                  <button className="vc-cancel-btn" disabled={busyId === f.id} onClick={() => respond(f.id, "decline")}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="circle-topic">Your friends</h2>
      {friends === null ? (
        <p className="circles-sub">Loading…</p>
      ) : accepted.length === 0 ? (
        <p className="circles-sub">No friends yet — add someone at the end of a video chat.</p>
      ) : (
        <div className="circles-grid">
          {accepted.map((f) => (
            <div className="circle-card" key={f.id}>
              <div className="circle-card-top">
                <h3 className="circle-topic">{f.name}</h3>
              </div>
              <button
                className="circles-btn-primary circle-cta"
                onClick={() => navigate(`/video-chat?reconnect=${f.id}`)}
              >
                Reconnect
              </button>
            </div>
          ))}
        </div>
      )}

      {sent.length > 0 && (
        <>
          <h2 className="circle-topic">Pending</h2>
          <div className="circles-grid">
            {sent.map((f) => (
              <div className="circle-card" key={f.id}>
                <div className="circle-card-top">
                  <h3 className="circle-topic">{f.name}</h3>
                </div>
                <p className="circle-desc">Waiting for them to accept</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
