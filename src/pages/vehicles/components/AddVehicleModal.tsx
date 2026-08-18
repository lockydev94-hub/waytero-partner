// ============================================================
// ADD VEHICLE MODAL — Register a new vehicle with photos
// Steps: 1. Basic Info  2. Vehicle Details  3. Photos  4. Confirm & Submit
// POST /vehicles?partner_id=X
// POST /vehicles/{uuid}/photos  (per-photo after registration)
// ============================================================
import { useState, useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, TextField, MenuItem, Alert,
  alpha, Stepper, Step, StepLabel, Grid, Chip, CircularProgress,
  LinearProgress, IconButton, Tooltip,
} from "@mui/material";
import {
  DirectionsCar, ArrowForward, ArrowBack, Check,
  CloudUpload, CheckCircle, Image as ImageIcon, Close,
  CameraAlt,
} from "@mui/icons-material";
import { COLORS } from "../../../theme";
import type {
  VehicleCategory, City, RegisterVehiclePayload, UploadPhotoPayload, Vehicle,
} from "../../../services/vehicle.service";
import { vehicleService, PHOTO_TYPES } from "../../../services/vehicle.service";

const FUEL_TYPES = ["PETROL", "DIESEL", "CNG", "ELECTRIC", "HYBRID"];
const STEPS = ["Basic Info", "Vehicle Details", "Photos", "Confirm"];

interface PhotoDraft {
  photo_type: string;
  file: File;
  previewUrl: string;
  caption: string;
  uploaded: boolean;
  uploading: boolean;
  error: string;
  remoteUrl: string; // after upload
}

interface Props {
  open: boolean;
  onClose: () => void;
  categories: VehicleCategory[];
  cities: City[];
  partnerId: number;
  onSubmit: (payload: RegisterVehiclePayload) => Promise<Vehicle>;
  onPhotosUploaded?: (vehicleUuid: string, photos: UploadPhotoPayload[]) => Promise<void>;
}

const EMPTY: RegisterVehiclePayload = {
  registration_number: "",
  vehicle_category_id: 0,
  vehicle_brand: "",
  vehicle_model: "",
  manufacturing_year: undefined,
  fuel_type: "",
  seating_capacity: undefined,
  city_id: 0,
};

// ── Photo Picker Card ─────────────────────────────────────

