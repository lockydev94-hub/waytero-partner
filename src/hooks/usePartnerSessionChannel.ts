// ============================================================
// WAYTERO PARTNER — CROSS-TAB SESSION CHANNEL
// A partner often keeps the dashboard open in more than one tab. Activity in
// any tab resets the idle window everywhere, and a lock in one tab is a lock
// in all of them — otherwise the gate would be decorative.
// ============================================================
import { useEffect, useRef } from "react";

const CHANNEL_NAME = "pp_partner_session";

export type PartnerSessionMessage =
  | { type: "activity"; ts: number }
  | { type: "lock" }
  | { type: "unlock" };

let channel: BroadcastChannel | null = null;
const listeners = new Set<(message: PartnerSessionMessage) => void>();

function ensureChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (channel) return channel;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent) => {
    const message = event.data as PartnerSessionMessage;
    listeners.forEach((fn) => fn(message));
  };
  return channel;
}

export function postPartnerSessionMessage(message: PartnerSessionMessage) {
  ensureChannel()?.postMessage(message);
}

export function usePartnerSessionChannel(
  onMessage: (message: PartnerSessionMessage) => void
) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const wrapped = (message: PartnerSessionMessage) => handlerRef.current(message);
    listeners.add(wrapped);
    ensureChannel();
    return () => {
      listeners.delete(wrapped);
    };
  }, []);
}
