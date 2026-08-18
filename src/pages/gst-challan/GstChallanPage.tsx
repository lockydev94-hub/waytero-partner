// ============================================================
// WAYTERO PARTNER PORTAL — GST CHALLAN PAGE
// Route: /dashboard/gst-challan
//
// India GST Rules (Transport / SAC 9964):
//   COMPANY  → 5% GST (2.5% CGST + 2.5% SGST); they have GSTIN,
//               file GSTR-1 & GSTR-3B themselves monthly, pay via PMT-06.
//   INDIVIDUAL → not GST-registered; admin files on their behalf.
//               This page shows read-only GST info to individuals.
//
// Filing deadline: GSTR-3B by 20th of the following month.
// Doc Ref: BRD §155 GST Integration | Migration 0029
// ============================================================
import { useState } from "react";
import {
  Box, Stack, Typography, Button, Chip, Grid, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, MenuItem, Select, FormControl, InputLabel, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Divider, LinearProgress, Tooltip, alpha, useTheme,
} from "@mui/material";
import {
  Receipt, Info, CheckCircle, HourglassTop, Warning, TaskAlt,
  Add, Download, AccountBalance, CurrencyRupee, ReceiptLong, Edit,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import {
  gstService,
  PartnerGSTMonthRecord,
  PartnerGSTSummaryResponse,
} from "../../services/gst.service";

const fmtINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COLORS = {
  navy: "#0F1B33",
  navyLight: "#1A2D4D",
  gold: "#C9A84C",
  success: "#2ECC71",
  border: "rgba(255,255,255,0.08)",
};

// ── Summary KPI Card ────────────────────────────────────────
function KpiCard({
  label, value, sub, icon, color, loading,
}: { label: string; value: string | number; sub: string; icon: React.ReactNode; color: string; loading?: boolean }) {
  const theme = useTheme();
  return (
    <Box sx={{
      p: 2.5, borderRadius: 2.5,
      border: `1px solid ${alpha(color, 0.18)}`,
      bgcolor: alpha(color, 0.04),
      display: "flex", flexDirection: "column", gap: 1,
    }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.68rem" }}>
          {label}
        </Typography>
        <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: alpha(color, 0.12), color, display: "flex" }}>
          {icon}
        </Box>
      </Stack>
      {loading ? (
        <Box sx={{ height: 32, display: "flex", alignItems: "center" }}>
          <CircularProgress size={18} sx={{ color }} />
        </Box>
      ) : (
        <Typography variant="h5" fontWeight={800} sx={{ color, letterSpacing: "-0.02em" }}>
          {value}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">{sub}</Typography>
    </Box>
  );
}

// ── Generate Challan Dialog ──────────────────────────────────
function GenerateChallanDialog({
  open, record, isCompany, onClose, onGenerate,
}: {
  open: boolean;
  record: PartnerGSTMonthRecord | null;
  isCompany: boolean;
  onClose: () => void;
  onGenerate: (month: string, challanNumber: string, notes: string) => Promise<void>;
}) {
  const theme = useTheme();
  const [challanNo, setChallanNo] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!record) return;
    setError("");
    setLoading(true);
    try {
      await onGenerate(record.month, challanNo.trim().toUpperCase(), notes.trim());
      setChallanNo(""); setNotes(""); onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to save challan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setChallanNo(""); setNotes(""); setError(""); onClose();
  };

  if (!record) return null;
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.1) }}>
            <Receipt sx={{ color: "warning.main" }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {record.challan_number ? "Update GST Challan" : "Record GST Challan"}
            </Typography>
            <Typography variant="body2" color="text.secondary">{record.month_label}</Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2.5 }}>
        <Stack gap={2.5}>
          {/* GST Breakdown Box */}
          <Box sx={{
            bgcolor: alpha(theme.palette.warning.main, 0.04),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.15)}`,
            borderRadius: 2, p: 2,
          }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}
              sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              GST Breakdown — {record.month_label}
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {[
                { label: "Tax Invoices", value: record.total_bookings.toString(), color: theme.palette.text.primary },
                { label: "Taxable Amount", value: fmtINR(record.taxable_amount), color: theme.palette.text.primary },
                { label: "CGST (2.5%)", value: fmtINR(record.cgst_amount), color: theme.palette.info.main },
                { label: "SGST (2.5%)", value: fmtINR(record.sgst_amount), color: theme.palette.secondary.main },
                { label: "Total GST (5%)", value: fmtINR(record.gst_amount), color: theme.palette.warning.main },
              ].map(item => (
                <Grid item xs={6} sm={4} key={item.label}>
                  <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                  <Typography fontWeight={700} sx={{ color: item.color }}>{item.value}</Typography>
                </Grid>
              ))}
            </Grid>
          </Box>

          {isCompany ? (
            <>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="body2">
                  <strong>COMPANY Partner:</strong> Pay GST via <strong>PMT-06</strong> on the GST portal
                  by the <strong>20th of {record.month_label.split(" ")[0] === "January" ? "February" : "the next month"}</strong>.
                  Then enter the challan number below for your records.
                </Typography>
              </Alert>
              <TextField
                label="GST Challan / ARN Reference Number"
                placeholder="e.g. 2506XXXXXX (from GST portal)"
                value={challanNo}
                onChange={e => setChallanNo(e.target.value)}
                fullWidth
                helperText="Enter the ARN / Challan ID from the GST portal after payment"
                inputProps={{ style: { textTransform: "uppercase", fontFamily: "monospace" } }}
              />
              <TextField
                label="Notes (optional)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                fullWidth
                multiline rows={2}
                placeholder="e.g. Paid via NEFT, Bank ref XXXXXXX"
                size="small"
              />
            </>
          ) : (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>Individual Partner:</strong> GST filing for individual partners is handled by the platform admin.
                This record is for your reference only. Please contact admin if you have queries.
              </Typography>
            </Alert>
          )}

          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        {isCompany && (
          <Button
            variant="contained" color="warning"
            onClick={handleSubmit} disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Receipt />}
          >
            {loading ? "Saving…" : record.challan_number ? "Update Record" : "Save Challan"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Mark Filed Dialog ────────────────────────────────────────
function MarkFiledDialog({
  open, record, onClose, onFiled,
}: {
  open: boolean;
  record: PartnerGSTMonthRecord | null;
  onClose: () => void;
  onFiled: (month: string, filedDate: string, notes: string) => Promise<void>;
}) {
  const [filedDate, setFiledDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!record) return;
    setLoading(true);
    try { await onFiled(record.month, filedDate, notes); onClose(); }
    finally { setLoading(false); }
  };

  if (!record) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Mark GSTR-3B as Filed</DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2.5 }}>
        <Stack gap={2}>
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            <Typography variant="body2">
              Confirming GSTR-3B has been filed for <strong>{record.month_label}</strong>.<br />
              GST Paid: <strong>{fmtINR(record.gst_amount)}</strong>
              &nbsp;(CGST {fmtINR(record.cgst_amount)} + SGST {fmtINR(record.sgst_amount)})
            </Typography>
          </Alert>
          <TextField type="date" label="Filed Date" value={filedDate}
            onChange={e => setFiledDate(e.target.value)}
            fullWidth size="small" InputLabelProps={{ shrink: true }} />
          <TextField label="ARN / Notes" value={notes}
            onChange={e => setNotes(e.target.value)}
            fullWidth size="small" multiline rows={2}
            placeholder="GST portal ARN, acknowledgement number, etc." />
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" color="success" onClick={handle}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <TaskAlt />}>
          {loading ? "Saving…" : "Confirm Filed"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function GstChallanPage() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(currentYear);
  const [challanModal, setChallanModal] = useState<PartnerGSTMonthRecord | null>(null);
  const [filedModal, setFiledModal] = useState<PartnerGSTMonthRecord | null>(null);

  const { data, isLoading } = useQuery<PartnerGSTSummaryResponse>({
    queryKey: ["partner-gst-summary", year],
    queryFn: () => gstService.summary(year),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const isCompany = data?.partner_type === "COMPANY";
  const ys = data?.yearly_summary;

  const handleGenerate = async (month: string, challanNumber: string, notes: string) => {
    await gstService.generateChallan({ month, challan_number: challanNumber || undefined, notes: notes || undefined });
    enqueueSnackbar("Challan record saved successfully!", { variant: "success" });
    qc.invalidateQueries({ queryKey: ["partner-gst-summary"] });
    setChallanModal(null);
  };

  const handleMarkFiled = async (month: string, filedDate: string, notes: string) => {
    await gstService.markFiled({ month, filed_date: filedDate, notes: notes || undefined });
    enqueueSnackbar("Challan marked as FILED!", { variant: "success" });
    qc.invalidateQueries({ queryKey: ["partner-gst-summary"] });
    setFiledModal(null);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200 }}>
      <Stack gap={3}>
        {/* ── Header ─────────────────────────────────────── */}
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            GST Challan
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monthly GST breakdown · 5% on transport services (SAC 9964) · 2.5% CGST + 2.5% SGST
          </Typography>
        </Box>

        {/* ── Partner Type Banner ─────────────────────────── */}
        {!isLoading && data && (
          <Alert
            severity={isCompany ? "info" : "warning"}
            icon={isCompany ? <AccountBalance /> : <Info />}
            sx={{ borderRadius: 2 }}
          >
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="body2">
                {isCompany ? (
                  <>
                    <strong>Company Partner</strong> — You are registered with GSTIN{" "}
                    <strong>{data.gst_number || "not set"}</strong>. You must file <strong>GSTR-1</strong> and{" "}
                    <strong>GSTR-3B</strong> monthly on the GST portal by the{" "}
                    <strong>20th of the following month</strong>. Use the challan records below to track your filings.
                  </>
                ) : (
                  <>
                    <strong>Individual Partner</strong> — GST filing is managed by the platform admin on your behalf
                    since you are not separately GST-registered. The table below shows GST collected from your bookings for reference.
                  </>
                )}
              </Typography>
            </Stack>
          </Alert>
        )}

        {/* ── Controls ───────────────────────────────────── */}
        <Box sx={{
          bgcolor: "background.paper", borderRadius: 2, p: 2.5,
          border: `1px solid ${theme.palette.divider}`,
        }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Typography variant="subtitle2" fontWeight={700}>
              GST Filing Tracker — {year}
            </Typography>
            <Stack direction="row" gap={1.5} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <InputLabel>Year</InputLabel>
                <Select value={year} onChange={e => setYear(Number(e.target.value))} label="Year">
                  {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button size="small" startIcon={<Download />} variant="outlined" disabled>
                Export
              </Button>
            </Stack>
          </Stack>
        </Box>

        {/* ── KPI Cards ──────────────────────────────────── */}
        <Grid container spacing={2}>
          {[
            { label: "Total Taxable (Year)", value: ys ? fmtINR(ys.total_taxable) : "—", sub: "Pre-GST fare", icon: <CurrencyRupee sx={{ fontSize: 18 }} />, color: theme.palette.primary.main },
            { label: "Total GST (Year)",     value: ys ? fmtINR(ys.total_gst) : "—",     sub: "5% collected", icon: <Receipt sx={{ fontSize: 18 }} />,        color: theme.palette.warning.main },
            { label: "CGST (2.5%)",          value: ys ? fmtINR(ys.total_cgst) : "—",    sub: "Central Govt", icon: <AccountBalance sx={{ fontSize: 18 }} />, color: theme.palette.info.main },
            { label: "SGST (2.5%)",          value: ys ? fmtINR(ys.total_sgst) : "—",    sub: "State Govt",   icon: <ReceiptLong sx={{ fontSize: 18 }} />,    color: theme.palette.secondary.main },
          ].map(c => (
            <Grid item xs={12} sm={6} md={3} key={c.label}>
              <KpiCard {...c} loading={isLoading} />
            </Grid>
          ))}
        </Grid>

        {/* ── Info note ──────────────────────────────────── */}
        <Alert severity="info" icon={<Info />} sx={{ borderRadius: 2 }}>
          <Typography variant="body2">
            <strong>Filing reminder:</strong> GSTR-3B must be filed and GST paid via <strong>PMT-06</strong> on the
            GST portal by the <strong>20th of each following month</strong>. Late filing attracts interest @ 18% p.a.
            {isCompany && " After paying on the portal, record your challan reference below and mark it as Filed."}
          </Typography>
        </Alert>

        {/* ── Monthly Table ──────────────────────────────── */}
        <Paper sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}`, overflow: "hidden" }}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="subtitle2" fontWeight={700}>Monthly GST Breakdown — {year}</Typography>
          </Box>
          {isLoading && <LinearProgress />}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Month</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Invoices</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Taxable</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>CGST (2.5%)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>SGST (2.5%)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total GST</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  {isCompany && <TableCell sx={{ fontWeight: 700 }}>Challan #</TableCell>}
                  {isCompany && <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {!isLoading && data?.records?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6, color: "text.secondary" }}>
                      No GST data available for {year}.
                    </TableCell>
                  </TableRow>
                )}
                {data?.records?.map((r, idx) => {
                  const isCurrent = idx + 1 === currentMonth && year === currentYear;
                  const hasTxn = r.has_bookings && r.total_bookings > 0;
                  const isFiled = r.challan_status === "FILED";
                  const isGenerated = r.challan_number && !isFiled;

                  return (
                    <TableRow key={r.month} hover sx={{
                      bgcolor: isCurrent ? alpha(theme.palette.primary.main, 0.03) : "inherit",
                      opacity: !hasTxn && !isCurrent ? 0.5 : 1,
                    }}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" gap={1}>
                          <Typography fontWeight={isCurrent ? 700 : 500} fontSize="0.85rem">
                            {r.month_label}
                          </Typography>
                          {isCurrent && (
                            <Chip label="Current" size="small" color="primary"
                              sx={{ height: 18, fontSize: "0.68rem" }} />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{hasTxn ? r.total_bookings : "—"}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>
                        {hasTxn ? fmtINR(r.taxable_amount) : "—"}
                      </TableCell>
                      <TableCell align="right" sx={{ color: theme.palette.info.dark }}>
                        {hasTxn ? fmtINR(r.cgst_amount) : "—"}
                      </TableCell>
                      <TableCell align="right" sx={{ color: theme.palette.secondary.dark }}>
                        {hasTxn ? fmtINR(r.sgst_amount) : "—"}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: hasTxn ? theme.palette.warning.dark : "text.disabled" }}>
                        {hasTxn ? fmtINR(r.gst_amount) : "—"}
                      </TableCell>
                      <TableCell>
                        {isFiled ? (
                          <Chip label="FILED" size="small" color="success" icon={<CheckCircle />} />
                        ) : isGenerated ? (
                          <Chip label="Pending Filing" size="small" color="warning" icon={<HourglassTop />} />
                        ) : hasTxn && isCompany ? (
                          <Chip label="Challan Due" size="small" color="error" icon={<Warning />} />
                        ) : hasTxn ? (
                          <Chip label="Admin Files" size="small" color="default" />
                        ) : (
                          <Typography variant="caption" color="text.disabled">No transactions</Typography>
                        )}
                      </TableCell>
                      {isCompany && (
                        <TableCell>
                          {r.challan_number ? (
                            <Tooltip title={r.challan_date ? `Date: ${r.challan_date}` : ""}>
                              <Typography variant="caption" fontFamily="monospace" fontWeight={600}>
                                {r.challan_number}
                              </Typography>
                            </Tooltip>
                          ) : "—"}
                        </TableCell>
                      )}
                      {isCompany && (
                        <TableCell align="center">
                          <Stack direction="row" gap={0.5} justifyContent="center">
                            {hasTxn && !r.challan_number && (
                              <Button size="small" variant="contained" color="warning"
                                startIcon={<Add />} sx={{ fontSize: "0.72rem" }}
                                onClick={() => setChallanModal(r)}>
                                Record
                              </Button>
                            )}
                            {isGenerated && !isFiled && (
                              <>
                                <Button size="small" variant="outlined" color="warning"
                                  startIcon={<Edit />} sx={{ fontSize: "0.72rem" }}
                                  onClick={() => setChallanModal(r)}>
                                  Edit
                                </Button>
                                <Button size="small" variant="contained" color="success"
                                  startIcon={<TaskAlt />} sx={{ fontSize: "0.72rem" }}
                                  onClick={() => setFiledModal(r)}>
                                  Mark Filed
                                </Button>
                              </>
                            )}
                            {isFiled && (
                              <Tooltip title={`Filed on ${r.filed_date || r.challan_date || "—"}`}>
                                <CheckCircle sx={{ color: "success.main", fontSize: 20 }} />
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* ── GST Filing Guide ────────────────────────────── */}
        {isCompany && (
          <Paper sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}`, p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              📋 GST Filing Guide (COMPANY Partners)
            </Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {[
                { step: "1", title: "Generate Tax Invoices", desc: "All completed bookings where platform GST is enabled automatically get a tax invoice with 5% GST." },
                { step: "2", title: "File GSTR-1 (by 11th)", desc: "Log in to the GST portal and file GSTR-1 with details of all outward supplies (invoices issued)." },
                { step: "3", title: "File GSTR-3B + Pay (by 20th)", desc: "File GSTR-3B summary return and pay the net GST liability (GST collected − ITC claimed) via PMT-06 challan." },
                { step: "4", title: "Record Challan Here", desc: "After payment, record the challan/ARN reference here and mark the month as 'Filed' for your compliance tracking." },
              ].map(s => (
                <Grid item xs={12} sm={6} key={s.step}>
                  <Stack direction="row" gap={1.5}>
                    <Box sx={{
                      minWidth: 28, height: 28, borderRadius: "50%",
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: "0.8rem",
                    }}>
                      {s.step}
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{s.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.desc}</Typography>
                    </Box>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}
      </Stack>

      {/* ── Dialogs ─────────────────────────────────────── */}
      <GenerateChallanDialog
        open={!!challanModal}
        record={challanModal}
        isCompany={isCompany ?? false}
        onClose={() => setChallanModal(null)}
        onGenerate={handleGenerate}
      />
      <MarkFiledDialog
        open={!!filedModal}
        record={filedModal}
        onClose={() => setFiledModal(null)}
        onFiled={handleMarkFiled}
      />
    </Box>
  );
}
