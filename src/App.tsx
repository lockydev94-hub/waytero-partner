// ============================================================
// WAYTERO PARTNER PORTAL — APP ROUTER
// Routes: /login → /change-password → /dashboard/*
// ============================================================
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { useGstEnabled } from "./hooks/useGstEnabled";
import { usePartnerServices } from "./hooks/usePartnerServices";
import { RealtimeProvider } from "./contexts/RealtimeContext";
import SessionManager from "./components/auth/SessionManager";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ForceChangePasswordPage from "./pages/auth/ForceChangePasswordPage";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardPage from "./pages/dashboard/DashboardPage";
import BookingsPage from "./pages/bookings/BookingsPage";
import BookingDetailPage from "./pages/bookings/BookingDetailPage";
import HotelBookingDetailPage from "./pages/bookings/HotelBookingDetailPage";
import TourBookingDetailPage from "./pages/bookings/TourBookingDetailPage";
import HotelSwitchHistoryPage from "./pages/hotel-bookings/HotelSwitchHistoryPage";
import CashCollectionPage from "./pages/cash-collection/CashCollectionPage";
import VehiclesPage from "./pages/vehicles/VehiclesPage";
import WalletPage from "./pages/wallet/WalletPage";
import AnalyticsPage from "./pages/analytics";
import HotelsPage from "./pages/hotels";
import HotelRoomsPage from "./pages/hotels/HotelRoomsPage";
import HotelDetailPage from "./pages/hotels/HotelDetailPage";
import NotificationsPage from "./pages/notifications";
import ToursPage from "./pages/tours";
import TourDetailPage from "./pages/tours/[id]/index";
import TourBookingsPage from "./pages/tours/[id]/bookings";
import SettingsPage from "./pages/settings/SettingsPage";
import GstChallanPage from "./pages/gst-challan/GstChallanPage";
import MyOffersPage from "./pages/offers/MyOffersPage";

// ── Protected route guard ──────────────────────────────────
function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated, mustChangePassword } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;
  return children;
}

// ── Force-change guard (blocks if not needed) ─────────────
function RequireChange({ children }: { children: JSX.Element }) {
  const { isAuthenticated, mustChangePassword } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!mustChangePassword) return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Feature-flag guard: redirects when the platform has GST disabled ──
// Prevents direct navigation (bookmarks, browser back, stale tabs) from
// reaching the GST Challan page when the admin has switched platform GST
// off. Pairs with DashboardLayout hiding the sidebar entry.
function RequireGstEnabled({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const { isGstEnabled, isLoading } = useGstEnabled();
  if (isLoading) return null;                  // don't flash the page during flag check
  if (!isGstEnabled) return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Service-type guard: blocks pages for services the partner was not ──
// assigned (CAB / HOTEL / TOUR). Pairs with DashboardLayout hiding the
// sidebar entry for unassigned services, so direct navigation (bookmarks,
// stale tabs, URL edits) is blocked too.
function RequireService({ service, children }: { service: string | string[]; children: JSX.Element }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const { services, isLoading } = usePartnerServices();
  if (isLoading) return null;                  // don't flash the page during service check
  const needed = Array.isArray(service) ? service : [service];
  if (!needed.some((s) => services.has(s))) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route
        path="/change-password"
        element={
          <RequireChange>
            <SessionManager>
              <ForceChangePasswordPage />
            </SessionManager>
          </RequireChange>
        }
      />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <SessionManager>
              <RealtimeProvider>
                <DashboardLayout />
              </RealtimeProvider>
            </SessionManager>
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="bookings/:bookingNumber" element={<BookingDetailPage />} />
        <Route path="bookings/hotel/:reservationId" element={<HotelBookingDetailPage />} />
        <Route path="bookings/tour/:bookingId" element={<TourBookingDetailPage />} />
        <Route path="hotel-bookings/switch-history" element={<RequireService service="HOTEL"><HotelSwitchHistoryPage /></RequireService>} />
        <Route path="cash-collection" element={<RequireService service="CAB"><CashCollectionPage /></RequireService>} />
        <Route path="fleet" element={<RequireService service="CAB"><VehiclesPage /></RequireService>} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="hotels" element={<RequireService service="HOTEL"><HotelsPage /></RequireService>} />
        <Route path="hotels/rooms" element={<RequireService service="HOTEL"><HotelRoomsPage /></RequireService>} />
        <Route path="hotels/:hotelId" element={<RequireService service="HOTEL"><HotelDetailPage /></RequireService>} />
        <Route path="tours" element={<RequireService service="TOUR"><ToursPage /></RequireService>} />
        <Route path="tours/:id" element={<RequireService service="TOUR"><TourDetailPage /></RequireService>} />
        <Route path="tours/:id/bookings" element={<RequireService service="TOUR"><TourBookingsPage /></RequireService>} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="offers" element={<RequireService service={["HOTEL", "TOUR"]}><MyOffersPage /></RequireService>} />
        <Route path="gst-challan" element={<RequireGstEnabled><GstChallanPage /></RequireGstEnabled>} />
        {/* Future routes: drivers */}
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
