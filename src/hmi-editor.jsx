import { useState, useRef, useCallback, useEffect } from "react";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  bg: "#0f1117", panel: "#161b22", panel2: "#1c2333", border: "#21262d",
  accent: "#f97316", accentDim: "#7c3a12", accentBg: "rgba(249,115,22,0.08)",
  text: "#e6edf3", textDim: "#8b949e", textFaint: "#444d56",
  green: "#3fb950", greenDim: "#0d3a2a",
  red: "#f85149", blue: "#58a6ff", yellow: "#e3b341",
};

const RESOLUTIONS = [
  { label:"272×480",  w:272,  h:480  },
  { label:"480×272",  w:480,  h:272  },
  { label:"800×480",  w:800,  h:480  },
  { label:"480×800",  w:480,  h:800  },
  { label:"1024×600", w:1024, h:600  },
  { label:"600×1024", w:600,  h:1024 },
  { label:"1280×800", w:1280, h:800  },
  { label:"Custom",   w:null, h:null },
];

const GRID = 8;
const snap = v => Math.round(v / GRID) * GRID;
let _id = 1;
const newId = () => `el_${_id++}`;

// ─── COMPONENT RENDER SYSTEM ─────────────────────────────────────────────────
// Each component: render(props, active) → JSX
// props includes user-defined colors, labels etc.
// FIX: All inner elements have pointerEvents:"none" so clicks reach the wrapper

const DEFS = {
  button_rect: {
    label:"Button", icon:"▭", w:120, h:44,
    render(p, active) {
      const bg = active ? (p.colorActive||T.accent) : (p.colorIdle||"#1e2430");
      const bd = active ? (p.colorActive||T.accent) : (p.borderIdle||"#374151");
      const fg = active ? (p.textActive||"#ffffff") : (p.textIdle||T.textDim);
      return <div style={{width:"100%",height:"100%",background:bg,border:`2px solid ${bd}`,borderRadius:p.radius??6,display:"flex",alignItems:"center",justifyContent:"center",color:fg,fontSize:p.fontSize||13,fontWeight:600,fontFamily:"monospace",boxShadow:active?`0 0 14px ${bg}66`:"none",pointerEvents:"none",userSelect:"none"}}>
        {p.label||"BUTTON"}
      </div>;
    },
  },
  button_round: {
    label:"Round", icon:"◯", w:64, h:64,
    render(p, active) {
      const bg = active ? (p.colorActive||T.accent) : (p.colorIdle||"#1e2430");
      const bd = active ? (p.colorActive||T.accent) : (p.borderIdle||"#374151");
      const fg = active ? (p.textActive||"#ffffff") : (p.textIdle||T.textDim);
      return <div style={{width:"100%",height:"100%",background:bg,border:`2px solid ${bd}`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:fg,fontSize:p.fontSize||11,fontWeight:700,fontFamily:"monospace",boxShadow:active?`0 0 16px ${bg}88`:"none",pointerEvents:"none",userSelect:"none"}}>
        {p.label||"OK"}
      </div>;
    },
  },
  toggle_switch: {
    label:"Toggle", icon:"⇌", w:72, h:36,
    render(p, active) {
      const track = active ? (p.colorActive||T.accent) : (p.colorIdle||"#1e2430");
      const bd = active ? (p.colorActive||T.accent) : (p.borderIdle||"#374151");
      return <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
        <div style={{width:54,height:28,background:track,border:`2px solid ${bd}`,borderRadius:14,position:"relative",boxShadow:active?`0 0 10px ${track}88`:"none",transition:"all 0.15s"}}>
          <div style={{position:"absolute",top:3,left:active?27:3,width:18,height:18,borderRadius:"50%",background:active?"#fff":(p.knobIdle||"#555"),transition:"left 0.15s"}}/>
        </div>
      </div>;
    },
  },
  indicator_led: {
    label:"LED", icon:"●", w:44, h:44,
    render(p, active) {
      const c = active ? (p.colorActive||T.green) : (p.colorIdle||"#1e2430");
      const bd = active ? (p.colorActive||T.green) : (p.borderIdle||"#374151");
      return <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
        <div style={{width:p.size||28,height:p.size||28,borderRadius:"50%",background:c,border:`2px solid ${bd}`,boxShadow:active?`0 0 16px ${c}`:active?"none":"none"}}/>
      </div>;
    },
  },
  indicator_bar: {
    label:"Bar", icon:"▬", w:150, h:36,
    render(p, active) {
      const fill = active ? (p.colorActive||T.accent) : (p.colorIdle||"#1e2430");
      const pct = active ? (p.value||70) : 15;
      return <div style={{width:"100%",height:"100%",background:p.bgColor||"#0a0e14",border:`1px solid ${p.borderIdle||"#374151"}`,borderRadius:p.radius??4,overflow:"hidden",position:"relative",pointerEvents:"none"}}>
        <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${pct}%`,background:fill,transition:"width 0.2s"}}/>
        {p.showValue!==false && <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:p.textColor||T.text,fontSize:11,fontFamily:"monospace"}}>{active?`${pct}%`:"0%"}</div>}
      </div>;
    },
  },
  slider_h: {
    label:"Slider", icon:"⎍", w:160, h:36,
    render(p, active) {
      const pct = active ? (p.value||60) : 0;
      const c = p.colorActive||T.accent;
      return <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",padding:"0 10px",boxSizing:"border-box",pointerEvents:"none"}}>
        <div style={{flex:1,height:4,background:p.trackColor||"#1e2430",borderRadius:2,position:"relative"}}>
          <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${pct}%`,background:c,borderRadius:2}}/>
          <div style={{position:"absolute",left:`${pct}%`,top:"50%",transform:"translate(-50%,-50%)",width:14,height:14,borderRadius:"50%",background:active?c:(p.knobIdle||"#374151"),border:`2px solid ${active?"#fff":"#555"}`,boxShadow:active?`0 0 8px ${c}66`:"none"}}/>
        </div>
      </div>;
    },
  },
  display_num: {
    label:"Number", icon:"#", w:110, h:48,
    render(p, active) {
      const bd = active ? (p.colorActive||T.accent) : (p.borderIdle||"#374151");
      const fg = active ? (p.colorActive||T.accent) : (p.textIdle||T.textDim);
      return <div style={{width:"100%",height:"100%",background:p.bgColor||"#0a0e14",border:`1px solid ${bd}`,borderRadius:p.radius??4,display:"flex",alignItems:"center",justifyContent:"center",color:fg,fontSize:p.fontSize||22,fontFamily:"monospace",fontWeight:700,letterSpacing:2,pointerEvents:"none"}}>
        {active?(p.value||"42.5"):"--.-"}
      </div>;
    },
  },
  label_text: {
    label:"Label", icon:"T", w:120, h:30,
    render(p, active) {
      const fg = active ? (p.colorActive||T.accent) : (p.colorIdle||T.textDim);
      return <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",color:fg,fontSize:p.fontSize||13,fontFamily:p.font||"monospace",fontWeight:p.bold?700:600,letterSpacing:p.spacing||0,pointerEvents:"none",userSelect:"none"}}>
        {p.text||"LABEL"}
      </div>;
    },
  },
  frame_box: {
    label:"Frame", icon:"▣", w:200, h:130,
    render(p, active) {
      const bd = active ? (p.colorActive||T.accent) : (p.borderIdle||"#374151");
      const bg = p.bgColor||"rgba(255,255,255,0.015)";
      return <div style={{width:"100%",height:"100%",border:`${p.borderWidth||2}px solid ${bd}`,borderRadius:p.radius??6,position:"relative",background:bg,pointerEvents:"none"}}>
        {p.title&&<div style={{position:"absolute",top:-(p.fontSize||11)/2-3,left:12,background:T.panel,padding:"0 6px",color:active?(p.colorActive||T.accent):(p.colorIdle||T.textDim),fontSize:p.fontSize||11,fontFamily:"monospace"}}>{p.title}</div>}
      </div>;
    },
  },
  separator: {
    label:"Line", icon:"─", w:200, h:4,
    render(p, active) {
      const c = active ? (p.colorActive||T.accent) : (p.colorIdle||"#374151");
      return <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",pointerEvents:"none"}}>
        <div style={{width:"100%",height:p.thickness||2,background:c,borderRadius:1,opacity:p.opacity||1}}/>
      </div>;
    },
  },
};

