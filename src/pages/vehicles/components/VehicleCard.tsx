// ============================================================
// VEHICLE CARD — grid card showing vehicle summary
// ============================================================
import { Box, Card, CardContent, Typography, alpha, Chip, IconButton, Tooltip, LinearProgress } from "@mui/material";
import { DirectionsCar, Description, OpenInNew, LocalGasStation, AirlineSeatReclineNormal, CalendarMonth } from "@mui/icons-material";
import { COLORS } from "../../../theme";
import VehicleStatusBadge, { VEHICLE_STATUS } from "./VehicleStatusBadge";
import type { VehicleListItem } from "../../../services/vehicle.service";

// Document types required per vehicle
const REQUIRED_DOCS = ["RC", "INSURANCE", "FITNESS", "PERMIT", "PUC"];

interface Props {
  vehicle: VehicleListItem;
  categoryName: string;
  docCount: number;      // docs uploaded
  onView: (uuid: string) => void;
}

const FUEL_ICONS: Record<string, string> = {
  PETROL: "⛽", DIESEL: "🛢️", CNG: "🔵", ELECTRIC: "⚡", HYBRID: "♻️",
};

export default function VehicleCard({ vehicle, categoryName, docCount, onView }: Props) {
  const statusCfg = VEHICLE_STATUS[vehicle.status] ?? { color: COLORS.textSecondary, label: vehicle.status, desc: "" };
  const docProgress = Math.min(Math.round((docCount / REQUIRED_DOCS.length) * 100), 100);
  const needsDocs = vehicle.status === "PENDING" && docCount < REQUIRED_DOCS.length;

  return (
    <Card
      sx={{
        borderRadius: 3.5,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        transition: "transform 0.18s, box-shadow 0.18s",
        "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 30px rgba(0,0,0,0.10)" },
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Status accent strip */}
      <Box sx={{ height: 4, background: `linear-gradient(90deg, ${statusCfg.color}, ${alpha(statusCfg.color, 0.4)})` }} />

      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 2.5, flexShrink: 0,
              background: `linear-gradient(135deg, ${alpha(COLORS.navy, 0.08)}, ${alpha(COLORS.navy, 0.04)})`,
              border: `1px solid ${COLORS.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <DirectionsCar sx={{ fontSize: 22, color: COLORS.navy }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", color: COLORS.textPrimary, lineHeight: 1.2 }}>
                {vehicle.registration_number}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary, fontFamily: "monospace" }}>
                {vehicle.vehicle_code ?? "—"}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <VehicleStatusBadge status={vehicle.status} />
            <Tooltip title="View Details">
              <IconButton size="small" onClick={() => onView(vehicle.uuid)} sx={{ color: COLORS.textSecondary }}>
                <OpenInNew sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Vehicle details */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: COLORS.textPrimary, mb: 0.25 }}>
            {vehicle.vehicle_brand ?? "—"} {vehicle.vehicle_model ?? ""}
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>{categoryName}</Typography>
        </Box>

        {/* Chips row */}
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 2.5 }}>
          {vehicle.fuel_type && (
            <Chip label={`${FUEL_ICONS[vehicle.fuel_type] ?? ""} ${vehicle.fuel_type}`} size="small"
              sx={{ height: 22, fontSize: "0.68rem", fontWeight: 600, bgcolor: alpha(COLORS.info, 0.08), color: COLORS.info, borderRadius: 1.5 }} />
          )}
          {vehicle.seating_capacity && (
            <Chip icon={<AirlineSeatReclineNormal sx={{ fontSize: "12px !important" }} />}
              label={`${vehicle.seating_capacity} Seats`} size="small"
              sx={{ height: 22, fontSize: "0.68rem", fontWeight: 600, bgcolor: alpha(COLORS.navy, 0.06), color: COLORS.navy, borderRadius: 1.5 }} />
          )}
          {vehicle.manufacturing_year && (
            <Chip icon={<CalendarMonth sx={{ fontSize: "12px !important" }} />}
              label={String(vehicle.manufacturing_year)} size="small"
              sx={{ height: 22, fontSize: "0.68rem", fontWeight: 600, bgcolor: alpha(COLORS.textSecondary, 0.07), color: COLORS.textSecondary, borderRadius: 1.5 }} />
          )}
        </Box>

        {/* Document progress */}
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Description sx={{ fontSize: 14, color: COLORS.textSecondary }} />
              <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary, fontWeight: 600 }}>
                Documents
              </Typography>
            </Box>
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: docCount >= REQUIRED_DOCS.length ? COLORS.success : COLORS.warning }}>
              {docCount}/{REQUIRED_DOCS.length}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={docProgress}
            sx={{
              height: 5, borderRadius: 3,
              bgcolor: alpha(COLORS.border, 0.8),
              "& .MuiLinearProgress-bar": {
                bgcolor: docCount >= REQUIRED_DOCS.length ? COLORS.success : COLORS.warning,
                borderRadius: 3,
              },
            }}
          />
          {needsDocs && (
            <Typography sx={{ fontSize: "0.68rem", color: COLORS.warning, mt: 0.5, fontWeight: 600 }}>
              Upload missing documents to speed up verification
            </Typography>
          )}
        </Box>

        {/* Status description */}
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px dashed ${COLORS.border}` }}>
          <Typography sx={{ fontSize: "0.7rem", color: statusCfg.color, fontWeight: 600 }}>
            {statusCfg.desc}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
