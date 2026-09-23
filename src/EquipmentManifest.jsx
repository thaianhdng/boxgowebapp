import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus, Pencil, Search, FileSpreadsheet, X, Copy, Package, ChevronUp, CalendarDays, ListFilter, Loader2, Check, Settings,
} from "lucide-react";
import { supabase } from "./lib/supabaseClient.js";
import { AttributesManagerModal } from "./components/AttributesManagerModal.jsx";
import { CatalogDeptSection } from "./components/CatalogDeptSection.jsx";
import { CatalogItemFormModal } from "./components/CatalogItemFormModal.jsx";
import { DepartmentManagerModal } from "./components/DepartmentManagerModal.jsx";
import { ManifestDeptSection } from "./components/ManifestDeptSection.jsx";
import { PreviewScreen } from "./components/PreviewScreen.jsx";
import { ProjectFormModal } from "./components/ProjectFormModal.jsx";
import { ProjectListView } from "./components/ProjectListView.jsx";
import { SideItem } from "./components/SideItem.jsx";
import { DEFAULT_DEPARTMENTS, DEFAULT_BRANDS, DEFAULT_CATALOG, DEFAULT_PROJECT_TAGS, ACCENT_CHOICES, FONT_CHOICES } from "./constants.js";
import { buildPdf } from "./lib/pdf.js";
import { createSnapshot, enableLiveLink, disableLiveLink, shareUrlFor } from "./lib/share.js";
import { uid, newProjectId, relabelDays, tomorrowStr, addOneDay, cascadeDates, formatDMY, formatDM, slug, exportDateStr, withTimeStamp, defaultExportFilename, orderDepartments } from "./lib/utils.js";


// Gives every day an explicit number for every item that has any. A day
// that already has its own number keeps it; a day with nothing stored gets
// `fill` — by default the item's shared quantity (what "All days same"
// shows), used when switching to per-day, so a day added while in "All
// days same" matches what was shown for it.
function fillUnsetDays(itemData, days, fill) {
  const result = {};
  for (const [id, entry] of Object.entries(itemData || {})) {
    const quantities = { ...(entry.quantities || {}) };
    const vals = Object.values(quantities);
    const shared = vals.length ? Math.max(...vals) : 0;
    (days || []).forEach((d) => { if (!(d.id in quantities)) quantities[d.id] = fill ?? shared; });
    result[id] = { ...entry, quantities };
  }
  return result;
}

// The app_state row as saved to Supabase. Built from one place so the
// "has this changed since it was saved?" check compares like with like.
function buildAppStatePayload(v) {
  return {
    catalog: v.catalog,
    departments: v.departments,
    project_tags: v.projectTags,
    production_houses: v.productionHouses,
    rental_houses: v.rentalHouses,
    brands: v.brands,
    templates: v.templates,
    settings: {
      userName: v.userName, userEmail: v.userEmail, userPhone: v.userPhone,
      includeUsernameInPdf: v.includeUsernameInPdf, includeEmailInPdf: v.includeEmailInPdf, includePhoneInPdf: v.includePhoneInPdf,
      theme: v.theme, accentId: v.accentId, fontId: v.fontId,
      departmentOrder: Object.keys(v.departments),
    },
  };
}

const CATALOG_OWNER_EMAIL = "thaianh.dng@gmail.com";

