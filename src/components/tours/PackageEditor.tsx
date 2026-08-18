// WAYTERO PARTNER PORTAL — TOUR PACKAGE EDITOR
// Multi-step visual editor (mirrors the admin editor) but tailored for
// partner-side creation: no partner dropdown, rejection reason banner
// when a package is bounced back, and partner-scoped action buttons
// (Save Draft / Submit for Review).
// Doc Ref: BRD_PART_5_TOUR_PACKAGE_MANAGEMENT §3
// ============================================================
import { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Stack, Stepper, Step, StepLabel, Grid, TextField, MenuItem,
  Button, IconButton, Divider, Card, CardContent, Chip, Alert, InputAdornment, Avatar,
} from "@mui/material";
import {
  Add, Delete, ArrowBack, ArrowForward, CheckCircle, LocationOn,
  CalendarMonth, People, AccessTime, Image as ImageIcon, Visibility,
  AttachMoney, Description, ListAlt, Warning, Save, Send, Hotel, Flight, Restaurant,
  DirectionsBus, CameraAlt, Museum, BeachAccess, Hiking, Bookmark, Star, StarBorder,
  Verified, Schedule, LocalActivity, Groups,
} from "@mui/icons-material";
import { tourService, PartnerTourPackage } from "../../services/tour.service";
import { COLORS } from "../../theme";

const PACKAGE_TYPES = [
  { value: "FIXED", label: "Fixed Departure", icon: <Schedule /> },
  { value: "PRIVATE", label: "Private Tour", icon: <Verified /> },
  { value: "GROUP", label: "Group Tour", icon: <Groups /> },
  { value: "PILGRIMAGE", label: "Pilgrimage", icon: <Bookmark /> },
  { value: "CORPORATE", label: "Corporate / MICE", icon: <LocalActivity /> },
];

const STEPS = [
  { key: "basics", label: "Basics", icon: <Description /> },
  { key: "itinerary", label: "Itinerary", icon: <ListAlt /> },
  { key: "inclusions", label: "Inclusions", icon: <CheckCircle /> },
  { key: "pricing", label: "Pricing", icon: <AttachMoney /> },
  { key: "media", label: "Media", icon: <ImageIcon /> },
  { key: "review", label: "Review", icon: <Visibility /> },
];

interface City { id: number; name: string; state_name?: string; }

interface PartnerPackageEditorProps {
  open: boolean;
  initial: PartnerTourPackage | null;
  cities: City[];
  onClose: () => void;
  onSaved: () => void;
}

const blankForm = () => ({
  package_name: "",
  package_type: "FIXED",
  destination: "",
  city_id: "",
  duration_days: 3,
  duration_nights: 2,
  minimum_persons: 1,
  maximum_persons: 12,
  short_description: "",
  description: "",
  terms_and_conditions: "",
  itinerary: [] as Array<{ day_number: number; title: string; description: string; activities: string[] }>,
  inclusions: [] as string[],
  exclusions: [] as string[],
  pricing: [] as Array<{ persons_count: number; package_price: number; effective_from: string; effective_to: string }>,
  media: [] as Array<{ media_url: string; caption: string; is_primary: boolean }>,
});

function fromPackage(p: PartnerTourPackage) {
  return {
    package_name: p.package_name || "",
    package_type: p.package_type || "FIXED",
    destination: p.destination || "",
    city_id: String(p.city_id || ""),
    duration_days: p.duration_days || 1,
    duration_nights: p.duration_nights || 0,
    minimum_persons: p.minimum_persons || 1,
    maximum_persons: p.maximum_persons || 12,
    short_description: p.short_description || "",
    description: p.description || "",
    terms_and_conditions: p.terms_and_conditions || "",
    itinerary: (p.itinerary || []).map(d => ({ day_number: d.day_number, title: d.title || "", description: d.description || "", activities: d.activities || [] })),
    inclusions: (p.inclusions || []).map(x => x.text),
    exclusions: (p.exclusions || []).map(x => x.text),
    pricing: (p.pricing || []).map(x => ({ persons_count: x.persons_count, package_price: x.package_price, effective_from: x.effective_from || "", effective_to: x.effective_to || "" })),
    media: (p.media || []).map(m => ({ media_url: m.media_url, caption: m.caption || "", is_primary: !!m.is_primary })),
  };
}

