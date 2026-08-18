// ============================================================
// VEHICLE DETAIL DRAWER — Full detail panel for a selected vehicle
// Shows: Info · Documents · Photos (with upload) · Status
// ============================================================
import { useState, useRef } from "react";
import {
  Drawer, Box, Typography, Chip, alpha, Divider, Button,
  Avatar, Tooltip, IconButton, LinearProgress, Alert, Tab, Tabs,
  Grid, CircularProgress,
} from "@mui/material";
import {
  Close, DirectionsCar, Description, CheckCircle,
  HourglassTop, FileOpen, Upload, AirlineSeatReclineNormal,
  LocalGasStation, CalendarMonth, Speed, LocationCity,
  VerifiedUser, CameraAlt, CloudUpload, CheckCircleOutline,
  ErrorOutline, Image as ImageIcon,
} from "@mui/icons-material";
import { COLORS } from "../../../theme";
import VehicleStatusBadge, { VEHICLE_STATUS, DOC_STATUS } from "./VehicleStatusBadge";
import type { Vehicle, VehicleCategory, City, VehiclePhoto } from "../../../services/vehicle.service";
import { vehicleService, PHOTO_TYPES } from "../../../services/vehicle.service";

const REQUIRED_DOCS = ["RC", "INSURANCE", "FITNESS_CERTIFICATE", "PERMIT", "PUC"];

interface Props {
  vehicle: Vehicle | null;
  open: boolean;
  categories: VehicleCategory[];
  cities: City[];
  onClose: () => void;
  onUploadDoc: () => void;
  onVehicleUpdated?: (v: Vehicle) => void; // called after photo upload to refresh
}

function InfoRow({ icon, label, value }: { icon: JSX.Element; label: string; value: string | number | null | undefined }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.25, borderBottom: `1px solid ${COLORS.border}` }}>
      <Box sx={{
        width: 30, height: 30, borderRadius: 1.5,
        bgcolor: alpha(COLORS.navy, 0.07),
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        "& svg": { fontSize: 15, color: COLORS.navy },
      }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary, fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: COLORS.textPrimary }}>{value ?? "—"}</Typography>
      </Box>
    </Box>
  );
}