// ─── EXPORT HELPERS ───────────────────────────────────────────────────────────
function elToHTML(el, active) {
  // Render element as inline HTML string for canvas export
  const p = el.props||{};
  const W = el.w, H = el.h;
  switch(el.type) {
    case "button_rect": { const bg=active?(p.colorActive||T.accent):(p.colorIdle||"#1e2430"),bd=active?(p.colorActive||T.accent):(p.borderIdle||"#374151"),fg=active?(p.textActive||"#fff"):(p.textIdle||T.textDim); return `<div style="width:${W}px;height:${H}px;background:${bg};border:2px solid ${bd};border-radius:${p.radius??6}px;display:flex;align-items:center;justify-content:center;color:${fg};font-size:${p.fontSize||13}px;font-weight:600;font-family:monospace;box-sizing:border-box;">${p.label||"BUTTON"}</div>`; }
    case "button_round": { const bg=active?(p.colorActive||T.accent):(p.colorIdle||"#1e2430"),bd=active?(p.colorActive||T.accent):(p.borderIdle||"#374151"),fg=active?(p.textActive||"#fff"):(p.textIdle||T.textDim); return `<div style="width:${W}px;height:${H}px;background:${bg};border:2px solid ${bd};border-radius:50%;display:flex;align-items:center;justify-content:center;color:${fg};font-size:${p.fontSize||11}px;font-weight:700;font-family:monospace;box-sizing:border-box;">${p.label||"OK"}</div>`; }
    case "toggle_switch": { const tr=active?(p.colorActive||T.accent):(p.colorIdle||"#1e2430"),bd=active?(p.colorActive||T.accent):(p.borderIdle||"#374151"); return `<div style="width:${W}px;height:${H}px;display:flex;align-items:center;justify-content:center;"><div style="width:54px;height:28px;background:${tr};border:2px solid ${bd};border-radius:14px;position:relative;box-sizing:border-box;"><div style="position:absolute;top:3px;left:${active?27:3}px;width:18px;height:18px;border-radius:50%;background:${active?"#fff":(p.knobIdle||"#555")};"></div></div></div>`; }
    case "indicator_led": { const c=active?(p.colorActive||T.green):(p.colorIdle||"#1e2430"),bd=active?(p.colorActive||T.green):(p.borderIdle||"#374151"),sz=p.size||28; return `<div style="width:${W}px;height:${H}px;display:flex;align-items:center;justify-content:center;"><div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${c};border:2px solid ${bd};"></div></div>`; }
    case "indicator_bar": { const fill=active?(p.colorActive||T.accent):(p.colorIdle||"#1e2430"),pct=active?(p.value||70):15; return `<div style="width:${W}px;height:${H}px;background:${p.bgColor||"#0a0e14"};border:1px solid ${p.borderIdle||"#374151"};border-radius:${p.radius??4}px;overflow:hidden;position:relative;box-sizing:border-box;"><div style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:${fill};"></div><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:${p.textColor||T.text};font-size:11px;font-family:monospace;">${active?`${pct}%`:"0%"}</div></div>`; }
    case "slider_h": { const pct=active?(p.value||60):0,c=p.colorActive||T.accent; return `<div style="width:${W}px;height:${H}px;display:flex;align-items:center;padding:0 10px;box-sizing:border-box;"><div style="flex:1;height:4px;background:${p.trackColor||"#1e2430"};border-radius:2px;position:relative;"><div style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:${c};border-radius:2px;"></div></div></div>`; }
    case "display_num": { const bd=active?(p.colorActive||T.accent):(p.borderIdle||"#374151"),fg=active?(p.colorActive||T.accent):(p.textIdle||T.textDim); return `<div style="width:${W}px;height:${H}px;background:${p.bgColor||"#0a0e14"};border:1px solid ${bd};border-radius:${p.radius??4}px;display:flex;align-items:center;justify-content:center;color:${fg};font-size:${p.fontSize||22}px;font-family:monospace;font-weight:700;letter-spacing:2px;box-sizing:border-box;">${active?(p.value||"42.5"):"--.-"}</div>`; }
    case "label_text": { const fg=active?(p.colorActive||T.accent):(p.colorIdle||T.textDim); return `<div style="width:${W}px;height:${H}px;display:flex;align-items:center;color:${fg};font-size:${p.fontSize||13}px;font-family:${p.font||"monospace"};font-weight:${p.bold?700:600};">${p.text||"LABEL"}</div>`; }
    case "frame_box": { const bd=active?(p.colorActive||T.accent):(p.borderIdle||"#374151"); return `<div style="width:${W}px;height:${H}px;border:${p.borderWidth||2}px solid ${bd};border-radius:${p.radius??6}px;position:relative;background:${p.bgColor||"rgba(255,255,255,0.015)"};box-sizing:border-box;">${p.title?`<div style="position:absolute;top:-8px;left:12px;background:#161b22;padding:0 6px;color:${active?(p.colorActive||T.accent):(p.colorIdle||T.textDim)};font-size:${p.fontSize||11}px;font-family:monospace;">${p.title}</div>`:""}</div>`; }
    case "separator": { const c=active?(p.colorActive||T.accent):(p.colorIdle||"#374151"); return `<div style="width:${W}px;height:${H}px;display:flex;align-items:center;"><div style="width:100%;height:${p.thickness||2}px;background:${c};border-radius:1px;"></div></div>`; }
    default: return `<div style="width:${W}px;height:${H}px;background:#333;border-radius:4px;"></div>`;
  }
}

function exportPNG(pageElements, sharedElements, active, filename, cW, cH, bgColor, bgImage) {
  const canvas = document.createElement("canvas");
  canvas.width = cW; canvas.height = cH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bgColor||T.bg;
  ctx.fillRect(0,0,cW,cH);
  const allEls = [...sharedElements, ...pageElements];
  const drawElements = () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cW}" height="${cH}">
    <foreignObject width="${cW}" height="${cH}">
      <div xmlns="http://www.w3.org/1999/xhtml" style="width:${cW}px;height:${cH}px;position:relative;background:transparent;font-family:monospace;">
        ${allEls.map(el=>`<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;opacity:${el.opacity??1};">${elToHTML(el,active)}</div>`).join("")}
      </div>
    </foreignObject>
  </svg>`;
    const url = URL.createObjectURL(new Blob([svg],{type:"image/svg+xml"}));
    const img = new Image();
    img.onload = () => { ctx.drawImage(img,0,0); URL.revokeObjectURL(url); canvas.toBlob(b=>{const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=filename;a.click();}); };
    img.src = url;
  };
  if (bgImage) {
    const bgImg = new Image();
    bgImg.onload = () => { ctx.drawImage(bgImg,0,0,cW,cH); drawElements(); };
    bgImg.src = bgImage;
  } else { drawElements(); }
}

function exportCSV(pages, sharedElements, cW, cH) {
  const rows = [["Page","Page Name","Layer","ID","Type","Label","X","Y","W","H","X2","Y2","Cx","Cy"]];
  const addEls = (els, pageName, pageId, layer) => els.forEach(el => {
    const lb = el.props?.label||el.props?.text||el.props?.title||"";
    rows.push([pageId,pageName,layer,el.id,el.type,lb,el.x,el.y,el.w,el.h,el.x+el.w,el.y+el.h,Math.round(el.x+el.w/2),Math.round(el.y+el.h/2)]);
  });
  sharedElements.forEach(el => { const lb=el.props?.label||el.props?.text||el.props?.title||""; rows.push(["SHARED","Общие элементы","shared",el.id,el.type,lb,el.x,el.y,el.w,el.h,el.x+el.w,el.y+el.h,Math.round(el.x+el.w/2),Math.round(el.y+el.h/2)]); });
  pages.forEach(p => addEls(p.elements, p.name, p.id, "page"));
  rows.push([],[`# Canvas: ${cW}x${cH}`]);
  const csv = rows.map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
  const a = document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="hmi_coords.csv"; a.click();
}

