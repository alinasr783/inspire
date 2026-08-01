"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { X, Palette, Clock, Table, Columns2, Rows3, Grid3X3, ChevronRight, ArrowLeft, Type, PaintBucket, Braces, Box, Undo2, AlignLeft, AlignCenter, AlignRight, ArrowUp, Minus, ArrowDown, EyeOff, SlidersHorizontal } from "lucide-react";
import { useRealtime } from "@/components/providers/realtime-provider";
import { upsertCellStyle, deleteCellStyle, deleteAllCellStyles } from "@/lib/cell-style-service";

export interface CellInfo {
  table: string;
  rowId: string;
  colKey: string;
  colLabel: string;
  rowData: Record<string, unknown> | null;
}

const C = [
  "#ffffff","#f8fafc","#f1f5f9","#e2e8f0","#cbd5e1","#94a3b8","#64748b","#475569","#334155","#1e293b","#0f172a","#000000",
  "#fef2f2","#fee2e2","#fecaca","#fca5a5","#f87171","#ef4444","#dc2626","#b91c1c","#991b1b","#7f1d1d",
  "#fff7ed","#ffedd5","#fed7aa","#fdba74","#fb923c","#f97316","#ea580c","#c2410c","#9a3412","#7c2d12",
  "#fefce8","#fef9c3","#fef08a","#fde047","#facc15","#eab308","#ca8a04","#a16207","#854d0e","#713f12",
  "#f0fdf4","#dcfce7","#bbf7d0","#86efac","#4ade80","#22c55e","#16a34a","#15803d","#166534","#14532d",
  "#eff6ff","#dbeafe","#bfdbfe","#93c5fd","#60a5fa","#3b82f6","#2563eb","#1d4ed8","#1e40af","#1e3a8a",
  "#f5f3ff","#ede9fe","#ddd6fe","#c4b5fd","#a78bfa","#8b5cf6","#7c3aed","#6d28d9","#5b21b6","#4c1d95",
  "#fdf2f8","#fce7f3","#fbcfe8","#f9a8d4","#f472b6","#ec4899","#db2777","#be185d","#9d174d","#831843",
  "#f0fdfa","#ccfbf1","#99f6e4","#5eead4","#2dd4bf","#14b8a6","#0d9488","#0f766e","#115e59","#134e4a",
];
const FS = [8,9,10,11,12,13,14,16,18,20,24,28,32,40];
const FW = [
  { w: "300", label: "Light" },
  { w: "400", label: "Regular" },
  { w: "500", label: "Medium" },
  { w: "600", label: "Semibold" },
  { w: "700", label: "Bold" },
  { w: "800", label: "Extrabold" },
  { w: "900", label: "Black" },
];

type NavStack = "main" | "table" | "column" | "row" | "cell" | "style" | "color_text" | "color_bg" | "font_size" | "font_weight" | "border" | "alignment" | "display_no" | "columns_settings" | "seriousness_highlight";

const BORDER_STYLES = [
  { key: "none", label: "None", css: "none" },
  { key: "solid", label: "Solid", css: "solid" },
  { key: "dashed", label: "Dashed", css: "dashed" },
  { key: "dotted", label: "Dotted", css: "dotted" },
  { key: "double", label: "Double", css: "double" },
];
const BORDER_WIDTHS = [1, 2, 3, 4];

function getTableColsFromDOM() {
  const ths = document.querySelectorAll("th[data-col-key]");
  const seen = new Set<string>();
  const out: { key: string; label: string }[] = [];
  ths.forEach((th) => {
    const k = th.getAttribute("data-col-key") || "";
    if (!seen.has(k)) { seen.add(k); out.push({ key: k, label: th.textContent?.trim() || k }); }
  });
  return out;
}

function isCellEmpty(td: HTMLElement): boolean {
  const input = td.querySelector("input") as HTMLInputElement | null;
  if (input) return input.value.trim() === "";
  const select = td.querySelector("select") as HTMLSelectElement | null;
  if (select) return select.value.trim() === "";
  const text = (td.textContent || "").replace(/\s/g, "");
  return text === "" || text === "\u00A0";
}