export default function EquipmentManifest({ session }) {
  // Copy Catalog only matters to whoever maintains the default catalog new
  // accounts start with, so it's only shown on that account.
  const isCatalogOwner = session?.user?.email?.toLowerCase() === CATALOG_OWNER_EMAIL;
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
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
  const [theme, setTheme] = useState("dark"); // "light" | "dark" | "system"
  // Tracks the OS/browser color-scheme preference live, so "system" mode
  // follows it without needing a page reload when it changes.
  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : true
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setSystemPrefersDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  const resolvedTheme = theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;
  // Keep the page behind the app (seen on over-scroll) the same color as the app.
  useEffect(() => {
    document.body.style.background = resolvedTheme === "dark" ? "#0D0D0D" : "#FAFAF8";
  }, [resolvedTheme]);
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

  // Every device keeps a full copy of this user's data in memory, and a tab
  // can sit open for days. To stop a stale device writing its old copy over
  // newer changes from another device:
  // - saves only write what actually changed since the last load/save
  //   (tracked in savedProjectsRef / savedStateJsonRef), and
  // - the app re-fetches from Supabase whenever it comes back into view,
  //   before the user can edit anything, unless it has unsaved changes.
  const savedProjectsRef = useRef(new Map()); // project id -> object as last loaded/saved
  const savedStateJsonRef = useRef(null);     // app_state payload as last saved
  const pendingSavesRef = useRef(0);

  async function fetchServerData() {
    const userId = session.user.id;
    const [{ data: stateRow, error: stateErr }, { data: projectRows, error: projectsErr }] = await Promise.all([
      supabase.from("app_state").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("projects").select("*").eq("user_id", userId),
    ]);
    if (stateErr) throw stateErr;
    if (projectsErr) throw projectsErr;
    return { stateRow, projectRows: projectRows || [] };
  }

  function applyServerData({ stateRow, projectRows }) {
    if (stateRow) {
      const st = stateRow.settings || {};
      const depts = orderDepartments(stateRow.departments || departments, st.departmentOrder);
      if (!depts.Subrent) depts.Subrent = [];
      const v = {
        catalog: stateRow.catalog || catalog,
        departments: depts,
        projectTags: stateRow.project_tags || projectTags,
        productionHouses: stateRow.production_houses || productionHouses,
        rentalHouses: stateRow.rental_houses || rentalHouses,
        brands: stateRow.brands || brands,
        templates: stateRow.templates || templates,
        userName: st.userName || "",
        userEmail: st.userEmail || "",
        userPhone: st.userPhone || "",
        includeUsernameInPdf: typeof st.includeUsernameInPdf === "boolean" ? st.includeUsernameInPdf : true,
        includeEmailInPdf: typeof st.includeEmailInPdf === "boolean" ? st.includeEmailInPdf : false,
        includePhoneInPdf: typeof st.includePhoneInPdf === "boolean" ? st.includePhoneInPdf : false,
        theme: st.theme || "dark",
        accentId: st.accentId || "amber",
        fontId: st.fontId || "jetbrains",
      };
      setCatalog(v.catalog);
      setDepartments(v.departments);
      setProjectTags(v.projectTags);
      setProductionHouses(v.productionHouses);
      setRentalHouses(v.rentalHouses);
      setBrands(v.brands);
      setTemplates(v.templates);
      setUserName(v.userName);
      setUserEmail(v.userEmail);
      setUserPhone(v.userPhone);
      setIncludeUsernameInPdf(v.includeUsernameInPdf);
      setIncludeEmailInPdf(v.includeEmailInPdf);
      setIncludePhoneInPdf(v.includePhoneInPdf);
      setTheme(v.theme);
      setAccentId(v.accentId);
      setFontId(v.fontId);
      // What we just loaded is by definition saved — so applying it never
      // triggers a write-back that could race another device's save.
      savedStateJsonRef.current = JSON.stringify(buildAppStatePayload(v));
    }
    const loadedProjects = projectRows.map((r) => ({ ...r.data, id: r.id }));
    savedProjectsRef.current = new Map(loadedProjects.map((p) => [p.id, p]));
    setProjectsState(loadedProjects);
    setLiveShareTokens(Object.fromEntries(projectRows.filter((r) => r.share_token).map((r) => [r.id, r.share_token])));
    // A project deleted on another device: leave its screens.
    if (activeProjectId && !loadedProjects.some((p) => p.id === activeProjectId)) {
      setActiveProjectId(null);
      setView("projects");
    }
  }

  // load — reads everything from Supabase once we have an authenticated
  // session. app_state is one row per user (catalog/departments/tags/
  // houses/brands/templates/settings); projects are one row each, keyed
  // by the project's own id.
  useEffect(() => {
    let cancelled = false;
    if (!session) return;
    (async () => {
      try {
        const data = await fetchServerData();
        if (cancelled) return;
        applyServerData(data);
        setLoaded(true);
      } catch (e) {
        // Never fall through to "loaded" here: the defaults still in state
        // would then autosave over this user's real catalog and settings.
        console.error("Failed to load BOXGO data from Supabase:", e);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loadAttempt]);

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


  const appStatePayload = () => buildAppStatePayload({
    catalog, departments, projectTags, productionHouses, rentalHouses, brands, templates,
    userName, userEmail, userPhone, includeUsernameInPdf, includeEmailInPdf, includePhoneInPdf, theme, accentId, fontId,
  });
  const changedProjects = () => projects.filter((p) => savedProjectsRef.current.get(p.id) !== p);
  const hasUnsavedChanges = () =>
    pendingSavesRef.current > 0 ||
    changedProjects().length > 0 ||
    JSON.stringify(appStatePayload()) !== savedStateJsonRef.current;

  async function runSave(write) {
    pendingSavesRef.current += 1;
    setSaveState("saving");
    try {
      await write();
      pendingSavesRef.current -= 1;
      if (pendingSavesRef.current === 0) setSaveState("saved");
    } catch (e) {
      pendingSavesRef.current -= 1;
      console.error("Failed to save BOXGO data to Supabase:", e);
      setSaveState("error");
    }
  }

  // save catalog/settings (debounced) — only when they actually changed.
  useEffect(() => {
    if (!loaded || !session) return;
    const timer = setTimeout(() => {
      const payload = appStatePayload();
      const json = JSON.stringify(payload);
      if (json === savedStateJsonRef.current) return;
      runSave(async () => {
        const { error } = await supabase.from("app_state").upsert({
          user_id: session.user.id,
          ...payload,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        savedStateJsonRef.current = json;
      });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments, catalog, projectTags, productionHouses, rentalHouses, brands, userName, userEmail, userPhone, includeUsernameInPdf, includeEmailInPdf, includePhoneInPdf, templates, theme, accentId, fontId, loaded, session]);

  // save projects (debounced) — only the ones that changed. Deleting a
  // project writes immediately in deleteProject() rather than here.
  useEffect(() => {
    if (!loaded || !session) return;
    const timer = setTimeout(() => {
      const changed = changedProjects();
      if (changed.length === 0) return;
      runSave(async () => {
        const now = new Date().toISOString();
        const { error } = await supabase.from("projects").upsert(
          changed.map((p) => ({ id: p.id, user_id: session.user.id, data: p, updated_at: now }))
        );
        if (error) throw error;
        changed.forEach((p) => savedProjectsRef.current.set(p.id, p));
      });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, loaded, session]);

  // Coming back to the app (switching tabs/apps, unlocking the phone):
  // pull the latest from Supabase so this device can't overwrite newer
  // changes made elsewhere. Skipped while this device has unsaved edits —
  // those get saved first, and the next return refreshes.
  useEffect(() => {
    if (!loaded || !session) return;
    let refreshing = false;
    async function refresh() {
      if (document.visibilityState !== "visible" || refreshing || hasUnsavedChanges()) return;
      refreshing = true;
      try {
        const data = await fetchServerData();
        if (!hasUnsavedChanges()) applyServerData(data);
      } catch (e) {
        console.error("Couldn't refresh from Supabase:", e);
      } finally {
        refreshing = false;
      }
    }
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  });

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
  // items alike) from one shoot day into another.
  function copyDayQuantities(fromIndex, toIndex) {
    setProjectsState((prev) =>
      prev.map((p) => {
        if (p.id !== activeProjectId) return p;
        const days = p.days || [];
        if (fromIndex === toIndex || !days[fromIndex] || !days[toIndex]) return p;
        const fromDayId = days[fromIndex].id;
        const toDayId = days[toIndex].id;
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

  // The "+" in the quantity column. Adding a day there means the user wants
  // to see each day, so an "All days same" project switches to per-day
  // columns. Existing days keep whatever they hold — including custom
  // per-day numbers kept from before the project was set to "All days
  // same" — and only the new day is filled, with the item's shared
  // quantity (what "all days same" showed for it).
  function addDay() {
    setProjectsState((prev) =>
      prev.map((p) => {
        if (p.id !== activeProjectId) return p;
        const days = p.days || [];
        const prevDate = days.length > 0 ? days[days.length - 1].date : "";
        const date = prevDate ? addOneDay(prevDate) : tomorrowStr();
        const newDay = { id: `day${Date.now()}`, date, location: "", projectLabel: "" };
        const nextDays = relabelDays([...days, newDay]);
        if (p.perDayQty) return { ...p, days: nextDays };
        return { ...p, days: nextDays, perDayQty: true, itemData: fillUnsetDays(p.itemData, nextDays) };
      })
    );
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
        if (patch.perDayQty && !p.perDayQty) next.itemData = fillUnsetDays(next.itemData, next.days);
        // Per-day -> "All days same": lock in the per-day numbers as shown
        // (an untouched box shows 0 but stores nothing), so switching back
        // restores exactly what was there.
        if (patch.perDayQty === false && p.perDayQty) next.itemData = fillUnsetDays(next.itemData, next.days, 0);
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


  // Copies the master catalog as JSON — { departments, brands, catalog }, shaped like
  // DEFAULT_DEPARTMENTS, DEFAULT_BRANDS and DEFAULT_CATALOG in constants.js — the point isn't spreadsheet editing, it's
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
    // Categories come along too — as an ordered object (category order, and
    // each category's sub-category order), shaped like DEFAULT_DEPARTMENTS.
    const json = JSON.stringify({ departments, brands, catalog: rows }, null, 2);

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

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Backup export failed:", err);
      setBackupError(`Backup couldn't be saved: ${err?.message || err}`);
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
    // A backup made before project ids were switched to real UUIDs (or one
    // hand-edited outside the app) can carry an id Supabase's projects.id
    // column will reject — and since every project upserts in one batch,
    // a single bad id fails the whole save silently. Reissue any id that
    // isn't a valid UUID rather than let that happen again.
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const restoredProjects = (data.projects || []).map((p) =>
      typeof p.id === "string" && uuidPattern.test(p.id) ? p : { ...p, id: newProjectId() }
    );
    setProjectsState(restoredProjects);
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
  const [shareResult, setShareResult] = useState(null); // { kind: "live" | "snapshot", url, projectId }
  const [shareError, setShareError] = useState("");
  // Live-link tokens live in their own projects.share_token column, not in
  // the project's saved data, so they're tracked separately here.
  const [liveShareTokens, setLiveShareTokens] = useState({});

  const pdfInputs = (project) => ({
    project,
    catalog,
    departments,
    accentHex: selectedAccent.light,
    preparedBy: {
      name: includeUsernameInPdf ? userName : "",
      email: includeEmailInPdf ? userEmail : "",
      phone: includePhoneInPdf ? userPhone : "",
    },
  });
  const buildPdfBlob = () => buildPdf(pdfInputs(activeProject));


  async function runShare(fn) {
    setShareGenerating(true);
    setShareError("");
    try {
      const result = await fn();
      setShareResult(result);
      navigator.clipboard?.writeText(result.url).catch(() => {});
    } catch (err) {
      console.error("Share failed:", err);
      setShareError(
        /shared_snapshots|share_token|get_shared_list|schema cache/.test(err?.message || "")
          ? "Sharing hasn't been set up in Supabase yet (the share SQL needs to be run once)."
          : "Sorry, the link couldn't be created. Please try again."
      );
    } finally {
      setShareGenerating(false);
    }
  }

  // Frozen copy with its own permanent link — for rental houses, where
  // what they priced must stay what they see.
  function shareSnapshot(project) {
    return runShare(async () => {
      const token = await createSnapshot({
        userId: session.user.id,
        project,
        catalog,
        departments,
        accentId,
        preparedBy: pdfInputs(project).preparedBy,
      });
      return { kind: "snapshot", url: shareUrlFor(token), projectId: project.id };
    });
  }

  // Always-current link — for crew. Reuses the project's existing token if
  // it already has one, so a link already handed out keeps working.
  function shareLive(project) {
    return runShare(async () => {
      const token = await enableLiveLink({ userId: session.user.id, project, existingToken: liveShareTokens[project.id] });
      setLiveShareTokens((prev) => ({ ...prev, [project.id]: token }));
      return { kind: "live", url: shareUrlFor(token), projectId: project.id };
    });
  }

  async function stopLiveLink(projectId) {
    try {
      await disableLiveLink(projectId);
      setLiveShareTokens((prev) => {
        const next = { ...prev };
        delete next[projectId];
        return next;
      });
      setShareResult(null);
    } catch (err) {
      console.error("Couldn't turn off live link:", err);
      setShareError("Couldn't turn off the live link. Please try again.");
    }
  }

  async function exportToPdf(filename) {
    const name = (filename && filename.trim()) || defaultExportFilename(activeProject, userName);
    setPdfGenerating(true);
    try {
      const { blob } = await buildPdfBlob();
      const finalName = withTimeStamp(name.endsWith(".pdf") ? name : `${name}.pdf`);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = finalName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Sorry, the PDF couldn't be generated. Please try again.");
    } finally {
      setPdfGenerating(false);
    }
  }

  const selectedAccent = ACCENT_CHOICES.find((a) => a.id === accentId) || ACCENT_CHOICES[0];
  const selectedFont = FONT_CHOICES.find((f) => f.id === fontId) || FONT_CHOICES[0];

  // Until this user's own data has loaded, show nothing editable: the state
  // still holds the built-in defaults, which are only meant for a brand-new
  // account with no saved data.
  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, background: "#111", color: "#aaa", fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 13, padding: 16, textAlign: "center" }}>
        <style>{"@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 0.9s linear infinite; }"}</style>
        {loadError ? (
          <>
            <div>Couldn't load your data. Check your connection and try again.</div>
            <button
              onClick={() => { setLoadError(false); setLoadAttempt((n) => n + 1); }}
              style={{ padding: "8px 16px", background: "#FFB020", color: "#111", border: "none", borderRadius: 4, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
            >
              Retry
            </button>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Loader2 size={16} className="spin" /> Loading…</div>
        )}
      </div>
    );
  }

  return (
    <div data-theme={resolvedTheme} className="app-root" style={{
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
        .mf-item-col { min-width: 160px; }
        .mf-pad { padding-left: 14px; padding-right: 14px; }
        @media (max-width: 600px) {
          .mf-item-col { min-width: 80px; }
          .mf-pad { padding-left: 8px; padding-right: 8px; }
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
                <div style={{ fontSize: 11, color: saveState === "error" ? "#AA0000" : "var(--muted)", display: "flex", alignItems: "center", gap: 4, marginRight: 4 }}>
                  {saveState === "saving" && <><Loader2 size={12} className="spin" /> saving</>}
                  {saveState === "saved" && <><Check size={12} /> saved</>}
                  {saveState === "error" && <><X size={12} /> couldn't save — check your connection</>}
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
                    {isCatalogOwner && (
                      <button className="btn btn-ghost" onClick={copyCatalogJson}>
                        <Copy size={14} /> {catalogCopyState === "copied" ? "Copied!" : "Copy Catalog"}
                      </button>
                    )}
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
                          className="btn btn-ghost"
                          style={{ flexShrink: 0, padding: "5px 10px", fontSize: 12 }}
                          title="Edit project details, days and quantity mode"
                        >
                          <Pencil size={13} /> Edit project
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
                          onCopyDay={copyDayQuantities}
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
            onShareSnapshot={shareSnapshot}
            onShareLive={shareLive}
            hasLiveLink={Boolean(liveShareTokens[activeProject.id])}
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
          resolvedTheme={resolvedTheme}
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

      {(shareResult || shareError) && (
        <div className="no-print" style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 80, padding: 16,
        }}>
          <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 440, padding: 22, border: "1px solid var(--border2)" }}>
            <div className="stencil" style={{ fontSize: 14, marginBottom: 10 }}>
              {shareResult?.kind === "live" ? "Live Link" : "Snapshot Link"}
            </div>
            {shareError ? (
              <div style={{ fontSize: 13, color: "#AA0000", marginBottom: 16 }}>{shareError}</div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
                  {shareResult.kind === "live"
                    ? "Anyone with this link can view this list as it is right now, and it keeps updating as you edit. No account needed. Copied to your clipboard."
                    : "Anyone with this link can view this list exactly as it is right now. It won't change when you edit the project later, and sending another snapshot makes a new link. No account needed. Copied to your clipboard."}
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <input readOnly value={shareResult.url} onFocus={(e) => e.target.select()} style={{ flex: 1, fontSize: 12.5 }} />
                  <button
                    className="btn btn-ghost"
                    onClick={() => navigator.clipboard?.writeText(shareResult.url).catch(() => {})}
                  >
                    <Copy size={14} /> Copy
                  </button>
                </div>
              </>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              {shareResult?.kind === "live" ? (
                <button className="btn btn-ghost" style={{ color: "#AA0000" }} onClick={() => stopLiveLink(shareResult.projectId)}>
                  Turn off live link
                </button>
              ) : <span />}
              <button className="btn btn-primary" onClick={() => { setShareResult(null); setShareError(""); }}>Done</button>
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
