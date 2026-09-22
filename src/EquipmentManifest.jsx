import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./lib/supabaseClient.js";

// The embedded PDF font (~300KB as base64) is loaded on demand by
// loadJbmFont() below rather than imported here — most visits never
// generate a PDF, so there's no reason to ship it in the main bundle.
// buildPdfBlob() and buildShareSnapshotHtml() both read it off window
// afterwards (the latter because the standalone HTML it generates reads
// window.__JBM_*_B64 from its own copy of window at that file's open
// time). On claude.ai these used to be injected by the host platform;
// here we supply them ourselves from the bundled font.
async function loadJbmFont() {
  if (typeof window === "undefined") return;
  if (window.__JBM_REGULAR_B64) return; // already loaded
  const { JBM_REGULAR_B64, JBM_BOLD_B64 } = await import("./assets/fonts/jetbrainsMonoBase64.js");
  window.__JBM_REGULAR_B64 = JBM_REGULAR_B64;
  window.__JBM_BOLD_B64 = JBM_BOLD_B64;
}

// Hand-built icon set matching lucide-react's designs, since published
// pages can't resolve npm-style imports. Usage throughout the app
// (<Plus size={14}/>, etc.) is unchanged.
function Icon({ children, size = 24, ...props }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}
const Plus = (p) => <Icon {...p}><path d="M5 12h14"/><path d="M12 5v14"/></Icon>;
const Trash2 = (p) => <Icon {...p}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></Icon>;
const Pencil = (p) => <Icon {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></Icon>;
const Search = (p) => <Icon {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></Icon>;
const Printer = (p) => <Icon {...p}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></Icon>;
const FileSpreadsheet = (p) => <Icon {...p}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/></Icon>;
const X = (p) => <Icon {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></Icon>;
const Copy = (p) => <Icon {...p}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></Icon>;
const Package = (p) => <Icon {...p}><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73Z"/><path d="M12 22V12"/><path d="M3.29 7 12 12l8.71-5"/><path d="m7.5 4.27 9 5.15"/></Icon>;
const ChevronDown = (p) => <Icon {...p}><path d="m6 9 6 6 6-6"/></Icon>;
const ChevronUp = (p) => <Icon {...p}><path d="m18 15-6-6-6 6"/></Icon>;
const ChevronRight = (p) => <Icon {...p}><path d="m9 18 6-6-6-6"/></Icon>;
const CalendarDays = (p) => <Icon {...p}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></Icon>;
const ListFilter = (p) => <Icon {...p}><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></Icon>;
const Loader2 = (p) => <Icon {...p}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></Icon>;
const Check = (p) => <Icon {...p}><path d="M20 6 9 17l-5-5"/></Icon>;
const ClipboardPaste = (p) => <Icon {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><path d="M16 4h2a2 2 0 0 1 2 2v1"/><path d="M20.4 14.5 16 10 11.6 14.5"/><path d="M16 10v10"/></Icon>;
const GripVertical = (p) => <Icon {...p}><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></Icon>;
const StickyNote = (p) => <Icon {...p}><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/></Icon>;
const Download = (p) => <Icon {...p}><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></Icon>;
const Share2 = (p) => <Icon {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></Icon>;
const BookmarkPlus = (p) => <Icon {...p}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/><line x1="12" x2="12" y1="7" y2="13"/><line x1="9" x2="15" y1="10" y2="10"/></Icon>;
const Sun = (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></Icon>;
const Moon = (p) => <Icon {...p}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></Icon>;
const Settings = (p) => <Icon {...p}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></Icon>;

const DEPT_COLORS = {
  Camera: "#333333",
  Grip: "#555555",
  Lighting: "#000000",
  Others: "#888888",
};

const DEFAULT_DEPARTMENTS = {
  Grip: ["Dolly/Track", "Crane/Jib", "Rigging"],
  Camera: ["Cinema Bodies", "Mirrorless", "Special", "Filters", "Wireless Video", "Monitors"],
  Lenses: ["Spericals", "Zoom", "Anamorphics", "Probe & Macro", "Sony GM"],
  Lighting: ["HMI", "Tungsten", "LED", "Modifiers", "Special"],
  Others: ["Cinema Bodies"],
  Subrent: [],
};

const DEFAULT_BRANDS = ["ARRI", "RED", "SONY", "FUJIFILM", "BLACKMAGIC", "GOPRO", "DJI", "VAXIS", "ACCSOON", "ARRI/ZEISS", "COOKE", "ZEISS", "DZOFILMS", "THYPOCH", "LAOWA", "BLAZAR", "DEDOLIGHT", "SKYPANEL", "APUTURE", "AMARAN", "PDL", "NISI", "ATOMOS", "HOLLYLAND"];

const DEFAULT_CATALOG = [
  { id: "b3b87k1n", name: "PANTHER", brand: "", model: "PANTHER", department: "Grip", subcategory: "Dolly/Track", note: "" },
  { id: "qk76t2uc", name: "DOORWAY DOLLY", brand: "", model: "DOORWAY DOLLY", department: "Grip", subcategory: "Dolly/Track", note: "" },
  { id: "sv7o1xma", name: "DANA DOLLY/SLIDER", brand: "", model: "DANA DOLLY/SLIDER", department: "Grip", subcategory: "Dolly/Track", note: "" },
  { id: "ijh6a6c7", name: "UBANGI", brand: "", model: "UBANGI", department: "Grip", subcategory: "Dolly/Track", note: "" },
  { id: "qs8zhcpc", name: "CRANE", brand: "", model: "CRANE", department: "Grip", subcategory: "Crane/Jib", note: "" },
  { id: "607jw2l2", name: "JIB ARM", brand: "", model: "JIB ARM", department: "Grip", subcategory: "Crane/Jib", note: "" },
  { id: "couao6fh", name: "HELMET CAM", brand: "", model: "HELMET CAM", department: "Grip", subcategory: "Rigging", note: "" },
  { id: "g5n4u0v2", name: "SNORRI CAM", brand: "", model: "SNORRI CAM", department: "Grip", subcategory: "Rigging", note: "" },
  { id: "cjomf5uu", name: "ARRI 35", brand: "ARRI", model: "35", department: "Camera", subcategory: "Cinema Bodies", note: "S35" },
  { id: "tdlqo6sw", name: "ARRI MINI", brand: "ARRI", model: "MINI", department: "Camera", subcategory: "Cinema Bodies", note: "S35" },
  { id: "lyewyvtg", name: "ARRI MINI LF", brand: "ARRI", model: "MINI LF", department: "Camera", subcategory: "Cinema Bodies", note: "FF" },
  { id: "cun5eck4", name: "RED RAPTOR-VV", brand: "RED", model: "RAPTOR-VV", department: "Camera", subcategory: "Cinema Bodies", note: "VV" },
  { id: "vyid9aj1", name: "RED KOMODO", brand: "RED", model: "KOMODO", department: "Camera", subcategory: "Cinema Bodies", note: "S35" },
  { id: "qzyoefe8", name: "RED KOMODO-X", brand: "RED", model: "KOMODO-X", department: "Camera", subcategory: "Cinema Bodies", note: "S35" },
  { id: "98gi9zdp", name: "SONY VENICE 2", brand: "SONY", model: "VENICE 2", department: "Camera", subcategory: "Cinema Bodies", note: "FF" },
  { id: "k9n8t01v", name: "SONY VENICE", brand: "SONY", model: "VENICE", department: "Camera", subcategory: "Cinema Bodies", note: "FF" },
  { id: "70vionyf", name: "SONY BURANO", brand: "SONY", model: "BURANO", department: "Camera", subcategory: "Cinema Bodies", note: "FF" },
  { id: "4cphsyel", name: "FUJIFILM ETERNA", brand: "FUJIFILM", model: "ETERNA", department: "Camera", subcategory: "Cinema Bodies", note: "65" },
  { id: "1rlxakt6", name: "BLACKMAGIC URSA CINE 12K", brand: "BLACKMAGIC", model: "URSA CINE 12K", department: "Camera", subcategory: "Cinema Bodies", note: "FF" },
  { id: "6ytcxem2", name: "BLACKMAGIC URSA CINE 17K", brand: "BLACKMAGIC", model: "URSA CINE 17K", department: "Camera", subcategory: "Cinema Bodies", note: "65" },
  { id: "0vn9qqlt", name: "BLACKMAGIC PYXIS 6K", brand: "BLACKMAGIC", model: "PYXIS 6K", department: "Camera", subcategory: "Cinema Bodies", note: "FF" },
  { id: "ravm4oba", name: "BLACKMAGIC PYXIS 12K", brand: "BLACKMAGIC", model: "PYXIS 12K", department: "Camera", subcategory: "Cinema Bodies", note: "FF" },
  { id: "kxa62vdd", name: "SONY FX3", brand: "SONY", model: "FX3", department: "Camera", subcategory: "Mirrorless", note: "FF" },
  { id: "rbv435kl", name: "SONY FX5", brand: "SONY", model: "FX5", department: "Camera", subcategory: "Mirrorless", note: "FF" },
  { id: "muh4f14q", name: "SONY FX6", brand: "SONY", model: "FX6", department: "Camera", subcategory: "Mirrorless", note: "FF" },
  { id: "2pu5zvl6", name: "SONY FX9", brand: "SONY", model: "FX9", department: "Camera", subcategory: "Mirrorless", note: "FF" },
  { id: "nyp9jbqe", name: "GOPRO HERO 11", brand: "GOPRO", model: "HERO 11", department: "Camera", subcategory: "Special", note: "" },
  { id: "krivwz0j", name: "DJI ACTION CAM 4", brand: "DJI", model: "ACTION CAM 4", department: "Camera", subcategory: "Special", note: "" },
  { id: "1rtc3gij", name: "FSND 4×5.65″", brand: "", model: "FSND 4×5.65″", department: "Camera", subcategory: "Filters", note: "" },
  { id: "874q507j", name: "BLACK PROMIST 4×5.65″", brand: "", model: "BLACK PROMIST 4×5.65″", department: "Camera", subcategory: "Filters", note: "" },
  { id: "4gwv1rhz", name: "BLACKMAGIC 4×5.65″", brand: "", model: "BLACKMAGIC 4×5.65″", department: "Camera", subcategory: "Filters", note: "" },
  { id: "gk6vinb5", name: "BLUE STREAK 4×5.65″", brand: "", model: "BLUE STREAK 4×5.65″", department: "Camera", subcategory: "Filters", note: "" },
  { id: "3lqdcpa2", name: "STAR BURST 4×5.65″", brand: "", model: "STAR BURST 4×5.65″", department: "Camera", subcategory: "Filters", note: "" },
  { id: "ea0he9px", name: "RAINBOW 4×5.65″", brand: "", model: "RAINBOW 4×5.65″", department: "Camera", subcategory: "Filters", note: "" },
  { id: "1wmg5cyc", name: "NISI VND", brand: "NISI", model: "VND", department: "Camera", subcategory: "Filters", note: "" },
  { id: "h6z7gjs5", name: "NISI MIST FILTER", brand: "NISI", model: "MIST FILTER", department: "Camera", subcategory: "Filters", note: "" },
  { id: "yjl3yf1h", name: "VAXIS STORM", brand: "VAXIS", model: "STORM", department: "Camera", subcategory: "Wireless Video", note: "" },
  { id: "spzngley", name: "ACCSOON CINEVIEW SE", brand: "ACCSOON", model: "CINEVIEW SE", department: "Camera", subcategory: "Wireless Video", note: "" },
  { id: "rewy51o6", name: "ACCSOON CINEVIEW MASTER", brand: "ACCSOON", model: "CINEVIEW MASTER", department: "Camera", subcategory: "Wireless Video", note: "" },
  { id: "rjjyj5ys", name: "15\"-18\" MONITORS", brand: "", model: "15\"-18\" MONITORS", department: "Camera", subcategory: "Monitors", note: "" },
  { id: "lji1lhe8", name: "ATOMOS SHOGUN", brand: "ATOMOS", model: "SHOGUN", department: "Camera", subcategory: "Monitors", note: "Record/Playback" },
  { id: "79o5qar3", name: "ARRI SIGNATURE PRIMES", brand: "ARRI", model: "SIGNATURE PRIMES", department: "Lenses", subcategory: "Spericals", note: "LPL T1.8 FF OD 114mm" },
  { id: "iy26twto", name: "ARRI/ZEISS MASTER PRIMES", brand: "ARRI/ZEISS", model: "MASTER PRIMES", department: "Lenses", subcategory: "Spericals", note: "PL T1.3 S35 OD 114mm" },
  { id: "ln5zfpzh", name: "ARRI/ZEISS ULTRA PRIMES", brand: "ARRI/ZEISS", model: "ULTRA PRIMES", department: "Lenses", subcategory: "Spericals", note: "PL T1.9 S35 OD 95mm" },
  { id: "a7h8z3kg", name: "ARRI/ZEISS SUPER SPEED MK III", brand: "ARRI/ZEISS", model: "SUPER SPEED MK III", department: "Lenses", subcategory: "Spericals", note: "PL T1.3 S35 OD 80mm" },
  { id: "ot6kitzi", name: "ARRI/ZEISS SUPER SPEED MK II", brand: "ARRI/ZEISS", model: "SUPER SPEED MK II", department: "Lenses", subcategory: "Spericals", note: "PL T1.3 S35" },
  { id: "xe8x5wny", name: "COOKE S8/I FF PRIMES", brand: "COOKE", model: "S8/I FF PRIMES", department: "Lenses", subcategory: "Spericals", note: "PL T1.4 FF OD 104mm" },
  { id: "9vgjkf37", name: "COOKE S7/I FF", brand: "COOKE", model: "S7/I FF", department: "Lenses", subcategory: "Spericals", note: "PL T2 FF OD 110mm" },
  { id: "1kajx7y7", name: "COOKE 5/I", brand: "COOKE", model: "5/I", department: "Lenses", subcategory: "Spericals", note: "PL T1.4 S35 OD 110mm" },
  { id: "90vkp6tr", name: "COOKE S4/I PRIMES", brand: "COOKE", model: "S4/I PRIMES", department: "Lenses", subcategory: "Spericals", note: "PL T2 S35" },
  { id: "c39swfl6", name: "COOKE SP3", brand: "COOKE", model: "SP3", department: "Lenses", subcategory: "Spericals", note: "E/RF/M/Z/L T2.4 FF OD 64mm" },
  { id: "87c2n9s1", name: "ZEISS SUPREME PRIMES", brand: "ZEISS", model: "SUPREME PRIMES", department: "Lenses", subcategory: "Spericals", note: "PL T1.5 FF OD 95mm" },
  { id: "rczvwu64", name: "DZOFILMS VESPID PRIME 2", brand: "DZOFILMS", model: "VESPID PRIME 2", department: "Lenses", subcategory: "Spericals", note: "PL T1.9 VV/FF OD 80mm" },
  { id: "lcdoiieh", name: "DZOFILMS VESPID PRIME OG", brand: "DZOFILMS", model: "VESPID PRIME OG", department: "Lenses", subcategory: "Spericals", note: "PL T2.1 VV/FF OD 80mm" },
  { id: "7bk11mtt", name: "DZOFILMS ARLES PRIMES", brand: "DZOFILMS", model: "ARLES PRIMES", department: "Lenses", subcategory: "Spericals", note: "PL T1.4 VV/FF OD 95mm" },
  { id: "dwlr1hr6", name: "THYPOCH SIMERA-C", brand: "THYPOCH", model: "SIMERA-C", department: "Lenses", subcategory: "Spericals", note: "R/M T1.5 FF OD 67mm" },
  { id: "3weqr5tz", name: "LAOWA 9MM", brand: "LAOWA", model: "9MM", department: "Lenses", subcategory: "Spericals", note: "PL/E/Z/RF/L T5.8 VV OD 80mm" },
  { id: "czaddkcq", name: "LAOWA 10MM ZERO-D CINE", brand: "LAOWA", model: "10MM ZERO-D CINE", department: "Lenses", subcategory: "Spericals", note: "PL/LPL/E/Z/RF/L T2.9 FF/VV OD 80mm" },
  { id: "cb2yzx0o", name: "LAOWA 12MM ZERO-D CINE", brand: "LAOWA", model: "12MM ZERO-D CINE", department: "Lenses", subcategory: "Spericals", note: "PL/E/Z/RF/L T2.9 FF/VV OD 80mm" },
  { id: "r6fo0wvf", name: "LAOWA 8-15MM", brand: "LAOWA", model: "8-15MM", department: "Lenses", subcategory: "Zoom", note: "PL T2.9  FF" },
  { id: "t37ulmjv", name: "DZOFILMS CATTA ACE", brand: "DZOFILMS", model: "CATTA ACE", department: "Lenses", subcategory: "Zoom", note: "PL 18-35/35-80/70-135 T2.9 VV/FF OD 80m" },
  { id: "j4uzssgo", name: "DZOFILMS ARLES ZOOM", brand: "DZOFILMS", model: "ARLES ZOOM", department: "Lenses", subcategory: "Zoom", note: "PL 25-75/65-180 T2.6 VV/FF OD 80m" },
  { id: "a38s3ejr", name: "COOKE ANAMORPHIC/I S35", brand: "COOKE", model: "ANAMORPHIC/I S35", department: "Lenses", subcategory: "Anamorphics", note: "PL T2.3 S35" },
  { id: "40g9k4y1", name: "COOKE ANAMORPHIC/I FF", brand: "COOKE", model: "ANAMORPHIC/I FF", department: "Lenses", subcategory: "Anamorphics", note: "PL T2.3 FF OD 110mm" },
  { id: "690v48k7", name: "LAOWA PROTEUS 2X", brand: "LAOWA", model: "PROTEUS 2X", department: "Lenses", subcategory: "Anamorphics", note: "PL T2 FF OD 114mm" },
  { id: "neojud4n", name: "DZOFILMS PAVO 2X", brand: "DZOFILMS", model: "PAVO 2X", department: "Lenses", subcategory: "Anamorphics", note: "PL T2.1 S35 OD 95m" },
  { id: "2axm7rdk", name: "DZOFILMS ARCANA 2X", brand: "DZOFILMS", model: "ARCANA 2X", department: "Lenses", subcategory: "Anamorphics", note: "PL T2.1 VV/FF OD 80m" },
  { id: "8bthy91b", name: "BLAZAR VIPER 1.5X", brand: "BLAZAR", model: "VIPER 1.5X", department: "Lenses", subcategory: "Anamorphics", note: "PL T2.1 FF OD 80mm" },
  { id: "cdwjhrof", name: "BLAZAR REMUS 1.5X", brand: "BLAZAR", model: "REMUS 1.5X", department: "Lenses", subcategory: "Anamorphics", note: "PL T1.8 FF OD 80mm" },
  { id: "meue8zbg", name: "DZOFILMS X-TRACT 18-28 SET", brand: "DZOFILMS", model: "X-TRACT 18-28 SET", department: "Lenses", subcategory: "Probe & Macro", note: "PL T8 FF" },
  { id: "ejbplwiq", name: "LAOWA PROBE ZOOM SET", brand: "LAOWA", model: "PROBE ZOOM SET", department: "Lenses", subcategory: "Probe & Macro", note: "PL 15-35mm T12 15-24mm T8 FF" },
  { id: "0iiamqib", name: "LAOWA PRO2BE 24MM 2X MARO", brand: "LAOWA", model: "PRO2BE 24MM 2X MARO", department: "Lenses", subcategory: "Probe & Macro", note: "PL T8 FF" },
  { id: "vqt7b3m5", name: "SONY 12-24MM F2.8", brand: "SONY", model: "12-24MM F2.8", department: "Lenses", subcategory: "Sony GM", note: "" },
  { id: "vwofhqzg", name: "SONY 16-35MM F2.8 II", brand: "SONY", model: "16-35MM F2.8 II", department: "Lenses", subcategory: "Sony GM", note: "T82" },
  { id: "8v18txdc", name: "SONY 24-70MM F2.8 II", brand: "SONY", model: "24-70MM F2.8 II", department: "Lenses", subcategory: "Sony GM", note: "T82" },
  { id: "kelvvicl", name: "SONY 70-200MM F2.8 II", brand: "SONY", model: "70-200MM F2.8 II", department: "Lenses", subcategory: "Sony GM", note: "T77" },
  { id: "y30971vk", name: "SONY 14 MM F1.8", brand: "SONY", model: "14 MM F1.8", department: "Lenses", subcategory: "Sony GM", note: "" },
  { id: "on85vq8j", name: "SONY 24MM F1.4", brand: "SONY", model: "24MM F1.4", department: "Lenses", subcategory: "Sony GM", note: "T67" },
  { id: "74q2zfiy", name: "SONY 35MM F1.4", brand: "SONY", model: "35MM F1.4", department: "Lenses", subcategory: "Sony GM", note: "T67" },
  { id: "mz7gfqn1", name: "SONY 50MM F1.4", brand: "SONY", model: "50MM F1.4", department: "Lenses", subcategory: "Sony GM", note: "T67" },
  { id: "1s7hp9il", name: "SONY 50MM F1.2", brand: "SONY", model: "50MM F1.2", department: "Lenses", subcategory: "Sony GM", note: "T72" },
  { id: "2skjop1q", name: "SONY 85MM F1.4 II", brand: "SONY", model: "85MM F1.4 II", department: "Lenses", subcategory: "Sony GM", note: "T77" },
  { id: "f100pqpg", name: "SONY 90MM F2.8 MACRO OSS", brand: "SONY", model: "90MM F2.8 MACRO OSS", department: "Lenses", subcategory: "Sony GM", note: "T62" },
  { id: "uwub8sv5", name: "SONY 100MM F2.8 STF OSS", brand: "SONY", model: "100MM F2.8 STF OSS", department: "Lenses", subcategory: "Sony GM", note: "T72" },
  { id: "t3mp65cf", name: "ARRI 18K ARRIMAX", brand: "ARRI", model: "18K ARRIMAX", department: "Lighting", subcategory: "HMI", note: "" },
  { id: "rleprcjq", name: "ARRI M90", brand: "ARRI", model: "M90", department: "Lighting", subcategory: "HMI", note: "" },
  { id: "iboo6kmq", name: "ARRI M40", brand: "ARRI", model: "M40", department: "Lighting", subcategory: "HMI", note: "" },
  { id: "7gm4o7x0", name: "ARRI M18", brand: "ARRI", model: "M18", department: "Lighting", subcategory: "HMI", note: "" },
  { id: "ztc27am5", name: "12K", brand: "", model: "12K", department: "Lighting", subcategory: "HMI", note: "" },
  { id: "m4v7vzts", name: "6K", brand: "", model: "6K", department: "Lighting", subcategory: "HMI", note: "" },
  { id: "03cme6gd", name: "6KW FRESNEL", brand: "", model: "6KW FRESNEL", department: "Lighting", subcategory: "HMI", note: "" },
  { id: "hvo1mz4h", name: "4KW FRESNEL", brand: "", model: "4KW FRESNEL", department: "Lighting", subcategory: "HMI", note: "" },
  { id: "ty8d821z", name: "2.5KW FRESNEL", brand: "", model: "2.5KW FRESNEL", department: "Lighting", subcategory: "HMI", note: "" },
  { id: "oajczzco", name: "1.2KW FRESNEL", brand: "", model: "1.2KW FRESNEL", department: "Lighting", subcategory: "HMI", note: "" },
  { id: "2szyh7iv", name: "10K FRESNEL", brand: "", model: "10K FRESNEL", department: "Lighting", subcategory: "Tungsten", note: "" },
  { id: "ewm4f6dy", name: "5K FRESNEL", brand: "", model: "5K FRESNEL", department: "Lighting", subcategory: "Tungsten", note: "" },
  { id: "9o5utxfs", name: "2K FRESNEL", brand: "", model: "2K FRESNEL", department: "Lighting", subcategory: "Tungsten", note: "" },
  { id: "d3h4oof4", name: "2K BLONDIE", brand: "", model: "2K BLONDIE", department: "Lighting", subcategory: "Tungsten", note: "" },
  { id: "b3jxh26r", name: "1K FRESNEL", brand: "", model: "1K FRESNEL", department: "Lighting", subcategory: "Tungsten", note: "" },
  { id: "8c73lai0", name: "1KW PARCAN", brand: "", model: "1KW PARCAN", department: "Lighting", subcategory: "Tungsten", note: "" },
  { id: "rzrv93ty", name: "800W REDHEAD", brand: "", model: "800W REDHEAD", department: "Lighting", subcategory: "Tungsten", note: "" },
  { id: "wlo0icy5", name: "650W", brand: "", model: "650W", department: "Lighting", subcategory: "Tungsten", note: "" },
  { id: "oaggrnrb", name: "DEDOLIGHT 150", brand: "DEDOLIGHT", model: "150", department: "Lighting", subcategory: "Tungsten", note: "Set" },
  { id: "px4nsrx8", name: "MAXIBRUTE", brand: "", model: "MAXIBRUTE", department: "Lighting", subcategory: "Tungsten", note: "" },
  { id: "rrqu57tf", name: "SPACELIGHT", brand: "", model: "SPACELIGHT", department: "Lighting", subcategory: "Tungsten", note: "" },
  { id: "jftxiupc", name: "SKYPANEL S30", brand: "SKYPANEL", model: "S30", department: "Lighting", subcategory: "LED", note: "" },
  { id: "gklsacfr", name: "SKYPANEL S60", brand: "SKYPANEL", model: "S60", department: "Lighting", subcategory: "LED", note: "" },
  { id: "3k2o922r", name: "SKYPANEL S120", brand: "SKYPANEL", model: "S120", department: "Lighting", subcategory: "LED", note: "" },
  { id: "jiu9e1sr", name: "SKYPANEL S360", brand: "SKYPANEL", model: "S360", department: "Lighting", subcategory: "LED", note: "" },
  { id: "dkjn9fn5", name: "APUTURE STORM XT52", brand: "APUTURE", model: "STORM XT52", department: "Lighting", subcategory: "LED", note: "" },
  { id: "vt5lu359", name: "APUTURE STORM XT26", brand: "APUTURE", model: "STORM XT26", department: "Lighting", subcategory: "LED", note: "" },
  { id: "u7sn6alk", name: "APUTURE STORM CS32", brand: "APUTURE", model: "STORM CS32", department: "Lighting", subcategory: "LED", note: "" },
  { id: "nnkwiaj7", name: "APUTURE STORM CS15", brand: "APUTURE", model: "STORM CS15", department: "Lighting", subcategory: "LED", note: "" },
  { id: "13rcup0t", name: "APUTURE STORM 1200X", brand: "APUTURE", model: "STORM 1200X", department: "Lighting", subcategory: "LED", note: "" },
  { id: "167kce4g", name: "APUTURE STORM 1000C", brand: "APUTURE", model: "STORM 1000C", department: "Lighting", subcategory: "LED", note: "" },
  { id: "9kyf8w4r", name: "APUTURE LS 600C PRO II", brand: "APUTURE", model: "LS 600C PRO II", department: "Lighting", subcategory: "LED", note: "" },
  { id: "0bxsknq4", name: "APUTURE LS 300D II", brand: "", model: "APUTURE LS 300D II", department: "Lighting", subcategory: "LED", note: "" },
  { id: "2hgfxwlu", name: "APUTURE STORM 80C", brand: "APUTURE", model: "STORM 80C", department: "Lighting", subcategory: "LED", note: "" },
  { id: "nqowu7hm", name: "APUTURE NOVA P600C", brand: "APUTURE", model: "NOVA P600C", department: "Lighting", subcategory: "LED", note: "" },
  { id: "4cipcela", name: "APUTURE NOVA P300C", brand: "APUTURE", model: "NOVA P300C", department: "Lighting", subcategory: "LED", note: "" },
  { id: "y33rohqa", name: "APUTURE NOVA 9°", brand: "APUTURE", model: "NOVA 9°", department: "Lighting", subcategory: "LED", note: "" },
  { id: "7lr7xjhv", name: "APUTURE NOVA II", brand: "APUTURE", model: "NOVA II", department: "Lighting", subcategory: "LED", note: "" },
  { id: "19kgbp1y", name: "APUTURE MC PRO", brand: "APUTURE", model: "MC PRO", department: "Lighting", subcategory: "LED", note: "Kit 8" },
  { id: "lwyu6ath", name: "APUTURE ACCENT B7C", brand: "APUTURE", model: "ACCENT B7C", department: "Lighting", subcategory: "LED", note: "Kit 8" },
  { id: "lrs3v5yg", name: "APUTURE INFINIMAT 4X4", brand: "APUTURE", model: "INFINIMAT 4X4", department: "Lighting", subcategory: "LED", note: "" },
  { id: "4o5kju18", name: "APUTURE INFINIMAT 8X8", brand: "APUTURE", model: "INFINIMAT 8X8", department: "Lighting", subcategory: "LED", note: "" },
  { id: "bnt9cokj", name: "AMARAN F22", brand: "AMARAN", model: "F22", department: "Lighting", subcategory: "LED", note: "" },
  { id: "2ay0zzi3", name: "AMARAN F21", brand: "AMARAN", model: "F21", department: "Lighting", subcategory: "LED", note: "" },
  { id: "50w5eqst", name: "APUTURE PB3", brand: "APUTURE", model: "PB3", department: "Lighting", subcategory: "LED", note: "" },
  { id: "2fw7t57o", name: "APUTURE PB6", brand: "APUTURE", model: "PB6", department: "Lighting", subcategory: "LED", note: "" },
  { id: "v2v83m3x", name: "APUTURE PB12", brand: "APUTURE", model: "PB12", department: "Lighting", subcategory: "LED", note: "" },
  { id: "hk0z6sbw", name: "AMARAN PT2C", brand: "AMARAN", model: "PT2C", department: "Lighting", subcategory: "LED", note: "" },
  { id: "soi8ir5r", name: "AMARAN PT4C", brand: "AMARAN", model: "PT4C", department: "Lighting", subcategory: "LED", note: "" },
  { id: "zsxwgcj1", name: "PDL MAXI 6 BÓNG", brand: "PDL", model: "MAXI 6 BÓNG", department: "Lighting", subcategory: "LED", note: "" },
  { id: "fm5wyso1", name: "PDL MAXI 6 BÓNG RGB", brand: "PDL", model: "MAXI 6 BÓNG RGB", department: "Lighting", subcategory: "LED", note: "" },
  { id: "yl0svu5l", name: "PDL MAXI 9 BÓNG", brand: "PDL", model: "MAXI 9 BÓNG", department: "Lighting", subcategory: "LED", note: "" },
  { id: "cv8s48h5", name: "PDL MAXI 12 BÓNG", brand: "PDL", model: "MAXI 12 BÓNG", department: "Lighting", subcategory: "LED", note: "" },
  { id: "2mqkltuu", name: "LIGHT DOME 40", brand: "", model: "LIGHT DOME 40", department: "Lighting", subcategory: "Modifiers", note: "" },
  { id: "2sz8vguv", name: "LIGHT DOME 60", brand: "", model: "LIGHT DOME 60", department: "Lighting", subcategory: "Modifiers", note: "" },
  { id: "5rpzizjh", name: "LIGHT DOME 90", brand: "", model: "LIGHT DOME 90", department: "Lighting", subcategory: "Modifiers", note: "" },
  { id: "nxran5i4", name: "LIGHT DOME 120", brand: "", model: "LIGHT DOME 120", department: "Lighting", subcategory: "Modifiers", note: "" },
  { id: "ig628mqb", name: "LIGHT DOME 150", brand: "", model: "LIGHT DOME 150", department: "Lighting", subcategory: "Modifiers", note: "" },
  { id: "33a2x7v1", name: "APUTURE CF16 FRESNEL", brand: "APUTURE", model: "CF16 FRESNEL", department: "Lighting", subcategory: "Modifiers", note: "" },
  { id: "06oa5unh", name: "APUTURE F14 FRESNEL", brand: "APUTURE", model: "F14 FRESNEL", department: "Lighting", subcategory: "Modifiers", note: "" },
  { id: "agi4s07s", name: "APUTURE F10 FRESNEL", brand: "APUTURE", model: "F10 FRESNEL", department: "Lighting", subcategory: "Modifiers", note: "" },
  { id: "pnvts5p3", name: "APUTURE LANTERN", brand: "APUTURE", model: "LANTERN", department: "Lighting", subcategory: "Modifiers", note: "60cm 90cm 120cm 180cm" },
  { id: "xzxzide1", name: "APUTURE SPOTLIGHT MAX", brand: "APUTURE", model: "SPOTLIGHT MAX", department: "Lighting", subcategory: "Modifiers", note: "19° 36° 50°" },
  { id: "ewa0t1yd", name: "APUTURE SPOTLIGHT MOUNT", brand: "APUTURE", model: "SPOTLIGHT MOUNT", department: "Lighting", subcategory: "Modifiers", note: "19° 26° 36°" },
  { id: "g9nygxpi", name: "SET FRAME 8X8", brand: "", model: "SET FRAME 8X8", department: "Lighting", subcategory: "Modifiers", note: "Silk/Ultrabounce/Black" },
  { id: "1nimzhsf", name: "SET FRAME 12X12", brand: "", model: "SET FRAME 12X12", department: "Lighting", subcategory: "Modifiers", note: "Silk/Ultrabounce/Black" },
  { id: "j8bqd719", name: "SET FRAME 20X20", brand: "", model: "SET FRAME 20X20", department: "Lighting", subcategory: "Modifiers", note: "Silk/Ultrabounce/Black" },
  { id: "zpgsx4ri", name: "SILK", brand: "", model: "SILK", department: "Lighting", subcategory: "Modifiers", note: "" },
  { id: "89kdzp2l", name: "PHẢN QUANG GƯƠNG", brand: "", model: "PHẢN QUANG GƯƠNG", department: "Lighting", subcategory: "Special", note: "Silver/white 4x4" },
  { id: "o7dp86wf", name: "CHROMA KEY GREEN", brand: "", model: "CHROMA KEY GREEN", department: "Lighting", subcategory: "Special", note: "" },
  { id: "9scj6sfh", name: "CHROMA KEY BLUE", brand: "", model: "CHROMA KEY BLUE", department: "Lighting", subcategory: "Special", note: "" },
  { id: "f05hqkf8", name: "GENERATOR TRUCK", brand: "", model: "GENERATOR TRUCK", department: "Others", subcategory: "Cinema Bodies", note: "" },
  { id: "mimhtkrq", name: "HOLLYLAND SOLIDCOM C1 PRO", brand: "HOLLYLAND", model: "SOLIDCOM C1 PRO", department: "Others", subcategory: "Cinema Bodies", note: "" },
  { id: "9vj5dil2", name: "INTERCOM SET", brand: "", model: "INTERCOM SET", department: "Others", subcategory: "Cinema Bodies", note: "" },
];

const DEFAULT_PROJECT_TAGS = ["TVC", "MV", "Short"];
const QTY_OPTIONS = Array.from({ length: 100 }, (_, i) => i); // 0-99

// 8 accent essences, each with a light-mode and dark-mode shade tuned for
// contrast against that mode's background (light shades are darker/more
// saturated; dark shades are brighter, since the background flips).
const ACCENT_CHOICES = [
  { id: "amber", name: "Amber", light: "#B8790A", dark: "#FFB020" },
  { id: "crimson", name: "Crimson", light: "#B23A3A", dark: "#FF5C5C" },
  { id: "teal", name: "Teal", light: "#0F766E", dark: "#2DD4BF" },
  { id: "blue", name: "Blue", light: "#1D4ED8", dark: "#5B9DFF" },
  { id: "violet", name: "Violet", light: "#7C3AED", dark: "#A78BFA" },
  { id: "green", name: "Green", light: "#15803D", dark: "#4ADE80" },
  { id: "pink", name: "Pink", light: "#BE185D", dark: "#F472B6" },
  { id: "slate", name: "Slate", light: "#404040", dark: "#B0B0B0" },
];

// 5 curated fonts, all with solid Vietnamese diacritic support.
const FONT_CHOICES = [
  { id: "jetbrains", name: "JetBrains Mono", stack: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace", googleFamily: "JetBrains+Mono:wght@400;500;600;700" },
  { id: "plex", name: "IBM Plex Mono", stack: "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace", googleFamily: "IBM+Plex+Mono:wght@400;500;600;700" },
  { id: "roboto", name: "Roboto Mono", stack: "'Roboto Mono', ui-monospace, 'SF Mono', Menlo, monospace", googleFamily: "Roboto+Mono:wght@400;500;600;700" },
  { id: "source", name: "Source Code Pro", stack: "'Source Code Pro', ui-monospace, 'SF Mono', Menlo, monospace", googleFamily: "Source+Code+Pro:wght@400;500;600;700" },
  { id: "inter", name: "Inter", stack: "'Inter', ui-sans-serif, system-ui, sans-serif", googleFamily: "Inter:wght@400;500;600;700" },
];

const uid = () => Math.random().toString(36).slice(2, 10);
// Project ids double as the Supabase `projects.id` primary key (a real
// uuid column), unlike every other id in this file which just lives
// inside a jsonb blob — so projects need a real UUID, not uid()'s short
// base36 string. crypto.randomUUID() isn't available in every browser
// context, so this falls back to building a v4 UUID by hand rather than
// silently handing Supabase something it'll reject.
function newProjectId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
const relabelDays = (arr) => arr.map((d, i) => ({ ...d, label: `Day ${i + 1}` }));

function loadColor(dept) {
  return DEPT_COLORS[dept] || "#555555";
}

function pad2(n) {
  return String(n).padStart(2, "0");
}
// "6-8/10/26" for consecutive shoot days, "10,17/10/26" for non-consecutive,
// multiple months joined like "28-30/09/26, 1-3/10/26".
function formatShootDateRange(days) {
  const dates = [...new Set((days || []).map((d) => d.date).filter(Boolean))]
    .map((s) => {
      const [y, m, d] = s.split("-").map(Number);
      return { y, m, d, key: s };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
  if (dates.length === 0) return "";

  const monthGroups = [];
  let current = null;
  for (const dt of dates) {
    if (!current || current.y !== dt.y || current.m !== dt.m) {
      current = { y: dt.y, m: dt.m, days: [] };
      monthGroups.push(current);
    }
    current.days.push(dt.d);
  }

  const parts = monthGroups.map((g) => {
    const tokens = [];
    let start = g.days[0];
    let prev = g.days[0];
    for (let i = 1; i <= g.days.length; i++) {
      const d = g.days[i];
      if (d === prev + 1) {
        prev = d;
        continue;
      }
      tokens.push(start === prev ? `${start}` : `${start}-${prev}`);
      if (i < g.days.length) {
        start = d;
        prev = d;
      }
    }
    return `${tokens.join(",")}/${pad2(g.m)}/${String(g.y).slice(-2)}`;
  });

  return parts.join(", ");
}
function fmtDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return fmtDate(d);
}
function addOneDay(dateStr) {
  if (!dateStr) return "";
  const [y, m, day] = dateStr.split("-").map(Number);
  if (!y || !m || !day) return "";
  const d = new Date(y, m - 1, day);
  d.setDate(d.getDate() + 1);
  return fmtDate(d);
}
// Recompute every date after fromIndex as (previous row's date + 1 day), cascading forward.
function cascadeDates(rows, fromIndex) {
  const next = [...rows];
  for (let i = fromIndex + 1; i < next.length; i++) {
    next[i] = { ...next[i], date: next[i - 1].date ? addOneDay(next[i - 1].date) : "" };
  }
  return next;
}
// Display dates strictly as dd/mm/yy, regardless of browser/OS locale.
function formatDMY(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y.slice(2)}`;
}
// Compact form without the year, for tight spaces like the sidebar.
function formatDM(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}`;
}
// Compact filesystem-friendly slug: lowercase, alphanumerics and hyphens only.
function slug(s) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
function exportDateStr() {
  const d = new Date();
  return `${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}
// 24-hour HHMMSS, no separators — appended to every saved filename (backup,
// catalog export, PDF export) so re-saving the same thing twice never
// silently overwrites the previous file.
function exportTimeStr() {
  const d = new Date();
  return `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}
// 24-hour HH:MM:SS — used next to the "Created On" date in the PDF and its
// preview, so that field shows the exact moment, not just the day.
function formatTime24(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
// Inserts `_HHMMSS` right before the file extension — the one place every
// export filename gets its save-time stamp, so PDF/json all do it
// identically.
function withTimeStamp(nameWithExt) {
  const dot = nameWithExt.lastIndexOf(".");
  if (dot === -1) return `${nameWithExt}_${exportTimeStr()}`;
  return `${nameWithExt.slice(0, dot)}_${exportTimeStr()}${nameWithExt.slice(dot)}`;
}
// Used to show the right keyboard-shortcut hint (⌘P vs Ctrl+P) in the print banner.
function isMac() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "");
}

// Only keep items with at least one non-zero day quantity for this shoot,
// then drop any subcat/dept that ends up empty once those are removed.
// Shared by PrintView (live data) and the self-contained share-link builder.
function computeVisibleGrouped(groupedCatalog, itemData) {
  const visibleGrouped = {};
  Object.keys(groupedCatalog).forEach((dept) => {
    const subMap = {};
    Object.keys(groupedCatalog[dept]).forEach((sub) => {
      const items = groupedCatalog[dept][sub].filter((c) => {
        const entry = itemData[c.id];
        return Object.values(entry?.quantities || {}).some((q) => q > 0);
      });
      if (items.length > 0) subMap[sub] = items;
    });
    if (Object.keys(subMap).length > 0) visibleGrouped[dept] = subMap;
  });
  return visibleGrouped;
}

// Order by the department/subcategory structure defined in Settings (the
// master catalog's manual order) rather than raw insertion order. Anything
// present in the data but not in that defined structure is appended after,
// alphabetically, rather than dropped. Shared by the PDF export and the
// read-only share-snapshot builder so both always agree on ordering.
function orderedKeys(obj, order) {
  const remaining = new Set(Object.keys(obj));
  const result = [];
  (order || []).forEach((k) => {
    if (remaining.has(k)) { result.push(k); remaining.delete(k); }
  });
  result.push(...Array.from(remaining).sort());
  return result;
}

function hexToRgb(hex) {
  const h = (hex || "#000000").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function defaultExportFilename(project, userName) {
  const parts = [
    exportDateStr(),
    slug(project?.name),
    slug(project?.productionHouse),
    slug(userName),
  ].filter(Boolean);
  return parts.join("_");
}

export default function EquipmentManifest({ session }) {
  const [loaded, setLoaded] = useState(false);
  const [projects, setProjectsState] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [catalog, setCatalog] = useState(DEFAULT_CATALOG);
  const [view, setView] = useState("projects"); // "projects" | "manifest" | "catalog" | "preview"
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [cameFromUrl, setCameFromUrl] = useState(false);
  const [previewReturnView, setPreviewReturnView] = useState("projects");
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [projectTags, setProjectTags] = useState(DEFAULT_PROJECT_TAGS);
  const [productionHouses, setProductionHouses] = useState([]);
  const [brands, setBrands] = useState(DEFAULT_BRANDS);
  const [templates, setTemplates] = useState([]);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [includeUsernameInPdf, setIncludeUsernameInPdf] = useState(true);
  const [includeEmailInPdf, setIncludeEmailInPdf] = useState(false);
  const [includePhoneInPdf, setIncludePhoneInPdf] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [accentId, setAccentId] = useState("amber");
  const [fontId, setFontId] = useState("jetbrains");
  const [rentalHouses, setRentalHouses] = useState([]);
  const [projectFilter, setProjectFilter] = useState(null); // { field, value }

  const [activeDay, setActiveDay] = useState("all");
  const [activeDept, setActiveDept] = useState("all");
  const [search, setSearch] = useState("");
  const [manifestSearch, setManifestSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});

  const [showCatalogForm, setShowCatalogForm] = useState(false);
  const [lastCatalogDraft, setLastCatalogDraft] = useState(null);
  const [editingCatalogId, setEditingCatalogId] = useState(null);
  const [showDeptManager, setShowDeptManager] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null);
  const [backupError, setBackupError] = useState("");
  const [catalogCopyState, setCatalogCopyState] = useState("idle"); // "idle" | "copied"
  const [undoState, setUndoState] = useState(null);
  const undoTimerRef = useRef(null);
  const [saveState, setSaveState] = useState("idle");
  const saveTimer = useRef(null);
  const noteRef = useRef(null);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  const days = activeProject ? activeProject.days : [];
  const itemData = activeProject ? (activeProject.itemData || {}) : {};
  const customItems = activeProject ? (activeProject.customItems || []) : [];

  useEffect(() => {
    if (noteRef.current) {
      noteRef.current.style.height = "auto";
      noteRef.current.style.height = `${noteRef.current.scrollHeight}px`;
    }
  }, [activeProjectId, activeProject?.note]);

  function setDays(updater) {
    setProjectsState((prev) =>
      prev.map((p) =>
        p.id === activeProjectId
          ? { ...p, days: typeof updater === "function" ? updater(p.days) : updater }
          : p
      )
    );
  }

  // load — reads everything from Supabase once we have an authenticated
  // session. app_state is one row per user (catalog/departments/tags/
  // houses/brands/templates/settings); projects are one row each, keyed
  // by the project's own id. See supabase-schema.sql for the tables.
  useEffect(() => {
    let cancelled = false;
    if (!session) return;
    (async () => {
      try {
        const userId = session.user.id;
        const [{ data: stateRow, error: stateErr }, { data: projectRows, error: projectsErr }] = await Promise.all([
          supabase.from("app_state").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("projects").select("*").eq("user_id", userId),
        ]);
        if (cancelled) return;
        if (stateErr) throw stateErr;
        if (projectsErr) throw projectsErr;

        if (stateRow) {
          if (stateRow.catalog) setCatalog(stateRow.catalog);
          if (stateRow.departments) {
            const withDefaults = { ...stateRow.departments };
            if (!withDefaults.Subrent) withDefaults.Subrent = [];
            setDepartments(withDefaults);
          }
          if (stateRow.project_tags) setProjectTags(stateRow.project_tags);
          if (stateRow.production_houses) setProductionHouses(stateRow.production_houses);
          if (stateRow.rental_houses) setRentalHouses(stateRow.rental_houses);
          if (stateRow.brands) setBrands(stateRow.brands);
          if (stateRow.templates) setTemplates(stateRow.templates);
          const s = stateRow.settings || {};
          if (s.userName) setUserName(s.userName);
          if (s.userEmail) setUserEmail(s.userEmail);
          if (s.userPhone) setUserPhone(s.userPhone);
          if (typeof s.includeUsernameInPdf === "boolean") setIncludeUsernameInPdf(s.includeUsernameInPdf);
          if (typeof s.includeEmailInPdf === "boolean") setIncludeEmailInPdf(s.includeEmailInPdf);
          if (typeof s.includePhoneInPdf === "boolean") setIncludePhoneInPdf(s.includePhoneInPdf);
          if (s.theme) setTheme(s.theme);
          if (s.accentId) setAccentId(s.accentId);
          if (s.fontId) setFontId(s.fontId);
        }
        if (projectRows) {
          setProjectsState(projectRows.map((r) => ({ ...r.data, id: r.id })));
        }
      } catch (e) {
        console.error("Failed to load BOXGO data from Supabase:", e);
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [session]);

  // Support shareable preview links: ?project=<id> in the URL jumps straight
  // to that project's read-only preview once data has loaded, so someone
  // opening a shared link — signed in or not — lands on the clean preview
  // rather than the editable project list.
  useEffect(() => {
    if (!loaded) return;
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("project");
    if (pid && projects.some((p) => p.id === pid)) {
      setActiveProjectId(pid);
      setView("preview");
      setCameFromUrl(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Tracks scroll position for the floating "back to top" button (shown
  // only on narrow/phone screens via CSS — see .back-to-top-btn). The app
  // shell itself doesn't scroll internally, so the window is what scrolls.
  useEffect(() => {
    function handleScroll() {
      setShowBackToTop(window.scrollY > 400);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function goToPreview(id) {
    // Remember which page we were on so the Back button can return there
    // (the project's own manifest page, if that's where Export was
    // clicked) instead of always landing on the project list.
    setPreviewReturnView(view);
    setActiveProjectId(id);
    setView("preview");
    const url = new URL(window.location.href);
    url.searchParams.set("project", id);
    window.history.pushState({}, "", url);
  }

  function exitPreview() {
    setView(previewReturnView);
    const url = new URL(window.location.href);
    url.searchParams.delete("project");
    window.history.pushState({}, "", url);
  }


  // save (debounced) — mirrors state into Supabase: one upsert for the
  // app_state row, one upsert per project. Deleting a project writes
  // immediately in deleteProject() below rather than waiting on this.
  useEffect(() => {
    if (!loaded || !session) return;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const userId = session.user.id;
        const settings = { userName, userEmail, userPhone, includeUsernameInPdf, includeEmailInPdf, includePhoneInPdf, theme, accentId, fontId };
        const { error: stateErr } = await supabase.from("app_state").upsert({
          user_id: userId,
          catalog,
          departments,
          project_tags: projectTags,
          production_houses: productionHouses,
          rental_houses: rentalHouses,
          brands,
          templates,
          settings,
          updated_at: new Date().toISOString(),
        });
        if (stateErr) throw stateErr;

        if (projects.length > 0) {
          const rows = projects.map((p) => ({
            id: p.id,
            user_id: userId,
            data: p,
            updated_at: new Date().toISOString(),
          }));
          const { error: projectsErr } = await supabase.from("projects").upsert(rows);
          if (projectsErr) throw projectsErr;
        }
        setSaveState("saved");
      } catch (e) {
        console.error("Failed to save BOXGO data to Supabase:", e);
        setSaveState("error");
      }
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [projects, departments, catalog, projectTags, productionHouses, rentalHouses, brands, userName, userEmail, userPhone, includeUsernameInPdf, includeEmailInPdf, includePhoneInPdf, templates, theme, accentId, fontId, loaded, session]);

  const deptNames = Object.keys(departments);

  const catalogCountsByDept = useMemo(() => {
    const c = {};
    for (const it of catalog) c[it.department] = (c[it.department] || 0) + 1;
    return c;
  }, [catalog]);

  const catalogFiltered = useMemo(() => {
    return catalog.filter((c) => {
      if (activeDept !== "all" && c.department !== activeDept) return false;
      if (search.trim() && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [catalog, activeDept, search]);

  const catalogGrouped = useMemo(() => {
    const g = {};
    for (const c of catalogFiltered) {
      if (!g[c.department]) g[c.department] = {};
      if (!g[c.department][c.subcategory]) g[c.department][c.subcategory] = [];
      g[c.department][c.subcategory].push(c);
    }
    return g;
  }, [catalogFiltered]);

  // Manifest grid always shows every department — clicking a department in the
  // sidebar jumps to it rather than filtering the rest out, so this ignores
  // activeDept entirely (unlike catalogGrouped above, used by the Catalog page).
  const manifestGrouped = useMemo(() => {
    const g = {};
    for (const c of catalog) {
      if (!g[c.department]) g[c.department] = {};
      if (!g[c.department][c.subcategory]) g[c.department][c.subcategory] = [];
      g[c.department][c.subcategory].push(c);
    }
    return g;
  }, [catalog]);

  const manifestGroupedFiltered = useMemo(() => {
    const q = manifestSearch.trim().toLowerCase();
    if (!q) return manifestGrouped;
    const g = {};
    Object.keys(manifestGrouped).forEach((dept) => {
      const subMap = {};
      Object.keys(manifestGrouped[dept]).forEach((sub) => {
        const items = manifestGrouped[dept][sub].filter((c) => c.name.toLowerCase().includes(q));
        if (items.length > 0) subMap[sub] = items;
      });
      if (Object.keys(subMap).length > 0) g[dept] = subMap;
    });
    return g;
  }, [manifestGrouped, manifestSearch]);

  const totalRequestedQty = useMemo(() => {
    return Object.values(itemData).reduce(
      (sum, entry) => sum + Object.values(entry.quantities || {}).reduce((s, q) => s + (q || 0), 0),
      0
    );
  }, [itemData]);

  const visibleDays = activeDay === "all" ? days : days.filter((d) => d.id === activeDay);

  const filteredProjects = useMemo(() => {
    const base = projectFilter
      ? projects.filter((p) => (p[projectFilter.field] || "") === projectFilter.value)
      : projects;
    return [...base].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [projects, projectFilter]);

  const recentProjectNames = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (let i = projects.length - 1; i >= 0; i--) {
      const n = projects[i].name;
      if (n && !seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        result.push(n);
      }
      if (result.length >= 10) break;
    }
    return result;
  }, [projects]);

  const recentCustomItemNames = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (let i = projects.length - 1; i >= 0; i--) {
      for (const c of projects[i].customItems || []) {
        if (c.name && !seen.has(c.name.toLowerCase())) {
          seen.add(c.name.toLowerCase());
          result.push(c.name);
        }
      }
      if (result.length >= 10) break;
    }
    return result;
  }, [projects]);

  const recentProjectLabels = useMemo(() => {
    const seen = new Set();
    const result = [];
    outer: for (let i = projects.length - 1; i >= 0; i--) {
      for (const d of projects[i].days || []) {
        if (d.projectLabel && !seen.has(d.projectLabel.toLowerCase())) {
          seen.add(d.projectLabel.toLowerCase());
          result.push(d.projectLabel);
        }
        if (result.length >= 10) break outer;
      }
    }
    return result;
  }, [projects]);

  function setItemQty(catalogId, dayId, qty) {
    const q = Math.max(0, parseInt(qty, 10) || 0);
    setProjectsState((prev) =>
      prev.map((p) => {
        if (p.id !== activeProjectId) return p;
        const nextItemData = { ...(p.itemData || {}) };
        const entry = nextItemData[catalogId] || { quantities: {}, notes: "" };
        let quantities;
        if (p.perDayQty) {
          quantities = { ...entry.quantities, [dayId]: q };
        } else {
          // "All days same" mode: every day shares one value, so writing
          // it once fans out to every day this project has.
          quantities = {};
          (p.days || []).forEach((d) => { quantities[d.id] = q; });
        }
        nextItemData[catalogId] = { ...entry, quantities };
        return { ...p, itemData: nextItemData };
      })
    );
  }

  function setItemNote(catalogId, note) {
    setProjectsState((prev) =>
      prev.map((p) => {
        if (p.id !== activeProjectId) return p;
        const nextItemData = { ...(p.itemData || {}) };
        const entry = nextItemData[catalogId] || { quantities: {}, notes: "" };
        nextItemData[catalogId] = { ...entry, notes: note };
        return { ...p, itemData: nextItemData };
      })
    );
  }

  function setItemNoteHidden(catalogId, hidden) {
    setProjectsState((prev) =>
      prev.map((p) => {
        if (p.id !== activeProjectId) return p;
        const nextItemData = { ...(p.itemData || {}) };
        const entry = nextItemData[catalogId] || { quantities: {}, notes: "" };
        nextItemData[catalogId] = { ...entry, noteHidden: hidden };
        return { ...p, itemData: nextItemData };
      })
    );
  }

  // Copies every item's quantity (catalog items and project-specific custom
  // items alike) from the day right before dayIndex into that day.
  function copyPreviousDayQuantities(dayIndex) {
    setProjectsState((prev) =>
      prev.map((p) => {
        if (p.id !== activeProjectId) return p;
        const days = p.days || [];
        if (dayIndex <= 0 || dayIndex >= days.length) return p;
        const fromDayId = days[dayIndex - 1].id;
        const toDayId = days[dayIndex].id;
        const nextItemData = {};
        Object.entries(p.itemData || {}).forEach(([itemId, entry]) => {
          const val = entry.quantities?.[fromDayId] || 0;
          nextItemData[itemId] = { ...entry, quantities: { ...(entry.quantities || {}), [toDayId]: val } };
        });
        return { ...p, itemData: nextItemData };
      })
    );
  }

  function addCustomItem(name, department) {
    const nm = (name || "").trim();
    if (!nm || !activeProjectId) return;
    const newItem = { id: uid(), name: nm, department: department || "Others" };
    setProjectsState((prev) =>
      prev.map((p) => (p.id === activeProjectId ? { ...p, customItems: [...(p.customItems || []), newItem] } : p))
    );
  }

  function removeCustomItem(itemId) {
    setProjectsState((prev) =>
      prev.map((p) => {
        if (p.id !== activeProjectId) return p;
        const nextItemData = { ...(p.itemData || {}) };
        delete nextItemData[itemId];
        return { ...p, customItems: (p.customItems || []).filter((it) => it.id !== itemId), itemData: nextItemData };
      })
    );
  }

  function addDay() {
    setDays((prev) => {
      const prevDate = prev.length > 0 ? prev[prev.length - 1].date : "";
      const date = prevDate ? addOneDay(prevDate) : tomorrowStr();
      return relabelDays([...prev, { id: `day${Date.now()}`, date, location: "", projectLabel: "" }]);
    });
  }

  function updateDay(id, patch) {
    setDays((prev) => {
      const idx = prev.findIndex((d) => d.id === id);
      if (idx === -1) return prev;
      let next = prev.map((d) => (d.id === id ? { ...d, ...patch } : d));
      if (Object.prototype.hasOwnProperty.call(patch, "date")) next = cascadeDates(next, idx);
      return next;
    });
  }

  function removeDay(id) {
    setDays((prev) => relabelDays(prev.filter((d) => d.id !== id)));
    setProjectsState((prev) =>
      prev.map((p) => {
        if (p.id !== activeProjectId || !p.itemData) return p;
        const nextItemData = {};
        Object.keys(p.itemData).forEach((cid) => {
          const q = { ...p.itemData[cid].quantities };
          delete q[id];
          nextItemData[cid] = { ...p.itemData[cid], quantities: q };
        });
        return { ...p, itemData: nextItemData };
      })
    );
    if (activeDay === id) setActiveDay("all");
  }

  function addProject(data) {
    const collapsedDepts = {};
    const collapsedSubcats = {};
    Object.entries(departments).forEach(([d, subs]) => {
      collapsedDepts[d] = true;
      (subs || []).forEach((s) => { collapsedSubcats[`${d}::${s}`] = true; });
    });
    const newDays = data.days && data.days.length ? data.days : [{ id: "day1", label: "Day 1", date: tomorrowStr(), location: "", projectLabel: "" }];
    const template = data.templateId ? templates.find((t) => t.id === data.templateId) : null;
    const itemData = {};
    if (template) {
      Object.entries(template.itemQuantities || {}).forEach(([itemId, qty]) => {
        const quantities = {};
        newDays.forEach((d) => { quantities[d.id] = qty; });
        itemData[itemId] = { quantities, notes: "" };
      });
      // expand collapse state for any category/subcategory the template touches, so applied items are visible
      Object.keys(template.itemQuantities || {}).forEach((itemId) => {
        const c = catalog.find((x) => x.id === itemId);
        if (!c) return;
        collapsedDepts[c.department] = false;
        if (c.subcategory) collapsedSubcats[`${c.department}::${c.subcategory}`] = false;
      });
    }
    const newProject = {
      id: newProjectId(),
      name: data.name,
      tag: (template && template.tag) || data.tag || "",
      productionHouse: (template && template.productionHouse) || data.productionHouse || "",
      producer: (template && template.producer) || data.producer || "",
      rentalHouse: (template && template.rentalHouse) || data.rentalHouse || "",
      gaffer: (template && template.gaffer) || data.gaffer || "",
      days: newDays,
      perDayQty: data.perDayQty || false,
      itemData,
      customItems: [],
      note: "",
      collapsedDepts,
      collapsedSubcats,
      createdAt: Date.now(),
    };
    setProjectsState((prev) => [...prev, newProject]);
    addProductionHouse(newProject.productionHouse);
    addRentalHouse(newProject.rentalHouse);
    setActiveProjectId(newProject.id);
    setActiveDay("all");
    setActiveDept("all");
    setView("manifest");
  }

  // Saves the current per-item peak quantities (the highest value across any
  // day) plus tag/house/producer/gaffer as a reusable starting point for
  // future projects. Shoot days and dates are deliberately not included.
  function saveAsTemplate(project, name) {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    const itemQuantities = {};
    Object.entries(project.itemData || {}).forEach(([itemId, entry]) => {
      const vals = Object.values(entry.quantities || {}).filter((q) => q > 0);
      if (vals.length > 0) itemQuantities[itemId] = Math.max(...vals);
    });
    const newTemplate = {
      id: uid(),
      name: trimmed,
      tag: project.tag || "",
      productionHouse: project.productionHouse || "",
      producer: project.producer || "",
      rentalHouse: project.rentalHouse || "",
      gaffer: project.gaffer || "",
      itemQuantities,
    };
    setTemplates((prev) => [...prev, newTemplate]);
  }

  function deleteTemplate(id) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  function duplicateProject(id) {
    const original = projects.find((p) => p.id === id);
    if (!original) return;
    const dayIdMap = {};
    const newDays = (original.days || []).map((d) => {
      const newId = uid();
      dayIdMap[d.id] = newId;
      return { ...d, id: newId };
    });
    const newItemData = {};
    Object.keys(original.itemData || {}).forEach((catalogId) => {
      const entry = original.itemData[catalogId];
      const newQuantities = {};
      Object.keys(entry.quantities || {}).forEach((dayId) => {
        newQuantities[dayIdMap[dayId] || dayId] = entry.quantities[dayId];
      });
      newItemData[catalogId] = { ...entry, quantities: newQuantities };
    });
    const newProject = {
      ...original,
      id: newProjectId(),
      days: newDays,
      itemData: newItemData,
      createdAt: Date.now(),
    };
    setProjectsState((prev) => [...prev, newProject]);
  }

  function updateProject(id, patch) {
    setProjectsState((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...patch };
        if (patch.days) {
          const newDayIds = new Set(patch.days.map((d) => d.id));
          const prunedItemData = {};
          Object.keys(p.itemData || {}).forEach((cid) => {
            const entry = p.itemData[cid];
            const q = {};
            Object.keys(entry.quantities || {}).forEach((dayId) => {
              if (newDayIds.has(dayId)) q[dayId] = entry.quantities[dayId];
            });
            prunedItemData[cid] = { ...entry, quantities: q };
          });
          next.itemData = prunedItemData;
        }
        return next;
      })
    );
    if (patch.productionHouse) addProductionHouse(patch.productionHouse);
    if (patch.rentalHouse) addRentalHouse(patch.rentalHouse);
  }

  function toggleDeptCollapse(dept) {
    if (!activeProjectId) return;
    setProjectsState((prev) =>
      prev.map((p) => {
        if (p.id !== activeProjectId) return p;
        const collapsedDepts = { ...(p.collapsedDepts || {}) };
        collapsedDepts[dept] = !collapsedDepts[dept];
        return { ...p, collapsedDepts };
      })
    );
  }

  // Shared by the sidebar (desktop) and the pill bar (phone): in the
  // manifest view "categories" are a jump-to-section nav, not a filter, so
  // this scrolls to (and expands) the department instead of hiding others;
  // in the catalog view it's a real filter via activeDept.
  function selectCategory(d) {
    if (view === "manifest") {
      if (d === "all") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (activeProject?.collapsedDepts?.[d]) toggleDeptCollapse(d);
      setTimeout(() => {
        document.getElementById(`mf-dept-${d}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    } else {
      setActiveDept(d);
    }
  }

  function toggleSubcatCollapse(dept, sub) {
    if (!activeProjectId) return;
    const key = `${dept}::${sub}`;
    setProjectsState((prev) =>
      prev.map((p) => {
        if (p.id !== activeProjectId) return p;
        const collapsedSubcats = { ...(p.collapsedSubcats || {}) };
        collapsedSubcats[key] = !collapsedSubcats[key];
        return { ...p, collapsedSubcats };
      })
    );
  }

  function showUndo(message, undo) {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoState({ message, undo });
    undoTimerRef.current = setTimeout(() => setUndoState(null), 6000);
  }

  function performUndo() {
    if (undoState) undoState.undo();
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoState(null);
  }

  function deleteProject(id) {
    const removed = projects.find((p) => p.id === id);
    const removedIndex = projects.findIndex((p) => p.id === id);
    setProjectsState((prev) => prev.filter((p) => p.id !== id));
    if (activeProjectId === id) {
      setActiveProjectId(null);
      setView("projects");
    }
    // Deleted immediately rather than waiting on the debounced save effect
    // below (which only ever upserts, never removes rows). If the user
    // hits Undo within the 6s window, the project reappears locally and
    // the next autosave re-creates the row via upsert.
    if (session) {
      supabase.from("projects").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to delete project from Supabase:", error);
      });
    }
    if (removed) {
      showUndo(`Deleted "${removed.name}"`, () => {
        setProjectsState((prev) => {
          const next = [...prev];
          next.splice(Math.min(removedIndex, next.length), 0, removed);
          return next;
        });
      });
    }
  }

  function openProject(id) {
    setActiveProjectId(id);
    setActiveDay("all");
    setActiveDept("all");
    setView("manifest");
  }

  function upsertCatalogEntry(name, department, subcategory) {
    setCatalog((prev) => {
      const exists = prev.some(
        (c) => c.name.toLowerCase() === name.toLowerCase() && c.department === department
      );
      if (exists) return prev;
      return [...prev, { id: uid(), name, department, subcategory: subcategory || "General" }];
    });
  }

  function addCatalogItem(data) {
    setCatalog((prev) => [...prev, { id: uid(), ...data }]);
  }

  function updateCatalogItem(id, patch) {
    setCatalog((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function deleteCatalogItem(id) {
    const removedItem = catalog.find((c) => c.id === id);
    const removedIndex = catalog.findIndex((c) => c.id === id);
    const affected = projects
      .filter((p) => p.itemData && p.itemData[id])
      .map((p) => ({ projectId: p.id, entry: p.itemData[id] }));
    setCatalog((prev) => prev.filter((c) => c.id !== id));
    setProjectsState((prev) =>
      prev.map((p) => {
        if (!p.itemData || !p.itemData[id]) return p;
        const nextItemData = { ...p.itemData };
        delete nextItemData[id];
        return { ...p, itemData: nextItemData };
      })
    );
    if (removedItem) {
      showUndo(`Deleted "${removedItem.name}"`, () => {
        setCatalog((prev) => {
          const next = [...prev];
          next.splice(Math.min(removedIndex, next.length), 0, removedItem);
          return next;
        });
        if (affected.length) {
          setProjectsState((prev) =>
            prev.map((p) => {
              const found = affected.find((a) => a.projectId === p.id);
              if (!found) return p;
              return { ...p, itemData: { ...(p.itemData || {}), [id]: found.entry } };
            })
          );
        }
      });
    }
  }

  // Moves draggedId next to targetId in the catalog array. Insertion side
  // depends on drag direction (drop after the target when dragging downward,
  // before it when dragging upward) so dropping onto the last item in a list
  // can actually make the dragged item the new last item, not just second-last.
  function reorderCatalogItem(draggedId, targetId) {
    if (draggedId === targetId) return;
    setCatalog((prev) => {
      const list = [...prev];
      const fromIdx = list.findIndex((c) => c.id === draggedId);
      const origTargetIdx = list.findIndex((c) => c.id === targetId);
      if (fromIdx === -1 || origTargetIdx === -1) return prev;
      const draggingDown = fromIdx < origTargetIdx;
      const [moved] = list.splice(fromIdx, 1);
      const newTargetIdx = list.findIndex((c) => c.id === targetId);
      const insertAt = draggingDown ? newTargetIdx + 1 : newTargetIdx;
      list.splice(insertAt, 0, moved);
      return list;
    });
  }

  function addDepartment(name) {
    if (!name || departments[name]) return;
    setDepartments((prev) => ({ ...prev, [name]: [] }));
  }

  function addProjectTag(tag) {
    const t = (tag || "").trim();
    if (!t || projectTags.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    setProjectTags((prev) => [...prev, t]);
  }

  function renameProjectTag(oldTag, newTag) {
    const n = (newTag || "").trim();
    if (!n || n === oldTag) return;
    setProjectTags((prev) => prev.map((t) => (t === oldTag ? n : t)));
    setProjectsState((prev) => prev.map((p) => (p.tag === oldTag ? { ...p, tag: n } : p)));
    setProjectFilter((f) => (f && f.field === "tag" && f.value === oldTag ? { field: "tag", value: n } : f));
  }

  function removeProjectTag(tag) {
    setProjectTags((prev) => prev.filter((t) => t !== tag));
    setProjectFilter((f) => (f && f.field === "tag" && f.value === tag ? null : f));
  }

  function addProductionHouse(name) {
    const t = (name || "").trim();
    if (!t || productionHouses.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    setProductionHouses((prev) => [...prev, t]);
  }

  function addBrand(name) {
    const t = (name || "").trim();
    if (!t || brands.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    setBrands((prev) => [...prev, t]);
  }

  function renameProductionHouse(oldName, newName) {
    const n = (newName || "").trim();
    if (!n || n === oldName) return;
    setProductionHouses((prev) => prev.map((x) => (x === oldName ? n : x)));
    setProjectsState((prev) => prev.map((p) => (p.productionHouse === oldName ? { ...p, productionHouse: n } : p)));
    setProjectFilter((f) => (f && f.field === "productionHouse" && f.value === oldName ? { field: "productionHouse", value: n } : f));
  }

  function removeProductionHouse(name) {
    setProductionHouses((prev) => prev.filter((x) => x !== name));
    setProjectFilter((f) => (f && f.field === "productionHouse" && f.value === name ? null : f));
  }

  function addRentalHouse(name) {
    const t = (name || "").trim();
    if (!t || rentalHouses.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    setRentalHouses((prev) => [...prev, t]);
  }

  function renameRentalHouse(oldName, newName) {
    const n = (newName || "").trim();
    if (!n || n === oldName) return;
    setRentalHouses((prev) => prev.map((x) => (x === oldName ? n : x)));
    setProjectsState((prev) => prev.map((p) => (p.rentalHouse === oldName ? { ...p, rentalHouse: n } : p)));
    setProjectFilter((f) => (f && f.field === "rentalHouse" && f.value === oldName ? { field: "rentalHouse", value: n } : f));
  }

  function removeRentalHouse(name) {
    setRentalHouses((prev) => prev.filter((x) => x !== name));
    setProjectFilter((f) => (f && f.field === "rentalHouse" && f.value === name ? null : f));
  }

  function addSubcategory(dept, sub) {
    if (!sub) return;
    setDepartments((prev) => ({
      ...prev,
      [dept]: prev[dept] ? (prev[dept].includes(sub) ? prev[dept] : [...prev[dept], sub]) : [sub],
    }));
  }

  function renameDepartment(oldName, newName) {
    const n = (newName || "").trim();
    if (!n || n === oldName || departments[n]) return;
    setDepartments((prev) => {
      const { [oldName]: subs, ...rest } = prev;
      return { ...rest, [n]: subs || [] };
    });
    setCatalog((prev) => prev.map((c) => (c.department === oldName ? { ...c, department: n } : c)));
    if (activeDept === oldName) setActiveDept(n);
  }

  function removeDepartment(name) {
    setDepartments((prev) => {
      const { [name]: _, ...rest } = prev;
      return rest;
    });
    if (activeDept === name) setActiveDept("all");
  }

  function renameSubcategory(dept, oldSub, newSub) {
    const n = (newSub || "").trim();
    if (!n || n === oldSub) return;
    setDepartments((prev) => ({
      ...prev,
      [dept]: (prev[dept] || []).map((s) => (s === oldSub ? n : s)),
    }));
    setCatalog((prev) => prev.map((c) => (c.department === dept && c.subcategory === oldSub ? { ...c, subcategory: n } : c)));
  }

  function removeSubcategory(dept, sub) {
    setDepartments((prev) => ({
      ...prev,
      [dept]: (prev[dept] || []).filter((s) => s !== sub),
    }));
  }

  function reorderSubcategory(dept, fromIndex, toIndex) {
    setDepartments((prev) => {
      const list = [...(prev[dept] || [])];
      if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) return prev;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return { ...prev, [dept]: list };
    });
  }

  function reorderDepartment(fromIndex, toIndex) {
    setDepartments((prev) => {
      const keys = Object.keys(prev);
      if (fromIndex < 0 || fromIndex >= keys.length || toIndex < 0 || toIndex >= keys.length) return prev;
      const [moved] = keys.splice(fromIndex, 1);
      keys.splice(toIndex, 0, moved);
      const next = {};
      keys.forEach((k) => { next[k] = prev[k]; });
      return next;
    });
  }


  // Copies the master catalog as JSON, shaped exactly like the DEFAULT_CATALOG
  // array at the top of this file — the point isn't spreadsheet editing, it's
  // getting a modified catalog back out so it can be baked into the app's
  // source as the new default (what a fresh account starts with). Ordered to
  // match your manual "Manage" department/subcategory order, items within
  // each group keeping your manual drag order too — nothing re-sorted
  // alphabetically. Falls back to a plain .json download if the clipboard
  // API is unavailable or the user declines permission.
  async function copyCatalogJson() {
    const rows = [];
    const pushed = new Set();
    const pushItem = (c) => {
      rows.push({
        id: c.id,
        name: c.name,
        brand: c.brand || "",
        model: c.model || "",
        department: c.department,
        subcategory: c.subcategory || "",
        note: c.note || "",
      });
      pushed.add(c.id);
    };
    Object.keys(departments).forEach((dept) => {
      const subcats = departments[dept] || [];
      [...subcats, ""].forEach((sub) => {
        catalog
          .filter((c) => c.department === dept && (c.subcategory || "") === sub)
          .forEach(pushItem);
      });
    });
    // safety net: any item whose department no longer matches the current list
    catalog.forEach((c) => { if (!pushed.has(c.id)) pushItem(c); });
    const json = JSON.stringify(rows, null, 2);

    try {
      await navigator.clipboard.writeText(json);
      setCatalogCopyState("copied");
      setTimeout(() => setCatalogCopyState("idle"), 2000);
    } catch (err) {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = withTimeStamp(`${exportDateStr()}_master-catalog.json`);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  }

  // Full state backup — everything needed to restore the app exactly as it
  // was at export time: every project (with its own items, days, notes),
  // tags, production/rental houses, brands, departments, and the master
  // catalog. Written as plain JSON and saved with a .json extension — the
  // platform's downloads capability only permits a fixed allow-list of
  // extensions, and .backup isn't on it.
  async function exportFullBackup() {
    setBackupError("");
    try {
      const backup = {
        type: "boxgo-full-backup",
        version: 1,
        exportedAt: new Date().toISOString(),
        userName,
        userEmail,
        userPhone,
        includeUsernameInPdf,
        includeEmailInPdf,
        includePhoneInPdf,
        projectTags,
        productionHouses,
        rentalHouses,
        brands,
        departments,
        catalog,
        projects,
        templates,
        theme,
        accentId,
        fontId,
      };
      const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
      const mmdd = exportDateStr();
      const nameSlug = userName.trim() ? `_${slug(userName)}` : "";
      const finalName = withTimeStamp(`${mmdd}_boxgo-backup${nameSlug}.json`);

      // A plain anchor-triggered download is inert on a published claude.ai
      // artifact — route it through the platform's downloads capability
      // instead, same as the PDF and master catalog exports.
      const downloads = window.claude ? await window.claude.use("downloads") : null;
      if (downloads) {
        await downloads.save({ filename: finalName, data: blob });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = finalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err?.code !== "declined") {
        console.error("Backup export failed:", err);
        setBackupError(`Backup couldn't be saved: ${err?.message || err}`);
      }
    }
  }

  function handleBackupFileSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!data || data.type !== "boxgo-full-backup") {
          setBackupError("That file doesn't look like a BOXGO backup.");
          return;
        }
        setBackupError("");
        setPendingRestore(data);
      } catch (err) {
        setBackupError("Couldn't read that file — it may be corrupted.");
      }
    };
    reader.readAsText(file);
  }

  function applyRestore(data) {
    setProjectsState(data.projects || []);
    setDepartments(data.departments || DEFAULT_DEPARTMENTS);
    setCatalog(data.catalog || []);
    setProjectTags(data.projectTags || DEFAULT_PROJECT_TAGS);
    setProductionHouses(data.productionHouses || []);
    setRentalHouses(data.rentalHouses || []);
    setBrands(data.brands || []);
    if (data.userName) setUserName(data.userName);
    if (data.userEmail) setUserEmail(data.userEmail);
    if (data.userPhone) setUserPhone(data.userPhone);
    if (typeof data.includeUsernameInPdf === "boolean") setIncludeUsernameInPdf(data.includeUsernameInPdf);
    if (typeof data.includeEmailInPdf === "boolean") setIncludeEmailInPdf(data.includeEmailInPdf);
    if (typeof data.includePhoneInPdf === "boolean") setIncludePhoneInPdf(data.includePhoneInPdf);
    if (data.templates) setTemplates(data.templates);
    if (data.theme) setTheme(data.theme);
    if (data.accentId) setAccentId(data.accentId);
    if (data.fontId) setFontId(data.fontId);
    setActiveProjectId(null);
    setView("projects");
    setPendingRestore(null);
  }

  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [shareGenerating, setShareGenerating] = useState(false);

  // Rasterizes the visible preview screen and slices it into a real
  // multi-page PDF file that downloads directly. This avoids the browser's
  // own print dialog and pagination entirely — no window.print(), no
  // dependency on how any particular browser or hosting page measures the
  // printable area, so page count is exactly what the content needs,
  // computed by us, every time.
  // Builds the actual PDF and returns it as a Blob — no side effects, no
  // download. Used both by the real download button and by the preview
  // screen, so the preview is never anything other than this exact file.
  // jsPDF is loaded on demand (it's a sizeable library, and most visits
  // never export a PDF) rather than imported at the top of the file.
  async function buildPdfBlob() {
    const [{ jsPDF }] = await Promise.all([import("jspdf"), loadJbmFont()]);
    const doc = new jsPDF({ unit: "pt", format: "a4" });

      // Embed JetBrains Mono directly (regular + bold) so Vietnamese
      // diacritics render as real, selectable text rather than a flattened
      // screenshot image.
      doc.addFileToVFS("JetBrainsMono-Regular.ttf", window.__JBM_REGULAR_B64);
      doc.addFont("JetBrainsMono-Regular.ttf", "JetBrainsMono", "normal");
      doc.addFileToVFS("JetBrainsMono-Bold.ttf", window.__JBM_BOLD_B64);
      doc.addFont("JetBrainsMono-Bold.ttf", "JetBrainsMono", "bold");
      doc.setFont("JetBrainsMono", "normal");

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      // Margins sized closer to a traditional A4 document (~2cm) rather
      // than the tighter working-draft margins used before.
      const marginX = 56, marginTop = 54, marginBottom = 46;
      const usableWidth = pageWidth - marginX * 2;
      const contentBottom = pageHeight - marginBottom;

      const dayColW = 24;
      const notesColW = 90;
      // Matches the on-screen manifest: when the project uses one shared
      // quantity for every day ("All days same"), the PDF prints a single
      // QTY column instead of a MAX column plus one column per day.
      const perDayQty = !!activeProject?.perDayQty;
      const singleQtyColW = 24;
      const maxColW = perDayQty && days.length > 1 ? 24 : 0;
      const dayColsWidth = perDayQty ? days.length * dayColW : singleQtyColW;
      // Item rows get an extra inset on top of the page margin (matching the
      // on-screen preview's row padding), so they read as nested under their
      // subcategory bar instead of running flush to the page edge.
      const rowInset = 20;
      const rowX = marginX + rowInset;
      const rowWidth = usableWidth - rowInset * 2;
      const nameColW = rowWidth - maxColW - dayColsWidth - notesColW;
      const accentRgb = hexToRgb(selectedAccent.light);
      const lh = (size) => size * 1.28;

      let y = marginTop;

      function newPage() {
        doc.addPage();
        y = marginTop;
        drawColumnHeader();
      }
      function ensureSpace(h) {
        if (y + h > contentBottom) newPage();
      }
      function drawColumnHeader() {
        doc.setFont("JetBrainsMono", "bold");
        doc.setFontSize(8);
        doc.setTextColor(136, 136, 136);
        doc.text("ITEM", rowX, y);
        if (maxColW > 0) {
          doc.text("MAX", rowX + nameColW + maxColW / 2, y, { align: "center" });
        }
        if (perDayQty) {
          days.forEach((d, i) => {
            doc.text(d.label.replace("Day ", "D"), rowX + nameColW + maxColW + i * dayColW + dayColW / 2, y, { align: "center" });
          });
        } else {
          doc.text("QTY", rowX + nameColW + maxColW + singleQtyColW / 2, y, { align: "center" });
        }
        doc.text("NOTES", rowX + nameColW + maxColW + dayColsWidth, y);
        y += 12;
      }

      const project = activeProject;
      const visibleGrouped = computeVisibleGrouped(manifestGrouped, itemData);
      const infoPairs = [
        { label: "Production House", values: [project?.productionHouse, project?.producer].filter(Boolean) },
        { label: "Rental House", values: [project?.rentalHouse, project?.gaffer].filter(Boolean) },
      ].filter((pair) => pair.values.length > 0);
      const shootDateRange = formatShootDateRange(project?.days);

      // Brand line now lives in the footer (see below) so the header stays
      // dedicated to the information that actually matters per-document.

      // Header: tag + name + date (left), prepared-by (right)
      const headerTopY = y;
      let leftX = marginX;
      doc.setFont("JetBrainsMono", "bold");
      if (project?.tag) {
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        const tagText = project.tag.toUpperCase();
        doc.text(tagText, leftX, y);
        leftX += doc.getTextWidth(tagText) + 8;
      }
      doc.setFontSize(17);
      doc.setTextColor(...accentRgb);
      const nameText = (project?.name || "Equipment List").toUpperCase();
      doc.text(nameText, leftX, y);
      leftX += doc.getTextWidth(nameText) + 8;
      if (shootDateRange) {
        doc.setTextColor(0, 0, 0);
        doc.text(`· ${shootDateRange}`, leftX, y);
      }

      // Prepared-by block, right-aligned
      let rightY = headerTopY;
      const rightX = marginX + usableWidth;
      if (includeUsernameInPdf && userName) {
        doc.setFont("JetBrainsMono", "bold");
        doc.setFontSize(17);
        doc.setTextColor(0, 0, 0);
        doc.text(userName, rightX, rightY, { align: "right" });
        rightY += 14;
      }
      if (includeEmailInPdf && userEmail) {
        doc.setFont("JetBrainsMono", "normal");
        doc.setFontSize(9);
        doc.setTextColor(85, 85, 85);
        doc.text(userEmail, rightX, rightY, { align: "right" });
        rightY += 11;
      }
      if (includePhoneInPdf && userPhone) {
        doc.setFont("JetBrainsMono", "normal");
        doc.setFontSize(9);
        doc.setTextColor(85, 85, 85);
        doc.text(userPhone, rightX, rightY, { align: "right" });
        rightY += 11;
      }

      y = Math.max(headerTopY + 10, rightY) + 8;

      // Info strip: Production House / Rental House flow left-to-right based
      // on actual content width (matching the preview's flex layout), and
      // Created On sits as a third block, right-aligned, on the same line —
      // one single strip instead of a separate stacked block up top.
      const hasCreatedOn = Boolean(project?.createdAt);
      if (infoPairs.length > 0 || hasCreatedOn) {
        let px = marginX;
        const gap = 28;
        infoPairs.forEach((pair) => {
          doc.setFont("JetBrainsMono", "bold");
          doc.setFontSize(8);
          doc.setTextColor(136, 136, 136);
          const labelText = pair.label.toUpperCase();
          doc.text(labelText, px, y);
          const labelWidth = doc.getTextWidth(labelText);

          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          const valueText = pair.values.join(" · ");
          doc.text(valueText, px, y + 13);
          const valueWidth = doc.getTextWidth(valueText);

          px += Math.max(labelWidth, valueWidth) + gap;
        });

        if (hasCreatedOn) {
          doc.setFont("JetBrainsMono", "bold");
          doc.setFontSize(8);
          doc.setTextColor(136, 136, 136);
          doc.text("CREATED ON", rightX, y, { align: "right" });
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          {
            const createdD = new Date(project.createdAt);
            doc.text(`${formatDMY(fmtDate(createdD))}  ${formatTime24(createdD)}`, rightX, y + 13, { align: "right" });
          }
        }

        y += 26;
      }

      // Divider
      doc.setDrawColor(...accentRgb);
      doc.setLineWidth(3);
      doc.line(marginX, y, marginX + usableWidth, y);
      doc.setLineWidth(1);
      y += 14;

      // Project note
      if (project?.note) {
        doc.setFont("JetBrainsMono", "bold");
        doc.setFontSize(8);
        doc.setTextColor(136, 136, 136);
        doc.text("PROJECT NOTE", marginX, y);
        y += 12;
        doc.setFont("JetBrainsMono", "normal");
        doc.setFontSize(10);
        doc.setTextColor(51, 51, 51);
        const noteLines = doc.splitTextToSize(project.note, usableWidth);
        noteLines.forEach((line) => { doc.text(line, marginX, y); y += lh(10); });
        y += 8;
      }

      if (Object.keys(visibleGrouped).length === 0) {
        doc.setFont("JetBrainsMono", "normal");
        doc.setFontSize(11);
        doc.setTextColor(136, 136, 136);
        doc.text("No quantities entered for this shoot yet.", marginX, y);
      } else {
        ensureSpace(16);
        drawColumnHeader();
      }

      orderedKeys(visibleGrouped, Object.keys(departments)).forEach((dept) => {
        ensureSpace(20 + 16 + 14 + 16);
        doc.setFillColor(...accentRgb);
        doc.rect(marginX, y, usableWidth, 17, "F");
        doc.setFont("JetBrainsMono", "bold");
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(dept.toUpperCase(), marginX + 8, y + 12);
        y += 17;

        orderedKeys(visibleGrouped[dept], departments[dept] || []).forEach((sub) => {
          ensureSpace(15 + 14 + 16);
          doc.setFillColor(242, 242, 242);
          doc.rect(marginX, y, usableWidth, 15, "F");
          doc.setFont("JetBrainsMono", "bold");
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.text(sub.toUpperCase(), marginX + 12, y + 11);
          y += 15;

          // Row geometry: a shared baseline offset can't give equal visual
          // clearance on both sides of the divider — a line's cap-height
          // eats into the space below its own baseline, but there's no
          // matching eat-in above the previous line's baseline (uppercase
          // text has no descender). So top and bottom use different values,
          // each sized off the embedded font's real metrics (cap-height
          // 0.731em, worst-case descender incl. Vietnamese marks 0.213em)
          // plus a flat 3pt of intended clearance:
          const G = 4.5;
          const topPad = G + 0.731 * 10;   // clears the next line's cap-height
          const bottomPad = G + 0.22 * 10; // clears this line's descender
          const itemsInSub = visibleGrouped[dept][sub];
          itemsInSub.forEach((c, idx) => {
            const entry = itemData[c.id];
            const projectNote = entry?.noteHidden ? "" : (entry?.notes || "");
            doc.setFont("JetBrainsMono", "normal");
            doc.setFontSize(10);
            const nameLines = doc.splitTextToSize(c.name, nameColW - 4);
            doc.setFontSize(8.5);
            const catNoteLines = c.note ? doc.splitTextToSize(c.note, nameColW - 4) : [];
            doc.setFontSize(10);
            const projectNoteLines = projectNote ? doc.splitTextToSize(projectNote, notesColW - 4) : [];
            const rowLines = Math.max(nameLines.length + catNoteLines.length, projectNoteLines.length, 1);
            const rowHeight = topPad + (rowLines - 1) * lh(10) + bottomPad;

            ensureSpace(rowHeight);
            const rowTop = y;

            doc.setFont("JetBrainsMono", "bold");
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            let ty = rowTop + topPad;
            nameLines.forEach((line) => { doc.text(line, rowX, ty); ty += lh(10); });
            if (catNoteLines.length) {
              doc.setFont("JetBrainsMono", "normal");
              doc.setFontSize(8.5);
              doc.setTextColor(136, 136, 136);
              catNoteLines.forEach((line) => { doc.text(line, rowX, ty); ty += lh(8.5); });
            }

            if (maxColW > 0) {
              const qtyValues = days.map((d) => entry?.quantities?.[d.id] || 0).filter((q) => q > 0);
              const peak = qtyValues.length > 0 ? Math.max(...qtyValues) : 0;
              doc.setFont("JetBrainsMono", "bold");
              doc.setFontSize(10);
              if (peak > 0) doc.setTextColor(...accentRgb); else doc.setTextColor(210, 210, 206);
              doc.text(String(peak), rowX + nameColW + maxColW / 2, rowTop + topPad, { align: "center" });
            }

            doc.setFont("JetBrainsMono", "bold");
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            if (perDayQty) {
              days.forEach((d, i) => {
                const qty = entry?.quantities?.[d.id] || 0;
                doc.text(String(qty), rowX + nameColW + maxColW + i * dayColW + dayColW / 2, rowTop + topPad, { align: "center" });
              });
            } else {
              // "All days same" mode: every day carries the same value, so
              // the max across whatever's stored is the value to show.
              const sharedVals = days.map((d) => entry?.quantities?.[d.id] || 0).filter((q) => q > 0);
              const sharedQty = sharedVals.length > 0 ? Math.max(...sharedVals) : 0;
              doc.text(String(sharedQty), rowX + nameColW + maxColW + singleQtyColW / 2, rowTop + topPad, { align: "center" });
            }

            if (projectNoteLines.length) {
              doc.setFont("JetBrainsMono", "normal");
              doc.setFontSize(10);
              doc.setTextColor(136, 136, 136);
              let ny = rowTop + topPad;
              projectNoteLines.forEach((line) => { doc.text(line, rowX + nameColW + maxColW + dayColsWidth, ny); ny += lh(10); });
            }

            y = rowTop + rowHeight;
            if (idx < itemsInSub.length - 1) {
              doc.setDrawColor(242, 242, 242);
              doc.line(rowX, y, rowX + rowWidth, y);
            }
          });
          y += 3;
        });
      });

      // Footer: brand/tagline on the left, page numbers on the right — one
      // clean line, keeping the header itself free for per-document info.
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont("JetBrainsMono", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(180, 180, 180);
        doc.text("BOXGO · EQUIPMENT LIST COMPOSER", marginX, pageHeight - marginBottom / 2);
        doc.setFont("JetBrainsMono", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - marginBottom / 2, { align: "right" });
      }

      const blob = doc.output("blob");
      return { blob, totalPages };
    }

  // Builds a self-contained, read-only HTML snapshot of the given project's
  // current manifest — a frozen copy, not a live view. Everything the page
  // needs (data, styling, the PDF-drawing routine, the JetBrains Mono font
  // for correct Vietnamese rendering) is embedded directly in the file, so
  // it opens correctly for anyone, offline, with no claude.ai account and
  // no connection back to this project. Returns the HTML as a string.
  async function buildShareSnapshotHtml(project) {
    await loadJbmFont();
    const visibleGrouped = computeVisibleGrouped(manifestGrouped, itemData);
    const perDayQty = !!project?.perDayQty;
    const groups = orderedKeys(visibleGrouped, Object.keys(departments)).map((dept) => ({
      dept,
      subs: orderedKeys(visibleGrouped[dept], departments[dept] || []).map((sub) => ({
        sub,
        items: visibleGrouped[dept][sub].map((c) => {
          const entry = itemData[c.id];
          const qtyByDay = {};
          days.forEach((d) => { qtyByDay[d.id] = entry?.quantities?.[d.id] || 0; });
          return {
            name: c.name,
            catNote: c.note || "",
            note: entry?.noteHidden ? "" : (entry?.notes || ""),
            qtyByDay,
          };
        }),
      })),
    }));

    const data = {
      generatedAt: new Date().toISOString(),
      project: {
        name: project?.name || "Equipment List",
        tag: project?.tag || "",
        note: project?.note || "",
        createdAt: project?.createdAt || null,
        productionHouse: project?.productionHouse || "",
        producer: project?.producer || "",
        rentalHouse: project?.rentalHouse || "",
        gaffer: project?.gaffer || "",
        shootDateRange: formatShootDateRange(project?.days),
      },
      perDayQty,
      days: days.map((d) => ({ id: d.id, label: d.label })),
      preparedBy: includeUsernameInPdf ? userName : "",
      email: includeEmailInPdf ? userEmail : "",
      phone: includePhoneInPdf ? userPhone : "",
      accent: selectedAccent.light,
      groups,
    };

    const dataJson = JSON.stringify(data);
    // The main app's header already loaded these as globals — reuse the
    // exact same font bytes here rather than re-embedding a separate copy.
    const jbmRegular = window.__JBM_REGULAR_B64 || "";
    const jbmBold = window.__JBM_BOLD_B64 || "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${(data.project.name || "Equipment List").replace(/</g, "&lt;")} — Shared list</title>
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"><\/script>
<style>
  :root { --accent: ${data.accent}; --border: #e5e5e5; --muted: #888; --faint: #f2f2f2; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px 16px 60px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; background: #fff; }
  .wrap { max-width: 760px; margin: 0 auto; }
  .banner { font-size: 11px; letter-spacing: .04em; color: var(--muted); text-transform: uppercase; margin-bottom: 18px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; border-bottom: 3px solid var(--accent); padding-bottom: 14px; margin-bottom: 14px; }
  .titleRow { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .tag { font-weight: 700; font-size: 13px; }
  .name { font-weight: 700; font-size: 22px; color: var(--accent); text-transform: uppercase; }
  .dates { font-size: 13px; color: #333; }
  .preparedBy { text-align: right; font-size: 13px; color: #555; }
  .preparedBy .who { font-weight: 700; font-size: 17px; color: #111; }
  .infoStrip { display: flex; gap: 28px; flex-wrap: wrap; margin-bottom: 18px; }
  .infoBlock .label { font-size: 10px; letter-spacing: .04em; color: var(--muted); text-transform: uppercase; }
  .infoBlock .value { font-size: 13px; margin-top: 2px; }
  .note { font-size: 13px; color: #333; margin-bottom: 18px; }
  .note .label { font-size: 10px; letter-spacing: .04em; color: var(--muted); text-transform: uppercase; display: block; margin-bottom: 3px; }
  .deptBar { background: var(--accent); color: #fff; font-weight: 700; font-size: 13px; padding: 8px 10px; margin-top: 18px; text-transform: uppercase; }
  .subBar { background: var(--faint); font-weight: 700; font-size: 11px; padding: 6px 12px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 12px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: top; }
  td.qty { text-align: center; font-weight: 700; width: 44px; white-space: nowrap; }
  td.notes { color: var(--muted); font-size: 12px; width: 35%; }
  .itemName { font-weight: 700; }
  .catNote { color: var(--muted); font-size: 11px; margin-top: 2px; }
  .empty { color: var(--muted); font-size: 13px; padding: 16px 0; }
  .footerBar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid var(--border); padding: 10px 16px; display: flex; justify-content: center; }
  button.dl { background: var(--accent); color: #fff; border: none; border-radius: 6px; padding: 10px 20px; font-size: 13px; font-weight: 700; cursor: pointer; }
  button.dl:disabled { opacity: .6; cursor: default; }
</style>
</head>
<body>
<div class="wrap">
  <div class="banner">BOXGO · Read-only shared list</div>
  <div id="root"></div>
</div>
<div class="footerBar"><button class="dl" id="dlBtn">Download PDF</button></div>
<script>
window.__SNAPSHOT__ = ${dataJson};
window.__JBM_REGULAR_B64 = "${jbmRegular}";
window.__JBM_BOLD_B64 = "${jbmBold}";

function fmtDMY(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const p2 = (n) => String(n).padStart(2, "0");
  return p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + "/" + String(d.getFullYear()).slice(2);
}
function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const p2 = (n) => String(n).padStart(2, "0");
  return p2(d.getHours()) + ":" + p2(d.getMinutes()) + ":" + p2(d.getSeconds());
}
function esc(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

function render() {
  const d = window.__SNAPSHOT__;
  const root = document.getElementById("root");
  let html = '<div class="header"><div><div class="titleRow">' +
    (d.project.tag ? '<span class="tag">' + esc(d.project.tag.toUpperCase()) + '</span>' : '') +
    '<span class="name">' + esc(d.project.name) + '</span>' +
    (d.project.shootDateRange ? '<span class="dates">· ' + esc(d.project.shootDateRange) + '</span>' : '') +
    '</div></div>';
  if (d.preparedBy || d.email || d.phone) {
    html += '<div class="preparedBy">' +
      (d.preparedBy ? '<div class="who">' + esc(d.preparedBy) + '</div>' : '') +
      (d.email ? '<div>' + esc(d.email) + '</div>' : '') +
      (d.phone ? '<div>' + esc(d.phone) + '</div>' : '') +
      '</div>';
  }
  html += '</div>';

  const infoBlocks = [];
  if (d.project.productionHouse || d.project.producer) {
    infoBlocks.push(['PRODUCTION HOUSE', [d.project.productionHouse, d.project.producer].filter(Boolean).join(' · ')]);
  }
  if (d.project.rentalHouse || d.project.gaffer) {
    infoBlocks.push(['RENTAL HOUSE', [d.project.rentalHouse, d.project.gaffer].filter(Boolean).join(' · ')]);
  }
  if (d.project.createdAt) {
    infoBlocks.push(['CREATED ON', fmtDMY(d.project.createdAt) + '  ' + fmtTime(d.project.createdAt)]);
  }
  if (infoBlocks.length) {
    html += '<div class="infoStrip">' + infoBlocks.map(([l, v]) =>
      '<div class="infoBlock"><div class="label">' + l + '</div><div class="value">' + esc(v) + '</div></div>'
    ).join('') + '</div>';
  }

  if (d.project.note) {
    html += '<div class="note"><span class="label">Project note</span>' + esc(d.project.note) + '</div>';
  }

  if (d.groups.length === 0) {
    html += '<div class="empty">No quantities entered for this shoot yet.</div>';
  }

  d.groups.forEach((g) => {
    html += '<div class="deptBar">' + esc(g.dept) + '</div>';
    g.subs.forEach((s) => {
      html += '<div class="subBar">' + esc(s.sub) + '</div><table><tbody>';
      s.items.forEach((it) => {
        const vals = d.days.map((day) => it.qtyByDay[day.id] || 0);
        const shown = d.perDayQty
          ? vals.map((v, i) => '<span style="display:inline-block;min-width:20px">' + v + '</span>').join(' ')
          : String(Math.max(0, ...vals));
        html += '<tr><td><div class="itemName">' + esc(it.name) + '</div>' +
          (it.catNote ? '<div class="catNote">' + esc(it.catNote) + '</div>' : '') + '</td>' +
          '<td class="qty">' + shown + '</td>' +
          '<td class="notes">' + esc(it.note) + '</td></tr>';
      });
      html += '</tbody></table>';
    });
  });

  root.innerHTML = html;
}
render();

// Reuses the same jsPDF + embedded JetBrains Mono approach as the live app,
// but with a simpler, fixed layout — this button just needs a clean,
// correct PDF of a frozen snapshot, not pixel-parity with the live export.
async function downloadPdf() {
  const btn = document.getElementById("dlBtn");
  btn.disabled = true;
  btn.textContent = "Generating…";
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    if (window.__JBM_REGULAR_B64) {
      doc.addFileToVFS("JBM-R.ttf", window.__JBM_REGULAR_B64);
      doc.addFont("JBM-R.ttf", "JBM", "normal");
      doc.addFileToVFS("JBM-B.ttf", window.__JBM_BOLD_B64);
      doc.addFont("JBM-B.ttf", "JBM", "bold");
      doc.setFont("JBM", "normal");
    }
    const d = window.__SNAPSHOT__;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 48, marginTop = 50, marginBottom = 40;
    const usableW = pageW - marginX * 2;
    const rgb = (function (hex) {
      const h = (hex || "#000000").replace("#", "");
      const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    })(d.accent);
    let y = marginTop;
    function ensure(h) { if (y + h > pageH - marginBottom) { doc.addPage(); y = marginTop; } }
    function setF(style, size, color) { doc.setFont("JBM", style); doc.setFontSize(size); doc.setTextColor(color[0], color[1], color[2]); }

    setF("bold", 16, rgb);
    doc.text((d.project.name || "").toUpperCase(), marginX, y);
    if (d.project.shootDateRange) {
      setF("normal", 11, [0, 0, 0]);
      doc.text("· " + d.project.shootDateRange, marginX + doc.getTextWidth((d.project.name || "").toUpperCase()) + 8, y);
    }
    y += 22;
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.setLineWidth(2);
    doc.line(marginX, y, marginX + usableW, y);
    y += 16;

    d.groups.forEach((g) => {
      ensure(40);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(marginX, y, usableW, 17, "F");
      setF("bold", 11, [255, 255, 255]);
      doc.text(g.dept.toUpperCase(), marginX + 8, y + 12);
      y += 17;
      g.subs.forEach((s) => {
        ensure(30);
        doc.setFillColor(242, 242, 242);
        doc.rect(marginX, y, usableW, 15, "F");
        setF("bold", 9, [0, 0, 0]);
        doc.text(s.sub.toUpperCase(), marginX + 10, y + 11);
        y += 15;
        s.items.forEach((it) => {
          ensure(18);
          setF("normal", 10, [0, 0, 0]);
          doc.text(it.name, marginX + 8, y + 11);
          const vals = d.days.map((day) => it.qtyByDay[day.id] || 0);
          const shown = String(Math.max(0, ...vals));
          setF("bold", 10, rgb);
          doc.text(shown, marginX + usableW - 60, y + 11, { align: "center" });
          if (it.note) { setF("normal", 8.5, [136, 136, 136]); doc.text(it.note, marginX + usableW - 200, y + 11); }
          y += 16;
          doc.setDrawColor(240, 240, 240);
          doc.line(marginX + 8, y, marginX + usableW, y);
        });
        y += 3;
      });
    });

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (d.project.name || "equipment-list").replace(/[^a-z0-9]+/gi, "-") + ".pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } finally {
    btn.disabled = false;
    btn.textContent = "Download PDF";
  }
}
document.getElementById("dlBtn").addEventListener("click", downloadPdf);
<\/script>
</body>
</html>`;
  }

  async function exportShareSnapshot(project) {
    setShareGenerating(true);
    try {
      const html = await buildShareSnapshotHtml(project);
      const blob = new Blob([html], { type: "text/html" });
      const mmdd = exportDateStr();
      const finalName = withTimeStamp(`${mmdd}_${slug(project?.name) || "equipment-list"}_share.html`);
      const downloads = window.claude ? await window.claude.use("downloads") : null;
      if (downloads) {
        try {
          await downloads.save({ filename: finalName, data: blob });
        } catch (err) {
          if (err?.code !== "declined") {
            console.error("Downloads capability error:", err);
            alert("Sorry, the shared file couldn't be saved. Please try again.");
          }
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = finalName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } finally {
      setShareGenerating(false);
    }
  }

  async function exportToPdf(filename) {
    const name = (filename && filename.trim()) || defaultExportFilename(activeProject, userName);
    setPdfGenerating(true);
    try {
      const { blob } = await buildPdfBlob();
      const finalName = withTimeStamp(name.endsWith(".pdf") ? name : `${name}.pdf`);

      // Published claude.ai artifacts can't trigger a plain browser download
      // directly — saves have to go through the platform's own "downloads"
      // capability, which shows the viewer a confirmation before anything
      // is written to their device.
      const downloads = window.claude ? await window.claude.use("downloads") : null;
      if (downloads) {
        try {
          await downloads.save({ filename: finalName, data: blob });
        } catch (err) {
          if (err?.code !== "declined") {
            console.error("Downloads capability error:", err);
            alert("Sorry, the PDF couldn't be saved. Please try again.");
          }
        }
      } else {
        // Fallback for when this page is opened outside the claude.ai
        // artifact viewer (e.g. a self-hosted copy), where a plain
        // anchor-triggered download works normally.
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = finalName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Sorry, the PDF couldn't be generated. Please try again.");
    } finally {
      setPdfGenerating(false);
    }
  }

  const selectedAccent = ACCENT_CHOICES.find((a) => a.id === accentId) || ACCENT_CHOICES[0];
  const selectedFont = FONT_CHOICES.find((f) => f.id === fontId) || FONT_CHOICES[0];

  return (
    <div data-theme={theme} className="app-root" style={{
      fontFamily: selectedFont.stack,
      background: "var(--bg)",
      color: "var(--text)",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=${selectedFont.googleFamily}&display=swap');
        [data-theme="dark"] {
          --bg: #0D0D0D; --surface: #161615; --surface2: #1C1C1A;
          --text: #EDEDED; --muted: #9A9A96; --muted2: #6A6A66; --faint: #4A4A47;
          --border: #2A2A27; --border2: #3A3A37;
          --accent: ${selectedAccent.dark}; --accent-text: #0D0D0D; --danger: #FF6B4A;
        }
        [data-theme="light"] {
          --bg: #FAFAF8; --surface: #FFFFFF; --surface2: #F1F0EC;
          --text: #141413; --muted: #6B6B67; --muted2: #8A8A85; --faint: #C8C8C2;
          --border: #DEDEDA; --border2: #DEDEDA;
          --accent: ${selectedAccent.light}; --accent-text: #FFFFFF; --danger: #C0392B;
        }
        * { box-sizing: border-box; }
        ::selection { background: var(--accent); color: var(--accent-text); }
        .btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px; border-radius: 3px; border: 1px solid var(--text);
          background: transparent; color: var(--text); font-size: 12px; font-weight: 600;
          cursor: pointer; transition: background 120ms, color 120ms;
        }
        .btn:hover { background: var(--text); color: var(--bg); }
        .btn-primary {
          background: var(--accent); border-color: var(--accent); color: var(--accent-text);
        }
        .btn-primary:hover { background: var(--accent); border-color: var(--accent); color: var(--accent-text); opacity: 0.85; }
        .btn-ghost { border-color: var(--border2); color: var(--text); }
        .btn-ghost:hover { background: var(--text); color: var(--bg); }
        input, select, textarea {
          font-family: inherit; font-size: 14px; padding: 8px 10px;
          border: 1px solid var(--border2); border-radius: 3px; background: var(--surface); color: var(--text);
          outline: none;
        }
        input:focus, select:focus, textarea:focus { border-color: var(--accent); }
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none; margin: 0;
        }
        input[type="number"] { -moz-appearance: textfield; }
        input[type="date"] {
          -webkit-appearance: none;
          appearance: none;
        }
        .stencil {
          text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 0.9s linear infinite; }
        .row:hover { background: var(--surface2); }
        .new-project-row-btn { display: none; }
        .back-to-top-btn { display: none !important; }
        .category-fab { display: none !important; }
        .category-fab-menu { display: none !important; }
        @media print {
          @page { margin: 10mm; }
          .no-print { display: none !important; }
          body, .app-root, .print-root { background: white !important; color: black !important; }
          .app-root { min-height: 0 !important; height: auto !important; display: block !important; }
          .app-root * { min-height: 0 !important; height: auto !important; }
          .print-root { width: 100% !important; max-width: 100% !important; overflow: hidden !important; box-sizing: border-box; }
        }
        @media (max-width: 780px) {
          .rail { display: none !important; }
          .mobile-tabs { display: flex !important; }
          .new-project-card { display: none !important; }
          .new-project-row-btn { display: flex !important; }
          .back-to-top-btn { display: flex !important; }
          .category-fab { display: flex !important; }
          .category-fab-menu { display: flex !important; }
        }
      `}</style>

      {view !== "preview" && (
        <>
          {/* Top bar */}
          <header className="no-print" style={{
            padding: "12px 20px", borderBottom: "2px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Package size={18} strokeWidth={2.2} />
                <span className="stencil" style={{ fontSize: 17, letterSpacing: "0.08em", color: "var(--text)" }}>
                  BOXGO
                </span>
                <span className="stencil" style={{ fontSize: 10, letterSpacing: "0.01em", color: "var(--muted)" }}>
                  Equipment List Composer
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your name"
                  style={{
                    fontSize: 17, fontWeight: 800, letterSpacing: "0.02em", color: "var(--text)", textAlign: "right",
                    background: "none", border: "none", padding: 0, width: 200, maxWidth: "40vw", minWidth: 60,
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <button
                  className="stencil"
                  onClick={() => { setActiveProjectId(null); setView("projects"); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    fontSize: 15, letterSpacing: "0.08em", color: view === "projects" ? "var(--accent)" : "var(--text)",
                  }}
                >
                  Project Manager
                </button>
                {view === "manifest" && (
                  <>
                    <span style={{ color: "var(--border2)", fontSize: 15 }}>/</span>
                    <span
                      className="stencil"
                      style={{
                        fontSize: 15, display: "flex", alignItems: "center", gap: 6,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200,
                      }}
                    >
                      {activeProject?.tag && (
                        <span style={{ fontSize: 11, flexShrink: 0, color: "var(--muted)" }}>{activeProject.tag}</span>
                      )}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--accent)" }}>
                        {activeProject?.name || "Project"}
                      </span>
                    </span>
                  </>
                )}
                {view === "catalog" && (
                  <>
                    <span style={{ color: "var(--border2)", fontSize: 15 }}>/</span>
                    <span className="stencil" style={{ fontSize: 15, color: "var(--accent)" }}>Master Catalog</span>
                  </>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4, marginRight: 4 }}>
                  {saveState === "saving" && <><Loader2 size={12} className="spin" /> saving</>}
                  {saveState === "saved" && <><Check size={12} /> saved</>}
                </div>
                {view === "manifest" && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => goToPreview(activeProject.id)}
                  >
                    <FileSpreadsheet size={14} /> Preview
                  </button>
                )}
                {view === "catalog" && (
                  <>
                    <button className="btn btn-ghost" onClick={copyCatalogJson}>
                      <Copy size={14} /> {catalogCopyState === "copied" ? "Copied!" : "Copy Catalog"}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setShowDeptManager(true)}>
                      <ListFilter size={14} /> Manage
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => { setEditingCatalogId(null); setShowCatalogForm(true); }}
                    >
                      <Plus size={14} /> Create New
                    </button>
                  </>
                )}
                <button className="btn btn-ghost" onClick={() => setShowTagManager(true)}>
                  <Settings size={14} /> Settings
                </button>
              </div>
            </div>
          </header>


          <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
            {/* Sidebar */}
            {view !== "projects" && (
              <aside className="rail no-print" style={{
                width: 220, borderRight: "1px solid var(--border)", padding: "16px 14px",
                flexShrink: 0,
              }}>
                {view === "manifest" && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span className="stencil" style={{ fontSize: 11, color: "var(--muted)" }}>Shoot Days</span>
                    </div>
                    <SideItem
                      active={activeDay === "all"}
                      label="All Days"
                      icon={<CalendarDays size={13} />}
                      onClick={() => setActiveDay("all")}
                    />
                    {days.map((d) => (
                      <SideItem
                        key={d.id}
                        active={activeDay === d.id}
                        label={d.label.replace("Day ", "D")}
                        sub={[formatDM(d.date), d.location, d.projectLabel].filter(Boolean).join(" · ")}
                        onClick={() => setActiveDay(d.id)}
                      />
                    ))}
                  </div>
                )}

                <div>
                  <div className="stencil" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>Categories</div>
                  <SideItem
                    active={activeDept === "all"}
                    label="All"
                    icon={<ListFilter size={13} />}
                    onClick={() => selectCategory("all")}
                  />
                  {deptNames.map((d) => (
                    <SideItem
                      key={d}
                      active={activeDept === d}
                      label={d}
                      onClick={() => selectCategory(d)}
                    />
                  ))}
                </div>
              </aside>
            )}

            {/* Main list */}
            <main className="manifest-scroll" style={{ flex: 1, minWidth: 0, padding: "18px 22px" }}>
              {view === "projects" && (
                <>
                  {projectFilter && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 12 }}>
                      <span style={{ color: "var(--muted)" }}>
                        Showing projects where <b>{projectFilter.field === "productionHouse" ? "production house" : projectFilter.field === "rentalHouse" ? "rental house" : projectFilter.field}</b> is <b>{projectFilter.value}</b>
                      </span>
                      <button className="btn btn-ghost" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => setProjectFilter(null)}>
                        Clear filter ✕
                      </button>
                    </div>
                  )}
                  <ProjectListView
                    projects={filteredProjects}
                    catalog={catalog}
                    isFiltered={!!projectFilter}
                    onOpen={openProject}
                    onEdit={(p) => { setEditingProjectId(p.id); setShowProjectForm(true); }}
                    onExport={(p) => goToPreview(p.id)}
                    onDuplicate={duplicateProject}
                    onDelete={deleteProject}
                    onFilterAttr={(field, value) => setProjectFilter({ field, value })}
                    onCreateNew={() => { setEditingProjectId(null); setShowProjectForm(true); }}
                  />
                </>
              )}
              {view === "manifest" && (() => {
                const deptsToShow = Object.keys(departments).filter((d) => manifestGroupedFiltered[d] || d === "Others" || d === "Subrent");
                const searching = !!manifestSearch.trim();
                const infoPairs = [
                  { label: "Production House", values: [activeProject?.productionHouse, activeProject?.producer].filter(Boolean) },
                  { label: "Rental House", values: [activeProject?.rentalHouse, activeProject?.gaffer].filter(Boolean) },
                ].filter((pair) => pair.values.length > 0);
                return (
                  <>
                    <div style={{ marginBottom: 20, border: "1px solid var(--border)", borderRadius: 4, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        {infoPairs.length > 0 ? (
                          <div style={{ display: "flex", gap: 28 }}>
                            {infoPairs.map((pair) => (
                              <div key={pair.label}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{pair.label}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{pair.values.join(" · ")}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: "var(--muted2)" }}>No production details set yet.</div>
                        )}
                        <button
                          onClick={() => { setEditingProjectId(activeProjectId); setShowProjectForm(true); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", flexShrink: 0, padding: 2 }}
                          title="Edit project"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                      <textarea
                        ref={noteRef}
                        value={activeProject?.note || ""}
                        onChange={(e) => {
                          updateProject(activeProjectId, { note: e.target.value });
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        placeholder="Project note…"
                        rows={1}
                        style={{
                          width: "100%", resize: "none", overflow: "hidden", fontSize: 13, padding: "4px 0 0",
                          marginTop: 10, border: "none", borderRadius: 0, background: "none",
                        }}
                      />
                    </div>

                    <div style={{ position: "relative", marginBottom: 14 }}>
                      <Search size={14} style={{ position: "absolute", left: 9, top: 9, color: "var(--muted)" }} />
                      <input
                        value={manifestSearch}
                        onChange={(e) => setManifestSearch(e.target.value)}
                        placeholder="Search this project's items…"
                        style={{ width: "100%", paddingLeft: 30, fontSize: 13 }}
                      />
                    </div>

                    {deptsToShow.length === 0 && (
                      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
                        <div style={{ fontSize: 14 }}>
                          {searching
                            ? "No items match your search."
                            : catalog.length === 0
                            ? "Your master list is empty — add equipment to start filling in day-by-day quantities."
                            : "No catalog items match this filter."}
                        </div>
                      </div>
                    )}
                    {deptsToShow.map((dept) => {
                      const isCustomEligible = dept === "Others" || dept === "Subrent";
                      return (
                        <ManifestDeptSection
                          key={dept}
                          id={`mf-dept-${dept}`}
                          dept={dept}
                          color="#000000"
                          subcats={departments[dept] || []}
                          data={manifestGroupedFiltered[dept] || {}}
                          days={visibleDays}
                          itemData={itemData}
                          perDayQty={!!activeProject?.perDayQty}
                          collapsed={searching ? false : !!activeProject?.collapsedDepts?.[dept]}
                          onToggle={() => toggleDeptCollapse(dept)}
                          collapsedSubcats={activeProject?.collapsedSubcats || {}}
                          forceExpand={searching}
                          onToggleSubcat={(sub) => toggleSubcatCollapse(dept, sub)}
                          onQtyChange={setItemQty}
                          onNoteChange={setItemNote}
                          onNoteHiddenChange={setItemNoteHidden}
                          onCopyPreviousDay={copyPreviousDayQuantities}
                          onAddDay={addDay}
                          customItems={isCustomEligible ? customItems.filter((c) => (c.department || "Others") === dept && (!searching || c.name.toLowerCase().includes(manifestSearch.trim().toLowerCase()))) : null}
                          onAddCustomItem={isCustomEligible ? (name) => addCustomItem(name, dept) : null}
                          recentCustomNames={isCustomEligible ? recentCustomItemNames : null}
                          onRemoveCustomItem={isCustomEligible ? removeCustomItem : null}
                        />
                      );
                    })}
                  </>
                );
              })()}
              {view === "catalog" && (
                <>
                  <div style={{ position: "relative", marginBottom: 16 }}>
                    <Search size={14} style={{ position: "absolute", left: 9, top: 10, color: "var(--muted)" }} />
                    <input
                      placeholder="Search catalog…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ paddingLeft: 30, width: "100%", maxWidth: 320 }}
                    />
                  </div>
                  {catalog.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
                      <div style={{ fontSize: 14 }}>Catalog is empty — it fills up automatically as you add shoot items, or add entries directly.</div>
                    </div>
                  )}
                  {Object.keys(departments).map((dept) => (
                    <CatalogDeptSection
                      key={dept}
                      dept={dept}
                      color="#000000"
                      subcats={departments[dept] || []}
                      data={catalogGrouped[dept] || {}}
                      collapsed={!!collapsed["cat_" + dept]}
                      onToggle={() => setCollapsed((c) => ({ ...c, ["cat_" + dept]: !c["cat_" + dept] }))}
                      onEdit={(c) => { setEditingCatalogId(c.id); setShowCatalogForm(true); }}
                      onDelete={deleteCatalogItem}
                      onReorderItem={reorderCatalogItem}
                      onAddItem={(d, s) => { setLastCatalogDraft({ department: d, subcategory: s }); setEditingCatalogId(null); setShowCatalogForm(true); }}
                    />
                  ))}
                </>
              )}
            </main>
          </div>
          {(showBackToTop || ((view === "catalog" || view === "manifest") && deptNames.length > 0)) && (
            <div
              className="no-print"
              style={{
                position: "fixed", bottom: 20, right: 16, zIndex: 40,
                display: "flex", flexDirection: "column-reverse", alignItems: "flex-end", gap: 8,
              }}
            >
              {(view === "catalog" || view === "manifest") && deptNames.length > 0 && (
                <button
                  className="category-fab no-print"
                  onClick={() => setShowCategoryMenu((v) => !v)}
                  title="Jump to category"
                  style={{
                    width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                    border: "1px solid var(--border2)",
                    background: showCategoryMenu ? "var(--accent)" : "var(--surface)",
                    color: showCategoryMenu ? "var(--accent-text)" : "var(--text)",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
                  }}
                >
                  <ListFilter size={18} />
                </button>
              )}
              {showBackToTop && (
                <button
                  className="back-to-top-btn no-print"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  title="Back to top"
                  style={{
                    width: 42, height: 42, borderRadius: "50%", border: "none", flexShrink: 0,
                    background: "var(--accent)", color: "var(--accent-text)",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
                  }}
                >
                  <ChevronUp size={20} />
                </button>
              )}
            </div>
          )}
          {/* Positioned independently of the button stack above (not as a
              flex sibling) so opening it can never push "back to top"
              further up — it just appears to the left of its own button,
              at the same height, regardless of what else is showing. */}
          {showCategoryMenu && (view === "catalog" || view === "manifest") && deptNames.length > 0 && (
            <div
              className="category-fab-menu no-print"
              style={{
                position: "fixed", bottom: 20, right: 66, zIndex: 41,
                width: 200, maxHeight: "50vh", overflowY: "auto",
                background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 10,
                padding: 6, display: "flex", flexDirection: "column", gap: 3,
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              }}
            >
              <button
                onClick={() => { selectCategory("all"); setShowCategoryMenu(false); }}
                style={{
                  padding: "8px 10px", borderRadius: 6, border: "none", width: "100%",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  background: view === "catalog" && activeDept === "all" ? "var(--accent)" : "transparent",
                  color: view === "catalog" && activeDept === "all" ? "var(--accent-text)" : "var(--text)",
                }}
              >
                All
              </button>
              {deptNames.map((d) => (
                <button
                  key={d}
                  onClick={() => { selectCategory(d); setShowCategoryMenu(false); }}
                  style={{
                    padding: "8px 10px", borderRadius: 6, border: "none", width: "100%",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    background: view === "catalog" && activeDept === d ? "var(--accent)" : "transparent",
                    color: view === "catalog" && activeDept === d ? "var(--accent-text)" : "var(--text)",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {view === "preview" && (
        activeProject ? (
          <PreviewScreen
            project={activeProject}
            userName={userName}
            buildPdfBlob={buildPdfBlob}
            showBack={!cameFromUrl}
            onBack={exitPreview}
            onDownload={exportToPdf}
            pdfGenerating={pdfGenerating}
            onShare={exportShareSnapshot}
            shareGenerating={shareGenerating}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: 8 }}>
            <Package size={28} strokeWidth={1.6} style={{ color: "var(--muted)" }} />
            <div className="stencil" style={{ fontSize: 13, color: "var(--muted)" }}>Project not found</div>
          </div>
        )
      )}

      {pdfGenerating && (
        <div className="no-print" style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 600,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ background: "var(--surface)", borderRadius: 8, padding: "18px 26px", display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--border2)" }}>
            <Loader2 size={20} className="spin" style={{ color: "var(--accent)" }} />
            <span className="stencil" style={{ fontSize: 13, color: "var(--text)" }}>Generating PDF…</span>
          </div>
        </div>
      )}

      {showCatalogForm && (
        <CatalogItemFormModal
          initial={catalog.find((c) => c.id === editingCatalogId)}
          draft={lastCatalogDraft}
          departments={departments}
          brands={brands}
          catalog={catalog}
          onClose={() => { setShowCatalogForm(false); setEditingCatalogId(null); }}
          onSave={(data) => {
            addBrand(data.brand);
            if (editingCatalogId) {
              updateCatalogItem(editingCatalogId, data);
              setShowCatalogForm(false);
              setEditingCatalogId(null);
            } else {
              addCatalogItem(data);
              setLastCatalogDraft({ brand: data.brand, model: data.model, department: data.department, subcategory: data.subcategory });
            }
          }}
        />
      )}

      {showProjectForm && (
        <ProjectFormModal
          initial={projects.find((p) => p.id === editingProjectId)}
          productionHouses={productionHouses}
          rentalHouses={rentalHouses}
          recentProjectNames={recentProjectNames}
          recentProjectLabels={recentProjectLabels}
          projectTags={projectTags}
          templates={templates}
          onSaveAsTemplate={(name) => saveAsTemplate(projects.find((p) => p.id === editingProjectId), name)}
          onManageTags={() => setShowTagManager(true)}
          onClose={() => { setShowProjectForm(false); setEditingProjectId(null); }}
          onSave={(data) => {
            if (editingProjectId) updateProject(editingProjectId, data);
            else addProject(data);
            setShowProjectForm(false);
            setEditingProjectId(null);
          }}
        />
      )}

      {showTagManager && (
        <AttributesManagerModal
          tags={projectTags}
          onAddTag={addProjectTag}
          onRenameTag={renameProjectTag}
          onRemoveTag={removeProjectTag}
          productionHouses={productionHouses}
          onAddProductionHouse={addProductionHouse}
          onRenameProductionHouse={renameProductionHouse}
          onRemoveProductionHouse={removeProductionHouse}
          rentalHouses={rentalHouses}
          onAddRentalHouse={addRentalHouse}
          onRenameRentalHouse={renameRentalHouse}
          onRemoveRentalHouse={removeRentalHouse}
          templates={templates}
          onDeleteTemplate={deleteTemplate}
          userName={userName}
          onSetUserName={setUserName}
          userEmail={userEmail}
          onSetUserEmail={setUserEmail}
          userPhone={userPhone}
          onSetUserPhone={setUserPhone}
          includeUsernameInPdf={includeUsernameInPdf}
          onSetIncludeUsernameInPdf={setIncludeUsernameInPdf}
          includeEmailInPdf={includeEmailInPdf}
          onSetIncludeEmailInPdf={setIncludeEmailInPdf}
          includePhoneInPdf={includePhoneInPdf}
          onSetIncludePhoneInPdf={setIncludePhoneInPdf}
          theme={theme}
          onSetTheme={setTheme}
          accentId={accentId}
          onSetAccentId={setAccentId}
          fontId={fontId}
          onSetFontId={setFontId}
          onOpenCatalog={() => { setShowTagManager(false); setView("catalog"); }}
          onExportBackup={exportFullBackup}
          onRestoreFileSelect={handleBackupFileSelect}
          backupError={backupError}
          onClose={() => setShowTagManager(false)}
          onSignOut={() => supabase.auth.signOut()}
        />
      )}

      {pendingRestore && (
        <div className="no-print" style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 80, padding: 16,
        }}>
          <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 380, padding: 22, border: "1px solid var(--border2)" }}>
            <div className="stencil" style={{ fontSize: 14, marginBottom: 10 }}>Restore Backup</div>
            {pendingRestore.userName && (
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                Backed up by {pendingRestore.userName}
              </div>
            )}
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
              This backup was made {pendingRestore.exportedAt ? formatDMY(pendingRestore.exportedAt.slice(0, 10)) : "at an unknown time"} and contains:
            </div>
            <ul style={{ fontSize: 13, color: "var(--text)", margin: "0 0 16px", paddingLeft: 18 }}>
              <li>{(pendingRestore.projects || []).length} project{(pendingRestore.projects || []).length !== 1 ? "s" : ""}</li>
              <li>{(pendingRestore.catalog || []).length} catalog item{(pendingRestore.catalog || []).length !== 1 ? "s" : ""}</li>
              <li>{(pendingRestore.projectTags || []).length} tag{(pendingRestore.projectTags || []).length !== 1 ? "s" : ""}, {(pendingRestore.productionHouses || []).length} production house{(pendingRestore.productionHouses || []).length !== 1 ? "s" : ""}, {(pendingRestore.rentalHouses || []).length} rental house{(pendingRestore.rentalHouses || []).length !== 1 ? "s" : ""}</li>
              {(pendingRestore.templates || []).length > 0 && (
                <li>{pendingRestore.templates.length} template{pendingRestore.templates.length !== 1 ? "s" : ""}</li>
              )}
            </ul>
            <div style={{ fontSize: 12, color: "#AA0000", marginBottom: 20 }}>
              This replaces everything currently in the app. This can't be undone.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setPendingRestore(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => applyRestore(pendingRestore)}>Restore</button>
            </div>
          </div>
        </div>
      )}

      {undoState && (
        <div className="no-print" style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 90,
          background: "var(--text)", color: "var(--bg)", borderRadius: 6, padding: "10px 16px",
          display: "flex", alignItems: "center", gap: 14, boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          maxWidth: "90vw",
        }}>
          <span style={{ fontSize: 13 }}>{undoState.message}</span>
          <button
            onClick={performUndo}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bg)", fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em" }}
          >
            Undo
          </button>
        </div>
      )}

      {showDeptManager && (
        <DepartmentManagerModal
          departments={departments}
          onAddDepartment={addDepartment}
          onRenameDepartment={renameDepartment}
          onRemoveDepartment={removeDepartment}
          onReorderDepartment={reorderDepartment}
          onAddSubcategory={addSubcategory}
          onRenameSubcategory={renameSubcategory}
          onRemoveSubcategory={removeSubcategory}
          onReorderSubcategory={reorderSubcategory}
          onClose={() => setShowDeptManager(false)}
        />
      )}
    </div>
  );
}

function EditableAttrRow({ value, onRename, onRemove, uppercase, extraActions }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    setEditing(false);
    const v = draft.trim();
    if (v && v !== value) onRename(v);
    else setDraft(value);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
      {editing ? (
        <input
          autoFocus
          style={{ flex: 1, fontSize: 13, padding: "4px 6px" }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(value); setEditing(false); }
          }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{
            flex: 1, fontSize: 13, fontWeight: uppercase ? 800 : 600,
            textTransform: uppercase ? "uppercase" : "none", letterSpacing: uppercase ? 0.3 : 0,
            cursor: "text",
          }}
        >
          {value}
        </span>
      )}
      {extraActions}
      <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted2)" }} title="Rename">
        <Pencil size={12} />
      </button>
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted2)" }} title="Remove">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function EditableAttrSection({ title, placeholder, items, onAdd, onRename, onRemove, uppercase }) {
  const [newVal, setNewVal] = useState("");

  function submitAdd() {
    if (!newVal.trim()) return;
    onAdd(newVal);
    setNewVal("");
  }

  const sortedItems = [...items].sort((a, b) => a.localeCompare(b));

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="stencil" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>{title}</div>
      {items.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>None yet.</div>
      )}
      {sortedItems.map((item) => (
        <EditableAttrRow
          key={item}
          value={item}
          uppercase={uppercase}
          onRename={(v) => onRename(item, v)}
          onRemove={() => onRemove(item)}
        />
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input
          style={{ flex: 1 }}
          placeholder={placeholder}
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submitAdd(); }}
        />
        <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={submitAdd} disabled={!newVal.trim()}>Add</button>
      </div>
    </div>
  );
}

function SideItem({ active, label, sub, icon, dot, count, onClick }) {
  return (
    <div
      className="row"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 3,
        cursor: "pointer", marginBottom: 2,
        background: active ? "var(--accent)" : "transparent",
        color: active ? "var(--accent-text)" : "var(--text)",
      }}
    >
      {icon}
      {dot && <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: active ? "var(--accent-text)" : "var(--muted)", opacity: active ? 0.85 : 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
      </div>
      {typeof count === "number" && (
        <span style={{ fontSize: 11, color: active ? "var(--accent-text)" : "var(--muted)", opacity: active ? 0.85 : 1 }}>{count}</span>
      )}
    </div>
  );
}

function ProjectListView({ projects, catalog, isFiltered, onOpen, onEdit, onExport, onDuplicate, onDelete, onFilterAttr, onCreateNew }) {
  const [confirmId, setConfirmId] = useState(null);
  const [projSearch, setProjSearch] = useState("");
  if (projects.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--muted)" }}>
        <div style={{ fontSize: 15, marginBottom: 4 }}>{isFiltered ? "No matching projects" : "No projects yet"}</div>
        <div style={{ fontSize: 13, marginBottom: isFiltered ? 0 : 16 }}>
          {isFiltered ? "Clear the filter to see all projects." : "Create your first project to start building a shoot's equipment list."}
        </div>
        {!isFiltered && (
          <button className="btn btn-primary" onClick={onCreateNew} style={{ margin: "0 auto" }}>
            <Plus size={14} /> Create New
          </button>
        )}
      </div>
    );
  }
  const q = projSearch.trim().toLowerCase();
  const visibleProjects = q
    ? projects.filter((p) =>
        [p.name, p.tag, p.productionHouse, p.rentalHouse, p.producer, p.gaffer].some((v) => (v || "").toLowerCase().includes(q))
      )
    : projects;
  function attr(e, field, value) {
    e.stopPropagation();
    if (value) onFilterAttr(field, value);
  }
  function usedModels(project, matchTest) {
    const ids = Object.keys(project.itemData || {}).filter((id) => {
      const entry = project.itemData[id];
      return Object.values(entry.quantities || {}).some((q) => q > 0);
    });
    const names = ids
      .map((id) => catalog.find((c) => c.id === id))
      .filter((c) => c && matchTest(c))
      .map((c) => c.name);
    return [...new Set(names)];
  }
  return (
    <>
    <div style={{ position: "relative", marginBottom: 14 }}>
      <Search size={14} style={{ position: "absolute", left: 9, top: 9, color: "var(--muted)" }} />
      <input
        value={projSearch}
        onChange={(e) => setProjSearch(e.target.value)}
        placeholder="Search projects…"
        style={{ width: "100%", paddingLeft: 30, fontSize: 13 }}
      />
    </div>
    <button className="new-project-row-btn btn btn-primary" onClick={onCreateNew} style={{ width: "100%", justifyContent: "center", marginBottom: 12 }}>
      <Plus size={14} /> Create New
    </button>
    {visibleProjects.length === 0 && (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
        <div style={{ fontSize: 14 }}>No projects match your search.</div>
      </div>
    )}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
      <button
        className="new-project-card"
        onClick={onCreateNew}
        style={{
          border: "1px dashed var(--border2)", borderRadius: 4, background: "none", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
          color: "var(--accent)", minHeight: 96, fontSize: 13, fontWeight: 600,
        }}
      >
        <Plus size={18} /> Create New
      </button>
      {visibleProjects.map((p) => {
        const bodies = usedModels(p, (c) => /camera/i.test(c.department) && /bod(y|ies)/i.test(c.subcategory || ""));
        const lenses = usedModels(p, (c) => /lens/i.test(c.department) || /lens/i.test(c.subcategory || ""));
        const emptyDays = (p.days || []).filter(
          (d) => !Object.values(p.itemData || {}).some((entry) => (entry.quantities?.[d.id] || 0) > 0)
        );
        return (
          <div
            key={p.id}
            style={{ border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)", borderRadius: 4, background: "var(--surface)", cursor: "pointer", padding: "8px 12px 12px", display: "flex", flexDirection: "column" }}
            onClick={() => onOpen(p.id)}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 3, marginBottom: 3 }}>
              {p.tag && (
                <span
                  onClick={(e) => attr(e, "tag", p.tag)}
                  title="Filter by this tag"
                  style={{
                    fontWeight: 700, fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase",
                    color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 2, padding: "1px 4px",
                    cursor: "pointer", flexShrink: 0, marginRight: 4,
                  }}
                >
                  {p.tag}
                </span>
              )}
              <span
                onClick={(e) => attr(e, "name", p.name)}
                title="Filter by this project name"
                style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3, color: "var(--text)", textTransform: "uppercase", cursor: "pointer", marginRight: 4 }}
              >
                {p.name}
              </span>
              {formatShootDateRange(p.days) && (
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, color: "var(--muted2)" }}>{formatShootDateRange(p.days)}</span>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, rowGap: 3, fontSize: 11, color: "var(--muted)" }}>
              {(p.productionHouse || p.producer) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                  {p.productionHouse && (
                    <span
                      onClick={(e) => attr(e, "productionHouse", p.productionHouse)}
                      title="Filter by this production house"
                      style={{ fontWeight: 700, letterSpacing: 0.3, color: "var(--text)", cursor: "pointer" }}
                    >
                      {p.productionHouse}
                    </span>
                  )}
                  {p.producer && <span>{p.producer}</span>}
                </span>
              )}
              {(p.rentalHouse || p.gaffer) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                  {p.rentalHouse && (
                    <span
                      onClick={(e) => attr(e, "rentalHouse", p.rentalHouse)}
                      title="Filter by this rental house"
                      style={{ fontWeight: 700, letterSpacing: 0.3, color: "var(--text)", cursor: "pointer" }}
                    >
                      {p.rentalHouse}
                    </span>
                  )}
                  {p.gaffer && <span>{p.gaffer}</span>}
                </span>
              )}
            </div>
            {(() => {
              const locs = [...new Set((p.days || []).map((d) => d.location).filter(Boolean))];
              return locs.length > 0 ? (
                <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 5 }}>{locs.join(" · ")}</div>
              ) : null;
            })()}
            {bodies.length > 0 && (
              <div style={{ fontSize: 10.5, color: "var(--muted2)", marginTop: 5 }}>{bodies.join(" · ")}</div>
            )}
            {lenses.length > 0 && (
              <div style={{ fontSize: 10.5, color: "var(--muted2)", marginTop: 2 }}>{lenses.join(" · ")}</div>
            )}
            {p.note && (
              <div
                title={p.note}
                style={{
                  fontSize: 10.5, color: "var(--muted2)", marginTop: 2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}
              >
                {p.note.replace(/\s*\n+\s*/g, " · ")}
              </div>
            )}
            {emptyDays.length > 0 && emptyDays.length < (p.days || []).length && (
              <div style={{ fontSize: 10.5, color: "var(--accent)", marginTop: 4 }} title="No items entered yet for these days">
                ⚠ No items: {emptyDays.map((d) => d.label.replace("Day ", "D")).join(", ")}
              </div>
            )}
            <div style={{ marginTop: "auto", paddingTop: 12 }}>
              <div style={{ borderTop: "1px solid var(--border)" }} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginRight: -6, paddingTop: 12 }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => onEdit(p)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 6 }}><Pencil size={13} /></button>
                <button onClick={() => onExport(p)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 6 }} title="Preview"><Printer size={13} /></button>
                <button onClick={() => onDuplicate(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 6 }} title="Duplicate project"><Copy size={13} /></button>
                <button
                  onClick={() => setConfirmId(p.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 6 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
    {confirmId && (() => {
      const target = projects.find((p) => p.id === confirmId);
      if (!target) return null;
      return (
        <div className="no-print" style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 80, padding: 16,
        }}>
          <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 340, padding: 22, border: "1px solid var(--border2)" }}>
            <div className="stencil" style={{ fontSize: 14, marginBottom: 10 }}>Delete Project</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
              Delete "{target.name}"? This can't be undone.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setConfirmId(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ background: "var(--danger)", borderColor: "var(--danger)", color: "#FFFFFF" }}
                onClick={() => { onDelete(confirmId); setConfirmId(null); }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      );
    })()}
    </>
  );
}