function ensureDisplayNoCSS() {
  if (!document.getElementById("inspire-display-no-css")) {
    const s = document.createElement("style");
    s.id = "inspire-display-no-css";
    s.textContent = `.inspire-display-no td{background-color:#ef4444!important;color:#fff!important}.inspire-display-no td input,.inspire-display-no td select{background-color:transparent!important;color:#fff!important}`;
    document.head.appendChild(s);
  }
}

export function ensureSeriousnessHighlightCSS(bg: string, txt: string) {
  const id = "inspire-seriousness-css";
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  if (!bg && !txt) return;
  const s = document.createElement("style");
  s.id = id;
  s.textContent = `.inspire-seriousness-highlight td{${bg ? `background-color:${bg}!important;` : ""}${txt ? `color:${txt}!important;` : ""}}`;
  document.head.appendChild(s);
}

function refreshSeriousnessHighlight(threshold: number, bg: string, txt: string) {
  document.querySelectorAll(".inspire-seriousness-highlight").forEach((el) => el.classList.remove("inspire-seriousness-highlight"));
  ensureSeriousnessHighlightCSS(bg, txt);
  if (!threshold) return;
  document.querySelectorAll("tr[data-seriousness]").forEach((el) => {
    const val = Number((el as HTMLElement).getAttribute("data-seriousness") || "0");
    if (!isNaN(val) && val >= threshold) {
      el.classList.add("inspire-seriousness-highlight");
    }
  });
}

function refreshDisplayNoHighlights(activeCols: Set<string>) {
  document.querySelectorAll(".inspire-display-no").forEach((el) => el.classList.remove("inspire-display-no"));
  const rows = new Set<HTMLElement>();
  for (const k of activeCols) {
    document.querySelectorAll(`td[data-col-key="${k}"]`).forEach((el) => {
      if (isCellEmpty(el as HTMLElement)) {
        const tr = (el as HTMLElement).closest("tr");
        if (tr) rows.add(tr as HTMLElement);
      }
    });
  }
  rows.forEach((tr) => tr.classList.add("inspire-display-no"));
  if (activeCols.size > 0) ensureDisplayNoCSS();
}

export function getElementSelector(info: CellInfo, scope: "table" | "column" | "row" | "cell"): string {
  if (scope === "table") return `table`;
  if (scope === "column") return `td[data-col-key="${info.colKey}"], th[data-col-key="${info.colKey}"]`;
  if (scope === "row") return `tr[data-row-id="${info.rowId}"]`;
  return `td[data-row-id="${info.rowId}"][data-col-key="${info.colKey}"]`;
}

export function applyElStyle(info: CellInfo, scope: "table" | "column" | "row" | "cell", prop: string, value: string) {
  const selector = getElementSelector(info, scope);
  document.querySelectorAll(selector).forEach((el) => {
    const h = el as HTMLElement;
    if (prop === "reset") { h.style.cssText = ""; return; }
    if (prop === "fontSize") h.style.fontSize = value ? `${value}px` : "";
    else if (prop === "fontWeight") h.style.fontWeight = value;
    else if (prop === "color") h.style.color = value;
    else if (prop === "backgroundColor") h.style.backgroundColor = value;
    else if (prop === "border") h.style.border = value;
    else if (prop === "borderStyle") h.style.borderStyle = value;
    else if (prop === "borderColor") h.style.borderColor = value;
    else if (prop === "borderWidth") h.style.borderWidth = value ? `${value}px` : "";
    else if (prop === "textAlign") h.style.textAlign = value;
    else if (prop === "verticalAlign") h.style.verticalAlign = value;
  });
}

const USER_STYLE_PROPS = ["color", "backgroundColor", "fontSize", "fontWeight", "border", "borderStyle", "borderColor", "borderWidth", "textAlign", "verticalAlign"] as const;

function getTableEl(info: CellInfo): HTMLTableElement | null {
  if (info.rowId) {
    const tr = document.querySelector(`tr[data-row-id="${info.rowId}"]`);
    if (tr) return tr.closest("table");
  }
  return document.querySelector("table");
}