// ─── COLOR PICKER ROW ─────────────────────────────────────────────────────────
function ColorRow({label, propKey, value, onChange, defaultVal}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
      <div style={{color:T.textDim,fontSize:11,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</div>
      <input type="color" value={value||defaultVal||"#000000"} onChange={e=>onChange(propKey,e.target.value)}
        style={{width:32,height:24,border:`1px solid ${T.border}`,borderRadius:3,cursor:"pointer",background:"none",padding:1}}/>
      <div onClick={()=>onChange(propKey,undefined)} title="Сбросить"
        style={{color:T.textFaint,cursor:"pointer",fontSize:13,lineHeight:1,padding:"2px 4px",borderRadius:2}}>✕</div>
    </div>
  );
}

// ─── PROP FIELD ───────────────────────────────────────────────────────────────
function PropField({label, value, onChange, type="text", min, max, placeholder}) {
  return (
    <div style={{marginBottom:8}}>
      <div style={{color:T.textDim,fontSize:11,marginBottom:3}}>{label}</div>
      <input type={type} value={value??""} min={min} max={max} placeholder={placeholder}
        onChange={e=>onChange(type==="number"?parseFloat(e.target.value)||0:e.target.value)}
        style={{width:"100%",background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:"5px 8px",fontSize:12,fontFamily:"monospace",borderRadius:3,boxSizing:"border-box"}}/>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function HMIEditor() {
  // Canvas settings
  const [resolution, setResolution] = useState(RESOLUTIONS[2]);
  const [customW, setCustomW] = useState(800);
  const [customH, setCustomH] = useState(480);
  const [bgColor, setBgColor] = useState("#0f1117");
  const [bgImage, setBgImage] = useState(null);
  const bgFileInputRef = useRef(null);
  const importJsonRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState(null); // null | "saved" | "error"
  const [showResModal, setShowResModal] = useState(false);
  const [tempRes, setTempRes] = useState(RESOLUTIONS[2]);

  const cW = resolution.w ?? customW;
  const cH = resolution.h ?? customH;

  // Pages: each has { id, name, elements[] }
  // elements can have el.shared=true — shown on all pages, editable anywhere
  const [pages, setPages] = useState([{id:"p1", name:"Page 1", elements:[]}]);
  const [activePageId, setActivePageId] = useState("p1");

  // Shared elements live separately (global, shown on all pages)
  const [sharedElements, setSharedElements] = useState([]);

  // Current page elements (live-edited)
  const [elements, setElements] = useState([]);

  // ── Undo/Redo history ──
  const MAX_HISTORY = 50;
  const [history, setHistory] = useState([{elements:[], sharedElements:[]}]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoRef = useRef(false); // flag to skip pushing during undo/redo

  // Selection & interaction
  const [selected, setSelected] = useState(null);        // primary (for props panel)
  const [selectedIsShared, setSelectedIsShared] = useState(false);
  const [multiSelected, setMultiSelected] = useState(new Set()); // all selected ids
  const [preview, setPreview] = useState("idle");  // idle|active|split

  // Zoom & pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({x:0, y:0});
  const zoomRef = useRef(1);
  const panRef = useRef({x:0, y:0});
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  // UI panels
  const [showCoords, setShowCoords] = useState(false);
  const [showPageMgr, setShowPageMgr] = useState(false);
  const [activeTab, setActiveTab] = useState("props"); // props|colors

  const canvasRef = useRef(null);
  const dragType = useRef(null);

  // ── Refs for always-fresh state in event handlers ──
  const elementsRef = useRef(elements);
  const sharedRef = useRef(sharedElements);
  const selectedIsSharedRef = useRef(false);
  const scaleRef = useRef(1);
  const cWRef = useRef(cW);
  const cHRef = useRef(cH);
  const selectedRef = useRef(selected);

  useEffect(() => { elementsRef.current = elements; }, [elements]);
  useEffect(() => { sharedRef.current = sharedElements; }, [sharedElements]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { selectedIsSharedRef.current = selectedIsShared; }, [selectedIsShared]);

  // Sync elements → page
  useEffect(() => {
    setPages(ps => ps.map(p => p.id === activePageId ? {...p, elements} : p));
  }, [elements]);

  // Load page elements when switching
  useEffect(() => {
    const p = pages.find(p => p.id === activePageId);
    setElements(p ? p.elements : []);
    setSelected(null);
    const empty = new Set();
    setMultiSelected(empty);
    multiSelectedRef.current = empty;
  }, [activePageId]);

  const currentPage = pages.find(p => p.id === activePageId);
  const selectedEl = (selectedIsShared ? sharedElements : elements).find(e => e.id === selected);
  const allPages = pages.map(p => p.id === activePageId ? {...p, elements} : p);

  // Canvas display: base scale fits canvas in view, then multiply by user zoom
  const BASE_SCALE = Math.min(1, Math.min(900, window.innerWidth - 460) / cW);
  const scale = BASE_SCALE * zoom;
  const dW = cW * scale;
  const dH = cH * scale;

  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { cWRef.current = cW; cHRef.current = cH; }, [cW, cH]);

  // Wheel zoom — plain wheel OR Ctrl+wheel, anywhere in the window
  useEffect(() => {
    const handler = (e) => {
      // Only zoom when hovering over the canvas area
      if (!canvasAreaRef.current?.contains(e.target)) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      setZoom(z => Math.min(4, Math.max(0.2, z * factor)));
    };
    window.addEventListener("wheel", handler, { passive: false });
    return () => window.removeEventListener("wheel", handler);
  }, []);

  // ── History (must be declared before any callback that uses it) ──
  const historyIndexRef = useRef(0);
  useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);

  const pushHistory = useCallback((els, shared) => {
    if (isUndoRedoRef.current) return;
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndexRef.current + 1);
      const next = [...trimmed, { elements: els.map(e=>({...e,props:{...e.props}})), sharedElements: shared.map(e=>({...e,props:{...e.props}})) }];
      return next.slice(-MAX_HISTORY);
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    const newIdx = historyIndexRef.current - 1;
    setHistoryIndex(newIdx);
    isUndoRedoRef.current = true;
    setHistory(h => {
      const snap = h[newIdx];
      if (snap) {
        setElements(snap.elements.map(e=>({...e,props:{...e.props}})));
        setSharedElements(snap.sharedElements.map(e=>({...e,props:{...e.props}})));
      }
      return h;
    });
    setTimeout(() => { isUndoRedoRef.current = false; }, 0);
  }, []);

  const redo = useCallback(() => {
    setHistory(h => {
      const newIdx = historyIndexRef.current + 1;
      if (newIdx >= h.length) return h;
      setHistoryIndex(newIdx);
      isUndoRedoRef.current = true;
      const snap = h[newIdx];
      if (snap) {
        setElements(snap.elements.map(e=>({...e,props:{...e.props}})));
        setSharedElements(snap.sharedElements.map(e=>({...e,props:{...e.props}})));
      }
      setTimeout(() => { isUndoRedoRef.current = false; }, 0);
      return h;
    });
  }, []);

  // ── Helpers ──
  const updateEl = useCallback((id, updater) => {
    if (selectedIsSharedRef.current) {
      setSharedElements(prev => prev.map(e => e.id === id ? updater(e) : e));
    } else {
      setElements(prev => prev.map(e => e.id === id ? updater(e) : e));
    }
  }, []);

  const propHistoryTimer = useRef(null);

  const updateProp = useCallback((key, val) => {
    const sel = selectedRef.current;
    if (!sel) return;
    if (selectedIsSharedRef.current) {
      setSharedElements(prev => {
        const next = prev.map(e => e.id === sel ? {...e, props:{...e.props, [key]: val===undefined?undefined:val}} : e);
        clearTimeout(propHistoryTimer.current);
        propHistoryTimer.current = setTimeout(() => pushHistory(elementsRef.current, next), 600);
        return next;
      });
    } else {
      setElements(prev => {
        const next = prev.map(e => e.id === sel ? {...e, props:{...e.props, [key]: val===undefined?undefined:val}} : e);
        clearTimeout(propHistoryTimer.current);
        propHistoryTimer.current = setTimeout(() => pushHistory(next, sharedRef.current), 600);
        return next;
      });
    }
  }, [pushHistory]);

  // ── Drag from palette ──
  const onPaletteDrag = (type) => { dragType.current = type; };

  const onCanvasDrop = useCallback((e) => {
    if (!dragType.current) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const sc = scaleRef.current;
    const def = DEFS[dragType.current];
    const x = snap((e.clientX - rect.left) / sc - def.w/2);
    const y = snap((e.clientY - rect.top) / sc - def.h/2);
    const el = {
      id: newId(), type: dragType.current,
      x: Math.max(0, Math.min(x, cWRef.current-def.w)),
      y: Math.max(0, Math.min(y, cHRef.current-def.h)),
      w: def.w, h: def.h, props: {},
    };
    setElements(prev => {
      const next = [...prev, el];
      pushHistory(next, sharedRef.current);
      return next;
    });
    setSelected(el.id);
    setSelectedIsShared(false);
    selectedIsSharedRef.current = false;
    dragType.current = null;
  }, [pushHistory]);

  // ── Element interaction (all use refs — zero stale closure) ──
  const draggingRef = useRef(null);   // { ids[], isShared, startPositions{id:{x,y}}, startMouseX, startMouseY }
  const resizingRef = useRef(null);
  const marqueeRef = useRef(null);    // { startX, startY, x, y, w, h } in canvas coords
  const middlePanRef = useRef(null);  // middle mouse pan
  const multiSelectedRef = useRef(new Set());
  useEffect(() => { multiSelectedRef.current = multiSelected; }, [multiSelected]);

  // Marquee state for rendering
  const [marquee, setMarquee] = useState(null);

  const onElDown = useCallback((e, id, isShared) => {
    e.stopPropagation();
    e.preventDefault();

    if (e.shiftKey) {
      // Shift+click — toggle in multi-selection
      setMultiSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) { next.delete(id); }
        else { next.add(id); }
        multiSelectedRef.current = next;
        return next;
      });
      setSelected(id);
      setSelectedIsShared(isShared);
      selectedRef.current = id;
      selectedIsSharedRef.current = isShared;
      return;
    }

    // Normal click — if clicking already-selected element in a multi-selection, start group drag
    // otherwise select single
    const currentMulti = multiSelectedRef.current;
    if (!currentMulti.has(id) || currentMulti.size <= 1) {
      setSelected(id);
      setSelectedIsShared(isShared);
      selectedRef.current = id;
      selectedIsSharedRef.current = isShared;
      const newSet = new Set([id]);
      setMultiSelected(newSet);
      multiSelectedRef.current = newSet;
    }

    // Start drag — capture start positions for all selected elements
    const allEls = [...elementsRef.current, ...sharedRef.current];
    const ids = multiSelectedRef.current.size > 0 ? [...multiSelectedRef.current] : [id];
    const startPositions = {};
    ids.forEach(eid => {
      const el = allEls.find(x => x.id === eid);
      if (el) startPositions[eid] = { x: el.x, y: el.y };
    });
    draggingRef.current = { ids, isShared, startPositions, startMouseX: e.clientX, startMouseY: e.clientY };
  }, []);

  const onResizeDown = useCallback((e, id, isShared) => {
    e.stopPropagation();
    e.preventDefault();
    const currentEls = isShared ? sharedRef.current : elementsRef.current;
    const el = currentEls.find(x => x.id === id);
    if (!el) return;
    resizingRef.current = { id, isShared, startX: e.clientX, startY: e.clientY, startW: el.w, startH: el.h };
  }, []);

  const canvasAreaRef = useRef(null); // the scrollable wrapper

  const onCanvasMouseDown = useCallback((e) => {
    // Middle mouse — start pan
    if (e.button === 1) {
      e.preventDefault();
      middlePanRef.current = { startX: e.clientX, startY: e.clientY, startPan: {...panRef.current} };
      return;
    }
    if (e.button !== 0) return;
    if (wasDraggingRef.current) { wasDraggingRef.current = false; return; }
    // Left click on canvas background — start marquee
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sc = scaleRef.current;
    const mx = (e.clientX - rect.left) / sc;
    const my = (e.clientY - rect.top) / sc;
    marqueeRef.current = { startX: mx, startY: my, x: mx, y: my, w: 0, h: 0 };
    if (!e.shiftKey) {
      setSelected(null);
      setSelectedIsShared(false);
      selectedRef.current = null;
      const empty = new Set();
      setMultiSelected(empty);
      multiSelectedRef.current = empty;
    }
  }, []);

  const onMouseMove = useCallback((e) => {
    // Middle mouse pan
    if (middlePanRef.current) {
      const dx = e.clientX - middlePanRef.current.startX;
      const dy = e.clientY - middlePanRef.current.startY;
      setPan({ x: middlePanRef.current.startPan.x + dx, y: middlePanRef.current.startPan.y + dy });
      return;
    }

    const dr = draggingRef.current;
    const rs = resizingRef.current;
    const mq = marqueeRef.current;

    if (dr) {
      const sc = scaleRef.current;
      const dx = (e.clientX - dr.startMouseX) / sc;
      const dy = (e.clientY - dr.startMouseY) / sc;
      const allEls = [...elementsRef.current, ...sharedRef.current];
      dr.ids.forEach(eid => {
        const startPos = dr.startPositions[eid];
        if (!startPos) return;
        const el = allEls.find(x => x.id === eid);
        if (!el) return;
        const nx = snap(Math.max(0, Math.min(startPos.x + dx, cWRef.current - el.w)));
        const ny = snap(Math.max(0, Math.min(startPos.y + dy, cHRef.current - el.h)));
        const updater = x => ({...x, x: nx, y: ny});
        // check if shared
        if (sharedRef.current.find(x => x.id === eid)) {
          setSharedElements(prev => prev.map(x => x.id === eid ? updater(x) : x));
        } else {
          setElements(prev => prev.map(x => x.id === eid ? updater(x) : x));
        }
      });
    }

    if (rs) {
      const sc = scaleRef.current;
      const dx = (e.clientX - rs.startX) / sc;
      const dy = (e.clientY - rs.startY) / sc;
      const updater = x => ({...x, w:Math.max(GRID*2,snap(rs.startW+dx)), h:Math.max(GRID*2,snap(rs.startH+dy))});
      if (rs.isShared) setSharedElements(prev => prev.map(x => x.id === rs.id ? updater(x) : x));
      else setElements(prev => prev.map(x => x.id === rs.id ? updater(x) : x));
    }

    if (mq) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sc = scaleRef.current;
      const mx = (e.clientX - rect.left) / sc;
      const my = (e.clientY - rect.top) / sc;
      const x = Math.min(mx, mq.startX);
      const y = Math.min(my, mq.startY);
      const w = Math.abs(mx - mq.startX);
      const h = Math.abs(my - mq.startY);
      marqueeRef.current = { ...mq, x, y, w, h };
      setMarquee({ x, y, w, h });
    }
  }, []);

  const wasDraggingRef = useRef(false);
  const onMouseUp = useCallback((e) => {
    if (middlePanRef.current) { middlePanRef.current = null; return; }

    const wasDrag = !!(draggingRef.current || resizingRef.current);
    wasDraggingRef.current = wasDrag;
    if (wasDrag) pushHistory(elementsRef.current, sharedRef.current);

    // Finish marquee — select all elements inside rect
    if (marqueeRef.current && marqueeRef.current.w > 4) {
      const mq = marqueeRef.current;
      const allEls = [...sharedRef.current, ...elementsRef.current];
      const hit = allEls.filter(el =>
        el.x < mq.x + mq.w && el.x + el.w > mq.x &&
        el.y < mq.y + mq.h && el.y + el.h > mq.y
      );
      if (hit.length > 0) {
        const ids = new Set(e.shiftKey ? [...multiSelectedRef.current, ...hit.map(x=>x.id)] : hit.map(x=>x.id));
        setMultiSelected(ids);
        multiSelectedRef.current = ids;
        const first = hit[hit.length - 1];
        setSelected(first.id);
        selectedRef.current = first.id;
        const firstIsShared = !!sharedRef.current.find(x => x.id === first.id);
        setSelectedIsShared(firstIsShared);
        selectedIsSharedRef.current = firstIsShared;
      }
    }

    draggingRef.current = null;
    resizingRef.current = null;
    marqueeRef.current = null;
    setMarquee(null);
  }, [pushHistory]);

  const deleteSelected = useCallback(() => {
    const ids = multiSelectedRef.current.size > 0 ? multiSelectedRef.current : (selectedRef.current ? new Set([selectedRef.current]) : new Set());
    if (ids.size === 0) return;
    setElements(prev => {
      const next = prev.filter(e => !ids.has(e.id));
      setSharedElements(prev2 => {
        const next2 = prev2.filter(e => !ids.has(e.id));
        pushHistory(next, next2);
        return next2;
      });
      return next;
    });
    setSelected(null);
    setSelectedIsShared(false);
    selectedRef.current = null;
    const empty = new Set();
    setMultiSelected(empty);
    multiSelectedRef.current = empty;
  }, [pushHistory]);



  const handleBgImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBgImage(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const clearBgImage = () => setBgImage(null);

  // ── Project serialization ──
  const getProjectSnapshot = () => {
    const currentAllPages = pages.map(p => p.id === activePageId ? {...p, elements} : p);
    return {
      version: 1,
      resolution,
      customW,
      customH,
      bgColor,
      bgImage,
      pages: currentAllPages,
      sharedElements,
      activePageId,
    };
  };

  const applyProjectSnapshot = (data) => {
    if (!data || data.version !== 1) return false;
    const res = RESOLUTIONS.find(r => r.label === data.resolution?.label) || data.resolution || RESOLUTIONS[2];
    setResolution(res);
    setCustomW(data.customW ?? 800);
    setCustomH(data.customH ?? 480);
    setBgColor(data.bgColor ?? "#0f1117");
    setBgImage(data.bgImage ?? null);
    const loadedPages = data.pages || [{id:"p1",name:"Page 1",elements:[]}];
    setPages(loadedPages);
    setSharedElements(data.sharedElements || []);
    const pid = data.activePageId || loadedPages[0]?.id;
    setActivePageId(pid);
    // Update _id counter to avoid ID collisions
    const allIds = [...(data.sharedElements||[]), ...loadedPages.flatMap(p=>p.elements||[])].map(e=>parseInt(e.id?.replace("el_","")||0)).filter(Boolean);
    if (allIds.length) _id = Math.max(...allIds) + 1;
    return true;
  };

  // Autosave to localStorage
  useEffect(() => {
    const snap = getProjectSnapshot();
    try {
      localStorage.setItem("hmi_editor_project", JSON.stringify(snap));
      setSaveStatus("saved");
      const t = setTimeout(() => setSaveStatus(null), 1500);
      return () => clearTimeout(t);
    } catch { setSaveStatus("error"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolution, customW, customH, bgColor, bgImage, pages, sharedElements, activePageId, elements]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("hmi_editor_project");
      if (raw) applyProjectSnapshot(JSON.parse(raw));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportJSON = () => {
    const snap = getProjectSnapshot();
    const blob = new Blob([JSON.stringify(snap, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "hmi_project.json";
    a.click();
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!applyProjectSnapshot(data)) alert("Неверный формат файла проекта.");
      } catch { alert("Не удалось прочитать файл. Убедитесь, что это корректный JSON."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Move element to/from shared ──
  const toggleShared = () => {
    const sel = selectedRef.current;
    if (!sel) return;
    if (selectedIsSharedRef.current) {
      const el = sharedRef.current.find(e => e.id === sel);
      if (!el) return;
      setSharedElements(prev => {
        const next = prev.filter(e => e.id !== sel);
        setElements(prevEls => {
          const nextEls = [...prevEls, el];
          pushHistory(nextEls, next);
          return nextEls;
        });
        return next;
      });
      setSelectedIsShared(false);
      selectedIsSharedRef.current = false;
    } else {
      const el = elementsRef.current.find(e => e.id === sel);
      if (!el) return;
      setElements(prev => {
        const next = prev.filter(e => e.id !== sel);
        setSharedElements(prevShared => {
          const nextShared = [...prevShared, el];
          pushHistory(next, nextShared);
          return nextShared;
        });
        return next;
      });
      setSelectedIsShared(true);
      selectedIsSharedRef.current = true;
    }
  };

  // ── Clipboard ──
  const clipboardRef = useRef(null);

  const copySelected = useCallback(() => {
    const sel = selectedRef.current;
    if (!sel) return;
    const src = selectedIsSharedRef.current ? sharedRef.current : elementsRef.current;
    const el = src.find(e => e.id === sel);
    if (!el) return;
    clipboardRef.current = { ...el, props: { ...el.props } };
  }, []);

  const pasteClipboard = useCallback(() => {
    const cb = clipboardRef.current;
    if (!cb) return;
    const el = { ...cb, id: newId(), x: cb.x + 8, y: cb.y + 8, props: { ...cb.props } };
    // keep pasting on repeated Ctrl+V — shift clipboard too so next paste is also offset
    clipboardRef.current = { ...cb, x: cb.x + 8, y: cb.y + 8 };
    setElements(prev => {
      const next = [...prev, el];
      pushHistory(next, sharedRef.current);
      return next;
    });
    setSelected(el.id);
    setSelectedIsShared(false);
    selectedRef.current = el.id;
    selectedIsSharedRef.current = false;
  }, [pushHistory]);

  const duplicateSelected = useCallback(() => {
    const sel = selectedRef.current;
    if (!sel) return;
    const src = selectedIsSharedRef.current ? sharedRef.current : elementsRef.current;
    const el = src.find(e => e.id === sel);
    if (!el) return;
    const dup = { ...el, id: newId(), x: el.x + 8, y: el.y + 8, props: { ...el.props } };
    setElements(prev => {
      const next = [...prev, dup];
      pushHistory(next, sharedRef.current);
      return next;
    });
    setSelected(dup.id);
    setSelectedIsShared(false);
    selectedRef.current = dup.id;
    selectedIsSharedRef.current = false;
  }, [pushHistory]);

  // Keyboard: delete + undo/redo + copy/paste/duplicate
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT") return;
      const hasSel = !!selectedRef.current;
      if ((e.key==="Delete"||e.key==="Backspace") && hasSel) { deleteSelected(); return; }
      if (e.ctrlKey || e.metaKey) {
        const code = e.code; // физическая клавиша — не зависит от раскладки
        if (code==="KeyZ" && !e.shiftKey) { e.preventDefault(); undo(); return; }
        if ((code==="KeyZ" && e.shiftKey) || code==="KeyY") { e.preventDefault(); redo(); return; }
        if (code==="KeyC" && hasSel) { e.preventDefault(); copySelected(); return; }
        if (code==="KeyV") { e.preventDefault(); pasteClipboard(); return; }
        if (code==="KeyD" && hasSel) { e.preventDefault(); duplicateSelected(); return; }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Page management ──
  const addPage = () => {
    const id = `p${Date.now()}`;
    setPages(ps => [...ps, {id, name:`Page ${ps.length+1}`, elements:[]}]);
    setActivePageId(id);
  };

  const duplicatePage = (pageId) => {
    const src = pages.find(p => p.id === pageId);
    if (!src) return;
    const id = `p${Date.now()}`;
    const newEls = src.elements.map(el => ({...el, id: newId(), props:{...el.props}}));
    setPages(ps => [...ps, {id, name:`${src.name} (копия)`, elements: newEls}]);
    setActivePageId(id);
  };

  const deletePage = (pageId) => {
    if (pages.length <= 1) return;
    setPages(ps => ps.filter(p => p.id !== pageId));
    if (activePageId === pageId) setActivePageId(pages.find(p => p.id !== pageId)?.id);
  };

  const renamePage = (pageId, name) => {
    setPages(ps => ps.map(p => p.id === pageId ? {...p, name} : p));
  };

  // ── Export ──
  const handleExport = () => {
    const pageIndex = allPages.findIndex(p => p.id === activePageId);
    const idleNum = pageIndex * 2;
    const activeNum = pageIndex * 2 + 1;
    exportPNG(elements, sharedElements, false, `${idleNum}.png`, cW, cH, bgColor, bgImage);
    setTimeout(() => exportPNG(elements, sharedElements, true, `${activeNum}.png`, cW, cH, bgColor, bgImage), 350);
  };

  const handleExportAll = () => {
    allPages.forEach((p, i) => {
      setTimeout(() => {
        exportPNG(p.elements, sharedElements, false, `${i * 2}.png`, cW, cH, bgColor, bgImage);
        setTimeout(() => exportPNG(p.elements, sharedElements, true, `${i * 2 + 1}.png`, cW, cH, bgColor, bgImage), 300);
      }, i * 700);
    });
  };

  // ── Render element ──
  const renderEl = (el, forceActive, isShared=false) => {
    const def = DEFS[el.type];
    if (!def) return null;
    const active = forceActive !== undefined ? forceActive : preview === "active";
    const isSel = el.id === selected && selectedIsShared === isShared;
    const isMulti = multiSelected.has(el.id) && !isSel;
    return (
      <div
        key={el.id}
        onMouseDown={(e) => onElDown(e, el.id, isShared)}
        style={{
          position:"absolute", left:el.x, top:el.y, width:el.w, height:el.h,
          cursor:"move",
          outline: isSel ? `2px solid ${T.accent}` : isMulti ? `2px solid ${T.yellow}` : isShared ? `1px dashed ${T.blue}44` : "none",
          outlineOffset: 2, zIndex: isSel?20:isMulti?15:isShared?1:1,
          boxSizing:"border-box",
          opacity: el.opacity ?? 1,
        }}
      >
        {def.render(el.props, active)}
        {isSel && (
          <div
            onMouseDown={(e) => onResizeDown(e, el.id, isShared)}
            style={{position:"absolute",right:-6,bottom:-6,width:14,height:14,background:T.accent,cursor:"se-resize",borderRadius:3,zIndex:30}}
          />
        )}
        {isSel && (
          <div style={{position:"absolute",top:-22,left:0,background:T.accentDim,color:T.accent,fontSize:10,padding:"2px 6px",borderRadius:2,whiteSpace:"nowrap",fontFamily:"monospace"}}>
            {el.type} [{el.x},{el.y}]{isShared?" 🔗":""}
          </div>
        )}
      </div>
    );
  };

  // ── Properties panel content ──
  const PropsPanel = () => {
    if (!selectedEl) return (
      <div style={{padding:16,color:T.textDim,fontSize:12,lineHeight:2.2}}>
        <div style={{color:T.text,fontWeight:600,marginBottom:8,fontSize:13}}>Как работать:</div>
        <div>← Перетащить компонент</div>
        <div>• Клик — выбор</div>
        <div>• Shift+клик — добавить к выбору</div>
        <div>• Рамка мышью — выбор группы</div>
        <div>• ↘ угол — ресайз</div>
        <div>• Del — удалить всё выбранное</div>
        <div>• Ctrl+Z — отменить</div>
        <div>• Ctrl+Shift+Z — повторить</div>
        <div>• Ctrl+C / Ctrl+V — копировать/вставить</div>
        <div>• Ctrl+D — дублировать</div>
        <div>• Колесо — зум, зажать колесо — панорама</div>
        <div style={{marginTop:10,color:T.accent}}>⬇ 2×PNG — экспорт</div>
        <div style={{color:T.green}}>⬇ CSV — координаты</div>
        <div style={{marginTop:10,color:T.blue,fontSize:11}}>Синяя пунктирная рамка<br/>= общий элемент</div>
      </div>
    );

    const p = selectedEl.props;
    const up = updateProp;
    const def = DEFS[selectedEl.type];

    return (
      <div style={{padding:12}}>
        <div style={{background:T.accentBg,border:`1px solid ${T.accentDim}`,borderRadius:4,padding:"6px 10px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{color:T.accent,fontSize:13,fontWeight:700}}>{def?.label||selectedEl.type}</span>
          {selectedIsShared && <span style={{color:T.blue,fontSize:11}}>🔗 ОБЩИЙ</span>}
        </div>

        {/* Position & Size */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:10}}>
          {[{l:"X",k:"x"},{l:"Y",k:"y"},{l:"W",k:"w"},{l:"H",k:"h"}].map(f=>(
            <div key={f.k}>
              <div style={{color:T.textDim,fontSize:11,marginBottom:3}}>{f.l}</div>
              <input type="number" value={selectedEl[f.k]}
                onChange={e=>{const v=snap(parseInt(e.target.value)||0); const sel=selectedRef.current; if(selectedIsSharedRef.current) setSharedElements(prev=>prev.map(el=>el.id===sel?{...el,[f.k]:v}:el)); else setElements(prev=>prev.map(el=>el.id===sel?{...el,[f.k]:v}:el));}}
                style={{width:"100%",background:T.bg,border:`1px solid ${T.border}`,color:T.green,padding:"5px 6px",fontSize:12,fontFamily:"monospace",borderRadius:3,boxSizing:"border-box"}}/>
            </div>
          ))}
        </div>

        {/* Opacity */}
        <div style={{marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <div style={{color:T.textDim,fontSize:11}}>ПРОЗРАЧНОСТЬ</div>
            <div style={{color:T.accent,fontSize:12,fontFamily:"monospace",fontWeight:700}}>{Math.round((selectedEl.opacity??1)*100)}%</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <input type="range" min={0} max={1} step={0.01} value={selectedEl.opacity??1}
              onChange={e=>{
                const v=parseFloat(e.target.value); const sel=selectedRef.current;
                if(selectedIsSharedRef.current) setSharedElements(prev=>prev.map(el=>el.id===sel?{...el,opacity:v}:el));
                else setElements(prev=>prev.map(el=>el.id===sel?{...el,opacity:v}:el));
              }}
              style={{flex:1,accentColor:T.accent,cursor:"pointer"}}/>
            <div onClick={()=>{const sel=selectedRef.current; if(selectedIsSharedRef.current) setSharedElements(prev=>prev.map(el=>el.id===sel?{...el,opacity:1}:el)); else setElements(prev=>prev.map(el=>el.id===sel?{...el,opacity:1}:el));}}
              title="Сбросить" style={{color:T.textFaint,cursor:"pointer",fontSize:13,padding:"2px 4px",flexShrink:0}}>✕</div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{display:"flex",gap:5,marginBottom:12,borderBottom:`1px solid ${T.border}`,paddingBottom:10}}>
          {["props","colors"].map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)}
              style={{flex:1,padding:"5px",background:activeTab===tab?T.accentBg:"transparent",border:`1px solid ${activeTab===tab?T.accentDim:T.border}`,color:activeTab===tab?T.accent:T.textDim,fontSize:11,cursor:"pointer",borderRadius:3,fontFamily:"monospace",letterSpacing:1}}>
              {tab==="props"?"СВОЙСТВА":"ЦВЕТА"}
            </button>
          ))}
        </div>

        {activeTab === "props" && (
          <div>
            {/* Common props by type */}
            {(selectedEl.type==="button_rect"||selectedEl.type==="button_round") && <>
              <PropField label="Надпись" value={p.label} onChange={v=>up("label",v)} placeholder="BUTTON"/>
              <PropField label="Размер шрифта" value={p.fontSize} onChange={v=>up("fontSize",v)} type="number" min={8} max={48}/>
              <PropField label="Радиус скругления" value={p.radius} onChange={v=>up("radius",v)} type="number" min={0} max={50}/>
            </>}
            {selectedEl.type==="label_text" && <>
              <PropField label="Текст" value={p.text} onChange={v=>up("text",v)} placeholder="LABEL"/>
              <PropField label="Размер шрифта" value={p.fontSize} onChange={v=>up("fontSize",v)} type="number" min={8} max={72}/>
              <div style={{marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                <div style={{color:T.textDim,fontSize:9}}>Жирный</div>
                <div onClick={()=>up("bold",!p.bold)} style={{width:28,height:16,background:p.bold?T.accent:"#1e2430",border:`1px solid ${p.bold?T.accent:"#374151"}`,borderRadius:8,cursor:"pointer",position:"relative"}}>
                  <div style={{position:"absolute",top:2,left:p.bold?12:2,width:10,height:10,borderRadius:"50%",background:p.bold?"#fff":"#555"}}/>
                </div>
              </div>
            </>}
            {selectedEl.type==="frame_box" && <>
              <PropField label="Заголовок" value={p.title} onChange={v=>up("title",v)} placeholder="GROUP"/>
              <PropField label="Толщина рамки" value={p.borderWidth} onChange={v=>up("borderWidth",v)} type="number" min={1} max={8}/>
              <PropField label="Радиус" value={p.radius} onChange={v=>up("radius",v)} type="number" min={0} max={40}/>
            </>}
            {(selectedEl.type==="indicator_bar"||selectedEl.type==="slider_h") && <>
              <PropField label="Значение (%)" value={p.value} onChange={v=>up("value",Math.max(0,Math.min(100,v)))} type="number" min={0} max={100}/>
            </>}
            {selectedEl.type==="indicator_led" && <>
              <PropField label="Размер (px)" value={p.size} onChange={v=>up("size",v)} type="number" min={8} max={80}/>
            </>}
            {selectedEl.type==="display_num" && <>
              <PropField label="Значение" value={p.value} onChange={v=>up("value",v)} placeholder="42.5"/>
              <PropField label="Размер шрифта" value={p.fontSize} onChange={v=>up("fontSize",v)} type="number" min={10} max={72}/>
            </>}
            {selectedEl.type==="separator" && <>
              <PropField label="Толщина (px)" value={p.thickness} onChange={v=>up("thickness",v)} type="number" min={1} max={16}/>
              <PropField label="Прозрачность" value={p.opacity} onChange={v=>up("opacity",Math.max(0,Math.min(1,v)))} type="number" min={0} max={1}/>
            </>}

            {/* Toggle shared */}
            <div style={{marginTop:12}}>
              <button onClick={toggleShared}
                style={{width:"100%",padding:"7px",background:selectedIsShared?"rgba(88,166,255,0.1)":"transparent",border:`1px solid ${selectedIsShared?T.blue:T.border}`,color:selectedIsShared?T.blue:T.textDim,fontSize:11,cursor:"pointer",borderRadius:3,marginBottom:5,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <span>{selectedIsShared?"🔗":"🔗"}</span>
                <span>{selectedIsShared?"✓ Общий элемент (снять)":"Сделать общим"}</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === "colors" && (
          <div>
            <div style={{color:T.textDim,fontSize:11,marginBottom:9,lineHeight:1.6}}>
              Idle = состояние ожидания<br/>Active = состояние нажатия
            </div>
            {/* Color fields per type */}
            {(selectedEl.type==="button_rect"||selectedEl.type==="button_round"||selectedEl.type==="toggle_switch") && <>
              <div style={{color:T.textDim,fontSize:11,marginBottom:5,letterSpacing:1}}>ФОН</div>
              <ColorRow label="Idle фон" propKey="colorIdle" value={p.colorIdle} onChange={up} defaultVal="#1e2430"/>
              <ColorRow label="Active фон" propKey="colorActive" value={p.colorActive} onChange={up} defaultVal={T.accent}/>
              <div style={{color:T.textDim,fontSize:11,marginBottom:5,marginTop:10,letterSpacing:1}}>ТЕКСТ</div>
              <ColorRow label="Idle текст" propKey="textIdle" value={p.textIdle} onChange={up} defaultVal={T.textDim}/>
              <ColorRow label="Active текст" propKey="textActive" value={p.textActive} onChange={up} defaultVal="#ffffff"/>
              <div style={{color:T.textDim,fontSize:11,marginBottom:5,marginTop:10,letterSpacing:1}}>РАМКА</div>
              <ColorRow label="Idle рамка" propKey="borderIdle" value={p.borderIdle} onChange={up} defaultVal="#374151"/>
            </>}
            {selectedEl.type==="indicator_led" && <>
              <ColorRow label="Idle цвет" propKey="colorIdle" value={p.colorIdle} onChange={up} defaultVal="#1e2430"/>
              <ColorRow label="Active цвет" propKey="colorActive" value={p.colorActive} onChange={up} defaultVal={T.green}/>
              <ColorRow label="Idle рамка" propKey="borderIdle" value={p.borderIdle} onChange={up} defaultVal="#374151"/>
            </>}
            {(selectedEl.type==="indicator_bar") && <>
              <ColorRow label="Idle заливка" propKey="colorIdle" value={p.colorIdle} onChange={up} defaultVal="#1e2430"/>
              <ColorRow label="Active заливка" propKey="colorActive" value={p.colorActive} onChange={up} defaultVal={T.accent}/>
              <ColorRow label="Фон полосы" propKey="bgColor" value={p.bgColor} onChange={up} defaultVal="#0a0e14"/>
              <ColorRow label="Цвет текста" propKey="textColor" value={p.textColor} onChange={up} defaultVal={T.text}/>
              <ColorRow label="Рамка" propKey="borderIdle" value={p.borderIdle} onChange={up} defaultVal="#374151"/>
            </>}
            {selectedEl.type==="slider_h" && <>
              <ColorRow label="Active цвет" propKey="colorActive" value={p.colorActive} onChange={up} defaultVal={T.accent}/>
              <ColorRow label="Трек" propKey="trackColor" value={p.trackColor} onChange={up} defaultVal="#1e2430"/>
              <ColorRow label="Idle ползунок" propKey="knobIdle" value={p.knobIdle} onChange={up} defaultVal="#374151"/>
            </>}
            {selectedEl.type==="label_text" && <>
              <ColorRow label="Idle цвет" propKey="colorIdle" value={p.colorIdle} onChange={up} defaultVal={T.textDim}/>
              <ColorRow label="Active цвет" propKey="colorActive" value={p.colorActive} onChange={up} defaultVal={T.accent}/>
            </>}
            {selectedEl.type==="frame_box" && <>
              <ColorRow label="Idle рамка" propKey="borderIdle" value={p.borderIdle} onChange={up} defaultVal="#374151"/>
              <ColorRow label="Active рамка" propKey="colorActive" value={p.colorActive} onChange={up} defaultVal={T.accent}/>
              <ColorRow label="Фон" propKey="bgColor" value={p.bgColor} onChange={up} defaultVal="transparent"/>
              <ColorRow label="Цвет текста idle" propKey="colorIdle" value={p.colorIdle} onChange={up} defaultVal={T.textDim}/>
            </>}
            {selectedEl.type==="separator" && <>
              <ColorRow label="Idle цвет" propKey="colorIdle" value={p.colorIdle} onChange={up} defaultVal="#374151"/>
              <ColorRow label="Active цвет" propKey="colorActive" value={p.colorActive} onChange={up} defaultVal={T.accent}/>
            </>}
          </div>
        )}

        <div style={{borderTop:`1px solid ${T.border}`,marginTop:12,paddingTop:10,display:"flex",flexDirection:"column",gap:6}}>
          <button onClick={duplicateSelected}
            style={{width:"100%",padding:"7px",background:"transparent",border:`1px solid ${T.yellow}`,color:T.yellow,fontSize:12,cursor:"pointer",borderRadius:3}}>
            ⎘ Дублировать (Ctrl+D)
          </button>
          <button onClick={deleteSelected}
            style={{width:"100%",padding:"7px",background:"transparent",border:`1px solid ${T.red}`,color:T.red,fontSize:12,cursor:"pointer",borderRadius:3}}>
            ✕ Удалить (Del)
          </button>
        </div>
      </div>
    );
  };

  // ── Mini preview ──
  const MiniCanvas = ({active, elOverride}) => {
    const sc = 0.14;
    return (
      <div style={{width:cW*sc,height:cH*sc,position:"relative",border:`1px solid ${T.border}`,borderRadius:3,overflow:"hidden",background:bgColor,backgroundImage:bgImage?`url(${bgImage})`:"none",backgroundSize:"cover",backgroundPosition:"center",flexShrink:0}}>
        <div style={{position:"absolute",inset:0,transform:`scale(${sc})`,transformOrigin:"top left",width:cW,height:cH}}>
          {sharedElements.map(el=>renderEl(el,active,true))}
          {(elOverride||elements).map(el=>renderEl(el,active,false))}
        </div>
        <div style={{position:"absolute",bottom:2,left:0,right:0,textAlign:"center",color:active?T.accent:T.textDim,fontSize:7,fontFamily:"monospace",fontWeight:700}}>
          {active?"ACTIVE":"IDLE"}
        </div>
      </div>
    );
  };

  return (
    <div style={{display:"flex",height:"100vh",width:"100vw",background:T.bg,color:T.text,fontFamily:"'Courier New',monospace",userSelect:"none",overflow:"hidden"}}>

      {/* Hidden file inputs */}
      <input ref={importJsonRef} type="file" accept=".json,application/json" onChange={handleImportJSON} style={{display:"none"}}/>

      {/* ══ LEFT PANEL ══ */}
      <div style={{width:196,flexShrink:0,background:T.panel,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"12px 14px 10px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{color:T.accent,fontSize:15,fontWeight:700,letterSpacing:2}}>HMI EDITOR</div>
          <div style={{color:T.textDim,fontSize:11,marginTop:2}}>DWIN DGUS TOOL</div>
        </div>

        {/* Resolution */}
        <div style={{padding:"9px 10px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{color:T.textDim,fontSize:11,letterSpacing:1,marginBottom:4}}>РАЗРЕШЕНИЕ</div>
          <div onClick={()=>{setTempRes(resolution);setShowResModal(true);}}
            style={{padding:"6px 10px",background:"#0a0e14",border:`1px solid ${T.accent}`,borderRadius:4,cursor:"pointer",fontSize:13,color:T.accent,fontFamily:"monospace",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>{cW}×{cH}</span><span style={{fontSize:11}}>▼</span>
          </div>
        </div>

        {/* Canvas bg color */}
        <div style={{padding:"9px 10px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
          <div style={{color:T.textDim,fontSize:11,flex:1}}>ФОН КАНВАСА</div>
          <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)}
            style={{width:36,height:26,border:`1px solid ${T.border}`,borderRadius:3,cursor:"pointer",padding:1,background:"none"}}/>
        </div>

        {/* Background image */}
        <div style={{padding:"9px 10px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{color:T.textDim,fontSize:11,marginBottom:5}}>ФОНОВОЕ ИЗОБРАЖЕНИЕ</div>
          <input ref={bgFileInputRef} type="file" accept="image/*" onChange={handleBgImageUpload} style={{display:"none"}}/>
          {bgImage ? (
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <div style={{width:36,height:26,borderRadius:3,border:`1px solid ${T.border}`,backgroundImage:`url(${bgImage})`,backgroundSize:"cover",backgroundPosition:"center",flexShrink:0}}/>
              <div style={{flex:1,color:T.green,fontSize:11}}>Загружено ✓</div>
              <div onClick={clearBgImage} title="Убрать" style={{color:T.red,cursor:"pointer",fontSize:14,padding:"2px 4px",borderRadius:2}}>✕</div>
            </div>
          ) : (
            <button onClick={()=>bgFileInputRef.current?.click()}
              style={{width:"100%",padding:"6px 8px",background:"#0a0e14",border:`1px dashed ${T.border}`,color:T.textDim,fontSize:11,cursor:"pointer",borderRadius:3,textAlign:"left",display:"flex",alignItems:"center",gap:6}}>
              <span>🖼</span><span>Загрузить файл...</span>
            </button>
          )}
        </div>

        {/* Components */}
        <div style={{padding:"8px 10px 4px",color:T.textDim,fontSize:11,letterSpacing:1}}>КОМПОНЕНТЫ</div>
        <div style={{flex:1,overflowY:"auto",padding:"0 10px 10px"}}>
          {Object.entries(DEFS).map(([type,def])=>(
            <div key={type} draggable onDragStart={()=>onPaletteDrag(type)}
              style={{padding:"7px 12px",marginBottom:4,background:"#0a0e14",border:`1px solid ${T.border}`,borderRadius:4,cursor:"grab",display:"flex",alignItems:"center",gap:10,transition:"border-color 0.1s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
              onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
              <span style={{fontSize:15,fontFamily:"monospace",color:T.textDim}}>{def.icon}</span>
              <span style={{color:T.text,fontSize:13}}>{def.label}</span>
            </div>
          ))}
        </div>

        {/* Pages list */}
        <div style={{borderTop:`1px solid ${T.border}`,padding:10}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <div style={{color:T.textDim,fontSize:11,letterSpacing:1}}>СТРАНИЦЫ</div>
            <div onClick={()=>setShowPageMgr(v=>!v)} style={{color:showPageMgr?T.accent:T.textDim,fontSize:13,cursor:"pointer",padding:"2px 5px",borderRadius:2}}>⚙</div>
          </div>
          <div style={{maxHeight:120,overflowY:"auto"}}>
            {pages.map(p=>(
              <div key={p.id} onClick={()=>setActivePageId(p.id)}
                style={{padding:"5px 10px",marginBottom:3,background:activePageId===p.id?T.accentDim:"#0a0e14",border:`1px solid ${activePageId===p.id?T.accent:T.border}`,borderRadius:3,fontSize:12,cursor:"pointer",color:activePageId===p.id?T.accent:T.textDim,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{p.name}</span>
                {pages.length>1&&activePageId===p.id&&<span onClick={e=>{e.stopPropagation();duplicatePage(p.id);}} title="Дублировать" style={{fontSize:12,marginLeft:4,opacity:.6}}>⎘</span>}
              </div>
            ))}
          </div>
          <button onClick={addPage} style={{width:"100%",padding:"5px",background:"transparent",border:`1px dashed ${T.border}`,color:T.textDim,fontSize:11,cursor:"pointer",borderRadius:3,marginTop:4}}>+ страница</button>

          {/* Shared info */}
          <div style={{marginTop:7,padding:"6px 10px",background:"#0a0e14",border:`1px solid ${T.border}`,borderRadius:3,fontSize:11,color:T.textDim,display:"flex",alignItems:"center",gap:6}}>
            <span style={{color:T.blue}}>🔗</span>
            <span>Общих: {sharedElements.length}</span>
          </div>
        </div>
      </div>

      {/* ══ CENTER ══ */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Toolbar */}
        <div style={{height:52,background:T.panel,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",padding:"0 12px",gap:6,flexShrink:0}}>
          {["idle","active","split"].map(m=>(
            <button key={m} onClick={()=>setPreview(m)}
              style={{padding:"5px 13px",background:preview===m?T.accentDim:"transparent",border:`1px solid ${preview===m?T.accent:T.border}`,color:preview===m?T.accent:T.textDim,fontSize:12,fontFamily:"monospace",cursor:"pointer",borderRadius:3,letterSpacing:1}}>
              {m.toUpperCase()}
            </button>
          ))}
          <div style={{flex:1}}/>
          <button onClick={undo} title="Отменить (Ctrl+Z)" disabled={historyIndex<=0}
            style={{padding:"5px 11px",background:"transparent",border:`1px solid ${historyIndex>0?T.yellow:T.border}`,color:historyIndex>0?T.yellow:T.textFaint,fontSize:13,cursor:historyIndex>0?"pointer":"default",borderRadius:3,opacity:historyIndex>0?1:0.4}}>↩</button>
          <button onClick={redo} title="Повторить (Ctrl+Shift+Z)" disabled={historyIndex>=history.length-1}
            style={{padding:"5px 11px",background:"transparent",border:`1px solid ${historyIndex<history.length-1?T.yellow:T.border}`,color:historyIndex<history.length-1?T.yellow:T.textFaint,fontSize:13,cursor:historyIndex<history.length-1?"pointer":"default",borderRadius:3,opacity:historyIndex<history.length-1?1:0.4}}>↪</button>
          <div style={{width:1,height:24,background:T.border,margin:"0 2px"}}/>
          <button onClick={()=>setShowCoords(v=>!v)}
            style={{padding:"5px 11px",background:showCoords?T.greenDim:"transparent",border:`1px solid ${showCoords?T.green:T.border}`,color:showCoords?T.green:T.textDim,fontSize:13,cursor:"pointer",borderRadius:3}}>
            📋
          </button>
          {selected&&<button onClick={deleteSelected}
            style={{padding:"5px 10px",background:"transparent",border:`1px solid ${T.red}`,color:T.red,fontSize:12,cursor:"pointer",borderRadius:3}}>✕</button>}
          <button onClick={()=>exportCSV(allPages,sharedElements,cW,cH)}
            style={{padding:"5px 13px",background:T.greenDim,border:`1px solid ${T.green}`,color:T.green,fontSize:12,fontWeight:700,cursor:"pointer",borderRadius:3}}>
            ⬇ CSV
          </button>
          <button onClick={exportJSON} title="Сохранить проект в файл"
            style={{padding:"5px 13px",background:"rgba(88,166,255,0.1)",border:`1px solid ${T.blue}`,color:T.blue,fontSize:12,fontWeight:700,cursor:"pointer",borderRadius:3}}>
            ⬇ JSON
          </button>
          <button onClick={()=>importJsonRef.current?.click()} title="Загрузить проект из файла"
            style={{padding:"5px 13px",background:"rgba(88,166,255,0.06)",border:`1px solid ${T.blue}44`,color:T.blue,fontSize:12,cursor:"pointer",borderRadius:3}}>
            ⬆ JSON
          </button>
          <button onClick={handleExport}
            style={{padding:"6px 15px",background:T.accent,border:"none",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",borderRadius:4}}>
            ⬇ 2×PNG
          </button>
          <button onClick={handleExportAll} title="Экспорт всех страниц"
            style={{padding:"6px 12px",background:"transparent",border:`1px solid ${T.accent}`,color:T.accent,fontSize:12,cursor:"pointer",borderRadius:4}}>
            ⬇ ALL
          </button>
        </div>

        {/* Page name bar */}
        <div style={{height:34,background:"#0a0e14",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",padding:"0 14px",gap:10,flexShrink:0}}>
          <span style={{color:T.textDim,fontSize:11}}>СТРАНИЦА:</span>
          <span style={{color:T.accent,fontSize:12,fontWeight:700}}>{currentPage?.name}</span>
          <div style={{flex:1}}/>
          <span style={{color:T.textFaint,fontSize:11}}>Общих: {sharedElements.length} | На стр.: {elements.length}</span>
          {history.length>1&&<span style={{color:T.yellow,fontSize:10,opacity:0.7}}>История: {historyIndex}/{history.length-1}</span>}
        </div>

        {/* Canvas */}
        <div ref={canvasAreaRef} style={{flex:1,overflow:"hidden",padding:20,display:"flex",gap:20,justifyContent:"center",alignItems:"flex-start",position:"relative",cursor:middlePanRef.current?"grabbing":"default"}}
          onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onMouseDown={e=>{ if(e.button===1){e.preventDefault();middlePanRef.current={startX:e.clientX,startY:e.clientY,startPan:{...panRef.current}};} }}>
          {preview==="split" ? (
            <div style={{display:"flex",gap:14,alignItems:"flex-start",transform:`translate(${pan.x}px,${pan.y}px)`}}>
              {[false,true].map(active=>(
                <div key={String(active)}>
                  <div style={{color:active?T.accent:T.textDim,fontSize:9,textAlign:"center",marginBottom:5,letterSpacing:1}}>{active?"▶ ACTIVE":"○ IDLE"}</div>
                  <div style={{width:dW,height:dH,position:"relative",overflow:"hidden",border:`1px solid ${active?T.accent:T.border}`,borderRadius:2}}>
                    <div ref={active?undefined:canvasRef}
                      style={{width:cW,height:cH,position:"absolute",top:0,left:0,background:bgColor,backgroundImage:bgImage?`url(${bgImage})`:`radial-gradient(circle,#1e2430 1px,transparent 1px)`,backgroundSize:bgImage?"cover":`${GRID*4}px ${GRID*4}px`,backgroundPosition:"center",transform:`scale(${scale})`,transformOrigin:"top left"}}>
                      {sharedElements.map(el=>renderEl(el,active,true))}
                      {elements.map(el=>renderEl(el,active,false))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{position:"relative",flexShrink:0,transform:`translate(${pan.x}px,${pan.y}px)`}}>
              <div style={{width:dW,height:dH,position:"relative",flexShrink:0}}>
                <div
                  ref={canvasRef}
                  onDrop={onCanvasDrop} onDragOver={e=>e.preventDefault()}
                  onMouseDown={onCanvasMouseDown}
                  onClick={e=>{ if(wasDraggingRef.current){wasDraggingRef.current=false;return;} }}
                  style={{width:cW,height:cH,background:bgColor,position:"absolute",top:0,left:0,backgroundImage:bgImage?`url(${bgImage})`:`radial-gradient(circle,#1e2430 1px,transparent 1px)`,backgroundSize:bgImage?"cover":`${GRID*4}px ${GRID*4}px`,backgroundPosition:"center",border:`1px solid ${T.border}`,transform:`scale(${scale})`,transformOrigin:"top left",cursor:"default",userSelect:"none"}}>
                  {sharedElements.map(el=>renderEl(el,undefined,true))}
                  {elements.map(el=>renderEl(el,undefined,false))}
                  {/* Marquee selection rect */}
                  {marquee && marquee.w > 2 && (
                    <div style={{position:"absolute",left:marquee.x,top:marquee.y,width:marquee.w,height:marquee.h,border:`1px solid ${T.accent}`,background:"rgba(249,115,22,0.08)",pointerEvents:"none",zIndex:100}}/>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Zoom controls */}
          <div style={{position:"absolute",bottom:14,right:14,display:"flex",gap:4,alignItems:"center",zIndex:20}}>
            <button onClick={()=>setZoom(z=>Math.min(4,z*1.2))} style={{width:28,height:28,background:T.panel,border:`1px solid ${T.border}`,color:T.text,fontSize:16,cursor:"pointer",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            <div onClick={()=>{setZoom(1);setPan({x:0,y:0});}} style={{padding:"3px 8px",background:T.panel,border:`1px solid ${T.border}`,color:T.textDim,fontSize:11,cursor:"pointer",borderRadius:4,fontFamily:"monospace",minWidth:48,textAlign:"center"}}>{Math.round(zoom*100)}%</div>
            <button onClick={()=>setZoom(z=>Math.max(0.2,z/1.2))} style={{width:28,height:28,background:T.panel,border:`1px solid ${T.border}`,color:T.text,fontSize:16,cursor:"pointer",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
          </div>
        </div>

        {/* Coordinates table */}
        {showCoords && (
          <div style={{height:200,background:T.panel,borderTop:`2px solid ${T.green}`,overflow:"auto",flexShrink:0}}>
            <div style={{padding:"6px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,background:T.panel,zIndex:10}}>
              <span style={{color:T.green,fontSize:12,fontWeight:700,letterSpacing:1}}>КООРДИНАТЫ — {currentPage?.name}</span>
              <span style={{color:T.textDim,fontSize:11}}>{elements.length} эл. + {sharedElements.length} общих</span>
              <div style={{flex:1}}/>
              <button onClick={()=>exportCSV(allPages,sharedElements,cW,cH)}
                style={{padding:"3px 10px",background:"transparent",border:`1px solid ${T.green}`,color:T.green,fontSize:11,cursor:"pointer",borderRadius:3}}>⬇ CSV</button>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"monospace"}}>
              <thead style={{position:"sticky",top:33,background:"#0a0e14",zIndex:9}}>
                <tr>{["Слой","ID","Тип","Label","X","Y","Ш","В","X2","Y2","Cx","Cy"].map(h=>(
                  <th key={h} style={{padding:"4px 12px",color:T.textDim,textAlign:"left",borderBottom:`1px solid ${T.border}`,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {[...sharedElements.map(el=>({...el,_shared:true})),...elements].map((el,i)=>(
                  <tr key={el.id} onClick={()=>{setSelectedIsShared(!!el._shared);selectedIsSharedRef.current=!!el._shared;setSelected(el.id);}}
                    style={{background:el.id===selected?"rgba(249,115,22,0.08)":i%2===0?"transparent":"rgba(255,255,255,0.02)",cursor:"pointer"}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
                    onMouseLeave={e=>e.currentTarget.style.background=el.id===selected?"rgba(249,115,22,0.08)":i%2===0?"transparent":"rgba(255,255,255,0.02)"}>
                    <td style={{padding:"4px 12px",color:el._shared?T.blue:T.textDim}}>{el._shared?"общий":"стр."}</td>
                    <td style={{padding:"4px 12px",color:T.accent}}>{el.id}</td>
                    <td style={{padding:"4px 12px",color:T.blue}}>{el.type}</td>
                    <td style={{padding:"4px 12px",color:T.text}}>{el.props?.label||el.props?.text||el.props?.title||"—"}</td>
                    <td style={{padding:"4px 12px",color:T.green,fontWeight:700}}>{el.x}</td>
                    <td style={{padding:"4px 12px",color:T.green,fontWeight:700}}>{el.y}</td>
                    <td style={{padding:"4px 12px",color:T.textDim}}>{el.w}</td>
                    <td style={{padding:"4px 12px",color:T.textDim}}>{el.h}</td>
                    <td style={{padding:"4px 12px",color:T.textDim}}>{el.x+el.w}</td>
                    <td style={{padding:"4px 12px",color:T.textDim}}>{el.y+el.h}</td>
                    <td style={{padding:"4px 12px",color:T.textDim}}>{Math.round(el.x+el.w/2)}</td>
                    <td style={{padding:"4px 12px",color:T.textDim}}>{Math.round(el.y+el.h/2)}</td>
                  </tr>
                ))}
                {elements.length===0&&sharedElements.length===0&&<tr><td colSpan={12} style={{padding:"18px",color:T.textDim,textAlign:"center"}}>Нет элементов</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        <div style={{height:26,background:T.panel,borderTop:`1px solid ${T.border}`,display:"flex",alignItems:"center",padding:"0 14px",gap:16,fontSize:11,color:T.textDim,flexShrink:0}}>
          <span style={{color:T.accent}}>{cW}×{cH}</span>
          <span>GRID:{GRID}px</span>
          <span>ZOOM:{Math.round(scale*100)}%</span>
          <span>ЭЛ:{elements.length}</span>
          <span>ОБЩ:{sharedElements.length}</span>
          <span>СТР:{pages.length}</span>
          {selectedEl&&<span style={{color:T.accent}}>● {selectedEl.type} [{selectedEl.x},{selectedEl.y}] {selectedEl.w}×{selectedEl.h}{selectedIsShared?" 🔗":""}</span>}
          {multiSelected.size > 1 && <span style={{color:T.yellow}}>▣ {multiSelected.size} выбрано</span>}
          <div style={{flex:1}}/>
          {saveStatus==="saved"&&<span style={{color:T.green,fontSize:10,letterSpacing:1}}>● АВТОСОХРАНЕНО</span>}
          {saveStatus==="error"&&<span style={{color:T.red,fontSize:10}}>⚠ ОШИБКА СОХРАНЕНИЯ</span>}
          {!saveStatus&&<span style={{color:T.textFaint,fontSize:10}}>💾 localStorage</span>}
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div style={{width:240,flexShrink:0,background:T.panel,borderLeft:`1px solid ${T.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{color:T.textDim,fontSize:11,letterSpacing:1}}>СВОЙСТВА</div>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          <PropsPanel/>
        </div>
        {elements.length>0&&(
          <div style={{padding:10,borderTop:`1px solid ${T.border}`}}>
            <div style={{color:T.textDim,fontSize:11,marginBottom:6}}>PREVIEW</div>
            <div style={{display:"flex",gap:4}}>
              <MiniCanvas active={false}/>
              <MiniCanvas active={true}/>
            </div>
          </div>
        )}
      </div>

      {/* ══ RESOLUTION MODAL ══ */}
      {showResModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}
          onClick={()=>setShowResModal(false)}>
          <div style={{background:T.panel,border:`2px solid ${T.accent}`,borderRadius:8,padding:28,minWidth:380}}
            onClick={e=>e.stopPropagation()}>
            <div style={{color:T.accent,fontSize:15,fontWeight:700,letterSpacing:2,marginBottom:5}}>РАЗРЕШЕНИЕ ЭКРАНА</div>
            <div style={{color:T.textDim,fontSize:11,marginBottom:16}}>Стандартные форматы DWIN DGUS II</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:14}}>
              {RESOLUTIONS.filter(r=>r.w!==null).map((r,i)=>(
                <div key={i} onClick={()=>setTempRes(r)}
                  style={{padding:"10px 12px",background:tempRes===r?"#1a2a3a":"#0a0e14",border:`1px solid ${tempRes===r?T.accent:T.border}`,borderRadius:4,cursor:"pointer"}}>
                  <div style={{color:tempRes===r?T.accent:T.text,fontSize:13,fontFamily:"monospace",fontWeight:700}}>{r.label}</div>
                </div>
              ))}
            </div>
            <div onClick={()=>setTempRes(RESOLUTIONS[7])}
              style={{padding:"9px 14px",marginBottom:14,background:tempRes.w===null?"#1a2a3a":"#0a0e14",border:`1px solid ${tempRes.w===null?T.accent:T.border}`,borderRadius:4,cursor:"pointer",fontSize:12,color:tempRes.w===null?T.accent:T.textDim}}>
              ✏ Кастомный размер
            </div>
            {tempRes.w===null&&(
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14}}>
                <input type="number" value={customW} onChange={e=>setCustomW(parseInt(e.target.value)||800)} style={{flex:1,background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:"7px 10px",fontSize:13,fontFamily:"monospace",borderRadius:3}}/>
                <span style={{color:T.textDim,fontSize:15}}>×</span>
                <input type="number" value={customH} onChange={e=>setCustomH(parseInt(e.target.value)||480)} style={{flex:1,background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:"7px 10px",fontSize:13,fontFamily:"monospace",borderRadius:3}}/>
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowResModal(false)}
                style={{flex:1,padding:"9px",background:"transparent",border:`1px solid ${T.border}`,color:T.textDim,fontSize:13,cursor:"pointer",borderRadius:4}}>Отмена</button>
              <button onClick={()=>{setResolution(tempRes);setShowResModal(false);}}
                style={{flex:2,padding:"9px",background:T.accent,border:"none",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",borderRadius:4}}>
                Применить {tempRes.w?`${tempRes.w}×${tempRes.h}`:`${customW}×${customH}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PAGE MANAGER ══ */}
      {showPageMgr&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}
          onClick={()=>setShowPageMgr(false)}>
          <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:8,padding:22,minWidth:400,maxHeight:"70vh",overflow:"auto"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{color:T.accent,fontSize:14,fontWeight:700,letterSpacing:2,marginBottom:16}}>УПРАВЛЕНИЕ СТРАНИЦАМИ</div>
            {pages.map((p,i)=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:"#0a0e14",border:`1px solid ${activePageId===p.id?T.accent:T.border}`,borderRadius:4,marginBottom:7}}>
                <span style={{color:T.textDim,fontSize:11,width:18}}>{i+1}</span>
                <input value={p.name} onChange={e=>renamePage(p.id,e.target.value)}
                  style={{flex:1,background:"transparent",border:"none",color:T.text,fontSize:13,fontFamily:"monospace",outline:"none"}}/>
                <button onClick={()=>{setActivePageId(p.id);setShowPageMgr(false);}}
                  style={{padding:"3px 9px",background:"transparent",border:`1px solid ${T.border}`,color:T.textDim,fontSize:11,cursor:"pointer",borderRadius:3}}>
                  {activePageId===p.id?"активна":"открыть"}
                </button>
                <button onClick={()=>duplicatePage(p.id)} title="Дублировать"
                  style={{padding:"3px 9px",background:"transparent",border:`1px solid ${T.blue}`,color:T.blue,fontSize:11,cursor:"pointer",borderRadius:3}}>⎘</button>
                {pages.length>1&&<button onClick={()=>deletePage(p.id)}
                  style={{padding:"3px 7px",background:"transparent",border:`1px solid ${T.red}`,color:T.red,fontSize:11,cursor:"pointer",borderRadius:3}}>✕</button>}
              </div>
            ))}
            <button onClick={addPage}
              style={{width:"100%",padding:"9px",background:"transparent",border:`1px dashed ${T.border}`,color:T.textDim,fontSize:12,cursor:"pointer",borderRadius:4,marginTop:5}}>
              + Добавить страницу
            </button>
            <div style={{marginTop:16,padding:"12px 14px",background:"rgba(88,166,255,0.05)",border:`1px solid ${T.blue}33`,borderRadius:4,color:T.textDim,fontSize:11,lineHeight:1.8}}>
              <div style={{color:T.blue,marginBottom:5,fontSize:12}}>Общие элементы</div>
              Выделите элемент и нажмите «Сделать общим» в панели свойств.<br/>
              Общие элементы видны на всех страницах и всегда доступны для редактирования.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}