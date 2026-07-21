import React from "react";

export type IslandState = "idle" | "searching" | "matched";

type Props = {
  state: IslandState;
  onlineLabel: string;
  waitingCount: number;
  partnerName: string;
};

// Dynamic Island–style live status pill for the chat lobby.
// Dark theme only — the caller renders the plain text status in light mode.
export default function DynamicIsland({ state, onlineLabel, waitingCount, partnerName }: Props) {
  return (
    <div className={`dyn-island dyn-${state}`} role="status" aria-live="polite">
      {/* key={state} remounts the content so the cross-fade animation replays on each morph */}
      <div className="dyn-inner" key={state}>
        {state === "idle" && (
          <>
            <span className="dyn-dot" aria-hidden="true" />
            <span className="dyn-label">{onlineLabel}</span>
          </>
        )}

        {state === "searching" && (
          <>
            <span className="dyn-spinner" aria-hidden="true" />
            <span className="dyn-label">
              {waitingCount > 1 ? `Finding someone · ${waitingCount} waiting` : "Finding someone…"}
            </span>
          </>
        )}

        {state === "matched" && (
          <>
            <span className="dyn-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <span className="dyn-label">Connected · {partnerName}</span>
          </>
        )}
      </div>
    </div>
  );
}