function PhotoPickerCard({
  typeValue,
  typeLabel,
  draft,
  onPick,
  onRemove,
}: {
  typeValue: string;
  typeLabel: string;
  draft: PhotoDraft | undefined;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) onPick(file);
  };

  return (
    <Box
      sx={{
        border: `2px dashed ${draft ? (draft.uploaded ? COLORS.success : COLORS.warning) : alpha(COLORS.navy, 0.2)}`,
        borderRadius: 2.5,
        overflow: "hidden",
        transition: "all 0.18s",
        bgcolor: dragOver ? alpha(COLORS.navy, 0.04) : "transparent",
      }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { onPick(f); e.target.value = ""; }
        }}
      />

      {/* Preview */}
      {draft?.previewUrl ? (
        <Box sx={{ position: "relative", height: 110 }}>
          <Box
            component="img"
            src={draft.previewUrl}
            alt={typeLabel}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {/* Status overlay */}
          <Box sx={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            bgcolor: draft.uploading ? "rgba(0,0,0,0.45)" : "transparent",
          }}>
            {draft.uploading && <CircularProgress size={26} sx={{ color: "#fff" }} />}
            {draft.uploaded && (
              <Box sx={{
                position: "absolute", top: 4, right: 4,
                bgcolor: COLORS.success, borderRadius: "50%", width: 20, height: 20,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Check sx={{ fontSize: 13, color: "#fff" }} />
              </Box>
            )}
          </Box>
          {/* Remove btn */}
          <Tooltip title="Remove">
            <IconButton
              size="small"
              onClick={onRemove}
              sx={{
                position: "absolute", top: 4, left: 4,
                bgcolor: "rgba(0,0,0,0.5)", color: "#fff", p: 0.3,
                "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
              }}
            >
              <Close sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box
          onClick={() => fileRef.current?.click()}
          sx={{
            height: 110, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 0.75,
            "&:hover": { bgcolor: alpha(COLORS.navy, 0.03) },
          }}
        >
          <CameraAlt sx={{ fontSize: 26, color: alpha(COLORS.navy, 0.3) }} />
          <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary, textAlign: "center" }}>
            Click or drop
          </Typography>
        </Box>
      )}

      {/* Label */}
      <Box sx={{
        px: 1, py: 0.75,
        bgcolor: draft?.uploaded
          ? alpha(COLORS.success, 0.06)
          : draft
            ? alpha(COLORS.warning, 0.06)
            : alpha(COLORS.navy, 0.03),
        display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: draft?.previewUrl ? "default" : "pointer",
      }}
        onClick={() => !draft?.previewUrl && fileRef.current?.click()}
      >
        <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: COLORS.textPrimary }}>
          {typeLabel}
        </Typography>
        {draft?.error && (
          <Typography sx={{ fontSize: "0.62rem", color: COLORS.error }}>retry</Typography>
        )}
        {!draft && (
          <Typography sx={{ fontSize: "0.62rem", color: COLORS.textSecondary, fontStyle: "italic" }}>
            optional
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// ── Main ─────────────────────────────────────────────────

export default function AddVehicleModal({
  open, onClose, categories, cities, partnerId, onSubmit, onPhotosUploaded,
}: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RegisterVehiclePayload>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Photos state
  const [photoDrafts, setPhotoDrafts] = useState<Record<string, PhotoDraft>>({});
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoProgress, setPhotoProgress] = useState({ done: 0, total: 0 });

  const set = (key: keyof RegisterVehiclePayload, val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  const canNext0 =
    form.registration_number.trim().length >= 3 &&
    form.vehicle_category_id > 0 &&
    form.city_id > 0;

  const canNext1 = !!form.vehicle_brand?.trim() && !!form.vehicle_model?.trim();

  const handleClose = () => {
    if (submitting || uploadingPhotos) return;
    setStep(0);
    setForm(EMPTY);
    setError("");
    setPhotoDrafts({});
    setPhotoProgress({ done: 0, total: 0 });
    onClose();
  };

  // ── Photo handling ─────────────────────────────────────

  const handlePickPhoto = (photoType: string, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setPhotoDrafts((prev) => ({
      ...prev,
      [photoType]: {
        photo_type: photoType,
        file,
        previewUrl,
        caption: "",
        uploaded: false,
        uploading: false,
        error: "",
        remoteUrl: "",
      },
    }));
  };

  const handleRemovePhoto = (photoType: string) => {
    setPhotoDrafts((prev) => {
      const next = { ...prev };
      if (next[photoType]?.previewUrl) {
        URL.revokeObjectURL(next[photoType].previewUrl);
      }
      delete next[photoType];
      return next;
    });
  };

  const pickedCount = Object.keys(photoDrafts).length;

  // ── Submit ─────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const payload: RegisterVehiclePayload = {
        ...form,
        registration_number: form.registration_number.toUpperCase().trim(),
        manufacturing_year: form.manufacturing_year || undefined,
        seating_capacity: form.seating_capacity || undefined,
        fuel_type: form.fuel_type || undefined,
        vehicle_brand: form.vehicle_brand || undefined,
        vehicle_model: form.vehicle_model || undefined,
      };

      // Step 1: Register vehicle
      const vehicle = await onSubmit(payload);
      setSubmitting(false);

      // Step 2: Upload photos (if any were picked)
      const drafts = Object.values(photoDrafts);
      if (drafts.length > 0) {
        setUploadingPhotos(true);
        setPhotoProgress({ done: 0, total: drafts.length });

        let done = 0;
        const uploadedPayloads: UploadPhotoPayload[] = [];

        for (const draft of drafts) {
          try {
            // Upload to Cloudinary
            const remoteUrl = await vehicleService.uploadFile(draft.file, "photo");
            // Save to backend
            await vehicleService.uploadPhoto(vehicle.uuid, partnerId, {
              photo_type: draft.photo_type,
              file_url: remoteUrl,
              caption: draft.caption || undefined,
            });
            uploadedPayloads.push({ photo_type: draft.photo_type, file_url: remoteUrl });
          } catch {
            // Continue even if one photo fails
          }
          done++;
          setPhotoProgress({ done, total: drafts.length });

          // Update individual card status
          setPhotoDrafts((prev) => ({
            ...prev,
            [draft.photo_type]: { ...prev[draft.photo_type], uploaded: true },
          }));
        }

        setUploadingPhotos(false);
        if (onPhotosUploaded) {
          await onPhotosUploaded(vehicle.uuid, uploadedPayloads);
        }
      }

      handleClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Failed to register vehicle.");
      setSubmitting(false);
      setUploadingPhotos(false);
    }
  };

  const selectedCat = categories.find((c) => c.id === form.vehicle_category_id);
  const selectedCity = cities.find((c) => c.id === form.city_id);
  const isWorking = submitting || uploadingPhotos;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          boxShadow: "0 24px 64px rgba(10,22,40,0.2)",
          border: `1px solid ${COLORS.border}`,
        },
      }}
    >
      <DialogTitle sx={{ pb: 0, pt: 3, px: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
          <Box
            sx={{
              width: 44, height: 44, borderRadius: 2.5,
              background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <DirectionsCar sx={{ fontSize: 22, color: "#fff" }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: COLORS.textPrimary }}>
              Register Vehicle
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>
              Submit for admin verification · Status starts as PENDING
            </Typography>
          </Box>
        </Box>
        <Stepper
          activeStep={step}
          sx={{ "& .MuiStepLabel-label": { fontSize: "0.75rem", fontWeight: 600 } }}
        >
          {STEPS.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
        </Stepper>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 3, minHeight: 320 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {/* ── STEP 0 — Basic Info ───────────────────────── */}
        {step === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <TextField
              label="Registration Number *"
              placeholder="e.g. MH12AB1234"
              value={form.registration_number}
              onChange={(e) => set("registration_number", e.target.value.toUpperCase())}
              fullWidth
              inputProps={{
                style: { textTransform: "uppercase", fontFamily: "monospace", letterSpacing: "0.08em", fontWeight: 700 },
              }}
              helperText="Enter the vehicle number plate exactly as on RC"
            />
            <TextField
              select
              label="Vehicle Category *"
              value={form.vehicle_category_id || ""}
              onChange={(e) => set("vehicle_category_id", Number(e.target.value))}
              fullWidth
            >
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.category_name}{c.seating_capacity ? ` · ${c.seating_capacity} seats` : ""}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Operating City *"
              value={form.city_id || ""}
              onChange={(e) => set("city_id", Number(e.target.value))}
              fullWidth
              helperText="City where this vehicle will operate"
            >
              {cities.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.city_name}{c.state_name ? `, ${c.state_name}` : ""}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        )}

        {/* ── STEP 1 — Vehicle Details ──────────────────── */}
        {step === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField
                label="Brand *"
                placeholder="e.g. Maruti, Toyota"
                value={form.vehicle_brand ?? ""}
                onChange={(e) => set("vehicle_brand", e.target.value)}
                fullWidth
              />
              <TextField
                label="Model *"
                placeholder="e.g. Dzire, Innova"
                value={form.vehicle_model ?? ""}
                onChange={(e) => set("vehicle_model", e.target.value)}
                fullWidth
              />
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField
                label="Manufacturing Year"
                type="number"
                inputProps={{ min: 1990, max: new Date().getFullYear() + 1 }}
                value={form.manufacturing_year ?? ""}
                onChange={(e) => set("manufacturing_year", e.target.value ? Number(e.target.value) : undefined)}
                fullWidth
              />
              <TextField
                label="Seating Capacity"
                type="number"
                inputProps={{ min: 1, max: 60 }}
                value={form.seating_capacity ?? ""}
                onChange={(e) => set("seating_capacity", e.target.value ? Number(e.target.value) : undefined)}
                fullWidth
              />
            </Box>
            <TextField
              select
              label="Fuel Type"
              value={form.fuel_type ?? ""}
              onChange={(e) => set("fuel_type", e.target.value)}
              fullWidth
            >
              <MenuItem value="">Not specified</MenuItem>
              {FUEL_TYPES.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </TextField>
          </Box>
        )}

        {/* ── STEP 2 — Photos ──────────────────────────── */}
        {step === 2 && (
          <Box>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.75 }}>
                <ImageIcon sx={{ color: COLORS.navy, fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color: COLORS.textPrimary }}>
                  Vehicle Photos
                </Typography>
                <Chip
                  label={`${pickedCount} selected`}
                  size="small"
                  sx={{
                    height: 20, fontSize: "0.68rem", fontWeight: 700,
                    bgcolor: pickedCount > 0 ? alpha(COLORS.success, 0.12) : alpha(COLORS.navy, 0.06),
                    color: pickedCount > 0 ? COLORS.success : COLORS.textSecondary,
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
                Upload clear vehicle photos to speed up admin verification. Photos are optional now — you can add them later from your vehicle details.
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 2, borderRadius: 2, fontSize: "0.78rem" }}>
              Required for full verification: Front, Rear, Left, Right, Interior, Odometer, Engine photos.
              The admin will review and approve each photo.
            </Alert>

            <Grid container spacing={1.5}>
              {PHOTO_TYPES.map((pt) => (
                <Grid item xs={6} sm={4} md={3} key={pt.value}>
                  <PhotoPickerCard
                    typeValue={pt.value}
                    typeLabel={pt.label}
                    draft={photoDrafts[pt.value]}
                    onPick={(file) => handlePickPhoto(pt.value, file)}
                    onRemove={() => handleRemovePhoto(pt.value)}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* ── STEP 3 — Confirm ──────────────────────────── */}
        {step === 3 && (
          <Box>
            <Box
              sx={{
                borderRadius: 3, p: 2.5,
                bgcolor: alpha(COLORS.bgMain, 0.8),
                border: `1px solid ${COLORS.border}`, mb: 2,
              }}
            >
              <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary, mb: 2, fontSize: "0.88rem" }}>
                Vehicle Details
              </Typography>
              {[
                ["Registration Number", form.registration_number],
                ["Category", selectedCat?.category_name ?? "—"],
                ["City", selectedCity ? `${selectedCity.city_name}${selectedCity.state_name ? `, ${selectedCity.state_name}` : ""}` : "—"],
                ["Brand & Model", `${form.vehicle_brand ?? "—"} ${form.vehicle_model ?? ""}`],
                ["Year", form.manufacturing_year ?? "—"],
                ["Seating", form.seating_capacity ? `${form.seating_capacity} seats` : "—"],
                ["Fuel Type", form.fuel_type ?? "—"],
              ].map(([label, value]) => (
                <Box
                  key={String(label)}
                  sx={{
                    display: "flex", justifyContent: "space-between", py: 0.75,
                    borderBottom: `1px solid ${COLORS.border}`,
                  }}
                >
                  <Typography sx={{ fontSize: "0.82rem", color: COLORS.textSecondary }}>{label}</Typography>
                  <Typography
                    sx={{
                      fontSize: "0.82rem", fontWeight: 600, color: COLORS.textPrimary,
                      textAlign: "right", maxWidth: "60%",
                      fontFamily: label === "Registration Number" ? "monospace" : undefined,
                    }}
                  >
                    {String(value)}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Photos summary */}
            {pickedCount > 0 && (
              <Box
                sx={{
                  borderRadius: 3, p: 2,
                  bgcolor: alpha(COLORS.success, 0.04),
                  border: `1px solid ${alpha(COLORS.success, 0.18)}`, mb: 2,
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: COLORS.success, mb: 1 }}>
                  {pickedCount} photo{pickedCount !== 1 ? "s" : ""} ready to upload
                </Typography>
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                  {Object.values(photoDrafts).map((d) => (
                    <Chip
                      key={d.photo_type}
                      label={PHOTO_TYPES.find((p) => p.value === d.photo_type)?.label ?? d.photo_type}
                      size="small"
                      sx={{
                        height: 20, fontSize: "0.68rem", fontWeight: 600,
                        bgcolor: alpha(COLORS.success, 0.1), color: COLORS.success,
                        borderRadius: 1.5,
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Upload progress */}
            {uploadingPhotos && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                  <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary, fontWeight: 600 }}>
                    Uploading photos…
                  </Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: COLORS.navy, fontWeight: 700 }}>
                    {photoProgress.done}/{photoProgress.total}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={photoProgress.total > 0 ? (photoProgress.done / photoProgress.total) * 100 : 0}
                  sx={{ borderRadius: 3, height: 5, "& .MuiLinearProgress-bar": { bgcolor: COLORS.gold } }}
                />
              </Box>
            )}

            <Alert severity="info" sx={{ borderRadius: 2.5, fontSize: "0.82rem" }}>
              Vehicle will be registered with status <strong>PENDING</strong>. Admin will review
              your documents and photos, then activate your vehicle.
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          disabled={isWorking}
          sx={{ borderRadius: 2.5, fontWeight: 600 }}
        >
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        {step > 0 && (
          <Button
            startIcon={<ArrowBack />}
            onClick={() => setStep((s) => s - 1)}
            disabled={isWorking}
            variant="outlined"
            sx={{ borderRadius: 2.5 }}
          >
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button
            endIcon={<ArrowForward />}
            variant="contained"
            disabled={
              (step === 0 && !canNext0) ||
              (step === 1 && !canNext1) ||
              isWorking
            }
            onClick={() => setStep((s) => s + 1)}
            sx={{
              borderRadius: 2.5, fontWeight: 700,
              background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
              color: "#fff",
            }}
          >
            {step === 2 && pickedCount === 0 ? "Skip Photos →" : "Next"}
          </Button>
        ) : (
          <Button
            startIcon={isWorking ? <CircularProgress size={15} color="inherit" /> : <Check />}
            variant="contained"
            onClick={handleSubmit}
            disabled={isWorking}
            sx={{
              borderRadius: 2.5, fontWeight: 700,
              background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
              color: "#000",
            }}
          >
            {submitting ? "Registering…" : uploadingPhotos ? "Uploading photos…" : "Register Vehicle"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
