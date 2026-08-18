// ============================================================
// HOTEL DOCUMENTS TAB — view verification status per document
// ============================================================
import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Stack, Paper, Chip, Alert, CircularProgress,
  alpha, Divider, Tooltip,
} from "@mui/material";
import {
  Description, CheckCircle, Cancel, HourglassTop,
  OpenInNew, CalendarToday,
} from "@mui/icons-material";
import { COLORS } from "../../../theme";
import { hotelService, type HotelDocument } from "../../../services/hotel.service";

const DOC_TYPE_LABELS: Record<string, string> = {
  GST_CERTIFICATE: "GST Certificate",
  PAN_CARD: "PAN Card",
  TRADE_LICENSE: "Trade License",
  BANK_PROOF: "Bank Proof",
  FIRE_SAFETY_CERTIFICATE: "Fire Safety Certificate",
  FSSAI_LICENSE: "FSSAI License",
  PROPERTY_OWNERSHIP_PROOF: "Property Ownership Proof",
  TOURISM_REGISTRATION: "Tourism Registration",
  OTHER: "Other Document",
};

const VERIFY_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:  { label: "Pending Review", color: COLORS.warning, icon: <HourglassTop sx={{ fontSize: 14 }} /> },
  VERIFIED: { label: "Verified",       color: COLORS.success, icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  REJECTED: { label: "Rejected",       color: COLORS.error,   icon: <Cancel sx={{ fontSize: 14 }} /> },
};

function DocCard({ doc }: { doc: HotelDocument }) {
  const meta = VERIFY_META[doc.verification_status] ?? VERIFY_META.PENDING;
  const label = DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type;

  return (
    <Paper elevation={0} sx={{
      p: 2, borderRadius: 2.5, border: `1px solid ${COLORS.border}`,
      bgcolor: COLORS.bgCard, transition: "all 0.15s",
      "&:hover": { borderColor: alpha(COLORS.navy, 0.2), boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
    }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box sx={{
          width: 42, height: 42, borderRadius: 2, flexShrink: 0,
          bgcolor: alpha(meta.color, 0.1),
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Description sx={{ fontSize: 22, color: meta.color }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 0.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: COLORS.textPrimary }}>
              {label}
            </Typography>
            <Chip
              icon={meta.icon as any}
              label={meta.label}
              size="small"
              sx={{
                height: 20, fontSize: 10, fontWeight: 700,
                bgcolor: alpha(meta.color, 0.1), color: meta.color,
                border: `1px solid ${alpha(meta.color, 0.25)}`,
                "& .MuiChip-icon": { color: meta.color },
              }}
            />
          </Stack>
          {doc.document_number && (
            <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary, fontFamily: "monospace", mb: 0.5 }}>
              #{doc.document_number}
            </Typography>
          )}
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <CalendarToday sx={{ fontSize: 12, color: COLORS.textSecondary }} />
              <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary }}>
                Uploaded {new Date(doc.uploaded_at).toLocaleDateString("en-IN")}
              </Typography>
            </Box>
            {doc.expiry_date && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <CalendarToday sx={{ fontSize: 12, color: COLORS.warning }} />
                <Typography sx={{ fontSize: "0.7rem", color: COLORS.warning }}>
                  Expires {new Date(doc.expiry_date).toLocaleDateString("en-IN")}
                </Typography>
              </Box>
            )}
          </Stack>
          {doc.verification_status === "REJECTED" && doc.remarks && (
            <Box sx={{ mt: 1, p: 1, borderRadius: 1.5, bgcolor: alpha(COLORS.error, 0.06), border: `1px solid ${alpha(COLORS.error, 0.15)}` }}>
              <Typography sx={{ fontSize: "0.72rem", color: COLORS.error }}>{doc.remarks}</Typography>
            </Box>
          )}
        </Box>
        <Tooltip title="Open document">
          <Box
            component="a"
            href={doc.file_url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: 1.5,
              bgcolor: alpha(COLORS.navy, 0.06),
              color: COLORS.navy, flexShrink: 0, textDecoration: "none",
              "&:hover": { bgcolor: alpha(COLORS.navy, 0.12) },
            }}
          >
            <OpenInNew sx={{ fontSize: 16 }} />
          </Box>
        </Tooltip>
      </Stack>
    </Paper>
  );
}

export default function HotelDocumentsTab({ hotelId }: { hotelId: number }) {
  const [docs, setDocs] = useState<HotelDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDocs(await hotelService.getDocuments(hotelId));
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
      <CircularProgress size={32} sx={{ color: COLORS.gold }} />
    </Box>
  );

  if (error) return <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>;

  const verified = docs.filter(d => d.verification_status === "VERIFIED");
  const pending  = docs.filter(d => d.verification_status === "PENDING");
  const rejected = docs.filter(d => d.verification_status === "REJECTED");

  if (docs.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <Description sx={{ fontSize: 48, color: alpha(COLORS.textSecondary, 0.3), mb: 1.5 }} />
        <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary }}>No documents uploaded yet</Typography>
        <Typography sx={{ fontSize: "0.82rem", color: COLORS.textSecondary, mt: 0.5 }}>
          Contact the WayTero admin team if documents need to be uploaded.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Summary */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 3 }}>
        {[
          { label: "Verified",  count: verified.length, color: COLORS.success },
          { label: "Pending",   count: pending.length,  color: COLORS.warning },
          { label: "Rejected",  count: rejected.length, color: COLORS.error },
        ].map(s => (
          <Paper key={s.label} elevation={0} sx={{
            px: 2.5, py: 1.5, borderRadius: 2.5, flex: 1,
            border: `1px solid ${COLORS.border}`,
            bgcolor: alpha(s.color, 0.04),
            display: "flex", alignItems: "center", gap: 1.5,
          }}>
            <Typography sx={{ fontSize: "1.6rem", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.count}</Typography>
            <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary, fontWeight: 500 }}>{s.label}</Typography>
          </Paper>
        ))}
      </Stack>

      <Stack spacing={1.5}>
        {docs.map(d => <DocCard key={d.id} doc={d} />)}
      </Stack>
    </Box>
  );
}