function ManifestDeptSection({
  id, dept, color, subcats, data, days, itemData, perDayQty, collapsed, onToggle, onQtyChange, onNoteChange, onNoteHiddenChange,
  customItems, onAddCustomItem, onRemoveCustomItem, collapsedSubcats, onToggleSubcat, forceExpand, onAddDay, onCopyPreviousDay, recentCustomNames,
}) {
  const total = Object.values(data).reduce((n, arr) => n + arr.length, 0) + (customItems ? customItems.length : 0);
  const [newCustomName, setNewCustomName] = useState("");
  const definedSet = new Set(subcats || []);
  const flatItems = Object.keys(data)
    .filter((k) => k === "" || !definedSet.has(k))
    .flatMap((k) => data[k] || []);
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  // The header row (Item / D1 / D2 / …) and the body rows below scroll
  // horizontally as two separate elements — kept in sync here — so that
  // adding more shoot days, which makes the row wider than the screen,
  // scrolls the header along with the body instead of the header just
  // getting cut off.
  function syncScroll(fromRef, toRef) {
    return () => { if (toRef.current) toRef.current.scrollLeft = fromRef.current.scrollLeft; };
  }

  function submitCustom() {
    if (!newCustomName.trim()) return;
    onAddCustomItem(newCustomName);
    setNewCustomName("");
  }

  return (
    <div id={id} style={{ marginBottom: 32, border: "1px solid var(--border)", borderRadius: 4, scrollMarginTop: 16 }}>
      <div style={{ position: "sticky", top: 0, zIndex: 6, borderRadius: collapsed ? "4px" : "4px 4px 0 0", overflow: "hidden" }}>
        <div
          onClick={onToggle}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", background: "var(--accent)", color: "var(--accent-text)", cursor: "pointer",
          }}
        >
          <span className="stencil" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            {dept}
          </span>
        </div>
        {!collapsed && (
          <div
            ref={headerScrollRef}
            onScroll={syncScroll(headerScrollRef, bodyScrollRef)}
            style={{
              display: "flex", alignItems: "center", width: "100%", padding: "6px 14px",
              borderBottom: "1px solid var(--border)", background: "var(--surface)", overflowX: "auto",
            }}
          >
            <div style={{ flex: 1, minWidth: 160, maxWidth: 220, fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Item</div>
            <div style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
              {perDayQty ? (
                <>
                  {days.length > 1 && (
                    <div style={{ width: 40, flexShrink: 0, textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" }}>
                      Max
                    </div>
                  )}
                  {days.map((d, i) => (
                    <div key={d.id} style={{ width: 40, flexShrink: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                      {d.label.replace("Day ", "D")}
                      {days.length > 1 && i > 0 && (
                        <button
                          onClick={() => onCopyPreviousDay(i)}
                          style={{
                            position: "absolute", left: "100%", marginLeft: 2, top: "50%", transform: "translateY(-50%)",
                            background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", padding: 0,
                          }}
                          title={`Copy ${d.label.replace("Day ", "D")}'s quantities from the day before`}
                        >
                          <Copy size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ width: 40, flexShrink: 0, textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }} title="Same quantity applies to every shoot day">
                  Qty
                </div>
              )}
              <div style={{ width: 22, flexShrink: 0 }} />
              <button
                onClick={onAddDay}
                style={{ width: 22, flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", justifyContent: "center" }}
                title="Add another shoot day"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
      {!collapsed && (
        <div
          ref={bodyScrollRef}
          onScroll={syncScroll(bodyScrollRef, headerScrollRef)}
          style={{ background: "var(--surface)", overflowX: "auto", borderRadius: "0 0 4px 4px" }}
        >
          {flatItems.length > 0 && (
            <div style={{ minWidth: "max-content" }}>
              {flatItems.map((c) => (
                <ManifestItemRow
                  key={c.id}
                  item={c}
                  days={days}
                  perDayQty={perDayQty}
                  entry={itemData[c.id]}
                  onQtyChange={(dayId, qty) => onQtyChange(c.id, dayId, qty)}
                  onNoteChange={(note) => onNoteChange(c.id, note)}
                  onNoteHiddenChange={(hidden) => onNoteHiddenChange(c.id, hidden)}
                />
              ))}
            </div>
          )}

          {(subcats || []).map((sub) => {
            if (!data[sub] || data[sub].length === 0) return null;
            const subKey = `${dept}::${sub}`;
            const subCollapsed = !forceExpand && !!(collapsedSubcats && collapsedSubcats[subKey]);
            return (
              <div key={sub} style={{ minWidth: "max-content" }}>
                <div
                  onClick={() => onToggleSubcat(sub)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                    fontSize: 12, fontWeight: 800, color: "var(--text)", padding: "8px 14px",
                    textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--surface2)",
                  }}
                >
                  {subCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  {sub}
                </div>
                {!subCollapsed && data[sub].map((c) => (
                  <ManifestItemRow
                    key={c.id}
                    item={c}
                    days={days}
                    perDayQty={perDayQty}
                    entry={itemData[c.id]}
                    onQtyChange={(dayId, qty) => onQtyChange(c.id, dayId, qty)}
                    onNoteChange={(note) => onNoteChange(c.id, note)}
                    onNoteHiddenChange={(hidden) => onNoteHiddenChange(c.id, hidden)}
                    />
                ))}
              </div>
            );
          })}

          {customItems && (
            <div style={{ minWidth: "max-content" }}>
              {customItems.map((c) => (
                <ManifestItemRow
                  key={c.id}
                  item={c}
                  days={days}
                  perDayQty={perDayQty}
                  entry={itemData[c.id]}
                  onQtyChange={(dayId, qty) => onQtyChange(c.id, dayId, qty)}
                  onNoteChange={(note) => onNoteChange(c.id, note)}
                  onNoteHiddenChange={(hidden) => onNoteHiddenChange(c.id, hidden)}
                  onDelete={() => onRemoveCustomItem(c.id)}
                />
              ))}
              <div style={{ display: "flex", gap: 6, padding: "8px 14px", minWidth: "max-content" }}>
                <Combobox
                  value={newCustomName}
                  onChange={setNewCustomName}
                  options={recentCustomNames || []}
                  onKeyDown={(e) => { if (e.key === "Enter") submitCustom(); }}
                  placeholder="New item name…"
                  style={{ flex: 1, minWidth: 160 }}
                  inputStyle={{ fontSize: 12.5, padding: "5px 8px" }}
                />
                <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={submitCustom} disabled={!newCustomName.trim()}>
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ManifestItemRow({ item, days, perDayQty, entry, onQtyChange, onNoteChange, onNoteHiddenChange, onDelete }) {
  const [isAdding, setIsAdding] = useState(false);
  const quantities = entry?.quantities || {};
  const hasText = !!(entry?.notes && entry.notes.trim());
  const isHidden = !!entry?.noteHidden;
  const hasVisibleNote = hasText && !isHidden;
  const showNoteField = hasVisibleNote || isAdding;
  const qtyValues = Object.values(quantities).filter((q) => q > 0);
  const peak = qtyValues.length > 0 ? Math.max(...qtyValues) : 0;

  function handleNoteIconClick() {
    if (hasText && !isHidden) {
      onNoteHiddenChange(true);
      setIsAdding(false);
    } else if (hasText && isHidden) {
      onNoteHiddenChange(false);
    } else {
      setIsAdding((v) => !v);
    }
  }

  return (
    <>
      <div className="row" style={{
        display: "flex", alignItems: "center", width: "100%", minWidth: "max-content", padding: "6px 14px",
        borderTop: "1px solid var(--border)", fontSize: 13,
      }}>
        <div style={{ flex: 1, minWidth: 160, maxWidth: 220, whiteSpace: "normal", wordBreak: "break-word" }}>
          <div style={{ fontWeight: 600 }}>
            {item.name}
          </div>
          {item.note && (
            <div
              title={item.note}
              style={{
                fontSize: 11, color: "var(--muted2)", marginTop: 1,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220,
              }}
            >
              {item.note.replace(/\s*\n+\s*/g, " · ")}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
          {perDayQty ? (
            <>
              {days.length > 1 && (
                <div style={{ width: 40, flexShrink: 0, textAlign: "center", fontSize: 13, fontWeight: 800, color: peak > 0 ? "var(--accent)" : "var(--faint)" }} title="Highest quantity needed on any single day">
                  {peak}
                </div>
              )}
              {days.map((d) => {
                const qty = quantities[d.id] || 0;
                return (
                  <QtyDropdown key={d.id} value={qty} onChange={(n) => onQtyChange(d.id, n)} />
                );
              })}
            </>
          ) : (
            // "All days same" mode: one shared value for every day. We
            // reuse `peak` (the max across whatever's stored) as that
            // value, and write through the first day's id — setItemQty
            // fans the write out to every day when this mode is on.
            <QtyDropdown value={peak} onChange={(n) => onQtyChange(days[0]?.id, n)} />
          )}
          <button
            onClick={handleNoteIconClick}
            style={{ width: 24, flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: hasVisibleNote ? "var(--accent)" : (hasText && isHidden ? "var(--muted)" : "var(--faint)"), display: "flex", justifyContent: "center" }}
            title={hasVisibleNote ? "Hide note" : (hasText && isHidden ? "Show note" : "Add note")}
          >
            <StickyNote size={18} />
          </button>
          {onDelete ? (
            <button onClick={onDelete} style={{ width: 24, flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", justifyContent: "center" }} title="Remove item">
              <Trash2 size={17} />
            </button>
          ) : (
            <div style={{ width: 24, flexShrink: 0 }} />
          )}
        </div>
      </div>
      {showNoteField && (
        <div style={{ padding: "0 14px 8px 14px", minWidth: "max-content" }}>
          <input
            autoFocus={isAdding && !hasText}
            value={entry?.notes || ""}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Note for this item…"
            style={{
              width: "100%", maxWidth: 360, fontSize: 12, padding: "4px 2px",
              border: "none", borderBottom: "1px solid var(--border2)", borderRadius: 0, background: "none",
            }}
          />
        </div>
      )}
    </>
  );
}

function QtyDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [draft, setDraft] = useState(String(value));
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const active = value > 0;

  useEffect(() => { setDraft(String(value)); }, [value]);

  function openMenu() {
    const r = btnRef.current?.getBoundingClientRect();
    const menuWidth = 44;
    if (r) setPos({ top: r.bottom + 2, left: r.left - (menuWidth - r.width) / 2, width: menuWidth });
    setOpen(true);
  }

  function commit(raw) {
    const n = Math.max(0, Math.min(99, parseInt(raw, 10) || 0));
    onChange(n);
    setDraft(String(n));
  }

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(e) {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
      commit(draft);
    }
    function handleScroll(e) {
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick, true);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick, true);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open, draft]);

  return (
    <div style={{ position: "relative", flexShrink: 0, width: 40, display: "flex", justifyContent: "center" }}>
      <input
        ref={btnRef}
        value={draft}
        inputMode="numeric"
        onFocus={(e) => { e.target.select(); openMenu(); }}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
        onKeyDown={(e) => {
          if (e.key === "Enter") { commit(draft); setOpen(false); e.target.blur(); }
          if (e.key === "Escape") { setDraft(String(value)); setOpen(false); e.target.blur(); }
        }}
        style={{
          width: 34, padding: "4px 0", textAlign: "center", lineHeight: "16px",
          fontSize: 13, fontWeight: active ? 800 : 400,
          color: active ? "var(--accent)" : "var(--faint)",
          background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 3, cursor: "text",
        }}
      />
      {open && pos && (
        <div
          ref={menuRef}
          style={{
            position: "fixed", top: pos.top, left: pos.left, zIndex: 200,
            background: "var(--surface)", border: "1px solid var(--text)", borderRadius: 4,
            width: pos.width, maxHeight: 132, overflowY: "auto",
            boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
          }}
        >
          {QTY_OPTIONS.map((n) => (
            <div
              key={n}
              onMouseDown={(e) => { e.preventDefault(); commit(n); setOpen(false); }}
              style={{
                padding: "4px 0", lineHeight: "16px", textAlign: "center", fontSize: 12.5, cursor: "pointer",
                background: n === value ? "var(--surface2)" : "transparent",
                color: n === value ? "var(--accent)" : "var(--text)",
                fontWeight: n === value ? 700 : 400,
              }}
            >
              {n}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DayManagerModal({ days, recentProjectLabels, onUpdate, onAdd, onRemove, onClose }) {
  return (
    <div className="no-print" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 420, maxHeight: "85vh", overflowY: "auto", padding: 22, border: "1px solid var(--border2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="stencil" style={{ fontSize: 14 }}>Manage Shoot Days</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}><X size={18} /></button>
        </div>

        {days.map((d) => (
          <div key={d.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", width: 20, flexShrink: 0 }}>{d.label.replace("Day ", "D")}</span>
              <input
                type="date"
                style={{ width: 118, flexShrink: 0, fontSize: 12, padding: "5px 6px" }}
                value={d.date}
                onChange={(e) => onUpdate(d.id, { date: e.target.value })}
              />
              <Combobox
                value={d.projectLabel || ""}
                onChange={(v) => onUpdate(d.id, { projectLabel: v })}
                options={recentProjectLabels}
                placeholder="Type of shooting…"
                style={{ flex: 1 }}
              />
              <button onClick={() => onRemove(d.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", flexShrink: 0 }}>
                <Trash2 size={14} />
              </button>
            </div>
            <input
              style={{ width: "calc(100% - 26px)", marginLeft: 26 }}
              value={d.location || ""}
              onChange={(e) => onUpdate(d.id, { location: e.target.value })}
              placeholder="Location"
            />
          </div>
        ))}

        {days.length < 7 ? (
          <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }} onClick={onAdd}>
            <Plus size={14} /> Add Day
          </button>
        ) : (
          <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 6 }}>
            7-day maximum reached
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectFormModal({ initial, productionHouses, rentalHouses, recentProjectNames, recentProjectLabels, projectTags, templates, onSaveAsTemplate, onManageTags, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [tag, setTag] = useState((initial && initial.tag) || projectTags[0] || "");
  const [productionHouse, setProductionHouse] = useState(initial?.productionHouse || "");
  const [producer, setProducer] = useState(initial?.producer || "");
  const [rentalHouse, setRentalHouse] = useState(initial?.rentalHouse || "");
  const [gaffer, setGaffer] = useState(initial?.gaffer || "");
  const [templateId, setTemplateId] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [dayCount, setDayCount] = useState(initial?.days?.length || 1);
  const [perDayQty, setPerDayQty] = useState(initial?.perDayQty || false);
  const [dayRows, setDayRows] = useState(
    initial?.days?.length
      ? initial.days.map((d) => ({ id: d.id, date: d.date, location: d.location || "", projectLabel: d.projectLabel || "" }))
      : [{ id: uid(), date: tomorrowStr(), location: "", projectLabel: "" }]
  );

  function handleDayCount(n) {
    setDayCount(n);
    setDayRows((prev) => {
      const next = [...prev];
      while (next.length < n) {
        const prevDate = next.length > 0 ? next[next.length - 1].date : "";
        next.push({ id: uid(), date: prevDate ? addOneDay(prevDate) : tomorrowStr(), location: "", projectLabel: "" });
      }
      while (next.length > n) next.pop();
      return next;
    });
  }

  function updateDayRow(id, patch) {
    setDayRows((prev) => {
      const idx = prev.findIndex((d) => d.id === id);
      if (idx === -1) return prev;
      let next = prev.map((d) => (d.id === id ? { ...d, ...patch } : d));
      if (Object.prototype.hasOwnProperty.call(patch, "date")) next = cascadeDates(next, idx);
      return next;
    });
  }

  function submitSaveTemplate() {
    if (!templateName.trim()) return;
    onSaveAsTemplate(templateName.trim());
    setTemplateName("");
    setShowSaveTemplate(false);
  }

  function submit() {
    if (!name.trim()) return;
    const days = dayRows.map((d, i) => ({
      id: d.id, label: `Day ${i + 1}`, date: d.date, location: d.location, projectLabel: d.projectLabel,
    }));
    onSave({ name: name.trim(), tag, productionHouse: productionHouse.trim(), producer: producer.trim(), rentalHouse: rentalHouse.trim(), gaffer: gaffer.trim(), days, perDayQty, templateId: templateId || undefined });
  }

  return (
    <div className="no-print" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto", padding: 22, border: "1px solid var(--border2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="stencil" style={{ fontSize: 14 }}>{initial ? "Edit Project" : "New Project"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}><X size={18} /></button>
        </div>

        {!initial && templates.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              style={{ width: "100%", fontSize: 13, fontWeight: 800 }}
            >
              <option value="">Start from scratch</option>
              {templates.map((t) => <option key={t.id} value={t.id}>Start from "{t.name}"</option>)}
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <select
            style={{ width: 60, flexShrink: 0, fontSize: 11, fontWeight: 800, textTransform: "uppercase", padding: "0 4px" }}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            title="Project tag"
          >
            {projectTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Combobox
            value={name}
            onChange={setName}
            options={recentProjectNames}
            placeholder="Project Name"
            style={{ flex: 1 }}
          />
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <select
            value={productionHouse}
            onChange={(e) => setProductionHouse(e.target.value)}
            style={{ flex: 3 }}
          >
            <option value="">Production</option>
            {productionHouses.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <input
            value={producer}
            onChange={(e) => setProducer(e.target.value)}
            placeholder="Producer"
            style={{ flex: 2 }}
          />
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <select
            value={rentalHouse}
            onChange={(e) => setRentalHouse(e.target.value)}
            style={{ flex: 3 }}
          >
            <option value="">Rental</option>
            {rentalHouses.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <input
            value={gaffer}
            onChange={(e) => setGaffer(e.target.value)}
            placeholder="Gaffer"
            style={{ flex: 2 }}
          />
        </div>

        <button
          onClick={onManageTags}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 11, marginBottom: 16 }}
        >
          <Pencil size={11} /> Manage tags, production houses and rental houses
        </button>

        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <Field label="Shooting Days" style={{ flex: "0 0 auto", marginBottom: 0 }}>
            <div style={{ display: "flex", gap: 4, background: "var(--surface2)", borderRadius: 4, padding: 3, maxWidth: 280 }}>
              {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => handleDayCount(n)}
                  style={{
                    flex: 1, padding: "6px 0", fontSize: 13, fontWeight: 700, border: "none",
                    borderRadius: 3, cursor: "pointer", minWidth: 26,
                    background: dayCount === n ? "var(--accent)" : "transparent",
                    color: dayCount === n ? "var(--accent-text)" : "var(--text)",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Equipment Quantities" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
            <div style={{ display: "flex", gap: 4, background: "var(--surface2)", borderRadius: 4, padding: 3 }} title="Whether every shoot day uses the same gear quantities, or each day is entered separately">
              <button
                onClick={() => setPerDayQty(false)}
                style={{
                  flex: 1, padding: "6px 4px", fontSize: 12, fontWeight: 700, border: "none",
                  borderRadius: 3, cursor: "pointer",
                  background: !perDayQty ? "var(--accent)" : "transparent",
                  color: !perDayQty ? "var(--accent-text)" : "var(--text)",
                }}
              >
                All days same
              </button>
              <button
                onClick={() => setPerDayQty(true)}
                style={{
                  flex: 1, padding: "6px 4px", fontSize: 12, fontWeight: 700, border: "none",
                  borderRadius: 3, cursor: "pointer",
                  background: perDayQty ? "var(--accent)" : "transparent",
                  color: perDayQty ? "var(--accent-text)" : "var(--text)",
                }}
              >
                Custom per day
              </button>
            </div>
          </Field>
        </div>

        <Field label={dayRows.length > 1 ? "Shoot days" : "Shoot day"}>
          {dayRows.map((d, i) => (
            <div key={d.id} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", width: 20, flexShrink: 0 }}>D{i + 1}</span>
                <input
                  type="date"
                  style={{ width: 118, flexShrink: 0, fontSize: 12, padding: "5px 6px" }}
                  value={d.date}
                  onChange={(e) => updateDayRow(d.id, { date: e.target.value })}
                />
                <Combobox
                  value={d.projectLabel}
                  onChange={(v) => updateDayRow(d.id, { projectLabel: v })}
                  options={recentProjectLabels}
                  placeholder="Type of shooting…"
                  style={{ flex: 1 }}
                />
              </div>
              <input
                style={{ width: "calc(100% - 26px)", marginLeft: 26 }}
                value={d.location}
                onChange={(e) => updateDayRow(d.id, { location: e.target.value })}
                placeholder="Location"
              />
            </div>
          ))}
        </Field>

        {initial && (
          <div style={{ marginBottom: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            {showSaveTemplate ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  autoFocus
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitSaveTemplate(); }}
                  placeholder="Template name…"
                  style={{ flex: 1, fontSize: 12.5 }}
                />
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={submitSaveTemplate} disabled={!templateName.trim()}>Save</button>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setShowSaveTemplate(false); setTemplateName(""); }}>Cancel</button>
              </div>
            ) : (
              <button
                className="btn btn-ghost"
                onClick={() => setShowSaveTemplate(true)}
                style={{ width: "100%", justifyContent: "center" }}
              >
                <BookmarkPlus size={14} /> Save as Template
              </button>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>{initial ? "Save changes" : "Create project"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      {children}
    </div>
  );
}

function Combobox({ value, onChange, options, placeholder, style, inputStyle, autoFocus, onKeyDown }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = (options || [])
    .filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10);

  return (
    <div style={{ position: "relative", ...style }}>
      <input
        style={{ width: "100%", ...inputStyle }}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => { onChange(e.target.value); setQuery(e.target.value); setOpen(true); }}
        onFocus={(e) => { setOpen(true); setQuery(""); e.target.select(); }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% - 1px)", left: 0, right: 0, zIndex: 30,
          background: "var(--surface)", border: "1px solid var(--text)", borderTop: "none",
          borderRadius: "0 0 3px 3px", maxHeight: 160, overflowY: "auto",
          boxShadow: "0 4px 10px rgba(27,27,24,0.12)",
        }}>
          {filtered.map((o) => (
            <div
              key={o}
              onMouseDown={(e) => { e.preventDefault(); onChange(o); setOpen(false); }}
              className="row"
              style={{ padding: "7px 10px", fontSize: 13, cursor: "pointer" }}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AttributesManagerModal({
  tags, onAddTag, onRenameTag, onRemoveTag,
  productionHouses, onAddProductionHouse, onRenameProductionHouse, onRemoveProductionHouse,
  rentalHouses, onAddRentalHouse, onRenameRentalHouse, onRemoveRentalHouse,
  templates, onDeleteTemplate,
  userName, onSetUserName, userEmail, onSetUserEmail, userPhone, onSetUserPhone,
  includeUsernameInPdf, onSetIncludeUsernameInPdf, includeEmailInPdf, onSetIncludeEmailInPdf, includePhoneInPdf, onSetIncludePhoneInPdf,
  theme, onSetTheme, accentId, onSetAccentId, fontId, onSetFontId,
  onOpenCatalog, onExportBackup, onRestoreFileSelect, backupError, onClose, onSignOut,
}) {
  const restoreInputRef = useRef(null);
  return (
    <div className="no-print" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16,
    }}>
      <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 400, maxHeight: "88vh", overflowY: "auto", padding: 22, border: "1px solid var(--border2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, position: "sticky", top: -22, background: "var(--surface)", paddingTop: 22, marginTop: -22, zIndex: 5 }}>
          <div className="stencil" style={{ fontSize: 14 }}>Settings</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}><X size={18} /></button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="stencil" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>Master Catalog</div>
          <button
            className="btn btn-ghost"
            style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}
            onClick={onOpenCatalog}
          >
            <Package size={14} /> Manage Master Catalog
          </button>

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onExportBackup}>
              <FileSpreadsheet size={14} /> Backup
            </button>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => restoreInputRef.current?.click()}>
              <ClipboardPaste size={14} /> Restore
            </button>
            <input
              ref={restoreInputRef}
              type="file"
              accept=".json"
              onChange={onRestoreFileSelect}
              style={{ display: "none" }}
            />
          </div>
          {backupError && (
            <div style={{ fontSize: 11.5, color: "#AA0000", marginBottom: 12 }}>{backupError}</div>
          )}
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            Backup saves every project, tag, house, and the master catalog to one file. Restore replaces everything currently in the app with that file's contents.
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="stencil" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>Username</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <input
              value={userName}
              onChange={(e) => onSetUserName(e.target.value)}
              placeholder="Your name"
              style={{ flex: 1, fontSize: 13 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--muted)", flexShrink: 0 }}>
              <input type="checkbox" checked={includeUsernameInPdf} onChange={(e) => onSetIncludeUsernameInPdf(e.target.checked)} />
              in PDF
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <input
              value={userEmail}
              onChange={(e) => onSetUserEmail(e.target.value)}
              placeholder="Email"
              type="email"
              style={{ flex: 1, fontSize: 13 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--muted)", flexShrink: 0 }}>
              <input type="checkbox" checked={includeEmailInPdf} onChange={(e) => onSetIncludeEmailInPdf(e.target.checked)} />
              in PDF
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              value={userPhone}
              onChange={(e) => onSetUserPhone(e.target.value)}
              placeholder="Phone number"
              type="tel"
              style={{ flex: 1, fontSize: 13 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--muted)", flexShrink: 0 }}>
              <input type="checkbox" checked={includePhoneInPdf} onChange={(e) => onSetIncludePhoneInPdf(e.target.checked)} />
              in PDF
            </label>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="stencil" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>Appearance</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: "center", background: theme === "light" ? "var(--text)" : "transparent", color: theme === "light" ? "var(--bg)" : "var(--text)" }}
              onClick={() => onSetTheme("light")}
            >
              <Sun size={14} /> Light
            </button>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: "center", background: theme === "dark" ? "var(--text)" : "transparent", color: theme === "dark" ? "var(--bg)" : "var(--text)" }}
              onClick={() => onSetTheme("dark")}
            >
              <Moon size={14} /> Dark
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {ACCENT_CHOICES.map((a) => (
              <button
                key={a.id}
                onClick={() => onSetAccentId(a.id)}
                title={a.name}
                style={{
                  width: 26, height: 26, borderRadius: "50%", cursor: "pointer",
                  background: theme === "dark" ? a.dark : a.light,
                  border: accentId === a.id ? "2px solid var(--text)" : "2px solid transparent",
                  boxShadow: accentId === a.id ? "0 0 0 2px var(--surface)" : "none",
                  padding: 0,
                }}
              />
            ))}
          </div>

          <select
            value={fontId}
            onChange={(e) => onSetFontId(e.target.value)}
            style={{ width: "100%", marginTop: 12, fontSize: 13 }}
          >
            {FONT_CHOICES.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <EditableAttrSection
          title="Project Tags"
          placeholder="New tag…"
          items={tags}
          onAdd={onAddTag}
          onRename={onRenameTag}
          onRemove={onRemoveTag}
          uppercase
        />
        <EditableAttrSection
          title="Production Houses"
          placeholder="New production house…"
          items={productionHouses}
          onAdd={onAddProductionHouse}
          onRename={onRenameProductionHouse}
          onRemove={onRemoveProductionHouse}
        />
        <EditableAttrSection
          title="Rental Houses"
          placeholder="New rental house…"
          items={rentalHouses}
          onAdd={onAddRentalHouse}
          onRename={onRenameRentalHouse}
          onRemove={onRemoveRentalHouse}
        />

        {templates.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="stencil" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>Templates</div>
            {templates.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13 }}>{t.name}</span>
                <button onClick={() => onDeleteTemplate(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 20 }}>
          Click a name to rename it — this updates every project using it. Removing one just takes it off the list; projects already using it keep their saved value.
        </div>

        <button
          className="btn btn-ghost"
          style={{ width: "100%", justifyContent: "center", color: "#AA0000" }}
          onClick={onSignOut}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function CatalogDeptSection({ dept, color, subcats, data, collapsed, onToggle, onEdit, onDelete, onReorderItem, onAddItem }) {
  const total = Object.values(data).reduce((n, arr) => n + arr.length, 0);
  const definedSet = new Set(subcats);
  const flatItems = Object.keys(data)
    .filter((k) => k === "" || !definedSet.has(k))
    .flatMap((k) => data[k] || []);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  function itemRow(c) {
    return (
      <div
        key={c.id}
        draggable
        onDragStart={() => setDragId(c.id)}
        onDragOver={(e) => { e.preventDefault(); if (dragId && dragId !== c.id) setDragOverId(c.id); }}
        onDragLeave={() => setDragOverId((id) => (id === c.id ? null : id))}
        onDrop={(e) => {
          e.preventDefault();
          if (dragId && dragId !== c.id) onReorderItem(dragId, c.id);
          setDragId(null);
          setDragOverId(null);
        }}
        onDragEnd={() => { setDragId(null); setDragOverId(null); }}
        className="row"
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
          borderTop: dragOverId === c.id ? "2px solid var(--accent)" : "1px solid var(--border)", fontSize: 13.5,
        }}
      >
        <span style={{ color: "var(--faint)", cursor: "grab", display: "flex", flexShrink: 0 }} title="Drag to reorder">
          <GripVertical size={13} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{c.name}</div>
          {c.note && <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 1, whiteSpace: "pre-wrap" }}>{c.note}</div>}
        </div>
        <button onClick={() => onEdit(c)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
          <Trash2 size={13} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 32, border: "1px solid var(--border)", borderRadius: 4 }}>
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", background: "var(--accent)", color: "var(--accent-text)", cursor: "pointer",
          position: "sticky", top: 0, zIndex: 6, borderRadius: collapsed ? "4px" : "4px 4px 0 0",
        }}
      >
        <span className="stencil" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          {dept}
        </span>
      </div>
      {!collapsed && (
        <div style={{ background: "var(--surface)", borderRadius: "0 0 4px 4px", overflow: "hidden" }}>
          <div>
            {flatItems.map((c) => itemRow(c))}
            <div style={{ padding: "8px 14px" }}>
              <button
                onClick={() => onAddItem(dept, "")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}
              >
                <Plus size={11} /> Add Item
              </button>
            </div>
          </div>
          {subcats.map((sub) => (
            <div key={sub}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 14px", background: "var(--surface2)",
              }}>
                <span style={{
                  fontSize: 12, fontWeight: 800, color: "var(--text)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  {sub}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onAddItem(dept, sub); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}
                >
                  <Plus size={11} /> Add Item
                </button>
              </div>
              {(data[sub] || []).map((c) => itemRow(c))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CatalogItemFormModal({ initial, draft, departments, brands, catalog, onClose, onSave }) {
  const deptNames = Object.keys(departments);
  const seed = initial || draft;
  const [brand, setBrand] = useState(seed?.brand || "");
  const [model, setModel] = useState(seed?.model || (initial && !initial.brand ? initial.name || "" : ""));
  const [department, setDepartment] = useState(seed?.department || deptNames[0] || "");
  const [subcategory, setSubcategory] = useState(seed?.subcategory || departments[deptNames[0]]?.[0] || "");
  const [note, setNote] = useState(initial?.note || "");
  const [justAdded, setJustAdded] = useState(false);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const modelRef = useRef(null);
  const subs = departments[department] || [];

  function findDuplicate(brandU, modelU, noteT) {
    return (catalog || []).find((c) =>
      c.id !== initial?.id &&
      (c.brand || "").trim().toUpperCase() === brandU &&
      (c.model || "").trim().toUpperCase() === modelU &&
      (c.note || "").trim() === noteT
    );
  }

  function submit() {
    const brandU = brand.trim().toUpperCase();
    const modelU = model.trim().toUpperCase();
    const noteT = note.trim();
    const name = [brandU, modelU].filter(Boolean).join(" ");
    if (!name || !department) return;
    if (!confirmDuplicate && findDuplicate(brandU, modelU, noteT)) {
      setConfirmDuplicate(true);
      return;
    }
    onSave({ name, brand: brandU, model: modelU, department, subcategory: subcategory || "", note: noteT });
    setConfirmDuplicate(false);
    if (!initial) {
      setJustAdded(true);
      modelRef.current?.focus();
      modelRef.current?.select();
      setTimeout(() => setJustAdded(false), 1500);
    }
  }

  return (
    <div className="no-print" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 420, padding: 22, border: "1px solid var(--border2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="stencil" style={{ fontSize: 14 }}>{initial ? "Edit Catalog Entry" : "New Item"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Category" style={{ flex: 1 }}>
            {deptNames.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--muted)", padding: "8px 0" }}>No categories yet — add one from "Manage" first.</div>
            ) : (
              <select
                style={{ width: "100%" }}
                value={department}
                onChange={(e) => { setDepartment(e.target.value); setSubcategory(departments[e.target.value]?.[0] || ""); }}
              >
                {deptNames.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </Field>
          <Field label="Subcategory" style={{ flex: 1 }}>
            <select style={{ width: "100%" }} value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
              <option value="">— No subcategory —</option>
              {subs.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Brand" style={{ flex: 1 }}>
            <Combobox
              value={brand}
              onChange={(v) => { setBrand(v); setConfirmDuplicate(false); }}
              options={brands || []}
              placeholder="e.g. ARRI"
              inputStyle={{ textTransform: "uppercase" }}
            />
          </Field>
          <Field label="Model / Item name" style={{ flex: 1 }}>
            <input ref={modelRef} style={{ width: "100%", textTransform: "uppercase" }} value={model} onChange={(e) => { setModel(e.target.value); setConfirmDuplicate(false); }} placeholder="e.g. Alexa 35, or C-Stand" />
          </Field>
        </div>
        <Field label="Item note (optional)">
          <textarea
            rows={2}
            style={{ width: "100%", resize: "vertical" }}
            value={note}
            onChange={(e) => { setNote(e.target.value); setConfirmDuplicate(false); }}
            placeholder="e.g. comes with hard case"
          />
        </Field>
        {confirmDuplicate && (
          <div style={{ fontSize: 12, color: "#AA6600", marginBottom: 10, padding: "8px 10px", background: "#FFF6E8", borderRadius: 4 }}>
            An item with this exact brand, model, and note already exists. Tap "{initial ? "Save changes" : "Add to catalog"}" again to add it anyway.
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--muted)", opacity: justAdded ? 1 : 0, transition: "opacity 150ms" }}>Added ✓</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>{initial ? "Cancel" : "Done"}</button>
            <button className="btn btn-primary" onClick={submit}>{initial ? "Save changes" : "Add to catalog"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DepartmentManagerModal({
  departments, onAddDepartment, onRenameDepartment, onRemoveDepartment, onReorderDepartment,
  onAddSubcategory, onRenameSubcategory, onRemoveSubcategory, onReorderSubcategory, onClose,
}) {
  const deptNames = Object.keys(departments);
  const [newDept, setNewDept] = useState("");
  const [newSubFor, setNewSubFor] = useState({});
  const [dragInfo, setDragInfo] = useState(null); // { dept, index }
  const [dragOverIndex, setDragOverIndex] = useState(null);

  function submitNewDept() {
    if (!newDept.trim()) return;
    onAddDepartment(newDept.trim());
    setNewDept("");
  }

  function submitNewSub(dept) {
    const v = (newSubFor[dept] || "").trim();
    if (!v) return;
    onAddSubcategory(dept, v);
    setNewSubFor((prev) => ({ ...prev, [dept]: "" }));
  }

  return (
    <div className="no-print" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16,
    }}>
      <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 440, maxHeight: "88vh", overflowY: "auto", padding: 22, border: "1px solid var(--border2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="stencil" style={{ fontSize: 14 }}>Manage Categories</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}><X size={18} /></button>
        </div>

        {deptNames.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>No categories yet — add one below.</div>
        )}

        {deptNames.map((dept, deptIdx) => (
          <div key={dept} style={{ border: "1px solid var(--border)", borderRadius: 4, padding: 10, marginBottom: 10 }}>
            <EditableAttrRow
              value={dept}
              uppercase
              onRename={(v) => onRenameDepartment(dept, v)}
              onRemove={() => onRemoveDepartment(dept)}
              extraActions={
                <span style={{ display: "flex", gap: 6, marginRight: 2 }}>
                  <button
                    onClick={() => onReorderDepartment(deptIdx, deptIdx - 1)}
                    disabled={deptIdx === 0}
                    style={{
                      background: "none", border: "none", cursor: deptIdx === 0 ? "default" : "pointer",
                      color: deptIdx === 0 ? "var(--faint)" : "var(--muted)", padding: 0, display: "flex",
                    }}
                    title="Move up"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    onClick={() => onReorderDepartment(deptIdx, deptIdx + 1)}
                    disabled={deptIdx === deptNames.length - 1}
                    style={{
                      background: "none", border: "none", cursor: deptIdx === deptNames.length - 1 ? "default" : "pointer",
                      color: deptIdx === deptNames.length - 1 ? "var(--faint)" : "var(--muted)", padding: 0, display: "flex",
                    }}
                    title="Move down"
                  >
                    <ChevronDown size={15} />
                  </button>
                </span>
              }
            />
            <div style={{ marginTop: 6, paddingLeft: 4 }}>
              {(departments[dept] || []).map((sub, idx) => (
                <div
                  key={sub}
                  draggable
                  onDragStart={() => setDragInfo({ dept, index: idx })}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragInfo && dragInfo.dept === dept) setDragOverIndex(idx);
                  }}
                  onDragLeave={() => setDragOverIndex((i) => (i === idx ? null : i))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragInfo && dragInfo.dept === dept && dragInfo.index !== idx) {
                      onReorderSubcategory(dept, dragInfo.index, idx);
                    }
                    setDragInfo(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => { setDragInfo(null); setDragOverIndex(null); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    borderTop: dragOverIndex === idx && dragInfo?.dept === dept ? "2px solid #000000" : "2px solid transparent",
                  }}
                >
                  <span style={{ color: "var(--faint)", cursor: "grab", display: "flex", flexShrink: 0 }} title="Drag to reorder">
                    <GripVertical size={13} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <EditableAttrRow
                      value={sub}
                      onRename={(v) => onRenameSubcategory(dept, sub, v)}
                      onRemove={() => onRemoveSubcategory(dept, sub)}
                    />
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input
                  style={{ flex: 1, fontSize: 12, padding: "5px 8px" }}
                  placeholder="New subcategory…"
                  value={newSubFor[dept] || ""}
                  onChange={(e) => setNewSubFor((prev) => ({ ...prev, [dept]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") submitNewSub(dept); }}
                />
                <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => submitNewSub(dept)}>Add</button>
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input
            style={{ flex: 1 }}
            placeholder="New category…"
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitNewDept(); }}
          />
          <button className="btn btn-primary" onClick={submitNewDept} disabled={!newDept.trim()}>Add</button>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
          Renaming a department or subcategory updates every catalog item using it. Removing one just takes it off the list — existing items keep their saved value.
        </div>
      </div>
    </div>
  );
}

// Renders the preview screen. Builds the actual PDF and displays those
// exact bytes — there is no separate layout to keep in sync, so the
// preview and the downloaded file are structurally guaranteed to match.
//
// Preferred path: draw each page onto a plain <canvas>, sized to fit the
// screen width, then stack them in a normal scrollable <div>. Because
// these are ordinary DOM elements (not an embedded PDF viewer plugin),
// scrolling and scaling behave exactly like any other web page — no
// zoomed-in native viewer, no page-drag instead of scroll.
//
// This depends on the pdf.js library loading from a CDN at startup. If
// that failed for any reason (network hiccup, CDN issue), window.pdfjsLib
// won't exist and __PDFJS_LOAD_FAILED is set — in that case this falls
// back to the one-iframe-per-page view (native viewer, imperfect scaling,
// but functional), so a CDN problem degrades the preview rather than
// breaking it.
function PreviewScreen({ project, userName, buildPdfBlob, showBack, onBack, onDownload, pdfGenerating, onShare, shareGenerating }) {
  const [filename, setFilename] = useState(() => defaultExportFilename(project, userName));
  const [pdfUrl, setPdfUrl] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pageImages, setPageImages] = useState(null); // array of data URLs once canvas-rendered
  const [useFallback, setUseFallback] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let url = null;
    setPageImages(null);
    setUseFallback(false);
    (async () => {
      try {
        const { blob, totalPages: pages } = await buildPdfBlob();
        url = URL.createObjectURL(blob);
        if (cancelled) return;
        setPdfUrl(url);
        setTotalPages(pages);
        setError(false);

        if (!window.pdfjsLib || window.__PDFJS_LOAD_FAILED) {
          setUseFallback(true);
          return;
        }

        try {
          const arrayBuffer = await blob.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const targetWidth = Math.min(900, window.innerWidth - 32);
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const images = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const unscaled = page.getViewport({ scale: 1 });
            const scale = (targetWidth * dpr) / unscaled.width;
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d");
            await page.render({ canvasContext: ctx, viewport }).promise;
            images.push(canvas.toDataURL("image/png"));
          }
          if (!cancelled) setPageImages(images);
        } catch (err) {
          console.error("Canvas PDF render failed, falling back to native viewer:", err);
          if (!cancelled) setUseFallback(true);
        }
      } catch (err) {
        console.error("Preview generation failed:", err);
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  const stillLoadingCanvas = !error && pdfUrl && !useFallback && !pageImages;

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface2)", display: "flex", flexDirection: "column" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--surface)", borderBottom: "2px solid var(--border)",
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        {showBack && (
          <button className="btn btn-ghost" onClick={onBack} style={{ padding: "6px 10px" }}>
            <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} /> Back
          </button>
        )}
        <div style={{ flex: 1, minWidth: 80 }}>
          <div className="stencil" style={{ fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name || "Equipment List"}
          </div>
        </div>
        {onShare && (
          <button
            className="btn btn-ghost"
            onClick={() => onShare(project)}
            disabled={shareGenerating}
            title="Save a read-only snapshot of this list as a shareable webpage — frozen at today's quantities, viewable by anyone without a claude.ai account."
            style={{ padding: "6px 12px", fontSize: 12 }}
          >
            <Share2 size={14} /> {shareGenerating ? "Preparing…" : "Share snapshot"}
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={() => onDownload(filename)}
          disabled={pdfGenerating}
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          <Printer size={14} /> Download PDF
        </button>
      </div>

      <div style={{ flex: 1, padding: 16 }}>
        {error && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", flexDirection: "column", gap: 8 }}>
            <div className="stencil" style={{ fontSize: 13, color: "var(--muted)" }}>Couldn't generate the preview.</div>
          </div>
        )}
        {(!error && !pdfUrl) || stillLoadingCanvas ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 10 }}>
            <Loader2 size={18} className="spin" style={{ color: "var(--accent)" }} />
            <span className="stencil" style={{ fontSize: 12, color: "var(--muted)" }}>Generating preview…</span>
          </div>
        ) : null}
        {!error && pdfUrl && pageImages && (
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            {pageImages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Page ${i + 1} of ${totalPages}`}
                style={{ width: "100%", display: "block", marginBottom: 16, border: "1px solid var(--border)", borderRadius: 4 }}
              />
            ))}
          </div>
        )}
        {!error && pdfUrl && useFallback && (
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <iframe
                key={p}
                src={`${pdfUrl}#page=${p}&toolbar=0&navpanes=0&statusbar=0&view=FitH`}
                title={`PDF preview — page ${p} of ${totalPages}`}
                style={{
                  width: "100%",
                  aspectRatio: "595 / 842",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  background: "#fff",
                  display: "block",
                  marginBottom: 16,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
