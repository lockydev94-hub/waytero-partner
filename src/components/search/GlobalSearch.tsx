// ============================================================
// WAYTERO PARTNER PORTAL — GLOBAL PAGE SEARCH
// Doc: Admin Portal §5 Header — type-ahead over every page in the
// sidebar (NAV_SECTIONS + BOTTOM_NAV), service-aware + GST-aware,
// keyboard shortcut Ctrl+K. Selecting a result navigates straight
// to that page.
// ============================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Autocomplete,
  Box,
  Chip,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  Search,
  Dashboard, DirectionsCar, Hotel, TravelExplore, BookOnline,
  AccountBalanceWallet, Analytics, Settings, SwapHoriz, Payments,
  Receipt, MeetingRoom,
} from "@mui/icons-material";
import { NAV_SECTIONS, BOTTOM_NAV, NavItem } from "../../constants/nav";
import { useGstEnabled } from "../../hooks/useGstEnabled";
import { usePartnerServices } from "../../hooks/usePartnerServices";
import { COLORS } from "../../theme";

const ICON_MAP: Record<string, React.ReactNode> = {
  Dashboard: <Dashboard />,
  BookOnline: <BookOnline />,
  Payments: <Payments />,
  DirectionsCar: <DirectionsCar />,
  Hotel: <Hotel />,
  MeetingRoom: <MeetingRoom />,
  SwapHoriz: <SwapHoriz />,
  TravelExplore: <TravelExplore />,
  AccountBalanceWallet: <AccountBalanceWallet />,
  Analytics: <Analytics />,
  Receipt: <Receipt />,
  Settings: <Settings />,
};

interface SearchOption {
  key: string;
  label: string;
  section: string;
  path: string;
  icon: string;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const muiTheme = useTheme();
  const { isGstEnabled } = useGstEnabled();
  const { services: partnerServices } = usePartnerServices();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Pages visible to this partner (service-type + GST gates applied),
  // flattened with their section title for grouping in the dropdown.
  const options = useMemo<SearchOption[]>(() => {
    const visible = (item: NavItem) =>
      (!item.service || partnerServices.has(item.service)) &&
      (!item.anyOfServices || item.anyOfServices.some((s) => partnerServices.has(s))) &&
      (!item.requiresGst || isGstEnabled);

    const sections: SearchOption[] = NAV_SECTIONS.flatMap((section) =>
      section.items.filter(visible).map((n) => ({ key: n.key, label: n.label, section: section.title, path: n.path, icon: n.icon }))
    );
    const bottom: SearchOption[] = BOTTOM_NAV.filter(visible).map((n) => ({ key: n.key, label: n.label, section: "Settings", path: n.path, icon: n.icon }));
    return [...sections, ...bottom];
  }, [partnerServices, isGstEnabled]);

  // Ctrl+K / Cmd+K toggles the search.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus the input when the dropdown opens.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      o.label.toLowerCase().includes(q) ||
      o.section.toLowerCase().includes(q) ||
      ([...NAV_SECTIONS.flatMap((s) => s.items), ...BOTTOM_NAV]
        .find((n) => n.key === o.key)?.keywords ?? "").toLowerCase().includes(q)
    );
  }, [options, query]);

  const darkSearch = muiTheme.palette.mode === "dark";

  return (
    <Box sx={{ position: "relative", display: "flex", alignItems: "center", flex: 1, maxWidth: 440, minWidth: { xs: 140, md: 300 } }}>
      <Autocomplete
        size="small"
        freeSolo
        options={filtered}
        groupBy={(o) => o.section}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        inputValue={query}
        onInputChange={(_, v) => setQuery(v)}
        onChange={(_, value) => {
          const opt = typeof value === "string" ? null : value;
          if (opt?.path) {
            navigate(opt.path);
            setOpen(false);
            setQuery("");
          }
        }}
        getOptionLabel={(o) => (typeof o === "string" ? o : o.label)}
        isOptionEqualToValue={(a, b) => a.key === b.key}
        renderOption={(props, option) => (
          <li {...props} key={option.key}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, width: "100%" }}>
              <Box sx={{ color: COLORS.textSecondary, display: "flex", fontSize: 20 }}>{ICON_MAP[option.icon]}</Box>
              <Typography variant="body2" sx={{ flex: 1 }}>{option.label}</Typography>
              <Chip label={option.section} size="small" sx={{ height: 20, fontSize: 11 }} />
            </Box>
          </li>
        )}
        noOptionsText="No matching pages"
        sx={{
          flex: 1,
          "& .MuiAutocomplete-inputRoot": { borderRadius: 3, pr: 7, bgcolor: darkSearch ? "rgba(255,255,255,0.08)" : COLORS.bgMain },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            inputRef={inputRef}
            placeholder="Search pages…  (Ctrl+K)"
            variant="outlined"
            fullWidth
            InputProps={{
              ...params.InputProps,
              startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: COLORS.textSecondary }} />,
              endAdornment: null,
            }}
          />
        )}
      />
      <Tooltip title="Search (Ctrl+K)" placement="bottom">
        <IconButton
          size="small"
          sx={{
            position: "absolute",
            right: 4,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 1,
            px: 0.75,
            py: 0.25,
            fontSize: 11,
            color: COLORS.textSecondary,
            "&:hover": { bgcolor: COLORS.bgMain },
          }}
          onClick={() => { setOpen(true); setQuery(""); }}
        >
          Ctrl K
        </IconButton>
      </Tooltip>
    </Box>
  );
}
