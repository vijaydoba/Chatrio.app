import React from "react";
import "./avatar.css";

// A friend's face: initials on a gradient derived deterministically from their
// name (so they always look the same), with an optional presence dot. Shared by
// the Messages inbox, DM thread header, request cards, and the call screen.

const GRADIENTS: [string, string][] = [
  ["#7c3aed", "#c026d3"],
  ["#0ea5e9", "#22d3ee"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#22d3ee"],
  ["#6366f1", "#22d3ee"],
  ["#ec4899", "#f59e0b"],
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  name: string;
  size?: number;
  presence?: "online" | "offline" | null;
  className?: string;
};

export default function Avatar({ name, size = 42, presence = null, className = "" }: Props) {
  const [c1, c2] = GRADIENTS[hash(name || "") % GRADIENTS.length];
  const cls =
    "cr-avatar" +
    (presence ? ` cr-avatar-${presence}` : "") +
    (className ? ` ${className}` : "");
  return (
    <span
      className={cls}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