export default function PartnerPackageEditor({ open, initial, cities, onClose, onSaved }: PartnerPackageEditorProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<any>(blankForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setError(null);
      setSuccess(false);
      setForm(initial ? fromPackage(initial) : blankForm());
    }
  }, [open, initial]);

  const update = (k: string, v: any) => setForm((s: any) => ({ ...s, [k]: v }));
  const isEdit = !!initial;
  const isLocked: boolean = Boolean(initial && ["ACTIVE", "SUSPENDED"].includes(initial.status));

  const stepValid = useMemo(() => {
    if (step === 0) {
      if (!form.package_name.trim() || form.package_name.trim().length < 3) return "Package name is required (min 3 chars)";
      if (!form.destination.trim()) return "Destination is required";
      if (!form.city_id) return "Pick a primary city";
      if (form.duration_days < 1) return "Duration must be at least 1 day";
      if (form.maximum_persons && form.maximum_persons < form.minimum_persons) return "Max pax must be ≥ min pax";
      if (!form.short_description.trim()) return "Add a short description so customers can find this tour";
    }
    if (step === 1) if (form.itinerary.length === 0) return "Add at least one day to the itinerary";
    if (step === 3) if (form.pricing.length === 0) return "Add at least one pricing slab";
    if (step === 4) if (form.media.length === 0 || !form.media.some((m: any) => m.is_primary)) return "Add at least one image and mark one as primary";
    return null;
  }, [step, form]);

  const addDay = () => setForm((s: any) => ({ ...s, itinerary: [...s.itinerary, { day_number: s.itinerary.length + 1, title: "", description: "", activities: [] }] }));
  const removeDay = (idx: number) => setForm((s: any) => ({ ...s, itinerary: s.itinerary.filter((_: any, i: number) => i !== idx).map((d: any, i: number) => ({ ...d, day_number: i + 1 })) }));
  const updateDay = (idx: number, k: string, v: any) => setForm((s: any) => ({ ...s, itinerary: s.itinerary.map((d: any, i: number) => i === idx ? { ...d, [k]: v } : d) }));
  const addActivity = (idx: number, a: string) => { if (!a.trim()) return; setForm((s: any) => ({ ...s, itinerary: s.itinerary.map((d: any, i: number) => i === idx ? { ...d, activities: [...d.activities, a.trim()] } : d) })); };
  const removeActivity = (idx: number, ai: number) => setForm((s: any) => ({ ...s, itinerary: s.itinerary.map((d: any, i: number) => i === idx ? { ...d, activities: d.activities.filter((_: any, j: number) => j !== ai) } : d) }));
  const addListItem = (k: "inclusions" | "exclusions", v: string) => { if (!v.trim()) return; setForm((s: any) => ({ ...s, [k]: [...s[k], v.trim()] })); };
  const removeListItem = (k: "inclusions" | "exclusions", idx: number) => setForm((s: any) => ({ ...s, [k]: s[k].filter((_: any, i: number) => i !== idx) }));
  const addPrice = () => setForm((s: any) => { const last = s.pricing[s.pricing.length - 1]; return { ...s, pricing: [...s.pricing, { persons_count: last ? last.persons_count + 2 : 2, package_price: 0, effective_from: "", effective_to: "" }] }; });
  const removePrice = (idx: number) => setForm((s: any) => ({ ...s, pricing: s.pricing.filter((_: any, i: number) => i !== idx) }));
  const updatePrice = (idx: number, k: string, v: any) => setForm((s: any) => ({ ...s, pricing: s.pricing.map((p: any, i: number) => i === idx ? { ...p, [k]: v } : p) }));
  const addMedia = (url: string, caption: string) => { if (!url.trim()) return; setForm((s: any) => ({ ...s, media: [...s.media, { media_url: url.trim(), caption: caption.trim(), is_primary: s.media.length === 0 }] })); };
  const removeMedia = (idx: number) => setForm((s: any) => { const next = s.media.filter((_: any, i: number) => i !== idx); if (next.length && !next.some((m: any) => m.is_primary)) next[0].is_primary = true; return { ...s, media: next }; });
  const setPrimary = (idx: number) => setForm((s: any) => ({ ...s, media: s.media.map((m: any, i: number) => ({ ...m, is_primary: i === idx })) }));

  const buildPayload = () => ({
    package_name: form.package_name.trim(),
    package_type: form.package_type,
    destination: form.destination.trim(),
    city_id: Number(form.city_id),
    duration_days: Number(form.duration_days),
    duration_nights: Number(form.duration_nights),
    minimum_persons: Number(form.minimum_persons),
    maximum_persons: form.maximum_persons ? Number(form.maximum_persons) : null,
    short_description: form.short_description.trim() || null,
    description: form.description.trim() || null,
    terms_and_conditions: form.terms_and_conditions.trim() || null,
    itinerary: form.itinerary.map((d: any) => ({ day_number: d.day_number, title: d.title, description: d.description || null, activities: d.activities })),
    inclusions: form.inclusions,
    exclusions: form.exclusions,
    pricing: form.pricing.map((p: any) => ({ persons_count: Number(p.persons_count), package_price: Number(p.package_price), effective_from: p.effective_from || null, effective_to: p.effective_to || null })),
    media: form.media.map((m: any, i: number) => ({ media_url: m.media_url, caption: m.caption || null, is_primary: m.is_primary, display_order: i, media_type: "IMAGE" })),
  });

  const save = async (submitForReview: boolean) => {
    setError(null);
    if (isLocked) { setError("Active packages can only be edited by admin. Submit a new version instead."); return; }
    for (let i = 0; i <= 4; i++) {
      const v = [null,
        form.package_name.trim().length >= 3 && form.destination.trim() && form.city_id ? null : "Fix Basics",
        form.itinerary.length === 0 ? "Add at least one itinerary day" : null,
        form.inclusions.length === 0 ? "Add at least one inclusion" : null,
        form.pricing.length === 0 || form.pricing.some((p: any) => !p.package_price) ? "Fix pricing" : null,
      ][i];
      if (v) { setStep(i); setError(v); return; }
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      let saved: PartnerTourPackage;
      if (isEdit) saved = await tourService.update(initial!.id, payload);
      else saved = await tourService.create(payload);
      if (submitForReview) {
        await tourService.submit(saved.id);
      }
      setSuccess(true);
      setTimeout(() => onSaved(), 800);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.response?.data?.detail ?? "Could not save this package");
    } finally {
      setSaving(false);
    }
  };

  const cityName = (id: string) => cities.find(c => String(c.id) === id)?.name || "—";
  const startingPrice = useMemo(() => form.pricing.length === 0 ? 0 : Math.min(...form.pricing.map((p: any) => Number(p.package_price) || 0)), [form.pricing]);

  return (
    <Box>
      {initial?.status === "REJECTED" && initial.rejection_reason && (
        <Alert severity="error" icon={<Warning />} sx={{ mb: 2 }}>
          <b>Admin feedback:</b> {initial.rejection_reason}. Update the package and re-submit.
        </Alert>
      )}

      <Box sx={{ px: 1, pt: 1 }}>
        <Stepper activeStep={step} alternativeLabel>
          {STEPS.map((s, i) => (
            <Step key={s.key} completed={step > i}><StepLabel icon={s.icon}>{s.label}</StepLabel></Step>
          ))}
        </Stepper>
      </Box>
      <Divider sx={{ my: 2 }} />
      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>Saved. Closing…</Alert>}

      {step === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={800}>Package type</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1, gap: 1 }}>
              {PACKAGE_TYPES.map(pt => (
                <Chip key={pt.value} icon={pt.icon as any} label={pt.label} onClick={() => update("package_type", pt.value)} color={form.package_type === pt.value ? "primary" : "default"} variant={form.package_type === pt.value ? "filled" : "outlined"} sx={{ fontWeight: 700 }} />
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Package name" placeholder="e.g. Royal Rajasthan Heritage Tour" value={form.package_name} onChange={e => update("package_name", e.target.value)} required /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Destination" placeholder="e.g. Rajasthan" value={form.destination} onChange={e => update("destination", e.target.value)} required InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" /></InputAdornment> }} /></Grid>
          <Grid item xs={12} md={6}><TextField select fullWidth label="Primary city" value={form.city_id} onChange={e => update("city_id", e.target.value)} required><MenuItem value="">Select city</MenuItem>{cities.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.name}{c.state_name ? `, ${c.state_name}` : ""}</MenuItem>)}</TextField></Grid>
          <Grid item xs={6} md={1.5}><TextField fullWidth type="number" label="Days" value={form.duration_days} onChange={e => update("duration_days", Number(e.target.value))} /></Grid>
          <Grid item xs={6} md={1.5}><TextField fullWidth type="number" label="Nights" value={form.duration_nights} onChange={e => update("duration_nights", Number(e.target.value))} /></Grid>
          <Grid item xs={6} md={1.5}><TextField fullWidth type="number" label="Min pax" value={form.minimum_persons} onChange={e => update("minimum_persons", Number(e.target.value))} /></Grid>
          <Grid item xs={6} md={1.5}><TextField fullWidth type="number" label="Max pax" value={form.maximum_persons} onChange={e => update("maximum_persons", Number(e.target.value))} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={2} maxRows={4} label="Short description" value={form.short_description} onChange={e => update("short_description", e.target.value)} inputProps={{ maxLength: 500 }} helperText={`${form.short_description.length}/500`} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth multiline minRows={5} label="Full description" value={form.description} onChange={e => update("description", e.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth multiline minRows={5} label="Terms & conditions" value={form.terms_and_conditions} onChange={e => update("terms_and_conditions", e.target.value)} /></Grid>
        </Grid>
      )}

      {step === 1 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box><Typography variant="subtitle1" fontWeight={800}>Day-by-day itinerary</Typography><Typography variant="body2" color="text.secondary">Break the trip into days.</Typography></Box>
            <Button startIcon={<Add />} variant="contained" onClick={addDay}>Add day</Button>
          </Stack>
          {form.itinerary.length === 0 && <Alert severity="info">No days yet. Add the first day.</Alert>}
          <Stack spacing={1.5}>
            {form.itinerary.map((day: any, idx: number) => (
              <Card key={idx} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: COLORS.navy, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800 }}>{day.day_number}</Box>
                    <TextField fullWidth size="small" label="Day title" value={day.title} onChange={e => updateDay(idx, "title", e.target.value)} />
                    <IconButton onClick={() => removeDay(idx)} sx={{ color: COLORS.error }}><Delete /></IconButton>
                  </Stack>
                  <TextField fullWidth size="small" multiline minRows={2} label="Description" value={day.description} onChange={e => updateDay(idx, "description", e.target.value)} sx={{ mb: 1.5 }} />
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">ACTIVITIES</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5, mb: 1, gap: 0.5 }}>
                      {day.activities.map((a: string, ai: number) => <Chip key={ai} label={a} onDelete={() => removeActivity(idx, ai)} size="small" />)}
                    </Stack>
                    <TextField
                      fullWidth size="small" placeholder="Add activity (Enter to add)"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addActivity(idx, (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; } }}
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}

      {step === 2 && (
        <Grid container spacing={3}>
          {(["inclusions", "exclusions"] as const).map((k) => (
            <Grid item xs={12} md={6} key={k}>
              <Typography variant="subtitle1" fontWeight={800}>{k === "inclusions" ? "What's included" : "What's not included"}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 2 }}>
                <TextField fullWidth size="small" id={`pe-${k}`} placeholder={k === "inclusions" ? "e.g. 3 nights hotel stay" : "e.g. Air tickets"} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addListItem(k, (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; } }} />
                <Button onClick={() => { const el = document.getElementById(`pe-${k}`) as HTMLInputElement; addListItem(k, el.value); el.value = ""; }} variant={k === "inclusions" ? "contained" : "outlined"} color={k === "inclusions" ? "success" : "error"} startIcon={<Add />}>Add</Button>
              </Stack>
              <Stack spacing={1}>
                {form[k].map((x: string, i: number) => (
                  <Stack key={i} direction="row" alignItems="center" spacing={1} sx={{ p: 1, bgcolor: k === "inclusions" ? "success.50" : "error.50", borderRadius: 1 }}>
                    {k === "inclusions" ? <CheckCircle color="success" fontSize="small" /> : <Box sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: "error.main", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>×</Box>}
                    <Typography sx={{ flex: 1, fontSize: 14 }}>{x}</Typography>
                    <IconButton size="small" onClick={() => removeListItem(k, i)}><Delete fontSize="small" /></IconButton>
                  </Stack>
                ))}
                {form[k].length === 0 && <Alert severity="info">No items yet.</Alert>}
              </Stack>
            </Grid>
          ))}
        </Grid>
      )}

      {step === 3 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box><Typography variant="subtitle1" fontWeight={800}>Pricing slabs</Typography><Typography variant="body2" color="text.secondary">Per-package total for each group size.</Typography></Box>
            <Button startIcon={<Add />} variant="contained" onClick={addPrice}>Add slab</Button>
          </Stack>
          {form.pricing.length === 0 && <Alert severity="info" sx={{ mb: 2 }}>Add at least one slab.</Alert>}
          <Stack spacing={1.5}>
            {form.pricing.map((p: any, idx: number) => (
              <Card key={idx} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={6} sm={2}><TextField fullWidth size="small" type="number" label="Pax" value={p.persons_count} onChange={e => updatePrice(idx, "persons_count", Number(e.target.value))} /></Grid>
                    <Grid item xs={6} sm={3}><TextField fullWidth size="small" type="number" label="Total price" value={p.package_price} onChange={e => updatePrice(idx, "package_price", Number(e.target.value))} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} /></Grid>
                    <Grid item xs={6} sm={3}><TextField fullWidth size="small" type="date" label="Effective from" InputLabelProps={{ shrink: true }} value={p.effective_from} onChange={e => updatePrice(idx, "effective_from", e.target.value)} /></Grid>
                    <Grid item xs={6} sm={3}><TextField fullWidth size="small" type="date" label="Effective to" InputLabelProps={{ shrink: true }} value={p.effective_to} onChange={e => updatePrice(idx, "effective_to", e.target.value)} /></Grid>
                    <Grid item xs={12} sm={1} sx={{ textAlign: "right" }}><IconButton onClick={() => removePrice(idx)} sx={{ color: COLORS.error }}><Delete /></IconButton></Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Stack>
          {startingPrice > 0 && <Alert severity="success" sx={{ mt: 2 }}>Starting price: <b>₹{startingPrice.toLocaleString("en-IN")}</b> per package</Alert>}
        </Box>
      )}

      {step === 4 && (
        <Box>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField fullWidth size="small" id="pe-m-url" placeholder="https://... (image URL)" />
            <TextField size="small" id="pe-m-cap" placeholder="Caption (optional)" sx={{ minWidth: 220 }} />
            <Button onClick={() => { addMedia((document.getElementById("pe-m-url") as HTMLInputElement).value, (document.getElementById("pe-m-cap") as HTMLInputElement).value); (document.getElementById("pe-m-url") as HTMLInputElement).value = ""; (document.getElementById("pe-m-cap") as HTMLInputElement).value = ""; }} variant="contained" startIcon={<Add />}>Add</Button>
          </Stack>
          {form.media.length === 0 && <Alert severity="info">No images yet.</Alert>}
          <Grid container spacing={2}>
            {form.media.map((m: any, idx: number) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <Card variant="outlined" sx={{ borderRadius: 2, borderColor: m.is_primary ? "primary.main" : "divider", borderWidth: m.is_primary ? 2 : 1 }}>
                  <Box sx={{ aspectRatio: "4/3", bgcolor: "grey.100" }}>
                    <img src={m.media_url} alt={m.caption || `img-${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  </Box>
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography variant="body2" noWrap>{m.caption || m.media_url.split("/").pop()}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      {!m.is_primary && <Button size="small" startIcon={<StarBorder />} onClick={() => setPrimary(idx)}>Set primary</Button>}
                      <IconButton size="small" onClick={() => removeMedia(idx)} sx={{ color: COLORS.error }}><Delete fontSize="small" /></IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {step === 5 && (
        <Box>
          <Card variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            {form.media.find((m: any) => m.is_primary) && (
              <Box sx={{ aspectRatio: "21/9", bgcolor: "grey.100" }}>
                <img src={form.media.find((m: any) => m.is_primary).media_url} alt="hero" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </Box>
            )}
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap">
                <Chip label={PACKAGE_TYPES.find(t => t.value === form.package_type)?.label} size="small" color="primary" />
                <Chip label={`${form.duration_days}D/${form.duration_nights}N`} size="small" icon={<AccessTime />} />
                <Chip label={`${form.minimum_persons}–${form.maximum_persons || "∞"} pax`} size="small" icon={<People />} />
              </Stack>
              <Typography variant="h5" fontWeight={900}>{form.package_name || "Untitled package"}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{cityName(form.city_id)} · {form.destination}</Typography>
              {form.short_description && <Typography sx={{ mb: 2 }}>{form.short_description}</Typography>}
              {startingPrice > 0 && (
                <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 2 }}>
                  <Typography variant="h4" fontWeight={900} color="primary.main">₹{startingPrice.toLocaleString("en-IN")}</Typography>
                  <Typography variant="body2" color="text.secondary">starting from per package</Typography>
                </Stack>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Itinerary — {form.itinerary.length} days</Typography>
              <Stack spacing={1} sx={{ mb: 2 }}>
                {form.itinerary.map((d: any, i: number) => (
                  <Stack key={i} direction="row" spacing={1.5}>
                    <Box sx={{ minWidth: 28, height: 28, borderRadius: 1.5, bgcolor: COLORS.navy, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12 }}>{d.day_number}</Box>
                    <Box><Typography variant="body2" fontWeight={700}>{d.title}</Typography>{d.description && <Typography variant="caption" color="text.secondary">{d.description}</Typography>}</Box>
                  </Stack>
                ))}
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" fontWeight={800} color="success.main">✓ Included ({form.inclusions.length})</Typography>
                  {form.inclusions.map((x: string, i: number) => <Typography key={i} variant="body2" sx={{ pl: 2 }}>• {x}</Typography>)}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" fontWeight={800} color="error.main">✗ Not included ({form.exclusions.length})</Typography>
                  {form.exclusions.map((x: string, i: number) => <Typography key={i} variant="body2" sx={{ pl: 2 }}>• {x}</Typography>)}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          <Alert severity="info" sx={{ mt: 2 }}>Click <b>Submit for review</b> to send the package to admin. You'll see updates here once they approve or request changes.</Alert>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Button startIcon={<ArrowBack />} onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0 || saving}>Back</Button>
        <Stack direction="row" spacing={1}>
          {step < STEPS.length - 1 ? (
            <Button endIcon={<ArrowForward />} variant="contained" onClick={() => { if (stepValid) { setError(stepValid); return; } setError(null); setStep(s => s + 1); }}>Continue</Button>
          ) : (
            <>
              <Button startIcon={<Save />} onClick={() => save(false)} disabled={saving || success || isLocked} variant="outlined">Save draft</Button>
              <Button startIcon={<Send />} onClick={() => save(true)} disabled={saving || success || isLocked} variant="contained">Submit for review</Button>
            </>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