function DocRow({ docType, doc }: {
  docType: string;
  doc?: { verification_status: string; expiry_date: string | null; uploaded_at: string; file_url: string | null };
}) {
  const cfg = doc ? DOC_STATUS[doc.verification_status] ?? DOC_STATUS.PENDING : null;
  const isExpiringSoon = doc?.expiry_date &&
    new Date(doc.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.25, borderBottom: `1px solid ${COLORS.border}` }}>
      <Box sx={{
        width: 30, height: 30, borderRadius: 1.5,
        bgcolor: doc ? alpha(COLORS.success, 0.08) : alpha(COLORS.warning, 0.08),
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {doc ? <CheckCircle sx={{ fontSize: 15, color: COLORS.success }} /> : <HourglassTop sx={{ fontSize: 15, color: COLORS.warning }} />}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: COLORS.textPrimary }}>{docType}</Typography>
          {cfg && (
            <Chip
              label={cfg.label}
              size="small"
              sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: alpha(cfg.color, 0.1), color: cfg.color, borderRadius: 1 }}
            />
          )}
        </Box>
        {doc ? (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary }}>
              Uploaded {new Date(doc.uploaded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </Typography>
            {doc.expiry_date && (
              <Typography sx={{ fontSize: "0.68rem", color: isExpiringSoon ? COLORS.error : COLORS.textSecondary, fontWeight: isExpiringSoon ? 700 : 400 }}>
                · Exp: {new Date(doc.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {isExpiringSoon && " ⚠️"}
              </Typography>
            )}
          </Box>
        ) : (
          <Typography sx={{ fontSize: "0.68rem", color: COLORS.warning, fontWeight: 600 }}>
            Not uploaded · Required for verification
          </Typography>
        )}
      </Box>
      {doc?.file_url && (
        <Tooltip title="View document">
          <IconButton size="small" onClick={() => window.open(doc.file_url!, "_blank")} sx={{ color: COLORS.info }}>
            <FileOpen sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

// ── Photo Card ────────────────────────────────────────────

function PhotoCard({
  photoType,
  label,
  photo,
  uploading,
  onUpload,
}: {
  photoType: string;
  label: string;
  photo: VehiclePhoto | undefined;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const STATUS_COLOR: Record<string, string> = {
    PENDING: COLORS.warning,
    APPROVED: COLORS.success,
    REJECTED: COLORS.error,
  };

  return (
    <Box
      sx={{
        border: `1px solid ${photo
          ? photo.verification_status === "APPROVED" ? COLORS.success
          : photo.verification_status === "REJECTED" ? COLORS.error
          : alpha(COLORS.navy, 0.2)
          : alpha(COLORS.navy, 0.12)}`,
        borderRadius: 2.5,
        overflow: "hidden",
        transition: "all 0.15s",
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { onUpload(f); e.target.value = ""; }
        }}
      />

      {/* Photo preview / placeholder */}
      <Box
        sx={{
          height: 90, position: "relative",
          bgcolor: photo ? "transparent" : alpha(COLORS.navy, 0.03),
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          "&:hover .overlay": { opacity: 1 },
        }}
        onClick={() => !uploading && fileRef.current?.click()}
      >
        {photo ? (
          <>
            <Box
              component="img"
              src={photo.file_url}
              alt={label}
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e: any) => { e.target.style.display = "none"; }}
            />
            {/* Hover overlay */}
            <Box
              className="overlay"
              sx={{
                position: "absolute", inset: 0, opacity: 0, transition: "opacity 0.18s",
                bgcolor: "rgba(0,0,0,0.5)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 0.5,
              }}
            >
              <CloudUpload sx={{ color: "#fff", fontSize: 18 }} />
              <Typography sx={{ color: "#fff", fontSize: "0.65rem", fontWeight: 700 }}>Replace</Typography>
            </Box>
            {/* Status badge */}
            <Box sx={{ position: "absolute", top: 4, right: 4 }}>
              {photo.verification_status === "APPROVED"
                ? <CheckCircleOutline sx={{ fontSize: 16, color: COLORS.success }} />
                : photo.verification_status === "REJECTED"
                  ? <ErrorOutline sx={{ fontSize: 16, color: COLORS.error }} />
                  : <HourglassTop sx={{ fontSize: 14, color: COLORS.warning }} />}
            </Box>
          </>
        ) : uploading ? (
          <CircularProgress size={22} sx={{ color: COLORS.navy }} />
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
            <CameraAlt sx={{ fontSize: 22, color: alpha(COLORS.navy, 0.25) }} />
            <Typography sx={{ fontSize: "0.62rem", color: COLORS.textSecondary }}>
              Tap to upload
            </Typography>
          </Box>
        )}
      </Box>

      {/* Label row */}
      <Box sx={{
        px: 1, py: 0.75,
        bgcolor: photo
          ? photo.verification_status === "APPROVED"
            ? alpha(COLORS.success, 0.05)
            : photo.verification_status === "REJECTED"
              ? alpha(COLORS.error, 0.05)
              : alpha(COLORS.warning, 0.04)
          : alpha(COLORS.navy, 0.02),
      }}>
        <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: COLORS.textPrimary, mb: 0.25 }} noWrap>
          {label}
        </Typography>
        {photo && (
          <Typography sx={{
            fontSize: "0.62rem", fontWeight: 600,
            color: STATUS_COLOR[photo.verification_status] ?? COLORS.textSecondary,
          }}>
            {photo.verification_status}
          </Typography>
        )}
        {photo?.file_url && (
          <Box sx={{ display: "flex", gap: 0.5, mt: 0.25 }}>
            <Tooltip title="View photo">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); window.open(photo.file_url, "_blank"); }}
                sx={{ p: 0.2, color: COLORS.info }}
              >
                <FileOpen sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ── Main Drawer ───────────────────────────────────────────

export default function VehicleDetailDrawer({
  vehicle, open, categories, cities, onClose, onUploadDoc, onVehicleUpdated,
}: Props) {
  const [tab, setTab] = useState(0);
  const [uploadingPhotoType, setUploadingPhotoType] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");

  if (!vehicle) return null;

  const cat = categories.find((c) => c.id === vehicle.vehicle_category_id);
  const city = cities.find((c) => c.id === vehicle.city_id);
  const docMap = Object.fromEntries(vehicle.documents.map((d) => [d.document_type ?? "", d]));
  const photoMap = Object.fromEntries((vehicle.photos ?? []).map((p) => [p.photo_type, p]));
  const uploadedCount = REQUIRED_DOCS.filter((t) => docMap[t]).length;
  const docProgress = Math.min(Math.round((uploadedCount / REQUIRED_DOCS.length) * 100), 100);
  const uploadedPhotoCount = (vehicle.photos ?? []).length;
  const photoProgress = Math.min(Math.round((uploadedPhotoCount / PHOTO_TYPES.length) * 100), 100);
  const statusCfg = VEHICLE_STATUS[vehicle.status] ?? { label: vehicle.status, color: COLORS.textSecondary, desc: "" };
  const canUpload = !["ON_TRIP", "SUSPENDED"].includes(vehicle.status);

  const handlePhotoUpload = async (photoType: string, file: File) => {
    setPhotoError("");
    setUploadingPhotoType(photoType);
    try {
      const remoteUrl = await vehicleService.uploadFile(file, "photo");
      await vehicleService.uploadPhoto(vehicle.uuid, vehicle.partner_id, {
        photo_type: photoType,
        file_url: remoteUrl,
      });
      // Refresh vehicle detail
      const updated = await vehicleService.getVehicle(vehicle.uuid);
      if (onVehicleUpdated) onVehicleUpdated(updated);
    } catch (e: any) {
      setPhotoError(e?.response?.data?.detail ?? "Photo upload failed. Please try again.");
    } finally {
      setUploadingPhotoType(null);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 500 },
          bgcolor: COLORS.bgCard,
          boxShadow: "-8px 0 40px rgba(10,22,40,0.12)",
        },
      }}
    >
      {/* Header */}
      <Box sx={{
        background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 100%)`,
        p: 3, position: "relative", flexShrink: 0,
      }}>
        <Box sx={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: alpha("#fff", 0.04) }} />
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar sx={{ width: 48, height: 48, bgcolor: alpha(COLORS.gold, 0.15), border: `2px solid ${alpha(COLORS.gold, 0.3)}` }}>
              <DirectionsCar sx={{ color: COLORS.gold, fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: "1.1rem", fontFamily: "monospace", letterSpacing: "0.04em" }}>
                {vehicle.registration_number}
              </Typography>
              <Typography sx={{ color: alpha("#fff", 0.5), fontSize: "0.72rem" }}>{vehicle.vehicle_code ?? "—"}</Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: alpha("#fff", 0.6), "&:hover": { color: "#fff" } }}>
            <Close sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <VehicleStatusBadge status={vehicle.status} />
          <Typography sx={{ color: alpha("#fff", 0.55), fontSize: "0.75rem" }}>{statusCfg.desc}</Typography>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            mt: 2,
            "& .MuiTab-root": { color: alpha("#fff", 0.55), fontSize: "0.75rem", minWidth: 0, px: 1.5, fontWeight: 600 },
            "& .Mui-selected": { color: "#fff" },
            "& .MuiTabs-indicator": { bgcolor: COLORS.gold, height: 2.5 },
          }}
        >
          <Tab label="Details" />
          <Tab label={`Docs (${uploadedCount}/${REQUIRED_DOCS.length})`} />
          <Tab label={`Photos (${uploadedPhotoCount}/${PHOTO_TYPES.length})`} />
        </Tabs>
      </Box>

      <Box sx={{ overflowY: "auto", flex: 1 }}>
        {/* ── TAB 0: Details ─────────────────────────── */}
        {tab === 0 && (
          <Box sx={{ p: 3 }}>
            {/* Status banners */}
            {["PENDING", "UNDER_REVIEW"].includes(vehicle.status) && (
              <Box sx={{ mb: 3, p: 2.5, borderRadius: 2.5, bgcolor: alpha(COLORS.info, 0.05), border: `1px solid ${alpha(COLORS.info, 0.2)}` }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <VerifiedUser sx={{ fontSize: 16, color: COLORS.info }} />
                  <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: COLORS.info }}>Verification Progress</Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>Documents</Typography>
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: uploadedCount >= REQUIRED_DOCS.length ? COLORS.success : COLORS.warning }}>
                      {uploadedCount}/{REQUIRED_DOCS.length}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={docProgress}
                    sx={{ height: 5, borderRadius: 3, bgcolor: alpha(COLORS.border, 0.8), mb: 0.5, "& .MuiLinearProgress-bar": { bgcolor: uploadedCount >= REQUIRED_DOCS.length ? COLORS.success : COLORS.info, borderRadius: 3 } }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>Photos</Typography>
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: uploadedPhotoCount >= PHOTO_TYPES.length ? COLORS.success : COLORS.warning }}>
                      {uploadedPhotoCount}/{PHOTO_TYPES.length}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={photoProgress}
                    sx={{ height: 5, borderRadius: 3, bgcolor: alpha(COLORS.border, 0.8), "& .MuiLinearProgress-bar": { bgcolor: uploadedPhotoCount >= PHOTO_TYPES.length ? COLORS.success : COLORS.info, borderRadius: 3 } }}
                  />
                </Box>
                {vehicle.status === "PENDING" && (uploadedCount < REQUIRED_DOCS.length || uploadedPhotoCount < PHOTO_TYPES.length) && (
                  <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2, py: 0.5, fontSize: "0.75rem" }}>
                    Upload all documents and photos to speed up admin verification.
                  </Alert>
                )}
                {vehicle.status === "UNDER_REVIEW" && (
                  <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2, py: 0.5, fontSize: "0.75rem" }}>
                    Admin is reviewing your vehicle. You'll be notified once activated.
                  </Alert>
                )}
              </Box>
            )}

            {vehicle.status === "ACTIVE" && (
              <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3, borderRadius: 2.5, fontSize: "0.82rem" }}>
                Vehicle is active and eligible for booking assignments.
              </Alert>
            )}
            {vehicle.status === "SUSPENDED" && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2.5, fontSize: "0.82rem" }}>
                This vehicle is suspended by admin. Contact support for reinstatement.
              </Alert>
            )}

            <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary, fontSize: "0.85rem", mb: 1.5 }}>Vehicle Details</Typography>
            <Box sx={{ mb: 3 }}>
              <InfoRow icon={<DirectionsCar />} label="Brand & Model" value={`${vehicle.vehicle_brand ?? "—"} ${vehicle.vehicle_model ?? ""}`} />
              <InfoRow icon={<Speed />} label="Category" value={cat?.category_name ?? `Category #${vehicle.vehicle_category_id}`} />
              <InfoRow icon={<LocalGasStation />} label="Fuel Type" value={vehicle.fuel_type} />
              <InfoRow icon={<AirlineSeatReclineNormal />} label="Seating Capacity" value={vehicle.seating_capacity ? `${vehicle.seating_capacity} seats` : null} />
              <InfoRow icon={<CalendarMonth />} label="Manufacturing Year" value={vehicle.manufacturing_year} />
              <InfoRow icon={<LocationCity />} label="Operating City" value={city ? `${city.city_name}${city.state_name ? `, ${city.state_name}` : ""}` : `City #${vehicle.city_id}`} />
            </Box>

            {/* Availability */}
            {(vehicle.status === "ACTIVE" || vehicle.status === "ON_TRIP" || vehicle.availability) && (
              <>
                <Divider sx={{ mb: 2 }} />
                <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary, fontSize: "0.85rem", mb: 1 }}>Availability</Typography>
                {(() => {
                  const rawStatus = vehicle.availability?.availability_status ?? null;
                  const displayStatus =
                    vehicle.status === "ON_TRIP" ? "ON_TRIP"
                    : vehicle.status === "ACTIVE" && (rawStatus === null || rawStatus === "UNAVAILABLE") ? "AVAILABLE"
                    : rawStatus ?? "UNKNOWN";
                  const cfg: Record<string, { label: string; color: string }> = {
                    AVAILABLE:   { label: "Available — Ready for bookings", color: COLORS.success },
                    UNAVAILABLE: { label: "Unavailable — Temporarily offline", color: COLORS.textSecondary },
                    ON_TRIP:     { label: "On Trip — Currently assigned", color: "#8B5CF6" },
                    UNKNOWN:     { label: "Unknown", color: COLORS.textSecondary },
                  };
                  const s = cfg[displayStatus] ?? cfg.UNKNOWN;
                  return (
                    <Chip
                      label={s.label}
                      size="small"
                      sx={{ fontWeight: 700, fontSize: "0.78rem", bgcolor: alpha(s.color, 0.1), color: s.color, border: `1px solid ${alpha(s.color, 0.25)}` }}
                    />
                  );
                })()}
              </>
            )}

            {/* Timestamps */}
            <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${COLORS.border}` }}>
              {[["Registered", vehicle.created_at], ["Last Updated", vehicle.updated_at]].map(([label, dt]) => (
                <Box key={String(label)} sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                  <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>{label}</Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
                    {new Date(dt!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* ── TAB 1: Documents ───────────────────────── */}
        {tab === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary, fontSize: "0.88rem" }}>
                Documents ({uploadedCount}/{REQUIRED_DOCS.length})
              </Typography>
              {canUpload && (
                <Button
                  size="small"
                  startIcon={<Upload sx={{ fontSize: 15 }} />}
                  variant="outlined"
                  onClick={onUploadDoc}
                  sx={{
                    borderRadius: 2, fontWeight: 700, fontSize: "0.72rem", py: 0.5,
                    borderColor: COLORS.border, color: COLORS.textSecondary,
                    "&:hover": { borderColor: COLORS.gold, color: COLORS.gold },
                  }}
                >
                  Upload
                </Button>
              )}
            </Box>
            <Box sx={{ mb: 2 }}>
              {REQUIRED_DOCS.map((t) => <DocRow key={t} docType={t} doc={docMap[t]} />)}
              {vehicle.documents
                .filter((d) => d.document_type && !REQUIRED_DOCS.includes(d.document_type))
                .map((d) => <DocRow key={d.id} docType={d.document_type ?? "OTHER"} doc={d} />)}
            </Box>
            {uploadedCount < REQUIRED_DOCS.length && canUpload && (
              <Button
                variant="contained"
                startIcon={<Upload />}
                onClick={onUploadDoc}
                fullWidth
                sx={{
                  borderRadius: 2.5, fontWeight: 700, mt: 1,
                  background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
                  color: "#fff",
                }}
              >
                Upload Missing Documents
              </Button>
            )}
          </Box>
        )}

        {/* ── TAB 2: Photos ──────────────────────────── */}
        {tab === 2 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ImageIcon sx={{ fontSize: 18, color: COLORS.navy }} />
                <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary, fontSize: "0.88rem" }}>
                  Vehicle Photos
                </Typography>
              </Box>
              <Chip
                label={`${uploadedPhotoCount}/${PHOTO_TYPES.length}`}
                size="small"
                sx={{
                  height: 20, fontSize: "0.68rem", fontWeight: 700,
                  bgcolor: uploadedPhotoCount >= PHOTO_TYPES.length ? alpha(COLORS.success, 0.12) : alpha(COLORS.warning, 0.1),
                  color: uploadedPhotoCount >= PHOTO_TYPES.length ? COLORS.success : COLORS.warning,
                }}
              />
            </Box>

            {photoError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontSize: "0.78rem" }} onClose={() => setPhotoError("")}>
                {photoError}
              </Alert>
            )}

            <Alert severity="info" sx={{ mb: 2, borderRadius: 2, fontSize: "0.75rem", py: 0.75 }}>
              Click any slot to upload a photo. Admin will verify each one before activation.
            </Alert>

            <Grid container spacing={1.5}>
              {PHOTO_TYPES.map((pt) => (
                <Grid item xs={6} sm={4} key={pt.value}>
                  <PhotoCard
                    photoType={pt.value}
                    label={pt.label}
                    photo={photoMap[pt.value]}
                    uploading={uploadingPhotoType === pt.value}
                    onUpload={(file) => handlePhotoUpload(pt.value, file)}
                  />
                </Grid>
              ))}
            </Grid>

            {/* Status summary */}
            {uploadedPhotoCount > 0 && (
              <Box sx={{ mt: 2.5, p: 2, borderRadius: 2.5, bgcolor: alpha(COLORS.navy, 0.03), border: `1px solid ${COLORS.border}` }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.78rem", color: COLORS.textSecondary, mb: 1 }}>
                  PHOTO STATUS SUMMARY
                </Typography>
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  {["PENDING", "APPROVED", "REJECTED"].map((s) => {
                    const count = (vehicle.photos ?? []).filter((p) => p.verification_status === s).length;
                    if (count === 0) return null;
                    const color = s === "APPROVED" ? COLORS.success : s === "REJECTED" ? COLORS.error : COLORS.warning;
                    return (
                      <Box key={s} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
                        <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary, fontWeight: 600 }}>
                          {count} {s.charAt(0) + s.slice(1).toLowerCase()}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
