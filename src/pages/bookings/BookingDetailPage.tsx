// ============================================================
// WAYTERO PARTNER PORTAL — BOOKING DETAIL PAGE
// Endpoints:
//   GET  /partners/me/bookings/:booking_number
//   POST /partners/me/bookings/:booking_number/assign-driver
//   POST /partners/me/bookings/:booking_number/start-trip
//   POST /partners/me/bookings/:booking_number/close-trip
//   POST /partners/me/bookings/:booking_number/collect-payment
//   GET  /partners/me/bookings/:booking_number/download-invoice
// ============================================================
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Card, Typography, alpha, Button, Chip,
  Avatar, Skeleton, Alert, Divider, Grid, Stack, Dialog,
  DialogTitle, DialogContent, DialogActions, RadioGroup,
  FormControlLabel, Radio, Tooltip, IconButton, LinearProgress,
  Collapse, Badge, CircularProgress,
} from "@mui/material";
import {
  ArrowBack, LocationOn, LocalTaxi, PersonPin, DirectionsCar,
  Schedule, Phone, Email, AccountBalanceWallet, AssignmentInd,
  CheckCircle, Cancel, Timeline, ExpandMore, ExpandLess,
  WifiProtectedSetup, GpsFixed, Done, Warning, Info,
  Receipt, PlayArrow, Stop, Payments, SupportAgent,
  DownloadOutlined, Speed, CurrencyRupee, TaskAlt,
  HourglassTop, Block, BuildCircle, SwapHoriz,
} from "@mui/icons-material";
import {
  bookingService,
  type BookingDetail,
  type AvailableDriver,
  type AvailableVehicle,
  type AdvanceEligibility,
} from "../../services/booking.service";
import { COLORS } from "../../theme";
import { useRealtime } from "../../hooks/useRealtime";

// Driver Assistance modals
import StartTripModal      from "./components/StartTripModal";
import CloseTripModal      from "./components/CloseTripModal";
import CollectPaymentModal from "./components/CollectPaymentModal";
import InvoiceModal        from "./components/InvoiceModal";
import CollectAdvanceModal  from "./components/CollectAdvanceModal";
import BreakdownControls    from "./components/BreakdownControls";

// Partner acceptance gate (Doc Ref: BRD Part 3 §42)
import RejectDialog        from "../../components/bookings/RejectDialog";
import PartnerCancelRequestDialog from "./components/PartnerCancelRequestDialog";
import { useCountdown }    from "../../hooks/useCountdown";

// ── Status config ────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: JSX.Element }> = {
  PENDING_ASSIGNMENT:         { label: "Pending Assignment",     color: "#F97316", bg: alpha("#F97316", 0.1), icon: <WifiProtectedSetup sx={{ fontSize: 16 }} /> },
  PENDING_PARTNER_ACCEPTANCE: { label: "Awaiting Your Acceptance", color: "#F59E0B", bg: alpha("#F59E0B", 0.12), icon: <HourglassTop sx={{ fontSize: 16 }} /> },
  ASSIGNED:                   { label: "Partner Assigned",       color: "#3B82F6", bg: alpha("#3B82F6", 0.1), icon: <AssignmentInd sx={{ fontSize: 16 }} /> },
  DRIVER_ASSIGNED:            { label: "Driver Assigned",        color: "#8B5CF6", bg: alpha("#8B5CF6", 0.1), icon: <PersonPin sx={{ fontSize: 16 }} /> },
  STARTED:                    { label: "Trip In Progress",       color: "#10B981", bg: alpha("#10B981", 0.1), icon: <GpsFixed sx={{ fontSize: 16 }} /> },
  COMPLETED:                  { label: "Completed",              color: "#10B981", bg: alpha("#10B981", 0.08), icon: <Done sx={{ fontSize: 16 }} /> },
  SETTLEMENT_PENDING:         { label: "Settlement Pending",     color: "#D97706", bg: alpha("#D97706", 0.1), icon: <AccountBalanceWallet sx={{ fontSize: 16 }} /> },
  SETTLED:                    { label: "Settled",                color: "#059669", bg: alpha("#059669", 0.1), icon: <CheckCircle sx={{ fontSize: 16 }} /> },
  CANCELLED:                  { label: "Cancelled",              color: "#EF4444", bg: alpha("#EF4444", 0.1), icon: <Cancel sx={{ fontSize: 16 }} /> },
  BREAKDOWN_REPORTED:         { label: "Vehicle Breakdown",      color: "#DC2626", bg: alpha("#DC2626", 0.1), icon: <BuildCircle sx={{ fontSize: 16 }} /> },
  AWAITING_SWAP:              { label: "Awaiting Replacement",   color: "#EA580C", bg: alpha("#EA580C", 0.1), icon: <SwapHoriz sx={{ fontSize: 16 }} /> },
};

const TRIP_TYPE_LABELS: Record<string, string> = {
  LOCAL: "Local", AIRPORT: "Airport Transfer", OUTSTATION: "Outstation",
  ONE_WAY: "One Way", ROUND_TRIP: "Round Trip",
};

const EVENT_ICONS: Record<string, JSX.Element> = {
  PARTNER_ASSIGNED:          <AssignmentInd sx={{ fontSize: 15, color: "#3B82F6" }} />,
  DRIVER_ASSIGNED:           <PersonPin sx={{ fontSize: 15, color: "#8B5CF6" }} />,
  BOOKING_CREATED:           <Receipt sx={{ fontSize: 15, color: COLORS.gold }} />,
  BOOKING_CANCELLED:         <Cancel sx={{ fontSize: 15, color: "#EF4444" }} />,
  TRIP_STARTED_BY_PARTNER:   <PlayArrow sx={{ fontSize: 15, color: "#10B981" }} />,
  TRIP_CLOSED_BY_PARTNER:    <Stop sx={{ fontSize: 15, color: "#EF4444" }} />,
  PAYMENT_CASH_COLLECTED:    <Payments sx={{ fontSize: 15, color: "#F59E0B" }} />,
  PAYMENT_WALLET_COLLECTED:  <AccountBalanceWallet sx={{ fontSize: 15, color: "#3B82F6" }} />,
  INVOICE_AUTO_GENERATED:    <Receipt sx={{ fontSize: 15, color: "#059669" }} />,
  BOOKING_SETTLED:           <CheckCircle sx={{ fontSize: 15, color: "#059669" }} />,
  ADVANCE_COLLECTED:         <AccountBalanceWallet sx={{ fontSize: 15, color: "#F59E0B" }} />,
  ADVANCE_VOIDED:            <Receipt sx={{ fontSize: 15, color: "#EF4444" }} />,
  BREAKDOWN_REPORTED_BY_DRIVER:  <BuildCircle sx={{ fontSize: 15, color: "#DC2626" }} />,
  BREAKDOWN_REPORTED_BY_PARTNER: <BuildCircle sx={{ fontSize: 15, color: "#DC2626" }} />,
  BREAKDOWN_REPORTED_BY_ADMIN:   <BuildCircle sx={{ fontSize: 15, color: "#DC2626" }} />,
  VEHICLE_SWAPPED_SAME_PARTNER: <SwapHoriz sx={{ fontSize: 15, color: "#3B82F6" }} />,
  VEHICLE_HANDOVERED_NEW_PARTNER: <SwapHoriz sx={{ fontSize: 15, color: "#EA580C" }} />,
  TRIP_RESUMED_AFTER_SWAP:    <PlayArrow sx={{ fontSize: 15, color: "#10B981" }} />,
};

