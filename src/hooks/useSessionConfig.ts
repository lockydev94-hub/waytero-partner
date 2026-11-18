// ============================================================
// WAYTERO PARTNER — USE SESSION CONFIG
// One GET /auth/admin/session-config supplies the idle window, MPIN state,
// minimum PIN length and the absolute 12-hour session expiry. Re-fetched on
// focus so changing the PIN in Settings reaches the shell immediately.
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { mpinService } from "../services/mpin.service";
import { useLockStore } from "../stores/lockStore";

export function useSessionConfig(enabled: boolean) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const config = await mpinService.getSessionConfig();
      useLockStore.getState().setSessionConfig(config);
      setFailed(false);
    } catch {
      // No policy → fall back to the stricter logout-on-idle behaviour.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [enabled, refresh]);

  return { loading, failed, refresh };
}
