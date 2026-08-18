// ============================================================
// UPLOAD DOCUMENT MODAL
// POST /vehicles/{uuid}/documents
// ============================================================
import { useState, useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, TextField, MenuItem, Alert,
  alpha, LinearProgress, Chip,
} from "@mui/material";
import { Description, CloudUpload, CheckCircle, CalendarMonth } from "@mui/icons-material";
import { COLORS } from "../../../theme";
import type { UploadDocumentPayload } from "../../../services/vehicle.service";

const DOC_TYPES = [
  { value: "RC",        label: "RC (Registration Certificate)", required: true },
  { value: "INSURANCE", label: "Insurance Certificate",         required: true },
  { value: "FITNESS_CERTIFICATE", label: "Fitness Certificate",  required: true },
  { value: "PERMIT",    label: "Permit",                        required: true },
  { value: "PUC",       label: "PUC (Pollution Under Control)", required: true },
];

interface Props {
  open: boolean;
  onClose: () => void;
  vehicleReg: string;
  uploadedTypes: string[];
  onUploadFile: (file: File, type: "document") => Promise<string>;
  onSubmit: (payload: UploadDocumentPayload) => Promise<void>;
}

export default function UploadDocumentModal({ open, onClose, vehicleReg, uploadedTypes, onUploadFile, onSubmit }: Props) {
  const [docType, setDocType] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    if (uploading || submitting) return;
    setDocType(""); setExpiryDate(""); setFile(null);
    setUploadProgress(0); setError("");
    onClose();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError("File size must be under 10 MB."); return; }
    setFile(f); setError("");
  };

  const handleSubmit = async () => {
    if (!file || !docType) return;
    setError(""); setUploading(true); setUploadProgress(30);
    let fileUrl = "";
    try {
      setUploadProgress(60);
      fileUrl = await onUploadFile(file, "document");
      setUploadProgress(90);
    } catch {
      setError("File upload failed. Please try again.");
      setUploading(false); setUploadProgress(0);
      return;
    }
    setUploading(false); setSubmitting(true);
    try {
      await onSubmit({ document_type: docType, file_url: fileUrl, expiry_date: expiryDate || null });
      setUploadProgress(100);
      setTimeout(handleClose, 400);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Failed to save document.");
    } finally {
      setSubmitting(false);
    }
  };

  const alreadyUploaded = docType && uploadedTypes.includes(docType);
  const canSubmit = !!file && !!docType && !alreadyUploaded;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3.5, boxShadow: "0 24px 64px rgba(10,22,40,0.2)", border: `1px solid ${COLORS.border}` } }}>
      <DialogTitle sx={{ pb: 0, pt: 3, px: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, background: `linear-gradient(135deg, ${COLORS.info}, #2563EB)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Description sx={{ fontSize: 20, color: "#fff" }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: COLORS.textPrimary }}>Upload Document</Typography>
            <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary, fontFamily: "monospace" }}>{vehicleReg}</Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 2.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2.5 }} onClose={() => setError("")}>{error}</Alert>}

        {/* Doc type chips */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary, mb: 1, fontWeight: 600 }}>Required Documents</Typography>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {DOC_TYPES.map((d) => {
              const done = uploadedTypes.includes(d.value);
              return (
                <Chip key={d.value} icon={done ? <CheckCircle sx={{ fontSize: "12px !important", color: `${COLORS.success} !important` }} /> : undefined}
                  label={d.value} size="small"
                  sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700,
                    bgcolor: done ? alpha(COLORS.success, 0.1) : alpha(COLORS.warning, 0.08),
                    color: done ? COLORS.success : COLORS.warning,
                    borderRadius: 1.5, border: `1px solid ${done ? alpha(COLORS.success, 0.2) : alpha(COLORS.warning, 0.2)}` }}
                />
              );
            })}
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField select label="Document Type *" value={docType} onChange={(e) => setDocType(e.target.value)} fullWidth>
            {DOC_TYPES.map((d) => (
              <MenuItem key={d.value} value={d.value}>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <span>{d.label}</span>
                  {uploadedTypes.includes(d.value) && (
                    <Chip label="Uploaded" size="small" sx={{ height: 18, fontSize: "0.62rem", bgcolor: alpha(COLORS.success, 0.1), color: COLORS.success }} />
                  )}
                </Box>
              </MenuItem>
            ))}
          </TextField>

          {alreadyUploaded && (
            <Alert severity="warning" sx={{ borderRadius: 2.5, fontSize: "0.78rem" }}>
              {docType} is already uploaded. You can re-upload to replace it.
            </Alert>
          )}

          <TextField label="Expiry Date" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
            fullWidth InputLabelProps={{ shrink: true }}
            InputProps={{ startAdornment: <CalendarMonth sx={{ fontSize: 18, color: COLORS.textSecondary, mr: 1 }} /> }}
            helperText="Required for Insurance, Fitness, Permit, PUC" />

          {/* File drop zone */}
          <Box
            onClick={() => fileRef.current?.click()}
            sx={{
              border: `2px dashed ${file ? COLORS.success : COLORS.border}`,
              borderRadius: 2.5, p: 3, textAlign: "center", cursor: "pointer",
              bgcolor: file ? alpha(COLORS.success, 0.04) : alpha(COLORS.bgMain, 0.6),
              transition: "all 0.18s",
              "&:hover": { borderColor: COLORS.gold, bgcolor: alpha(COLORS.gold, 0.04) },
            }}
          >
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={handleFile} />
            {file ? (
              <>
                <CheckCircle sx={{ fontSize: 28, color: COLORS.success, mb: 0.5 }} />
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: COLORS.success }}>{file.name}</Typography>
                <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary }}>{(file.size / 1024).toFixed(0)} KB · Click to replace</Typography>
              </>
            ) : (
              <>
                <CloudUpload sx={{ fontSize: 28, color: COLORS.textSecondary, mb: 0.5 }} />
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: COLORS.textPrimary }}>Click to upload</Typography>
                <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary }}>PDF, JPG or PNG · Max 10 MB</Typography>
              </>
            )}
          </Box>

          {(uploading || submitting) && (
            <LinearProgress variant="determinate" value={uploadProgress}
              sx={{ borderRadius: 3, height: 5, "& .MuiLinearProgress-bar": { bgcolor: COLORS.gold } }} />
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={handleClose} variant="outlined" disabled={uploading || submitting} sx={{ borderRadius: 2.5, fontWeight: 600 }}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit || uploading || submitting}
          sx={{ borderRadius: 2.5, fontWeight: 700, background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`, color: "#000" }}>
          {uploading ? "Uploading…" : submitting ? "Saving…" : "Upload Document"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