function clearUserStyles(root: Element) {
  root.querySelectorAll("tr, td, th").forEach((el) => {
    const style = (el as HTMLElement).style;
    for (const p of USER_STYLE_PROPS) (style as unknown as Record<string, string>)[p] = "";
  });
  const style = (root as HTMLElement).style;
  for (const p of USER_STYLE_PROPS) (style as unknown as Record<string, string>)[p] = "";
}

function GlassBackdrop({ onClick, children }: { onClick?: () => void; children?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-75"
      onClick={(e) => { if (e.target === e.currentTarget) onClick?.(); }}>
      {children}
    </div>
  );
}

function GlassPanel({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <div onClick={onClick}
      className={`rounded-3xl border border-white/20 bg-white/75 dark:bg-zinc-900/75 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

interface NavItem {
  key: string; icon: any; label: string; desc: string; color: string;
}

function ColorGrid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hex, setHex] = useState(value || "#000000");
  const visible = C.slice(0, 18);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-9 gap-1.5">
        {visible.map((c) => (
          <button key={c} className="h-7 w-7 rounded-lg transition-all duration-150 hover:scale-110 active:scale-95"
            style={{ backgroundColor: c, boxShadow: hex === c ? "0 0 0 2.5px var(--primary), 0 0 0 4px rgba(var(--primary),0.3)" : "0 0 0 1px rgba(0,0,0,0.08)" }}
            onClick={() => { setHex(c); onChange(c); }} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-zinc-500">#</span>
        <input value={hex} onChange={(e) => { setHex(e.target.value); onChange(e.target.value); }}
          className="flex-1 h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/50 dark:bg-zinc-800/50 px-3 text-sm outline-none focus:border-primary/50 transition-all" />
        <input type="color" value={hex.startsWith("#") ? hex : "#" + hex}
          onChange={(e) => { setHex(e.target.value); onChange(e.target.value); }}
          className="h-9 w-9 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer p-0.5 bg-transparent" />
      </div>
    </div>
  );
}

function FontSizePanel({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FS.map((s) => (
          <button key={s} onClick={() => onChange(s)}
            className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-medium transition-all duration-150 hover:scale-105 active:scale-95
              ${value === s ? "bg-primary text-primary-foreground shadow-lg" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}>
            {s}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 px-1">
        <span className="text-xs text-zinc-400">A</span>
        <input type="range" min={8} max={40} value={value} onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md cursor-pointer" />
        <span className="text-lg text-zinc-400">A</span>
      </div>
      <p className="text-center text-sm text-zinc-400 py-2" style={{ fontSize: value }}>
        Preview at {value}px
      </p>
    </div>
  );
}

export function TableCellContextMenu({ info, position, onClose, shortcut }: { info: CellInfo | null; position: { x: number; y: number } | null; onClose: () => void; shortcut?: { scope: "row" | "column"; target: "color_bg" } | null }) {
  const [nav, setNav] = useState<NavStack[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const styleScope = useRef<"table" | "column" | "row" | "cell">("cell");
  const { currentUser } = useRealtime();

  const [txtColor, setTxtColor] = useState("");
  const [bgColor, setBgColor] = useState("");
  const [fs, setFs] = useState(13);
  const [fw, setFw] = useState("400");
  const [borderVal, setBorderVal] = useState("");
  const [bs, setBs] = useState("solid");
  const [bc, setBc] = useState("#e2e8f0");
  const [bw, setBw] = useState(1);
  const [talign, setTalign] = useState("");
  const [valign, setValign] = useState("");
  const [activeDisplayNo, setActiveDisplayNo] = useState<Set<string>>(new Set());
  const [showAllDno, setShowAllDno] = useState(true);
  const [seriousnessThreshold, setSeriousnessThreshold] = useState(7);
  const [seriousnessBgColor, setSeriousnessBgColor] = useState("#fef3c7");
  const [seriousnessTxtColor, setSeriousnessTxtColor] = useState("#92400e");
  const columnOverride = useRef<{ key: string; label: string } | null>(null);

  useEffect(() => {
    refreshDisplayNoHighlights(activeDisplayNo);
  }, [activeDisplayNo]);

  useEffect(() => {
    function clickOut(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, [onClose]);

  const resetNav = useCallback(() => setNav([]), []);

  useLayoutEffect(() => {
    if (!info || !position) return;
    if (shortcut) {
      styleScope.current = shortcut.scope;
      setNav([shortcut.scope, "style", shortcut.target]);
    } else {
      setNav([]);
      columnOverride.current = null;
    }
    setTxtColor(""); setBgColor(""); setFs(13); setFw("400");
    setBs("solid"); setBc("#e2e8f0"); setBw(1); setTalign(""); setValign("");
  }, [position, shortcut]);

  if (!info || !position) return null;

  const current = nav.length > 0 ? nav[nav.length - 1] : "main";
  const push = (s: NavStack) => setNav((p) => [...p, s]);
  const pop = () => setNav((p) => p.slice(0, -1));

  const colKey = () => columnOverride.current?.key || info.colKey;
  const colLabel = () => columnOverride.current?.label || info.colLabel || info.colKey;

  const timeline = [
    { l: "Created", v: info.rowData?.created_at ? new Date(info.rowData.created_at as string).toLocaleString() : "—" },
    { l: "Updated", v: info.rowData?.updated_at ? new Date(info.rowData.updated_at as string).toLocaleString() : "—" },
    { l: "Table", v: info.table },
    { l: "Column", v: colLabel() },
    { l: "Row ID", v: info.rowId?.slice(0, 12) + "..." },
  ];

  const elementKey = () => {
    if (styleScope.current === "table") return "main";
    if (styleScope.current === "column") return colKey();
    if (styleScope.current === "row") return info.rowId;
    return `${info.rowId}:${colKey()}`;
  };

  const persistStyle = async (props: Record<string, string>) => {
    if (!currentUser?.id) return;
    try {
      const style: Record<string, any> = { user_id: currentUser.id, table_name: info.table, element_type: styleScope.current, element_key: elementKey() };
      if (props.color !== undefined) style.text_color = props.color || null;
      if (props.backgroundColor !== undefined) style.background_color = props.backgroundColor || null;
      if (props.fontSize !== undefined) style.font_size = props.fontSize ? Number(props.fontSize) : null;
      if (props.fontWeight !== undefined) style.font_weight = props.fontWeight || null;
      if (props.borderStyle !== undefined) style.border_style = props.borderStyle || null;
      if (props.borderColor !== undefined) style.border_color = props.borderColor || null;
      if (props.borderWidth !== undefined) style.border_width = props.borderWidth || null;
      if (props.textAlign !== undefined) style.text_align = props.textAlign || null;
      if (props.verticalAlign !== undefined) style.vertical_align = props.verticalAlign || null;
      if (props.border !== undefined) style.border_style = props.border || null;
      await upsertCellStyle(style as any);
    } catch (e) { console.error("Failed to persist style:", e); }
  };

  const apply = (prop: string, val: string) => {
    const eff = columnOverride.current ? { ...info, colKey: columnOverride.current.key, colLabel: columnOverride.current.label } : info;
    applyElStyle(eff, styleScope.current, prop, val);
    if (prop === "reset") { setTxtColor(""); setBgColor(""); setFs(13); setFw("400"); setBorderVal(""); setBs("solid"); setBc("#e2e8f0"); setBw(1); setTalign(""); setValign(""); }
    if (prop === "color") setTxtColor(val);
    if (prop === "backgroundColor") setBgColor(val);
    if (prop === "fontSize") setFs(Number(val));
    if (prop === "fontWeight") setFw(val);
    if (prop === "border") setBorderVal(val);
    if (prop === "borderStyle") setBs(val);
    if (prop === "borderColor") setBc(val);
    if (prop === "borderWidth") setBw(Number(val));
    if (prop === "textAlign") setTalign(val);
    if (prop === "verticalAlign") setValign(val);
    if (prop === "reset") {
      if (currentUser?.id) deleteCellStyle(currentUser.id, info.table, styleScope.current, elementKey()).catch(console.error);
    } else {
      persistStyle({ [prop]: val });
    }
  };

  const handleResetDefaults = async () => {
    if (styleScope.current === "table") {
      const tableEl = getTableEl(info);
      if (tableEl) clearUserStyles(tableEl);
      document.querySelectorAll(".inspire-display-no").forEach((el) => el.classList.remove("inspire-display-no"));
      document.querySelectorAll(".inspire-seriousness-highlight").forEach((el) => el.classList.remove("inspire-seriousness-highlight"));
      document.getElementById("inspire-display-no-css")?.remove();
      document.getElementById("inspire-seriousness-css")?.remove();
      setActiveDisplayNo(new Set());
      setTxtColor(""); setBgColor(""); setFs(13); setFw("400"); setBorderVal(""); setBs("solid"); setBc("#e2e8f0"); setBw(1); setTalign(""); setValign("");
      if (currentUser?.id) {
        try { await deleteAllCellStyles(currentUser.id, info.table); } catch (e) { console.error("Failed to reset table styles:", e); }
      }
      window.dispatchEvent(new CustomEvent("inspire:table-reset", { detail: { table: info.table } }));
    } else {
      apply("reset", "");
    }
    pop();
  };

  const mainItems: NavItem[] = [
    { key: "table", icon: Table, label: "Table", desc: "Global table settings", color: "text-blue-500 bg-blue-50 dark:bg-blue-950" },
    { key: "column", icon: Columns2, label: "Column", desc: colLabel(), color: "text-purple-500 bg-purple-50 dark:bg-purple-950" },
    { key: "row", icon: Rows3, label: "Row", desc: "Row " + info.rowId?.slice(0, 8) + "...", color: "text-amber-500 bg-amber-50 dark:bg-amber-950" },
    { key: "cell", icon: Grid3X3, label: "Cell", desc: "This specific cell", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950" },
  ];

  const styleItems = [
    { key: "color_text" as NavStack, icon: Type, label: "Text Color", preview: txtColor ? <span className="h-3 w-3 rounded-full ring-1 ring-zinc-200" style={{ backgroundColor: txtColor }} /> : null },
    { key: "color_bg" as NavStack, icon: PaintBucket, label: "Background", preview: bgColor ? <span className="h-3 w-3 rounded-full ring-1 ring-zinc-200" style={{ backgroundColor: bgColor }} /> : null },
    { key: "font_size" as NavStack, icon: Braces, label: "Font Size", preview: <span className="text-[11px] text-zinc-400">{fs}px</span> },
    { key: "font_weight" as NavStack, icon: Type, label: "Font Weight", preview: <span className="text-[11px] text-zinc-400">{fw}</span> },
    { key: "border" as NavStack, icon: Box, label: "Border", preview: null },
    { key: "alignment" as NavStack, icon: AlignLeft, label: "Alignment", preview: null },
  ];

  const renderPanel = () => {
    if (current === "main") {
      return (
        <div className="w-72 p-2 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <Grid3X3 className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{info.table}</span>
            <button onClick={onClose} className="ms-auto rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <X className="h-3.5 w-3.5 text-zinc-400" />
            </button>
          </div>
          {mainItems.map((m) => (
            <button key={m.key} onClick={() => { styleScope.current = m.key as any; push(m.key as NavStack); }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-xs transition-all duration-150 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 active:scale-[0.98] group">
              <div className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-colors ${m.color}`}>
                <m.icon className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 text-start">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{m.label}</p>
                <p className="text-[10px] text-zinc-400">{m.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
            </button>
          ))}
        </div>
      );
    }

    const scopeLabel = current === "style" ? (styleScope.current.charAt(0).toUpperCase() + styleScope.current.slice(1)) : "";

    if (current === "style") {
      return (
        <div className="w-72 p-2 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <button onClick={pop} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft className="h-4 w-4" /></button>
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{scopeLabel} Style</span>
            <button onClick={onClose} className="ms-auto rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X className="h-3.5 w-3.5 text-zinc-400" /></button>
          </div>
          {styleItems.map((si) => (
            <button key={si.key} onClick={() => push(si.key)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-xs transition-all duration-150 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 active:scale-[0.98]">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                <si.icon className="h-4 w-4" />
              </div>
              <span className="flex-1 text-start text-zinc-900 dark:text-zinc-100">{si.label}</span>
              {si.preview}
              <ChevronRight className="h-4 w-4 text-zinc-300" />
            </button>
          ))}
          <div className="pt-2 space-y-1">
            <button onClick={() => { handleResetDefaults(); }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
              <Undo2 className="h-4 w-4" />Reset to Defaults
            </button>
          </div>
        </div>
      );
    }

    if (current === "color_text" || current === "color_bg") {
      const isBg = current === "color_bg";
      return (
        <div className="w-80 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={pop} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft className="h-4 w-4" /></button>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{isBg ? "Background" : "Text"} Color</span>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X className="h-3.5 w-3.5 text-zinc-400" /></button>
          </div>
          <ColorGrid value={isBg ? bgColor : txtColor} onChange={(v) => apply(isBg ? "backgroundColor" : "color", v)} />
        </div>
      );
    }

    if (current === "font_size") {
      return (
        <div className="w-80 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={pop} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft className="h-4 w-4" /></button>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Font Size</span>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X className="h-3.5 w-3.5 text-zinc-400" /></button>
          </div>
          <FontSizePanel value={fs} onChange={(v) => apply("fontSize", String(v))} />
        </div>
      );
    }

    if (current === "font_weight") {
      return (
        <div className="w-72 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={pop} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft className="h-4 w-4" /></button>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Font Weight</span>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X className="h-3.5 w-3.5 text-zinc-400" /></button>
          </div>
          <div className="space-y-1">
            {FW.map((item) => (
              <button key={item.w} onClick={() => apply("fontWeight", item.w)}
                className={`w-full rounded-xl px-4 py-3 text-sm text-start transition-all duration-150 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 active:scale-[0.98]
                  ${fw === item.w ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "text-zinc-600 dark:text-zinc-300"}`}
                style={{ fontWeight: item.w }}>
                <span className="font-medium">{item.label}</span>
                <span className="ml-2 text-zinc-400">({item.w})</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (current === "border") {
      return (
        <div className="w-80 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={pop} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft className="h-4 w-4" /></button>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Border</span>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X className="h-3.5 w-3.5 text-zinc-400" /></button>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-medium text-zinc-500 mb-2 ml-1">Style</p>
              <div className="flex flex-wrap gap-1.5">
                {BORDER_STYLES.map((s) => (
                  <button key={s.key} onClick={() => apply("borderStyle", s.css)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-95
                      ${bs === s.css ? "bg-primary text-primary-foreground shadow-md" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}>
                    {s.key === "none" ? "✕" : <span style={{ borderBottom: `2px ${s.css} currentColor`, width: 20, display: "inline-block" }} />}
                    <span className="ml-1.5">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-medium text-zinc-500 mb-2 ml-1">Color</p>
              <ColorGrid value={bc} onChange={(v) => apply("borderColor", v)} />
            </div>

            <div>
              <p className="text-[11px] font-medium text-zinc-500 mb-2 ml-1">Width</p>
              <div className="flex gap-2">
                {BORDER_WIDTHS.map((w) => (
                  <button key={w} onClick={() => apply("borderWidth", String(w))}
                    className={`flex-1 h-10 rounded-2xl text-sm font-medium transition-all duration-150 hover:scale-105 active:scale-95
                      ${bw === w ? "bg-primary text-primary-foreground shadow-lg" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}>
                    {w}px
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (current === "alignment") {
      return (
        <div className="w-72 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={pop} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft className="h-4 w-4" /></button>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Alignment</span>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X className="h-3.5 w-3.5 text-zinc-400" /></button>
          </div>
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-medium text-zinc-500 mb-2 ml-1">Horizontal</p>
              <div className="flex gap-1.5">
                {[
                  { k: "left", icon: AlignLeft, label: "Left" },
                  { k: "center", icon: AlignCenter, label: "Center" },
                  { k: "right", icon: AlignRight, label: "Right" },
                ].map((a) => (
                  <button key={a.k} onClick={() => apply("textAlign", a.k)}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-2xl text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-95
                      ${talign === a.k ? "bg-primary text-primary-foreground shadow-lg" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}>
                    <a.icon className="h-3.5 w-3.5" />{a.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-500 mb-2 ml-1">Vertical</p>
              <div className="flex gap-1.5">
                {[
                  { k: "top", icon: ArrowUp, label: "Top" },
                  { k: "middle", icon: Minus, label: "Middle" },
                  { k: "bottom", icon: ArrowDown, label: "Bottom" },
                ].map((a) => (
                  <button key={a.k} onClick={() => apply("verticalAlign", a.k)}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-2xl text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-95
                      ${valign === a.k ? "bg-primary text-primary-foreground shadow-lg" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}>
                    <a.icon className="h-3.5 w-3.5" />{a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (current === "display_no") {
      const dnoCols = getTableColsFromDOM();
      const visibleCols = showAllDno ? dnoCols : dnoCols.slice(0, 4);
      return (
        <div className="w-72 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={pop} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft className="h-4 w-4" /></button>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Display with no</span>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X className="h-3.5 w-3.5 text-zinc-400" /></button>
          </div>
          <p className="text-[11px] text-zinc-500 mb-3 ml-1">Red background for rows with empty values</p>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {dnoCols.length === 0 && <p className="text-[11px] text-zinc-400 text-center py-4">No columns found</p>}
            {visibleCols.map((col) => {
              const active = activeDisplayNo.has(col.key);
              return (
                <button key={col.key} onClick={() => {
                  setActiveDisplayNo((prev) => {
                    const next = new Set(prev);
                    if (next.has(col.key)) next.delete(col.key); else next.add(col.key);
                    return next;
                  });
                }}
                  className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-xs transition-all duration-150 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 active:scale-[0.98]
                    ${active ? "bg-red-50 dark:bg-red-950/30 ring-1 ring-red-200" : ""}`}>
                  <span className={`h-3 w-3 rounded-full border-2 transition-colors flex-shrink-0 ${active ? "bg-red-500 border-red-500" : "border-zinc-300"}`} />
                  <span className="flex-1 text-start truncate text-zinc-900 dark:text-zinc-100">{col.label}</span>
                  <span className="text-[10px] text-zinc-400 flex-shrink-0">{col.key}</span>
                </button>
              );
            })}
            {dnoCols.length > 4 && (
              <button onClick={() => setShowAllDno((p) => !p)}
                className="w-full text-center text-[11px] text-primary font-medium py-1.5 hover:underline">
                {showAllDno ? `Show less (${dnoCols.length} columns)` : `Show all ${dnoCols.length} columns`}
              </button>
            )}
          </div>
        </div>
      );
    }

    if (current === "seriousness_highlight") {
      return (
        <div className="w-80 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={pop} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft className="h-4 w-4" /></button>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Seriousness Highlight</span>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X className="h-3.5 w-3.5 text-zinc-400" /></button>
          </div>
          <p className="text-[11px] text-zinc-500 mb-4 ml-1">Highlight rows where seriousness is above threshold</p>

          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-medium text-zinc-500 mb-2 ml-1">Threshold (≥)</p>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                  <button key={val} onClick={() => setSeriousnessThreshold(val)}
                    className={`h-8 w-8 rounded-lg text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-95
                      ${seriousnessThreshold === val ? "bg-primary text-primary-foreground shadow-md" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}>
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-medium text-zinc-500 mb-2 ml-1">Background Color</p>
              <ColorGrid value={seriousnessBgColor} onChange={setSeriousnessBgColor} />
            </div>

            <div>
              <p className="text-[11px] font-medium text-zinc-500 mb-2 ml-1">Text Color</p>
              <ColorGrid value={seriousnessTxtColor} onChange={setSeriousnessTxtColor} />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => {
                refreshSeriousnessHighlight(seriousnessThreshold, seriousnessBgColor, seriousnessTxtColor);
                if (currentUser?.id) {
                  upsertCellStyle({
                    user_id: currentUser.id,
                    table_name: info.table,
                    element_type: "conditional",
                    element_key: "seriousness_highlight",
                    background_color: seriousnessBgColor || null,
                    text_color: seriousnessTxtColor || null,
                    font_size: seriousnessThreshold,
                  }).catch(console.error);
                }
                onClose();
              }}
                className="flex-1 h-10 rounded-2xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98]">
                Apply
              </button>
              <button onClick={() => {
                document.querySelectorAll(".inspire-seriousness-highlight").forEach((el) => el.classList.remove("inspire-seriousness-highlight"));
                const el = document.getElementById("inspire-seriousness-css");
                if (el) el.remove();
                if (currentUser?.id) {
                  deleteCellStyle(currentUser.id, info.table, "conditional", "seriousness_highlight").catch(console.error);
                }
                onClose();
              }}
                className="h-10 rounded-2xl px-4 text-sm font-medium bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/50 transition-all active:scale-[0.98]">
                Clear
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (current === "columns_settings") {
      const tableCols = getTableColsFromDOM();
      return (
        <div className="w-72 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={pop} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft className="h-4 w-4" /></button>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Columns Settings</span>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X className="h-3.5 w-3.5 text-zinc-400" /></button>
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {tableCols.length === 0 && <p className="text-[11px] text-zinc-400 text-center py-4">No columns found</p>}
            {tableCols.map((col) => (
              <button key={col.key} onClick={() => { styleScope.current = "column"; columnOverride.current = { key: col.key, label: col.label }; push("style"); }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-xs transition-all duration-150 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 active:scale-[0.98]">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500"><Columns2 className="h-3.5 w-3.5" /></div>
                <span className="flex-1 text-start text-zinc-900 dark:text-zinc-100 truncate">{col.label}</span>
                <span className="text-[10px] text-zinc-400">{col.key}</span>
                <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Table / Column / Row / Cell detail panels
    return (
      <div className="w-72 p-2 space-y-1">
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <button onClick={pop} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft className="h-4 w-4" /></button>
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 capitalize">{current}</span>
          <button onClick={onClose} className="ms-auto rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X className="h-3.5 w-3.5 text-zinc-400" /></button>
        </div>

        <div className="mx-2 mb-2 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 p-3 space-y-1.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Timeline</span>
          </div>
          {timeline.map((t) => (
            <div key={t.l} className="flex items-center justify-between text-[10px]">
              <span className="text-zinc-400">{t.l}</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{t.v}</span>
            </div>
          ))}
        </div>

        <button onClick={() => push("style")}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-xs transition-all duration-150 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 active:scale-[0.98]">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-500">
            <Palette className="h-4 w-4" />
          </div>
          <div className="flex-1 text-start">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">Style Settings</p>
            <p className="text-[10px] text-zinc-400">Colors, fonts, borders</p>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-300" />
        </button>

        {current === "table" && (
          <>
            <button onClick={() => push("display_no")}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-xs transition-all duration-150 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 active:scale-[0.98]">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950 text-red-500">
                <EyeOff className="h-4 w-4" />
              </div>
              <div className="flex-1 text-start">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">Display with no</p>
                <p className="text-[10px] text-zinc-400">Highlight empty values</p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-300" />
            </button>
            {current === "table" && info.table === "clients" && (
              <button onClick={() => push("seriousness_highlight")}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-xs transition-all duration-150 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 active:scale-[0.98]">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-950 text-green-500">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div className="flex-1 text-start">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">Seriousness Highlight</p>
                  <p className="text-[10px] text-zinc-400">Highlight by rating</p>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-300" />
              </button>
            )}
            <button onClick={() => push("columns_settings")}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-xs transition-all duration-150 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 active:scale-[0.98]">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-500">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <div className="flex-1 text-start">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">Columns Settings</p>
                <p className="text-[10px] text-zinc-400">Configure each column</p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-300" />
            </button>
          </>
        )}
      </div>
    );
  };

  const panelLeft = Math.min(position.x - 20, window.innerWidth - 340);
  const panelTop = (() => {
    const isSeriousness = nav.length > 0 && nav[nav.length - 1] === "seriousness_highlight";
    const h = isSeriousness ? 650 : 560;
    let t = position.y - (isSeriousness ? 40 : 10);
    if (t + h > window.innerHeight - 20) t = Math.max(10, window.innerHeight - h - 20);
    return t;
  })();

  return (
    <GlassBackdrop onClick={onClose}>
      <div ref={ref} className="absolute" style={{ left: panelLeft, top: panelTop }}>
        <GlassPanel>
          <div key={nav.join("/")} className="animate-in slide-in-from-right-3 fade-in duration-150">
            {renderPanel()}
          </div>
        </GlassPanel>
      </div>
    </GlassBackdrop>
  );
}
