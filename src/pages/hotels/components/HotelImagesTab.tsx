// ============================================================
// HOTEL IMAGES TAB — gallery view of hotel photos
// ============================================================
import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Grid, Paper, Chip, Alert, CircularProgress,
  alpha, Stack, Dialog, IconButton,
} from "@mui/material";
import {
  Image, Star, Close, OpenInNew,
} from "@mui/icons-material";
import { COLORS } from "../../../theme";
import { hotelService, type HotelImage } from "../../../services/hotel.service";

const IMAGE_TYPE_COLORS: Record<string, string> = {
  EXTERIOR: COLORS.info,
  LOBBY: "#8B5CF6",
  ROOM: COLORS.navy,
  BATHROOM: "#06B6D4",
  RESTAURANT: "#F97316",
  AMENITY: COLORS.success,
  GALLERY: COLORS.textSecondary,
};

export default function HotelImagesTab({ hotelId }: { hotelId: number }) {
  const [images, setImages] = useState<HotelImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<HotelImage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setImages(await hotelService.getImages(hotelId));
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load images");
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

  if (images.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <Image sx={{ fontSize: 48, color: alpha(COLORS.textSecondary, 0.3), mb: 1.5 }} />
        <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary }}>No images uploaded yet</Typography>
        <Typography sx={{ fontSize: "0.82rem", color: COLORS.textSecondary, mt: 0.5 }}>
          Contact the WayTero admin team to upload hotel photos.
        </Typography>
      </Box>
    );
  }

  // Group by type
  const types = Array.from(new Set(images.map(i => i.image_type)));

  return (
    <Box>
      {/* Summary chips */}
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
        {types.map(t => (
          <Chip
            key={t}
            label={`${t.replace("_", " ")} (${images.filter(i => i.image_type === t).length})`}
            size="small"
            sx={{
              bgcolor: alpha(IMAGE_TYPE_COLORS[t] ?? COLORS.textSecondary, 0.1),
              color: IMAGE_TYPE_COLORS[t] ?? COLORS.textSecondary,
              fontWeight: 700, fontSize: 11, height: 24,
              border: `1px solid ${alpha(IMAGE_TYPE_COLORS[t] ?? COLORS.textSecondary, 0.25)}`,
            }}
          />
        ))}
      </Stack>

      <Grid container spacing={1.5}>
        {images
          .slice()
          .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.display_order - b.display_order)
          .map(img => (
            <Grid item key={img.id} xs={6} sm={4} md={3}>
              <Box
                onClick={() => setPreview(img)}
                sx={{
                  position: "relative", borderRadius: 2.5, overflow: "hidden",
                  paddingTop: "75%", cursor: "pointer",
                  border: `1.5px solid ${img.is_primary ? COLORS.gold : COLORS.border}`,
                  boxShadow: img.is_primary ? `0 0 0 2px ${alpha(COLORS.gold, 0.3)}` : "none",
                  transition: "all 0.15s",
                  "&:hover .img-overlay": { opacity: 1 },
                  "&:hover": { transform: "scale(1.02)", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" },
                }}
              >
                <Box
                  component="img"
                  src={img.thumbnail_url ?? img.image_url}
                  alt={img.caption ?? img.image_type}
                  sx={{
                    position: "absolute", inset: 0, width: "100%", height: "100%",
                    objectFit: "cover",
                  }}
                />
                {/* Overlay */}
                <Box className="img-overlay" sx={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)",
                  opacity: 0, transition: "opacity 0.15s",
                  display: "flex", alignItems: "flex-end", p: 1,
                }}>
                  <Typography sx={{ fontSize: "0.68rem", color: "#fff", fontWeight: 600 }}>
                    {img.caption ?? img.image_type.replace("_", " ")}
                  </Typography>
                </Box>
                {/* Type badge */}
                <Box sx={{
                  position: "absolute", top: 6, left: 6,
                  bgcolor: alpha(IMAGE_TYPE_COLORS[img.image_type] ?? COLORS.textSecondary, 0.85),
                  borderRadius: 1, px: 0.75, py: 0.25,
                }}>
                  <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: "#fff" }}>
                    {img.image_type.replace("_", " ")}
                  </Typography>
                </Box>
                {img.is_primary && (
                  <Box sx={{
                    position: "absolute", top: 6, right: 6,
                    bgcolor: alpha(COLORS.gold, 0.9), borderRadius: 1, px: 0.5, py: 0.25,
                    display: "flex", alignItems: "center", gap: 0.25,
                  }}>
                    <Star sx={{ fontSize: 10, color: "#000" }} />
                    <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: "#000" }}>Primary</Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          ))}
      </Grid>

      {/* Lightbox */}
      <Dialog open={preview !== null} onClose={() => setPreview(null)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: "#0A0A0A", borderRadius: 3, overflow: "hidden" } }}>
        <Box sx={{ position: "relative" }}>
          <IconButton
            onClick={() => setPreview(null)}
            sx={{ position: "absolute", top: 8, right: 8, color: "#fff", bgcolor: alpha("#fff", 0.15), zIndex: 1 }}
          >
            <Close />
          </IconButton>
          <IconButton
            component="a"
            href={preview?.image_url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ position: "absolute", top: 8, right: 52, color: "#fff", bgcolor: alpha("#fff", 0.15), zIndex: 1 }}
          >
            <OpenInNew sx={{ fontSize: 18 }} />
          </IconButton>
          {preview && (
            <Box
              component="img"
              src={preview.image_url}
              alt={preview.caption ?? ""}
              sx={{ width: "100%", maxHeight: "75vh", objectFit: "contain", display: "block" }}
            />
          )}
          {preview?.caption && (
            <Box sx={{ px: 3, py: 1.5 }}>
              <Typography sx={{ color: "#ccc", fontSize: "0.85rem" }}>{preview.caption}</Typography>
            </Box>
          )}
        </Box>
      </Dialog>
    </Box>
  );
}
