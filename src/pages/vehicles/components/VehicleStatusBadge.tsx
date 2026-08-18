// ============================================================
// STATUS BADGE — used across all vehicle components
// Status flow: PENDING → UNDER_REVIEW → APPROVED → ACTIVE → ON_TRIP → MAINTENANCE → SUSPENDED
// ============================================================
import { Chip, alpha } from "@mui/material";
import {
  HourglassTop, ManageSearch, CheckCircle, DirectionsCar,
  LocalTaxi, Build, Block, PowerOff,
} from "@mui/icons-material";
import { COLORS } from "../../../theme";

export const VEHICLE_STATUS: Record<string, { label: string; color: string; icon: JSX.Element; desc: string }> = {
  PENDING:      { label: "Pending",      color: COLORS.warning,     icon: <HourglassTop sx={{ fontSize: 13 }} />, desc: "Awaiting admin review" },
  UNDER_REVIEW: { label: "Under Review", color: "#F97316",          icon: <ManageSearch sx={{ fontSize: 13 }} />, desc: "Verification officer reviewing" },
  APPROVED:     { label: "Approved",     color: COLORS.info,        icon: <CheckCircle sx={{ fontSize: 13 }} />,  desc: "Approved, becoming active" },
  ACTIVE:       { label: "Active",       color: COLORS.success,     icon: <DirectionsCar sx={{ fontSize: 13 }} />,desc: "Ready for bookings" },
  ON_TRIP:      { label: "On Trip",      color: "#8B5CF6",          icon: <LocalTaxi sx={{ fontSize: 13 }} />,   desc: "Currently on a booking" },
  MAINTENANCE:  { label: "Maintenance",  color: "#64748B",          icon: <Build sx={{ fontSize: 13 }} />,       desc: "Under maintenance" },
  SUSPENDED:    { label: "Suspended",    color: COLORS.error,       icon: <Block sx={{ fontSize: 13 }} />,       desc: "Suspended by admin" },
  INACTIVE:     { label: "Inactive",     color: COLORS.textSecondary, icon: <PowerOff sx={{ fontSize: 13 }} />, desc: "Inactive" },
};

export const DOC_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:  { label: "Pending",  color: COLORS.warning },
  APPROVED: { label: "Verified", color: COLORS.success },
  REJECTED: { label: "Rejected", color: COLORS.error },
};

interface Props { status: string; size?: "small" | "medium" }

export default function VehicleStatusBadge({ status, size = "small" }: Props) {
  const cfg = VEHICLE_STATUS[status] ?? { label: status, color: COLORS.textSecondary, icon: null, desc: "" };
  return (
    <Chip
      icon={cfg.icon ?? undefined}
      label={cfg.label}
      size={size}
      sx={{
        height: size === "small" ? 24 : 28,
        fontWeight: 700,
        fontSize: size === "small" ? "0.7rem" : "0.78rem",
        borderRadius: 1.5,
        color: cfg.color,
        bgcolor: alpha(cfg.color, 0.1),
        border: `1px solid ${alpha(cfg.color, 0.25)}`,
        "& .MuiChip-icon": { color: "inherit", ml: 0.75 },
      }}
    />
  );
}
