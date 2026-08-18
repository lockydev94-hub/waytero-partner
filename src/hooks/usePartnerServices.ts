// ============================================================
// WAYTERO PARTNER PORTAL — PARTNER SERVICES
// Hook: usePartnerServices
//
// Single source of truth for the partner's enabled service types
// (CAB / HOTEL / TOUR), read from GET /partners/me and shared via
// one TanStack Query cache entry. The sidebar uses it to show only
// the menus for services the admin assigned when creating/editing
// the partner, and the route guard uses it to block direct
// navigation to service pages the partner doesn't have.
//
// The query key + fetcher match DashboardLayout's "partner-nav-profile"
// query exactly, so the two never issue a second request.
// ============================================================
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "../services/settings.service";

export interface PartnerServiceRecord {
  service_type: string;
  is_active: boolean;
}

export interface UsePartnerServicesResult {
  /** Set of active service type codes, e.g. Set { "CAB", "HOTEL" } */
  services: Set<string>;
  isLoading: boolean;
}

export const PARTNER_PROFILE_QUERY_KEY = ["partner-nav-profile"] as const;

export function usePartnerServices(): UsePartnerServicesResult {
  const { data, isLoading } = useQuery({
    queryKey: PARTNER_PROFILE_QUERY_KEY,
    queryFn: () => settingsService.getProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const services = new Set<string>(
    ((data?.services ?? []) as PartnerServiceRecord[])
      .filter((s) => s.is_active)
      .map((s) => s.service_type)
  );

  return { services, isLoading };
}