// ── Determine available driver assist actions ────────────────────
function getDriverActions(status: string, paymentMode: string | null, paymentStatus?: string) {
  // hasPayment: payment_mode is the authoritative signal.
  // Fallback: if payment_status=PAID and status is post-COMPLETED, treat as paid.
  // This handles legacy bookings where admin recorded payment via MasterBooking only
  // (payment_status=PAID on master_bookings but payment_mode=NULL on cab_bookings).
  const isPostCompleted = ["COMPLETED", "SETTLEMENT_PENDING", "SETTLED"].includes(status);
  const hasPayment = !!paymentMode || (isPostCompleted && paymentStatus === "PAID");
  return {
    canStart:   status === "DRIVER_ASSIGNED",
    canClose:   status === "STARTED",
    canPayment: status === "COMPLETED" && !hasPayment,
    canInvoice: hasPayment && isPostCompleted,
  };
}

// ── Sub-components ────────────────────────────────────────────────

function InfoRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 1, alignItems: "flex-start", gap: 2 }}>
      <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary, flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: COLORS.textPrimary, textAlign: "right", fontFamily: mono ? "monospace" : "inherit" }}>
        {value ?? "—"}
      </Typography>
    </Box>
  );
}

function SectionCard({ title, icon, children, headerRight }: { title: string; icon: JSX.Element; children: React.ReactNode; headerRight?: React.ReactNode }) {
  return (
    <Card elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden", height: "100%" }}>
      <Box sx={{ px: 2.5, py: 1.75, display: "flex", alignItems: "center", gap: 1, borderBottom: `1px solid ${COLORS.border}`, bgcolor: alpha(COLORS.bgMain, 0.5) }}>
        <Box sx={{ color: COLORS.gold, display: "flex" }}>{icon}</Box>
        <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: COLORS.textPrimary, flex: 1 }}>{title}</Typography>
        {headerRight}
      </Box>
      <Box sx={{ px: 2.5, py: 0.5 }}>{children}</Box>
    </Card>
  );
}

// ── Assign Driver Modal ──────────────────────────────────────────

interface AssignModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (driverId: number, vehicleId: number) => void;
  drivers: AvailableDriver[];
  vehicles: AvailableVehicle[];
  submitting: boolean;
  vehicleCategory: string | null;
}

