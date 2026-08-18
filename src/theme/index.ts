// ============================================================
// WAYTERO PARTNER PORTAL — PREMIUM MUI THEME
// Deep navy sidebar, gold accent, clean white content
// ============================================================
import { createTheme, alpha } from "@mui/material/styles";

export const COLORS = {
  navy: "#0A1628",
  navyLight: "#0F2040",
  navyMid: "#142952",
  gold: "#F59E0B",
  goldLight: "#FCD34D",
  goldDark: "#D97706",
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
  bgMain: "#F0F4F8",
  bgCard: "#FFFFFF",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  border: "#E2E8F0",
};

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: COLORS.gold, light: COLORS.goldLight, dark: COLORS.goldDark, contrastText: "#000" },
    secondary: { main: COLORS.navy, light: COLORS.navyLight, dark: "#060D1A", contrastText: "#fff" },
    success: { main: COLORS.success },
    error: { main: COLORS.error },
    background: { default: COLORS.bgMain, paper: COLORS.bgCard },
    text: { primary: COLORS.textPrimary, secondary: COLORS.textSecondary },
    divider: COLORS.border,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 800, letterSpacing: "-0.025em" },
    h2: { fontWeight: 700, letterSpacing: "-0.02em" },
    h3: { fontWeight: 700, letterSpacing: "-0.015em" },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: { fontWeight: 600, letterSpacing: "0.025em", textTransform: "none" },
  },
  shape: { borderRadius: 12 },
  shadows: [
    "none",
    "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    "0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04)",
    "0 10px 15px rgba(0,0,0,0.07), 0 4px 6px rgba(0,0,0,0.05)",
    "0 20px 25px rgba(0,0,0,0.08), 0 10px 10px rgba(0,0,0,0.04)",
    "0 25px 50px rgba(0,0,0,0.1)",
    ...Array(19).fill("none"),
  ] as any,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: "10px 24px",
          fontSize: "0.9375rem",
          boxShadow: "none",
          "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.12)" },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.goldDark} 100%)`,
          color: "#000",
          "&:hover": { background: `linear-gradient(135deg, ${COLORS.goldLight} 0%, ${COLORS.gold} 100%)` },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 10,
            backgroundColor: alpha("#F8FAFC", 0.8),
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: COLORS.gold },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: COLORS.gold },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
          border: `1px solid ${COLORS.border}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8, fontWeight: 600 } },
    },
  },
});

export default theme;
