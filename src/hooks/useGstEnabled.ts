// ============================================================
// WAYTERO PARTNER PORTAL — GST FEATURE FLAG
// Hook: useGstEnabled
//
// Single source of truth for the platform-level "GST is enabled" signal
// in the partner portal. Reads the existing GET /partners/me/gst/summary
// payload (which already exposes `is_gst_enabled`) and shares the result
// across the sidebar, the route guard, and any future consumers via one
// TanStack Query cache entry.
//
// Default-deny: if the query errors, is loading, or the backend reports
// `is_gst_enabled=false`, the hook returns `false`. A broken backend
// should not accidentally expose a partner-side mutating feature.
// ============================================================
import { useQuery } from "@tanstack/react-query";
import { gstService } from "../services/gst.service";

export interface UseGstEnabledResult {
  isGstEnabled: boolean;
  isLoading: boolean;
}

const STALE_TIME_MS = 5 * 60 * 1000; // matches the topbar query

export function useGstEnabled(): UseGstEnabledResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["partner-gst-enabled"],
    queryFn: () => gstService.summary(),
    // Use the current year implicitly (default arg on the service).
    staleTime: STALE_TIME_MS,
    refetchOnMount: "always",
  });

  // Default-deny: any error, missing payload, or explicit false → disabled.
  const isGstEnabled = !isError && !!data?.is_gst_enabled;

  return { isGstEnabled, isLoading };
}
