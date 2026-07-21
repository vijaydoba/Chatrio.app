import { useEffect } from "react";

/**
 * WhatsApp/Instagram-style keyboard behavior on mobile.
 *
 * When the on-screen keyboard opens, the *visual* viewport shrinks but CSS
 * `100vh`/`100dvh` does not — so the composer gets hidden behind the keyboard.
 * This hook publishes the real visible height as the CSS var `--kb-vh` on
 * <html>, so a chat container sized `height: var(--kb-vh, 100dvh)` stays pinned
 * above the keyboard. It also fires `onViewportChange` (e.g. to keep the message
 * list scrolled to the bottom) whenever the keyboard opens/closes.
 *
 * Pass `active` so it only runs while a chat view is mounted.
 */
export function useKeyboardViewport(active: boolean, onViewportChange?: () => void) {
  useEffect(() => {
    if (!active) return;
    const vv = window.visualViewport;
    const apply = () => {
      const h = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty("--kb-vh", `${Math.round(h)}px`);
      // Defer so layout settles before we scroll the list to the bottom.
      requestAnimationFrame(() => onViewportChange && onViewportChange());
    };
    apply();
    if (vv) {
      vv.addEventListener("resize", apply);
      vv.addEventListener("scroll", apply);
    }
    window.addEventListener("orientationchange", apply);
    return () => {
      if (vv) {
        vv.removeEventListener("resize", apply);
        vv.removeEventListener("scroll", apply);
      }
      window.removeEventListener("orientationchange", apply);
      document.documentElement.style.removeProperty("--kb-vh");
    };
  }, [active, onViewportChange]);
}
