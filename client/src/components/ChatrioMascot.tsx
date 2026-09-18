import React from "react";

// Fresh Chatrio mascot — a playful chat-bubble character in the brand
// purple→cyan gradient with a sticker outline. `uid` keeps the gradient/filter
// ids unique so multiple mascots can render on the same page.
export default function ChatrioMascot({
  size = 96,
  uid = "m",
  className,
  style,
}: {
  size?: number;
  uid?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Chatrio mascot"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <filter id={`${uid}-sh`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#6d28d9" floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter={`url(#${uid}-sh)`}>
        <path
          d="M60 14 C33 14 14 30 14 52 C14 68 24 81 41 87 L36 104 L58 86 C59 86 60 86 60 86 C87 86 106 70 106 52 C106 30 87 14 60 14 Z"
          fill={`url(#${uid}-g)`}
          stroke="#fff"
          strokeWidth="6"
          strokeLinejoin="round"
        />
      </g>
      <circle cx="45" cy="46" r="9" fill="#fff" />
      <circle cx="75" cy="46" r="9" fill="#fff" />
      <circle cx="47" cy="47" r="4.2" fill="#0b1220" />
      <circle cx="77" cy="47" r="4.2" fill="#0b1220" />
      <path d="M42 60 Q60 82 78 60 Z" fill="#fff" />
      <path d="M54 71 Q60 82 66 71 Q66 66 60 66 Q54 66 54 71 Z" fill="#22d3ee" />
    </svg>
  );
}