function AssignDriverModal({ open, onClose, onConfirm, drivers, vehicles, submitting, vehicleCategory }: AssignModalProps) {
  const [selectedDriver,  setSelectedDriver]  = useState<number | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [step, setStep] = useState<"driver" | "vehicle">("driver");

  const reset = () => { setSelectedDriver(null); setSelectedVehicle(null); setStep("driver"); };
  const handleClose = () => { reset(); onClose(); };

  const availableDrivers  = drivers.filter(d => d.availability_status !== "BUSY");
  const busyDrivers       = drivers.filter(d => d.availability_status === "BUSY");
  const availableVehicles = vehicles.filter(v => v.availability_status !== "BUSY");
  const busyVehicles      = vehicles.filter(v => v.availability_status === "BUSY");

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, boxShadow: "0 24px 64px rgba(0,0,0,0.15)" } }}>
      <DialogTitle sx={{ pb: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 2, background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AssignmentInd sx={{ fontSize: 18, color: "#000" }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>Assign Driver & Vehicle</Typography>
          {vehicleCategory && <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>Required: {vehicleCategory}</Typography>}
        </Box>
      </DialogTitle>

      {submitting && <LinearProgress sx={{ mx: 3 }} />}

      <DialogContent sx={{ pt: 1 }}>
        {/* Step tabs */}
        <Box sx={{ display: "flex", mb: 2.5, gap: 1 }}>
          {(["driver", "vehicle"] as const).map(s => (
            <Box key={s} onClick={() => setStep(s)} sx={{
              flex: 1, py: 1, borderRadius: 2, textAlign: "center", cursor: "pointer",
              border: `2px solid ${step === s ? COLORS.gold : COLORS.border}`,
              bgcolor: step === s ? alpha(COLORS.gold, 0.06) : "transparent", transition: "all 0.15s",
            }}>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: step === s ? COLORS.goldDark : COLORS.textSecondary, textTransform: "capitalize" }}>
                {s === "driver" ? "1. Select Driver" : "2. Select Vehicle"}
              </Typography>
              {s === "driver" && selectedDriver !== null && <CheckCircle sx={{ fontSize: 14, color: COLORS.success, ml: 0.5 }} />}
              {s === "vehicle" && selectedVehicle !== null && <CheckCircle sx={{ fontSize: 14, color: COLORS.success, ml: 0.5 }} />}
            </Box>
          ))}
        </Box>

        {step === "driver" && (
          <Box>
            {drivers.length === 0 ? (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>No approved drivers found. Please add drivers first.</Alert>
            ) : (
              <>
                <RadioGroup value={selectedDriver} onChange={e => setSelectedDriver(Number(e.target.value))}>
                  {availableDrivers.map(d => (
                    <Box key={d.id} onClick={() => setSelectedDriver(d.id)} sx={{
                      display: "flex", alignItems: "center", p: 1.5, mb: 1,
                      border: `1.5px solid ${selectedDriver === d.id ? COLORS.gold : COLORS.border}`,
                      borderRadius: 2, cursor: "pointer",
                      bgcolor: selectedDriver === d.id ? alpha(COLORS.gold, 0.04) : "transparent",
                      transition: "all 0.15s", "&:hover": { borderColor: COLORS.gold, bgcolor: alpha(COLORS.gold, 0.04) },
                    }}>
                      <FormControlLabel value={d.id} control={<Radio size="small" sx={{ color: COLORS.gold, "&.Mui-checked": { color: COLORS.gold } }} />} label="" sx={{ m: 0, mr: 1 }} />
                      <Avatar sx={{ width: 34, height: 34, fontSize: "0.8rem", fontWeight: 700, bgcolor: alpha(COLORS.success, 0.12), color: COLORS.success, mr: 1.5 }}>
                        {d.full_name?.[0] ?? "D"}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: COLORS.textPrimary }}>{d.full_name}</Typography>
                        <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>{d.mobile} · {d.driver_code}</Typography>
                      </Box>
                      <Chip label={d.availability_status} size="small" sx={{ bgcolor: alpha(COLORS.success, 0.1), color: COLORS.success, fontWeight: 700, fontSize: "0.65rem", height: 20 }} />
                    </Box>
                  ))}
                </RadioGroup>
                {busyDrivers.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary, mb: 0.5 }}>Currently busy ({busyDrivers.length})</Typography>
                    {busyDrivers.map(d => (
                      <Box key={d.id} sx={{ display: "flex", alignItems: "center", p: 1.25, mb: 0.5, border: `1px solid ${COLORS.border}`, borderRadius: 2, opacity: 0.5 }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: "0.72rem", bgcolor: alpha(COLORS.error, 0.1), color: COLORS.error, mr: 1.25 }}>{d.full_name?.[0] ?? "D"}</Avatar>
                        <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: "0.78rem", fontWeight: 600 }}>{d.full_name}</Typography></Box>
                        <Chip label="BUSY" size="small" sx={{ bgcolor: alpha(COLORS.error, 0.1), color: COLORS.error, fontWeight: 700, fontSize: "0.65rem", height: 18 }} />
                      </Box>
                    ))}
                  </Box>
                )}
                <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                  <Button variant="contained" disabled={selectedDriver === null} onClick={() => setStep("vehicle")} sx={{ px: 3 }}>
                    Next: Select Vehicle
                  </Button>
                </Box>
              </>
            )}
          </Box>
        )}

        {step === "vehicle" && (
          <Box>
            {vehicles.length === 0 ? (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>No approved vehicles found{vehicleCategory ? ` for: ${vehicleCategory}` : ""}.</Alert>
            ) : (
              <RadioGroup value={selectedVehicle} onChange={e => setSelectedVehicle(Number(e.target.value))}>
                {availableVehicles.map(v => (
                  <Box key={v.id} onClick={() => setSelectedVehicle(v.id)} sx={{
                    display: "flex", alignItems: "center", p: 1.5, mb: 1,
                    border: `1.5px solid ${selectedVehicle === v.id ? COLORS.gold : COLORS.border}`,
                    borderRadius: 2, cursor: "pointer",
                    bgcolor: selectedVehicle === v.id ? alpha(COLORS.gold, 0.04) : "transparent",
                    transition: "all 0.15s", "&:hover": { borderColor: COLORS.gold, bgcolor: alpha(COLORS.gold, 0.04) },
                  }}>
                    <FormControlLabel value={v.id} control={<Radio size="small" sx={{ color: COLORS.gold, "&.Mui-checked": { color: COLORS.gold } }} />} label="" sx={{ m: 0, mr: 1 }} />
                    <Box sx={{ width: 34, height: 34, borderRadius: 2, mr: 1.5, bgcolor: alpha(COLORS.gold, 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <DirectionsCar sx={{ fontSize: 18, color: COLORS.goldDark }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: COLORS.textPrimary, fontFamily: "monospace" }}>{v.registration_number}</Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>{[v.make, v.model, v.color].filter(Boolean).join(" · ")} {v.category_name ? `· ${v.category_name}` : ""}</Typography>
                    </Box>
                    <Chip label="Available" size="small" sx={{ bgcolor: alpha(COLORS.success, 0.1), color: COLORS.success, fontWeight: 700, fontSize: "0.65rem", height: 20 }} />
                  </Box>
                ))}
                {busyVehicles.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary, mb: 0.5 }}>On trip ({busyVehicles.length})</Typography>
                    {busyVehicles.map(v => (
                      <Box key={v.id} sx={{ display: "flex", alignItems: "center", p: 1.25, mb: 0.5, border: `1px solid ${COLORS.border}`, borderRadius: 2, opacity: 0.5 }}>
                        <DirectionsCar sx={{ fontSize: 16, color: COLORS.textSecondary, mr: 1 }} />
                        <Typography sx={{ fontSize: "0.78rem", fontFamily: "monospace" }}>{v.registration_number}</Typography>
                        <Box sx={{ flex: 1 }} />
                        <Chip label="BUSY" size="small" sx={{ bgcolor: alpha(COLORS.error, 0.1), color: COLORS.error, fontWeight: 700, fontSize: "0.65rem", height: 18 }} />
                      </Box>
                    ))}
                  </Box>
                )}
              </RadioGroup>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        {step === "vehicle" && <Button variant="text" onClick={() => setStep("driver")} sx={{ mr: "auto" }}>← Back</Button>}
        <Button onClick={handleClose} variant="outlined" disabled={submitting}>Cancel</Button>
        {step === "vehicle" && (
          <Button
            variant="contained"
            disabled={selectedDriver === null || selectedVehicle === null || submitting}
            onClick={() => selectedDriver !== null && selectedVehicle !== null && onConfirm(selectedDriver, selectedVehicle)}
            startIcon={<AssignmentInd />}
          >
            {submitting ? "Assigning…" : "Confirm Assignment"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Trip Status Stepper ──────────────────────────────────────────
const TRIP_STEPS = [
  { status: "DRIVER_ASSIGNED", label: "Driver Assigned", color: "#8B5CF6" },
  { status: "STARTED",         label: "Trip Started",    color: "#10B981" },
  { status: "COMPLETED",       label: "Completed",       color: "#3B82F6" },
  { status: "SETTLED",         label: "Settled",         color: "#D97706" },
];

function TripStatusStepper({ status }: { status: string }) {
  const currentIdx = TRIP_STEPS.findIndex(s => s.status === status);
  const effectiveIdx = status === "SETTLEMENT_PENDING" ? 2.5 : currentIdx;

  return (
    <Box sx={{
      display: "flex", alignItems: "center",
      px: 1, py: 1.5,
      bgcolor: alpha(COLORS.bgMain, 0.7),
      borderTop: `1px solid ${COLORS.border}`,
    }}>
      {TRIP_STEPS.map((step, idx) => {
        const done   = idx < (effectiveIdx === 2.5 ? 3 : Math.floor(effectiveIdx));
        const active = Math.floor(effectiveIdx) === idx;
        return (
          <Box key={step.status} sx={{ display: "flex", alignItems: "center", flex: idx < TRIP_STEPS.length - 1 ? 1 : "none" }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 68 }}>
              <Box sx={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                bgcolor: done || active ? step.color : alpha(COLORS.border, 0.4),
                border: active ? `3px solid ${step.color}` : "2px solid transparent",
                boxShadow: active ? `0 0 0 3px ${alpha(step.color, 0.2)}` : "none",
                transition: "all 0.3s",
              }}>
                {done ? (
                  <TaskAlt sx={{ fontSize: 14, color: "#fff" }} />
                ) : active ? (
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#fff" }} />
                ) : (
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: alpha(COLORS.textSecondary, 0.4) }} />
                )}
              </Box>
              <Typography sx={{
                fontSize: "0.6rem", mt: 0.5, textAlign: "center", lineHeight: 1.2,
                fontWeight: done || active ? 700 : 400,
                color: done || active ? COLORS.textPrimary : COLORS.textSecondary,
              }}>
                {step.label}
              </Typography>
            </Box>
            {idx < TRIP_STEPS.length - 1 && (
              <Box sx={{
                flex: 1, height: 2, mx: 0.5, mb: 2.5,
                bgcolor: done ? alpha(step.color, 0.5) : alpha(COLORS.border, 0.5),
                borderRadius: 1, transition: "all 0.3s",
              }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// ── Driver Assistance Panel ──────────────────────────────────────
// Inline action toolbar + status pipeline

interface DriverAssistPanelProps {
  booking: BookingDetail;
  onAction: (action: "start" | "close" | "payment" | "invoice") => void;
}

function DriverAssistPanel({ booking, onAction }: DriverAssistPanelProps) {
  const status     = booking.booking_status;
  const payMode    = booking.payment_mode ?? null;
  const payStatus  = booking.payment_status ?? undefined;
  const { canStart, canClose, canPayment, canInvoice } = getDriverActions(status, payMode, payStatus);
  const invoiceNum = booking.invoice_number ?? null;

  const showPanel = ["DRIVER_ASSIGNED", "STARTED", "COMPLETED", "SETTLEMENT_PENDING", "SETTLED"].includes(status);
  if (!showPanel) return null;

  const steps = [
    {
      key: "start",
      label: "Start Trip",
      icon: <PlayArrow sx={{ fontSize: 20 }} />,
      color: "#10B981" as string,
      enabled: canStart,
      done: !["DRIVER_ASSIGNED", "ASSIGNED"].includes(status),
      tooltip: canStart ? "Start trip on driver's behalf" : "Not available",
    },
    {
      key: "close",
      label: "Close Trip",
      icon: <Stop sx={{ fontSize: 20 }} />,
      color: "#EF4444" as string,
      enabled: canClose,
      done: ["COMPLETED", "SETTLEMENT_PENDING", "SETTLED"].includes(status),
      tooltip: canClose ? "Record end KM and final amount" : "Trip must be STARTED first",
    },
    {
      key: "payment",
      label: "Collect Payment",
      icon: <Payments sx={{ fontSize: 20 }} />,
      color: "#3B82F6" as string,
      enabled: canPayment,
      done: !!payMode || (["COMPLETED", "SETTLEMENT_PENDING", "SETTLED"].includes(status) && payStatus === "PAID"),
      tooltip: canPayment ? "Record cash or wallet payment" : (payMode || payStatus === "PAID") ? `Payment recorded${payMode ? ` (${payMode})` : ""}` : "Close trip first",
    },
    {
      key: "invoice",
      label: "Download Invoice",
      icon: <DownloadOutlined sx={{ fontSize: 20 }} />,
      color: "#D97706" as string,
      enabled: canInvoice,
      done: !!invoiceNum,
      tooltip: canInvoice ? "Download PDF invoice" : "Collect payment first",
    },
  ];

  return (
    <Card elevation={0} sx={{
      border: `1.5px solid ${alpha("#8B5CF6", 0.3)}`,
      borderRadius: 3, overflow: "hidden", mb: 2.5,
      background: `linear-gradient(135deg, ${alpha("#1E1B4B", 0.04)} 0%, ${alpha("#8B5CF6", 0.03)} 100%)`,
    }}>
      <Box sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${alpha("#8B5CF6", 0.2)}`, display: "flex", alignItems: "center", gap: 1.25 }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: 1.5,
          background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <SupportAgent sx={{ fontSize: 17, color: "#fff" }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", color: COLORS.textPrimary }}>
            Driver Assistance
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
            Help your driver manage this trip when the driver app is unavailable
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 2.5 }}>
        {/* Step pipeline */}
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
          {steps.map((step, idx) => (
            <Box key={step.key} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title={step.tooltip} arrow>
                <span>
                  <Button
                    variant={step.enabled ? "contained" : "outlined"}
                    size="small"
                    startIcon={step.done ? <CheckCircle sx={{ fontSize: "16px !important" }} /> : step.icon}
                    disabled={!step.enabled}
                    onClick={() => step.enabled && onAction(step.key as any)}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      ...(step.enabled ? {
                        bgcolor: step.color,
                        "&:hover": { bgcolor: step.color, filter: "brightness(0.92)" },
                        color: "#fff",
                        boxShadow: `0 4px 12px ${alpha(step.color, 0.35)}`,
                      } : {
                        borderColor: step.done ? alpha(step.color, 0.5) : COLORS.border,
                        color: step.done ? step.color : COLORS.textSecondary,
                        opacity: step.done ? 0.75 : 0.5,
                      }),
                    }}
                  >
                    {step.done && !step.enabled ? `${step.label} ✓` : step.label}
                  </Button>
                </span>
              </Tooltip>
              {idx < steps.length - 1 && (
                <Typography sx={{ color: COLORS.textSecondary, fontSize: "0.75rem", userSelect: "none" }}>→</Typography>
              )}
            </Box>
          ))}
        </Box>

        {/* Trip data summary if started */}
        {["STARTED", "COMPLETED", "SETTLEMENT_PENDING", "SETTLED"].includes(status) && (
          <Box sx={{
            display: "flex", gap: 2, flexWrap: "wrap",
            p: 1.5, borderRadius: 2,
            bgcolor: alpha(COLORS.bgMain, 0.8),
            border: `1px solid ${COLORS.border}`,
          }}>
            {booking.trip_start_km !== null && booking.trip_start_km !== undefined && (
              <Box>
                <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary }}>Start KM</Typography>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: COLORS.textPrimary, fontFamily: "monospace" }}>
                  {booking.trip_start_km?.toLocaleString() ?? "—"} km
                </Typography>
              </Box>
            )}
            {booking.trip_end_km !== null && booking.trip_end_km !== undefined && (
              <Box>
                <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary }}>End KM</Typography>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: COLORS.textPrimary, fontFamily: "monospace" }}>
                  {booking.trip_end_km?.toLocaleString() ?? "—"} km
                </Typography>
              </Box>
            )}
            {booking.actual_distance !== null && booking.actual_distance !== undefined && (
              <Box>
                <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary }}>Actual Distance</Typography>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: COLORS.textPrimary }}>
                  {booking.actual_distance?.toFixed(1)} km
                </Typography>
              </Box>
            )}
            {booking.final_amount > 0 && (
              <Box>
                <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary }}>Final Amount</Typography>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: COLORS.textPrimary }}>
                  ₹{booking.final_amount.toLocaleString("en-IN")}
                </Typography>
              </Box>
            )}
            {booking.payment_mode && (
              <Box>
                <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary }}>Payment Mode</Typography>
                <Chip label={booking.payment_mode} size="small" sx={{ fontWeight: 700, fontSize: "0.7rem", height: 22, bgcolor: alpha(COLORS.success, 0.1), color: COLORS.success }} />
              </Box>
            )}
            {booking.invoice_number && (
              <Box>
                <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary }}>Invoice</Typography>
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: COLORS.goldDark, fontFamily: "monospace" }}>
                  {booking.invoice_number}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
      {/* Trip Progress Stepper */}
      <TripStatusStepper status={status} />
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────────

type ModalType = "start" | "close" | "payment" | "invoice" | "advance" | null;

export default function BookingDetailPage() {
  const { bookingNumber } = useParams<{ bookingNumber: string }>();
  const navigate = useNavigate();

  const [booking,           setBooking]          = useState<BookingDetail | null>(null);
  const [loading,           setLoading]          = useState(true);
  const [error,             setError]            = useState<string | null>(null);
  const [successMsg,        setSuccessMsg]        = useState<string | null>(null);
  const [assignOpen,        setAssignOpen]        = useState(false);
  const [submitting,        setSubmitting]        = useState(false);
  const [timelineExpanded,  setTimelineExpanded] = useState(false);
  const [activeModal,       setActiveModal]      = useState<ModalType>(null);
  const [advElig,           setAdvElig]          = useState<AdvanceEligibility | null>(null);
  const [rejectOpen,        setRejectOpen]        = useState(false);
  const [acceptSubmitting,  setAcceptSubmitting] = useState(false);
  const [cancelReqOpen,     setCancelReqOpen]     = useState(false);

  // Load advance eligibility whenever booking data is available
  // and booking is in an advance-collectable status
  const COLLECTABLE = ["PENDING_ASSIGNMENT", "ASSIGNED", "DRIVER_ASSIGNED", "STARTED"];

  const load = useCallback(async (silent?: boolean) => {
    if (!bookingNumber) return;
    // Silent refresh (polling / tab-focus) must not flip the page into the
    // skeleton state — that causes the whole UI to visibly "reload" on every
    // poll tick.
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await bookingService.getBookingDetail(bookingNumber);
      setBooking(data);
      // Fetch advance eligibility for collectable bookings
      if (COLLECTABLE.includes(data.booking_status)) {
        try {
          const ae = await bookingService.getAdvanceEligibility(bookingNumber);
          setAdvElig(ae);
        } catch { /* non-fatal */ }
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load booking details.");
    } finally {
      setLoading(false);
    }
  }, [bookingNumber]);

  useEffect(() => { load(); }, [load]);

  // ── Auto-refresh while booking is in COMPLETED state ────────────────────
  // Polls every 15s so partner sees admin-recorded payment without manual refresh.
  // Stops automatically once payment_mode is set (buttons correct, no wasted calls).
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const shouldPoll = booking &&
      booking.booking_status === "COMPLETED" &&
      !booking.payment_mode;

    if (shouldPoll) {
      if (!pollRef.current) {
        pollRef.current = setInterval(() => {
          load(true);
        }, 15000);
      }
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [booking?.booking_status, booking?.payment_mode, load]);

  // ── Refresh on tab focus (catches admin payment done while tab was hidden) ──
  useEffect(() => {
    const onFocus = () => {
      if (booking && booking.booking_status === "COMPLETED" && !booking.payment_mode) {
        load(true);
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onFocus();
    });
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [booking?.booking_status, booking?.payment_mode, load]);

  // ── Realtime: admin payment/settle/cancel, or another tab's action,
  // fans out BOOKING_UPDATED → silent refresh for instant updates ──
  const { subscribe } = useRealtime();
  useEffect(() => {
    const unsub = subscribe<{ booking_number: string }>("BOOKING_UPDATED", (msg) => {
      if (bookingNumber && msg.data.booking_number === bookingNumber) {
        load(true);
      }
    });
    return unsub;
  }, [subscribe, load, bookingNumber]);


  const handleAssignDriver = async (driverId: number, vehicleId: number) => {
    if (!bookingNumber) return;
    setSubmitting(true);
    try {
      const res = await bookingService.assignDriver(bookingNumber, { driver_id: driverId, vehicle_id: vehicleId });
      setSuccessMsg(`Driver ${res.driver_name} assigned with vehicle ${res.vehicle_reg}`);
      setAssignOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to assign driver.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalSuccess = async (msg?: string, optimisticPatch?: Partial<BookingDetail>) => {
    // 1. Close modal immediately
    setActiveModal(null);
    // 2. Show success message
    if (msg) setSuccessMsg(msg);
    // 3. Apply optimistic update so buttons disable instantly (no flicker)
    if (optimisticPatch && booking) {
      setBooking({ ...booking, ...optimisticPatch });
    }
    // 4. Refresh booking data to get server-confirmed state
    await load();
  };

  // ── Partner acceptance gate (Doc Ref: BRD Part 3 §42) ──
  const isPendingAcceptance = booking?.booking_status === "PENDING_PARTNER_ACCEPTANCE";
  const { minutes, seconds, expired } = useCountdown(booking?.acceptance_deadline ?? null);

  const handleAccept = async () => {
    if (!bookingNumber || !booking) return;
    setAcceptSubmitting(true);
    try {
      const res = await bookingService.acceptBooking(bookingNumber);
      setSuccessMsg(res?.message ?? "Booking accepted.");
      await load();
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? e?.response?.data?.message ?? "Failed to accept booking.";
      setError(detail);
    } finally {
      setAcceptSubmitting(false);
    }
  };

  const handleRejectSuccess = async (msg?: string) => {
    setRejectOpen(false);
    if (msg) setSuccessMsg(msg);
    await load();
  };

  const statusCfg = booking ? (STATUS_CONFIG[booking.booking_status] ?? { label: booking.booking_status, color: COLORS.textSecondary, bg: COLORS.bgMain, icon: <Info /> }) : null;
  const canAssign = booking && ["ASSIGNED", "DRIVER_ASSIGNED"].includes(booking.booking_status);

  if (loading) {
    return (
      <Box>
        <Skeleton height={60} sx={{ mb: 2 }} />
        <Skeleton height={140} sx={{ mb: 2, borderRadius: 3 }} />
        <Grid container spacing={2.5}>
          {[...Array(4)].map((_, i) => <Grid item xs={12} md={6} key={i}><Skeleton height={200} /></Grid>)}
        </Grid>
      </Box>
    );
  }

  if (error && !booking) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>Back</Button>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      </Box>
    );
  }

  if (!booking) return null;

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate("/dashboard/bookings")}
          sx={{ mb: 1.5, color: COLORS.textSecondary, px: 0, "&:hover": { bgcolor: "transparent", color: COLORS.textPrimary } }}
        >
          Back to Bookings
        </Button>

        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5, flexWrap: "wrap" }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary, fontFamily: "monospace" }}>
                {booking.booking_number}
              </Typography>
              {statusCfg && (
                <Chip
                  icon={statusCfg.icon}
                  label={statusCfg.label}
                  sx={{ bgcolor: statusCfg.bg, color: statusCfg.color, fontWeight: 700, fontSize: "0.78rem", height: 28, border: `1px solid ${alpha(statusCfg.color, 0.3)}`, "& .MuiChip-icon": { color: statusCfg.color } }}
                />
              )}
              {booking.trip_type && (
                <Chip label={TRIP_TYPE_LABELS[booking.trip_type] ?? booking.trip_type} size="small" sx={{ bgcolor: alpha(COLORS.gold, 0.12), color: COLORS.goldDark, fontWeight: 700, border: `1px solid ${alpha(COLORS.gold, 0.25)}` }} />
              )}
            </Box>
            <Typography sx={{ color: COLORS.textSecondary, fontSize: "0.82rem" }}>
              Master: {booking.master_booking_number} &nbsp;·&nbsp; {booking.city_name ?? ""}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Tooltip title="Refresh">
              <IconButton onClick={() => load()} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 2 }}>
                <WifiProtectedSetup sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            {canAssign && (
              <Button variant="contained" startIcon={<AssignmentInd />} onClick={() => setAssignOpen(true)} sx={{ fontWeight: 700 }}>
                {booking.assignment.driver_id ? "Reassign Driver" : "Assign Driver"}
              </Button>
            )}
            {!["CANCELLED", "COMPLETED", "SETTLEMENT_PENDING", "SETTLED"].includes(booking.booking_status) && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<Cancel />}
                onClick={() => setCancelReqOpen(true)}
                sx={{ fontWeight: 700 }}
              >
                Request Cancellation
              </Button>
            )}
          </Stack>
        </Box>
      </Box>

      {/* ── Alerts ── */}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}

      {/* ── Action needed banner ── */}
      {booking.booking_status === "ASSIGNED" && !booking.assignment.driver_id && (
        <Card elevation={0} sx={{
          mb: 2.5, p: 2, borderRadius: 2.5,
          border: `1.5px solid #F97316`, bgcolor: alpha("#F97316", 0.05),
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2,
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Warning sx={{ color: "#F97316", fontSize: 22 }} />
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: "#92400E" }}>Action Required</Typography>
              <Typography sx={{ fontSize: "0.78rem", color: "#B45309" }}>
                This booking has been assigned to you — please assign a driver and vehicle to proceed.
              </Typography>
            </Box>
          </Box>
          <Button variant="contained" size="small" onClick={() => setAssignOpen(true)} sx={{ fontWeight: 700, flexShrink: 0 }}>
            Assign Driver Now
          </Button>
        </Card>
      )}

      {/* ── Awaiting Partner Acceptance banner (Doc Ref: BRD Part 3 §42) ── */}
      {isPendingAcceptance && (
        <Card elevation={0} sx={{
          mb: 2.5, p: 2.5, borderRadius: 2.5,
          border: `1.5px solid #F59E0B`,
          bgcolor: alpha("#F59E0B", 0.06),
          background: `linear-gradient(135deg, ${alpha("#F59E0B", 0.08)} 0%, ${alpha("#F59E0B", 0.04)} 100%)`,
        }}>
          <Stack direction="row" alignItems="flex-start" gap={2} flexWrap="wrap">
            <Box sx={{
              width: 44, height: 44, borderRadius: 2,
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <HourglassTop sx={{ fontSize: 22, color: "#fff" }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 220 }}>
              <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
                <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: "#92400E" }}>
                  Awaiting Your Acceptance
                </Typography>
                {booking.acceptance_deadline && !expired && (
                  <Chip
                    icon={<HourglassTop sx={{ fontSize: 14, color: "#fff !important" }} />}
                    label={`${minutes}:${String(seconds).padStart(2, "0")} left`}
                    size="small"
                    sx={{
                      bgcolor: "#F59E0B", color: "#fff", fontWeight: 800,
                      fontFamily: "monospace", letterSpacing: "0.04em",
                      "& .MuiChip-icon": { color: "#fff" },
                    }}
                  />
                )}
                {booking.acceptance_deadline && expired && (
                  <Chip
                    label="Window expired"
                    size="small"
                    sx={{
                      bgcolor: alpha("#EF4444", 0.15), color: "#B91C1C",
                      fontWeight: 700, border: `1px solid ${alpha("#EF4444", 0.3)}`,
                    }}
                  />
                )}
              </Stack>
              <Typography sx={{ fontSize: "0.82rem", color: "#B45309", mt: 0.5 }}>
                Admin has assigned this cab booking to you. Accept to assign a driver, or reject with a reason — admin will reassign to another partner.
              </Typography>
            </Box>
            <Stack direction="row" gap={1} flexShrink={0}>
              <Button
                variant="contained"
                startIcon={acceptSubmitting ? <CircularProgress size={14} color="inherit" /> : <CheckCircle />}
                onClick={handleAccept}
                disabled={acceptSubmitting || expired}
                sx={{
                  fontWeight: 800, borderRadius: 2,
                  bgcolor: "#10B981", "&:hover": { bgcolor: "#059669" },
                  boxShadow: `0 4px 12px ${alpha("#10B981", 0.35)}`,
                }}
              >
                {acceptSubmitting ? "Accepting…" : "Accept Booking"}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Block />}
                onClick={() => setRejectOpen(true)}
                disabled={acceptSubmitting}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                Reject
              </Button>
            </Stack>
          </Stack>
        </Card>
      )}

      {/* ── Driver Assistance Panel ── */}
      <DriverAssistPanel
        booking={booking}
        onAction={action => setActiveModal(action)}
      />

      {/* ── Lifecycle guide ── */}
      <Card elevation={0} sx={{ mb: 2.5, borderRadius: 2.5, border: `1px solid ${COLORS.border}`, bgcolor: alpha(COLORS.info, 0.03) }}>
        <Box sx={{ px: 2.5, py: 1.5, display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <Info sx={{ color: COLORS.info, fontSize: 20, mt: 0.25, flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "0.78rem", color: COLORS.textPrimary, mb: 0.75 }}>
              HOW THIS BOOKING FLOWS
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2, "& li": { mb: 0.5 } }}>
              <Typography component="li" sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>
                <strong>Accept →</strong> admin assigns the cab to you; accept to take it, or reject so it can be reassigned.
              </Typography>
              <Typography component="li" sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>
                <strong>Assign driver + vehicle →</strong> set who drives and which cab, then the trip is ready.
              </Typography>
              <Typography component="li" sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>
                <strong>Start trip →</strong> record start KM when the cab departs.
              </Typography>
              <Typography component="li" sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>
                <strong>Close trip →</strong> record end KM. This locks the final amount, your payout, platform commission and GST.
              </Typography>
              <Typography component="li" sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>
                <strong>Collect payment →</strong> take cash/wallet payment from the customer. The tax invoice is generated here.
              </Typography>
              <Typography component="li" sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>
                <strong>Settled →</strong> WayTero credits your wallet with the payout (net of TDS/commission) once admin settles this booking.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Card>

      {/* ── Detail grid ── */}
      <Grid container spacing={2.5}>

        {/* Route card */}
        <Grid item xs={12} md={6}>
          <SectionCard title="Trip Details" icon={<LocalTaxi sx={{ fontSize: 20 }} />}>
            <Box sx={{ py: 1.5 }}>
              <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: alpha(COLORS.bgMain, 0.7), border: `1px solid ${COLORS.border}` }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 0.25 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: COLORS.success, border: "2px solid white", boxShadow: `0 0 0 2px ${COLORS.success}` }} />
                    <Box sx={{ width: 1.5, height: 32, bgcolor: alpha(COLORS.textSecondary, 0.25) }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: COLORS.error, border: "2px solid white", boxShadow: `0 0 0 2px ${COLORS.error}` }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: COLORS.textPrimary, mb: 0.5 }}>
                      {booking.pickup_location ?? "Pickup not set"}
                    </Typography>
                    <Box sx={{ height: 22 }} />
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: COLORS.textPrimary }}>
                      {booking.drop_location ?? "Drop not set"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 1.5 }} />
              <InfoRow label="Trip Type" value={TRIP_TYPE_LABELS[booking.trip_type ?? ""] ?? booking.trip_type} />
              <InfoRow label="Vehicle Category" value={booking.vehicle_category} />
              <InfoRow
                label="Pickup Date/Time"
                value={booking.pickup_datetime ? new Date(booking.pickup_datetime).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : undefined}
              />
              <InfoRow label="Est. Distance" value={booking.estimated_distance ? `${booking.estimated_distance} km` : undefined} />
              <InfoRow label="Est. Amount" value={booking.estimated_amount ? `₹${booking.estimated_amount.toLocaleString("en-IN")}` : undefined} />
              {booking.coupon_discount > 0 && (
                <InfoRow label="Coupon Discount" value={`−₹${booking.coupon_discount.toLocaleString("en-IN")}`} />
              )}
              {booking.offer && <InfoRow label="Offer" value={booking.offer.title} />}
              {booking.coupon && booking.coupon.type !== "PLATFORM" && booking.coupon.partner_share > 0 && (
                <InfoRow label="Your Coupon Share" value={`₹${booking.coupon.partner_share.toLocaleString("en-IN")}`} />
              )}
              {booking.final_amount > 0 && <InfoRow label="Final Amount" value={`₹${booking.final_amount.toLocaleString("en-IN")}`} />}
              {booking.partner_payout > 0 && (
                <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: alpha(COLORS.success, 0.08), border: `1px solid ${alpha(COLORS.success, 0.2)}` }}>
                  <Typography sx={{ fontSize: "0.78rem", color: COLORS.success, fontWeight: 700 }}>
                    Your Payout: ₹{booking.partner_payout.toLocaleString("en-IN")}
                  </Typography>
                </Box>
              )}
            </Box>
          </SectionCard>
        </Grid>

        {/* Customer & Payment card */}
        <Grid item xs={12} md={6}>
          <SectionCard title="Customer" icon={<PersonPin sx={{ fontSize: 20 }} />}>
            <Box sx={{ py: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Avatar sx={{ width: 44, height: 44, fontWeight: 800, fontSize: "1.1rem", background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${alpha(COLORS.navy, 0.7)} 100%)` }}>
                  {booking.customer_name?.[0]?.toUpperCase() ?? "?"}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: COLORS.textPrimary }}>{booking.customer_name}</Typography>
                  {booking.customer_mobile && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Phone sx={{ fontSize: 13, color: COLORS.textSecondary }} />
                      <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>{booking.customer_mobile}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
              {booking.customer_email && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
                  <Email sx={{ fontSize: 15, color: COLORS.textSecondary }} />
                  <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>{booking.customer_email}</Typography>
                </Box>
              )}

              <Divider sx={{ my: 1.5 }} />
              <Typography sx={{ fontWeight: 700, fontSize: "0.8rem", color: COLORS.textPrimary, mb: 1 }}>Payment</Typography>
              <InfoRow label="Payment Status" value={booking.payment_status} />
              <InfoRow label="Total Amount" value={`₹${booking.total_amount.toLocaleString("en-IN")}`} />
              <InfoRow label="Amount Paid" value={`₹${booking.total_paid_amount.toLocaleString("en-IN")}`} />

              {booking.remarks && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(COLORS.bgMain, 0.7), border: `1px solid ${COLORS.border}` }}>
                    <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary, mb: 0.25 }}>Remarks</Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: COLORS.textPrimary }}>{booking.remarks}</Typography>
                  </Box>
                </>
              )}
            </Box>
          </SectionCard>
        </Grid>

        {/* Assignment card */}
        <Grid item xs={12} md={6}>
          <SectionCard title="Driver & Vehicle Assignment" icon={<DirectionsCar sx={{ fontSize: 20 }} />}>
            <Box sx={{ py: 1.5 }}>
              {booking.assignment.driver_id ? (
                <>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                    <Avatar sx={{ width: 40, height: 40, fontWeight: 700, bgcolor: alpha("#8B5CF6", 0.1), color: "#7C3AED" }}>
                      {booking.assignment.driver_name?.[0] ?? "D"}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: COLORS.textPrimary }}>{booking.assignment.driver_name}</Typography>
                      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                        {booking.assignment.driver_mobile && <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>{booking.assignment.driver_mobile}</Typography>}
                        {booking.assignment.driver_code && <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary, fontFamily: "monospace" }}>· {booking.assignment.driver_code}</Typography>}
                      </Box>
                    </Box>
                    <Chip label="Driver" size="small" sx={{ ml: "auto", bgcolor: alpha("#8B5CF6", 0.1), color: "#7C3AED", fontWeight: 700, fontSize: "0.68rem", height: 20 }} />
                  </Box>

                  {booking.assignment.vehicle_reg && (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(COLORS.gold, 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <DirectionsCar sx={{ fontSize: 20, color: COLORS.goldDark }} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: COLORS.textPrimary, fontFamily: "monospace" }}>{booking.assignment.vehicle_reg}</Typography>
                          <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
                            {[booking.assignment.vehicle_make, booking.assignment.vehicle_model, booking.assignment.vehicle_color].filter(Boolean).join(" · ")}
                          </Typography>
                        </Box>
                        <Chip label="Vehicle" size="small" sx={{ ml: "auto", bgcolor: alpha(COLORS.gold, 0.1), color: COLORS.goldDark, fontWeight: 700, fontSize: "0.68rem", height: 20 }} />
                      </Box>
                    </>
                  )}

                  {booking.assignment.assigned_at && (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <InfoRow label="Assigned At" value={new Date(booking.assignment.assigned_at).toLocaleString("en-IN")} />
                    </>
                  )}

                  {canAssign && (
                    <Box sx={{ mt: 2 }}>
                      <Button variant="outlined" size="small" startIcon={<WifiProtectedSetup />} onClick={() => setAssignOpen(true)} fullWidth>
                        Change Assignment
                      </Button>
                    </Box>
                  )}

                  {/* Issue / swap controls — only show when the booking
                      has an active driver and the status allows mid-trip
                      interruption. */}
                  {booking.assignment.driver_id && (
                    <BreakdownControls
                      bookingNumber={booking.booking_number}
                      bookingStatus={booking.booking_status}
                      availableVehicles={booking.available_vehicles}
                      availableDrivers={booking.available_drivers}
                      onChanged={() => load()}
                    />
                  )}
                </>
              ) : (
                <Box sx={{ textAlign: "center", py: 3 }}>
                  <AssignmentInd sx={{ fontSize: 48, color: alpha(COLORS.textSecondary, 0.3), mb: 1.5 }} />
                  <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary, mb: 0.5 }}>No Driver Assigned</Typography>
                  <Typography sx={{ fontSize: "0.8rem", color: COLORS.textSecondary, mb: 2 }}>
                    Select a driver and vehicle from your fleet.
                  </Typography>
                  {canAssign && (
                    <Button variant="contained" startIcon={<AssignmentInd />} onClick={() => setAssignOpen(true)}>
                      Assign Driver
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </SectionCard>
        </Grid>

        {/* ── Advance Payment card ── */}
        {COLLECTABLE.includes(booking.booking_status) && (
          <Grid item xs={12} md={6}>
            <SectionCard
              title="Advance Payment"
              icon={<AccountBalanceWallet sx={{ fontSize: 20 }} />}
              headerRight={
                advElig?.advance ? (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadOutlined sx={{ fontSize: 14 }} />}
                    onClick={async () => {
                      try {
                        const blob = await bookingService.downloadAdvanceReceipt(booking.booking_number);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `Advance_${booking.booking_number}.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch {
                        /* silent */
                      }
                    }}
                    sx={{ fontSize: "0.72rem", borderColor: COLORS.border, color: COLORS.textSecondary }}
                  >
                    Receipt
                  </Button>
                ) : advElig?.can_collect ? (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AccountBalanceWallet sx={{ fontSize: 14 }} />}
                    onClick={() => setActiveModal("advance")}
                    sx={{ fontSize: "0.72rem", bgcolor: COLORS.gold, "&:hover": { bgcolor: "#C09000" }, fontWeight: 700 }}
                  >
                    Collect Advance
                  </Button>
                ) : null
              }
            >
              <Box sx={{ py: 1 }}>
                {advElig?.advance ? (
                  /* ── Advance exists ── */
                  <Box>
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha("#22C55E", 0.06), border: `1px solid ${alpha("#22C55E", 0.2)}`, mb: 2 }}>
                      <Typography sx={{ fontSize: "0.72rem", color: "#16A34A", mb: 0.25 }}>Advance Collected</Typography>
                      <Typography sx={{ fontSize: "1.6rem", fontWeight: 800, color: "#15803D" }}>
                        ₹{advElig.advance.amount?.toLocaleString("en-IN")}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                      <InfoRow label="Receipt No."   value={advElig.advance.receipt_number} />
                      <InfoRow label="Payment Mode"  value={advElig.advance.payment_mode} />
                      <InfoRow label="Received By"   value={advElig.advance.received_by} />
                      {advElig.advance.reference_note && (
                        <InfoRow label="Reference" value={advElig.advance.reference_note} />
                      )}
                      {advElig.advance.collected_at && (
                        <InfoRow
                          label="Collected At"
                          value={new Date(advElig.advance.collected_at).toLocaleString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        />
                      )}
                      <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: alpha("#EF4444", 0.06), border: `1px solid ${alpha("#EF4444", 0.15)}` }}>
                        <Typography sx={{ fontSize: "0.72rem", color: "#B91C1C" }}>Balance Due from Customer</Typography>
                        <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, color: "#DC2626" }}>
                          ₹{Math.max(0, (advElig.max_amount ?? 0) - advElig.advance.amount).toLocaleString("en-IN")}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ) : advElig?.blocked_reason ? (
                  /* ── Blocked ── */
                  <Box sx={{ textAlign: "center", py: 3 }}>
                    <AccountBalanceWallet sx={{ fontSize: 40, color: alpha(COLORS.textSecondary, 0.25), mb: 1 }} />
                    <Typography sx={{ fontSize: "0.8rem", color: COLORS.textSecondary }}>{advElig.blocked_reason}</Typography>
                  </Box>
                ) : (
                  /* ── No advance yet ── */
                  <Box sx={{ textAlign: "center", py: 3 }}>
                    <AccountBalanceWallet sx={{ fontSize: 40, color: alpha(COLORS.textSecondary, 0.25), mb: 1 }} />
                    <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary, mb: 0.5, fontSize: "0.9rem" }}>
                      No advance collected
                    </Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary, mb: 2 }}>
                      Collect an advance payment from the customer before the trip ends.
                    </Typography>
                    {advElig?.can_collect && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<AccountBalanceWallet />}
                        onClick={() => setActiveModal("advance")}
                        sx={{ bgcolor: COLORS.gold, "&:hover": { bgcolor: "#C09000" }, fontWeight: 700 }}
                      >
                        Collect Advance
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            </SectionCard>
          </Grid>
        )}

        {/* Timeline card */}
        <Grid item xs={12} md={6}>
          <SectionCard title="Booking Timeline" icon={<Timeline sx={{ fontSize: 20 }} />}>
            <Box sx={{ py: 1 }}>
              {booking.timeline.length === 0 ? (
                <Typography sx={{ textAlign: "center", py: 3, color: COLORS.textSecondary, fontSize: "0.82rem" }}>
                  No timeline events yet.
                </Typography>
              ) : (
                <>
                  {(timelineExpanded ? booking.timeline : booking.timeline.slice(0, 5)).map((event, i) => (
                    <Box key={i} sx={{ display: "flex", gap: 1.5, mb: 2, alignItems: "flex-start" }}>
                      <Box sx={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        bgcolor: alpha(COLORS.bgMain, 0.8), border: `1.5px solid ${COLORS.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center", mt: 0.25,
                      }}>
                        {EVENT_ICONS[event.event_type] ?? <Info sx={{ fontSize: 13, color: COLORS.textSecondary }} />}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: COLORS.textPrimary }}>
                          {event.event_type.replace(/_/g, " ")}
                        </Typography>
                        {event.event_description && (
                          <Typography sx={{ fontSize: "0.73rem", color: COLORS.textSecondary, mt: 0.25 }}>
                            {event.event_description}
                          </Typography>
                        )}
                        <Typography sx={{ fontSize: "0.68rem", color: alpha(COLORS.textSecondary, 0.7), mt: 0.25 }}>
                          {new Date(event.event_timestamp).toLocaleString("en-IN")}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                  {booking.timeline.length > 5 && (
                    <Button
                      size="small"
                      onClick={() => setTimelineExpanded(!timelineExpanded)}
                      endIcon={timelineExpanded ? <ExpandLess /> : <ExpandMore />}
                      sx={{ color: COLORS.textSecondary, fontSize: "0.75rem", pl: 0 }}
                    >
                      {timelineExpanded ? "Show less" : `Show all ${booking.timeline.length} events`}
                    </Button>
                  )}
                </>
              )}
            </Box>
          </SectionCard>
        </Grid>
      </Grid>

      {/* ── Assign Driver Modal ── */}
      <AssignDriverModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onConfirm={handleAssignDriver}
        drivers={booking.available_drivers}
        vehicles={booking.available_vehicles}
        submitting={submitting}
        vehicleCategory={booking.vehicle_category}
      />

      {/* ── Partner Acceptance Gate — Reject dialog (Doc Ref: BRD Part 3 §42) ── */}
      {bookingNumber && (
        <RejectDialog
          open={rejectOpen}
          onClose={() => setRejectOpen(false)}
          bookingNumber={bookingNumber}
          bookingId={booking.master_booking_id}
          onAccepted={() => { /* unused — kept for future symmetry */ }}
        />
      )}

      {/* ── Cancellation Request Dialog ── */}
      {bookingNumber && (
        <PartnerCancelRequestDialog
          open={cancelReqOpen}
          onClose={() => setCancelReqOpen(false)}
          bookingType="CAB"
          bookingNumber={bookingNumber}
          onSubmitted={() => load()}
        />
      )}

      {/* ── Driver Assistance Modals ── */}
      {bookingNumber && (
        <>
          {/* ── Collect Advance Modal ── */}
  {bookingNumber && (
    <CollectAdvanceModal
      open={activeModal === "advance"}
      onClose={() => { setActiveModal(null); load(); }}
      bookingNumber={bookingNumber}
    />
  )}

  <StartTripModal
            open={activeModal === "start"}
            bookingNumber={bookingNumber}
            onClose={() => setActiveModal(null)}
            onSuccess={msg => handleModalSuccess(msg)}
          />

          <CloseTripModal
            open={activeModal === "close"}
            bookingNumber={bookingNumber}
            tripStartKm={booking.trip_start_km ?? null}
            estimatedAmount={booking.estimated_amount}
            cityName={booking.city_name}
            tripType={booking.trip_type}
            vehicleCategory={booking.vehicle_category}
            couponDiscount={booking.coupon_discount ?? 0}
            advancePaid={booking.advance_paid ?? 0}
            onClose={() => setActiveModal(null)}
            onSuccess={msg => handleModalSuccess(msg)}
          />

          <CollectPaymentModal
            open={activeModal === "payment"}
            bookingNumber={bookingNumber}
            finalAmount={booking.final_amount}
            couponDiscount={booking.coupon_discount ?? 0}
            advancePaid={booking.advance_paid ?? 0}
            customerName={booking.customer_name}
            onClose={() => setActiveModal(null)}
            onSuccess={(msg, paymentMode, invoiceNumber) =>
              handleModalSuccess(msg, {
                payment_mode: paymentMode,
                invoice_number: invoiceNumber ?? booking.invoice_number ?? null,
              })
            }
          />

          <InvoiceModal
            open={activeModal === "invoice"}
            bookingNumber={bookingNumber}
            invoiceNumber={booking.invoice_number ?? null}
            finalAmount={booking.final_amount}
            couponDiscount={booking.coupon_discount ?? 0}
            advancePaid={booking.advance_paid ?? 0}
            paymentMode={booking.payment_mode ?? null}
            cashPendingAt={booking.cash_pending_at ?? null}
            customerName={booking.customer_name}
            onClose={() => setActiveModal(null)}
            onSuccess={() => handleModalSuccess()}
          />
        </>
      )}
    </Box>
  );
}
