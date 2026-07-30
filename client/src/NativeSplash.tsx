import { useEffect, useState } from "react";
import "./native-splash.css";

// Shown once on cold launch of the Android app, over the same brand mark used
// in the site header — the native OS splash (static image) hands off to this
// for a real branded animated moment before the app underneath is visible.
export default function NativeSplash() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leaveTimer = setTimeout(() => setLeaving(true), 1150);
    const hideTimer = setTimeout(() => setVisible(false), 1500);
    return () => { clearTimeout(leaveTimer); clearTimeout(hideTimer); };
  }, []);

  if (!visible) return null;

  return (
    <div className={`ns-wrap${leaving ? " ns-leaving" : ""}`} aria-hidden="true">
      <div className="ns-glow" />
      <div className="ns-mark-wrap">
        <span className="ns-ring ns-ring-a" />
        <span className="ns-ring ns-ring-b" />
        <svg className="ns-mark" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="ns-bm" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6d28d9" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <rect x="1" y="2" width="34" height="23" rx="9" fill="url(#ns-bm)" />
          <path d="M5 25 L2 34 L15 25Z" fill="url(#ns-bm)" />
          <circle className="ns-dot" cx="10" cy="13.5" r="2.2" fill="white" />
          <circle className="ns-dot" cx="18" cy="13.5" r="2.2" fill="white" />
          <circle className="ns-dot" cx="26" cy="13.5" r="2.2" fill="white" />
        </svg>
      </div>
      <span className="ns-brand-label">Chatrio</span>
      <span className="ns-wordmark">Circles</span>
    </div>
  );
}
