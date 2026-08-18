// ============================================================
// WAYTERO PARTNER PORTAL — NOTIFICATION PROMPT BANNER
// Doc Ref: BRD Part 7 §155 — Realtime channel
//
// Small MUI Alert that pins to the top of the dashboard when the
// browser's Notification permission is `default` (never asked) or
// `denied` (refused). Offers a one-click "Turn on notifications"
// button that:
//   1. Calls Notification.requestPermission()
//   2. On grant, immediately registers the FCM web push token with
//      the backend so the very first assignment can fire a push.
//
// Hidden once permission is `granted`. Mounted once at the layout
// level so the banner survives page navigations.
// ============================================================

import { useEffect, useState } from "react";
import { Alert, Button, Stack, alpha } from "@mui/material";
import { NotificationsActive, NotificationsOff } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import {
  notificationStatus,
  requestNotificationPermission,
  unlockAudioOnce,
} from "../../utils/audio";
import { registerWebPush } from "../../services/firebasePush";
import { COLORS } from "../../theme";

export default function NotificationPromptBanner() {
  const { enqueueSnackbar } = useSnackbar();
  // null = we haven't checked yet (avoids SSR / first-paint flicker);
  // otherwise the actual Notification.permission value or "unsupported".
  const [status, setStatus] = useState<
    NotificationPermission | "unsupported" | null
  >(null);
  const [busy, setBusy] = useState(false);

  // Check on mount and whenever the tab regains focus — the user may
  // have toggled permission in the browser address bar while the tab
  // was hidden.
  useEffect(() => {
    const check = () => setStatus(notificationStatus());
    check();
    const onVis = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const onEnable = async () => {
    setBusy(true);
    try {
      // Single click = single gesture — unlocks both audio (so the
      // ringtone works on the very next assignment) and notification
      // permission (so the OS-level push works).
      await unlockAudioOnce();
      const result = await requestNotificationPermission();
      setStatus(result);
      if (result === "granted") {
        const token = await registerWebPush();
        if (token) {
          enqueueSnackbar(
            "Notifications enabled — you'll be alerted for every cab assignment.",
            { variant: "success" }
          );
        } else {
          enqueueSnackbar(
            "Browser permission granted, but FCM isn't configured on the server. Cab assignments will still ring in-app.",
            { variant: "info" }
          );
        }
      } else if (result === "denied") {
        enqueueSnackbar(
          "Notifications blocked. Enable them from the lock icon in your browser's address bar.",
          { variant: "warning" }
        );
      }
    } catch (err) {
      enqueueSnackbar("Failed to enable notifications", { variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (status === null || status === "granted" || status === "unsupported") {
    return null;
  }

  const isDenied = status === "denied";
  return (
    <Alert
      severity={isDenied ? "warning" : "info"}
      icon={isDenied ? <NotificationsOff /> : <NotificationsActive />}
      sx={{
        mb: 2,
        borderRadius: 2,
        bgcolor: isDenied ? alpha("#F59E0B", 0.08) : alpha(COLORS.info ?? "#3B82F6", 0.06),
        border: `1px solid ${isDenied ? alpha("#F59E0B", 0.3) : alpha("#3B82F6", 0.2)}`,
      }}
      action={
        <Stack direction="row" spacing={1}>
          {!isDenied && (
            <Button
              variant="contained"
              size="small"
              onClick={onEnable}
              disabled={busy}
              startIcon={<NotificationsActive />}
              sx={{ fontWeight: 700, borderRadius: 2, whiteSpace: "nowrap" }}
            >
              {busy ? "Enabling…" : "Turn on Notifications"}
            </Button>
          )}
        </Stack>
      }
    >
      <Stack>
        <strong>
          {isDenied
            ? "Notifications are blocked for this site"
            : "Stay alerted for every cab assignment"}
        </strong>
        <span style={{ fontSize: "0.78rem", opacity: 0.85 }}>
          {isDenied
            ? "Open the lock icon next to the URL and allow notifications. Then refresh this page."
            : "Enable browser notifications + sound so you never miss a new cab booking from admin."}
        </span>
      </Stack>
    </Alert>
  );
}
